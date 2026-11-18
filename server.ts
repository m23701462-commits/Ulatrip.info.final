import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { db, isSupabaseConfigured } from './server/store.ts';
import { INDIAN_STATES, type IndianState } from './src/types.ts';

const PORT = 3000;

interface SocketClient extends WebSocket {
  rooms?: Set<string>;
}

const wssClients = new Set<SocketClient>();

function broadcastToRoom(room: string, event: string, payload: unknown): void {
  const frame = JSON.stringify({ room, event, payload });
  for (const client of wssClients) {
    if (client.readyState === WebSocket.OPEN && client.rooms?.has(room)) {
      client.send(frame);
    }
  }
}

function isValidState(state: string): state is IndianState {
  return (INDIAN_STATES as readonly string[]).includes(state);
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: SocketClient) => {
    ws.rooms = new Set<string>();
    wssClients.add(ws);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string; room?: string };
        if (msg.type === 'subscribe' && msg.room) {
          ws.rooms?.add(msg.room);
        } else if (msg.type === 'unsubscribe' && msg.room) {
          ws.rooms?.delete(msg.room);
        }
      } catch {
        // Ignore malformed frames
      }
    });

    ws.on('close', () => {
      wssClients.delete(ws);
    });
  });

  // 1. Platform Settings & Health
  app.get('/api/settings', async (_req, res) => {
    const settings = await db.getSettings();
    res.json({
      ...settings,
      supabase_connected: isSupabaseConfigured,
      cashfree_configured: Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY),
    });
  });

  // 2. Member Profile Lookup
  app.get('/api/auth/me', async (req, res) => {
    const userId = String(req.query.userId || '');
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const user = await db.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const passes = await db.getUserPasses(user.id);
    return res.json({ user, passes });
  });

  // 3. Cashfree Order Creation & Verification
  app.post('/api/create-cashfree-order', async (req, res) => {
    const { userId, state, userName, userEmail, userPhone } = req.body as {
      userId?: string;
      state?: string;
      userName?: string;
      userEmail?: string;
      userPhone?: string;
    };
    if (!userId || !state || !isValidState(state)) {
      return res.status(400).json({ error: 'Valid userId and Indian state are required.' });
    }
    const user = await db.ensureUserProfile({
      id: userId,
      full_name: userName,
      email: userEmail,
      phone: userPhone,
    });
    if (user.is_banned) return res.status(403).json({ error: 'Account suspended due to safety policy violation.' });

    const settings = await db.getSettings();
    const amount = settings.party_chat_fee;
    const orderId = `ULATRIP_${state.replace(/\s+/g, '').toUpperCase().slice(0, 4)}_${Date.now()}_${crypto
      .randomBytes(2)
      .toString('hex')
      .toUpperCase()}`;

    const cfAppId = process.env.CASHFREE_APP_ID;
    const cfSecret = process.env.CASHFREE_SECRET_KEY;
    const cfEnv = (process.env.CASHFREE_ENV || 'SANDBOX').toUpperCase() === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX';

    if (cfAppId && cfSecret) {
      const endpoint =
        cfEnv === 'PRODUCTION' ? 'https://api.cashfree.com/pg/orders' : 'https://sandbox.cashfree.com/pg/orders';
      const returnBase = process.env.APP_URL || `http://localhost:${PORT}`;
      try {
        const cfResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': cfAppId,
            'x-client-secret': cfSecret,
            'x-api-version': '2023-08-01',
          },
          body: JSON.stringify({
            order_id: orderId,
            order_amount: amount,
            order_currency: 'INR',
            customer_details: {
              customer_id: user.id.replace(/[^a-zA-Z0-9_-]/g, '_'),
              customer_name: user.full_name,
              customer_email: user.email,
              customer_phone: user.phone.replace(/\D/g, '').slice(-10) || '9840011223',
            },
            order_meta: {
              return_url: `${returnBase}/?order_id={order_id}&state=${encodeURIComponent(state)}`,
            },
            order_note: `UlaTrip 30-Day Pass for ${state}`,
          }),
        });
        const cfData = (await cfResponse.json()) as { payment_session_id?: string; message?: string };
        if (!cfResponse.ok || !cfData.payment_session_id) {
          return res.status(502).json({ error: cfData.message || 'Cashfree order creation failed.' });
        }
        await db.savePendingOrder({ order_id: orderId, user_id: user.id, state, amount });
        return res.json({
          mode: 'cashfree_live',
          order_id: orderId,
          payment_session_id: cfData.payment_session_id,
          amount,
          state,
          cashfree_env: cfEnv,
        });
      } catch (err) {
        return res.status(502).json({ error: `Cashfree connection failed: ${(err as Error).message}` });
      }
    }

    // Sandbox interactive checkout session when merchant keys aren't configured
    await db.savePendingOrder({ order_id: orderId, user_id: user.id, state, amount });
    return res.json({
      mode: 'cashfree_sandbox_preview',
      order_id: orderId,
      payment_session_id: `session_${orderId}`,
      amount,
      state,
      cashfree_env: 'SANDBOX',
    });
  });

  app.post('/api/verify-cashfree-payment', async (req, res) => {
    const { orderId, userId, state } = req.body as {
      orderId?: string;
      userId?: string;
      state?: string;
    };
    if (!orderId || !userId || !state || !isValidState(state)) {
      return res.status(400).json({ error: 'orderId, userId, and valid state are required.' });
    }

    const settings = await db.getSettings();
    const cfAppId = process.env.CASHFREE_APP_ID;
    const cfSecret = process.env.CASHFREE_SECRET_KEY;
    const cfEnv = (process.env.CASHFREE_ENV || 'SANDBOX').toUpperCase() === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX';
    let verifiedPaymentId = `CFPAY_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    let amountPaid = settings.party_chat_fee;

    if (cfAppId && cfSecret) {
      const endpoint =
        cfEnv === 'PRODUCTION'
          ? `https://api.cashfree.com/pg/orders/${orderId}`
          : `https://sandbox.cashfree.com/pg/orders/${orderId}`;
      const cfResponse = await fetch(endpoint, {
        headers: {
          'x-client-id': cfAppId,
          'x-client-secret': cfSecret,
          'x-api-version': '2023-08-01',
        },
      });
      const cfData = (await cfResponse.json()) as {
        order_status?: string;
        order_amount?: number;
        cf_order_id?: string;
      };
      if (!cfResponse.ok || cfData.order_status !== 'PAID') {
        return res.status(400).json({
          error: `Payment not completed yet (status: ${cfData.order_status || 'PENDING'}).`,
        });
      }
      verifiedPaymentId = cfData.cf_order_id || verifiedPaymentId;
      amountPaid = cfData.order_amount || amountPaid;
    } else {
      const pending = await db.getPendingOrder(orderId);
      if (!pending || pending.user_id !== userId || pending.state !== state) {
        return res.status(404).json({ error: 'Order session not found or mismatched.' });
      }
      amountPaid = pending.amount;
    }

    const pass = await db.approveStatePass({
      user_id: userId,
      unlocked_state: state,
      order_id: orderId,
      payment_id: verifiedPaymentId,
      amount_paid: amountPaid,
    });

    return res.json({ verified: true, pass });
  });

  // 4. State Group Chat (Strictly Isolated & Pay-to-Enter Enforced Per Unlocked State)
  app.get('/api/state-chat', async (req, res) => {
    const state = String(req.query.state || '');
    const userId = String(req.query.userId || '');
    if (!isValidState(state)) return res.status(400).json({ error: 'Invalid state.' });
    const user = await db.getUserById(userId);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });
    if (user.is_banned) {
      return res.status(403).json({ error: 'Account suspended due to safety policy violation.' });
    }

    const pass = await db.hasActiveStatePass(userId, state);
    if (!pass) {
      return res.status(403).json({ error: `Locked: Active paid pass required for ${state}.` });
    }
    const messages = await db.getStateMessages(state);
    return res.json({ messages, pass });
  });

  app.post('/api/state-chat', async (req, res) => {
    const { state, userId, message } = req.body as {
      state?: string;
      userId?: string;
      message?: string;
    };
    if (!state || !isValidState(state) || !userId || !message?.trim()) {
      return res.status(400).json({ error: 'State, userId, and message are required.' });
    }
    const user = await db.getUserById(userId);
    if (!user) return res.status(401).json({ error: 'User not found.' });
    if (user.is_banned) return res.status(403).json({ error: 'Your account has been suspended for safety violations.' });

    const pass = await db.hasActiveStatePass(userId, state);
    if (!pass) {
      return res.status(403).json({ error: `Locked: Unlock ${state} pass before chatting.` });
    }

    const saved = await db.addMessage({
      state,
      party_id: null,
      user_id: user.id,
      user_name: user.full_name,
      message,
    });
    broadcastToRoom(`state:${state}`, 'message:created', saved);
    return res.status(201).json(saved);
  });

  // 5. Parties & Meetups (State-scoped, Pay-to-Enter Enforced)
  app.get('/api/parties', async (req, res) => {
    const state = String(req.query.state || '');
    const userId = String(req.query.userId || '');
    if (!isValidState(state)) return res.status(400).json({ error: 'Valid state required.' });
    const user = await db.getUserById(userId);
    if (!user) return res.status(401).json({ error: 'Sign in required.' });
    if (user.is_banned) return res.status(403).json({ error: 'Account suspended.' });

    const pass = await db.hasActiveStatePass(userId, state);
    if (!pass) {
      return res.status(403).json({ error: `Unlock ${state} to view events.` });
    }

    const parties = await db.getPartiesForState(state, userId);
    return res.json({ parties });
  });

  app.get('/api/parties/mine', async (req, res) => {
    const userId = String(req.query.userId || '');
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const parties = await db.getHostSubmittedParties(userId);
    return res.json({ parties });
  });

  app.post('/api/parties', async (req, res) => {
    const body = req.body as {
      host_id?: string;
      state?: string;
      city?: string;
      event_type?: 'Home Party' | 'Public Place Chai / Food Meetup';
      title?: string;
      description?: string;
      event_date?: string;
      event_time?: string;
      entry_fee?: number;
      host_upi_id?: string;
      max_guests?: number;
      secret_address?: string;
      safety_pledge_accepted?: boolean;
      terms_accepted?: boolean;
    };

    if (!body.host_id || !body.state || !isValidState(body.state)) {
      return res.status(400).json({ error: 'Valid host and state are required.' });
    }
    const host = await db.getUserById(body.host_id);
    if (!host) return res.status(404).json({ error: 'Host profile not found.' });
    if (host.is_banned) return res.status(403).json({ error: 'Suspended users cannot host events.' });

    if (!body.safety_pledge_accepted || !body.terms_accepted) {
      return res.status(400).json({
        error: 'Both Safety Pledge (No Alcohol, No Sexual Content) and 3rd-Party Platform Terms checkboxes are mandatory.',
      });
    }
    const entryFee = Number(body.entry_fee || 0);
    if (entryFee > 0 && !body.host_upi_id?.trim()) {
      return res.status(400).json({ error: 'Host UPI ID is required for paid events.' });
    }
    if (!body.title?.trim() || !body.city?.trim() || !body.secret_address?.trim()) {
      return res.status(400).json({ error: 'Title, city, and secret address are required.' });
    }

    const created = await db.createParty({
      host_id: host.id,
      host_name: host.full_name,
      host_phone: host.phone,
      host_email: host.email,
      state: body.state,
      city: body.city.trim(),
      event_type: body.event_type || 'Public Place Chai / Food Meetup',
      title: body.title.trim(),
      description: body.description?.trim() || '',
      event_date: body.event_date || new Date().toISOString().slice(0, 10),
      event_time: body.event_time || '06:00 PM',
      entry_fee: entryFee,
      host_upi_id: body.host_upi_id?.trim() || '',
      max_guests: Number(body.max_guests || 15),
      secret_address: body.secret_address.trim(),
      safety_pledge_accepted: true,
      terms_accepted: true,
    });

    broadcastToRoom('admin:global', 'party:submitted', created);
    return res.status(201).json(created);
  });

  app.post('/api/parties/:id/join', async (req, res) => {
    const partyId = req.params.id;
    const { userId, utr_number } = req.body as { userId?: string; utr_number?: string };
    if (!userId) return res.status(400).json({ error: 'userId required.' });

    const user = await db.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.is_banned) return res.status(403).json({ error: 'Suspended user cannot join events.' });

    const party = await db.getPartyById(partyId);
    if (!party || !party.is_approved) return res.status(404).json({ error: 'Approved party not found.' });

    const pass = await db.hasActiveStatePass(userId, party.state);
    if (!pass) {
      return res.status(403).json({ error: `Unlock ${party.state} state pass first.` });
    }

    if (party.entry_fee === 0) {
      const participant = await db.upsertParticipant({
        party_id: party.id,
        user,
        payment_status: 'approved',
      });
      return res.json({ participant, secret_address: party.secret_address });
    }

    const cleanUtr = (utr_number || '').trim();
    if (!/^\d{12}$/.test(cleanUtr)) {
      return res.status(400).json({ error: 'Please enter a valid 12-digit numeric UTR reference.' });
    }

    const participant = await db.upsertParticipant({
      party_id: party.id,
      user,
      payment_status: 'pending',
      utr_number: cleanUtr,
    });
    return res.json({ participant });
  });

  app.post('/api/parties/:id/dispute', async (req, res) => {
    const partyId = req.params.id;
    const { userId, note } = req.body as { userId?: string; note?: string };
    if (!userId) return res.status(400).json({ error: 'userId required.' });

    const updated = await db.reportDispute(partyId, userId, note);
    if (!updated) {
      return res.status(404).json({ error: 'Submit your 12-digit UTR first before raising an entry dispute.' });
    }
    broadcastToRoom('admin:global', 'dispute:created', updated);
    return res.json({ participant: updated });
  });

  app.get('/api/parties/:id/participants', async (req, res) => {
    const partyId = req.params.id;
    const userId = String(req.query.userId || '');
    const user = await db.getUserById(userId);
    const party = await db.getPartyById(partyId);
    if (!user || !party) return res.status(404).json({ error: 'Not found' });
    if (party.host_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only host or admin can inspect participants.' });
    }
    const participants = await db.getParticipantsForParty(partyId);
    return res.json({ participants });
  });

  app.post('/api/participants/:id/approve-by-host', async (req, res) => {
    const participantId = req.params.id;
    const { hostId, status } = req.body as { hostId?: string; status?: 'approved' | 'rejected' };
    if (!hostId || !status) return res.status(400).json({ error: 'hostId and status required' });
    const resolved = await db.resolveParticipantStatus(participantId, status);
    if (!resolved) return res.status(404).json({ error: 'Participant not found' });
    broadcastToRoom(`party:${resolved.party_id}`, 'participant:updated', resolved);
    return res.json({ participant: resolved });
  });

  // 6. Party Private Chat (Only Approved Participants / Host / Admin)
  app.get('/api/parties/:id/messages', async (req, res) => {
    const partyId = req.params.id;
    const userId = String(req.query.userId || '');
    const user = await db.getUserById(userId);
    const party = await db.getPartyById(partyId);
    if (!user || !party) return res.status(404).json({ error: 'Party not found.' });

    const pt = await db.getParticipant(partyId, userId);
    const allowed = party.host_id === userId || user.role === 'admin' || pt?.payment_status === 'approved';
    if (!allowed) {
      return res.status(403).json({ error: 'Locked: Party entry approval required to access private party chat.' });
    }
    const messages = await db.getPartyMessages(partyId);
    return res.json({ messages, secret_address: party.secret_address });
  });

  app.post('/api/parties/:id/messages', async (req, res) => {
    const partyId = req.params.id;
    const { userId, message } = req.body as { userId?: string; message?: string };
    if (!userId || !message?.trim()) return res.status(400).json({ error: 'userId and message required.' });

    const user = await db.getUserById(userId);
    const party = await db.getPartyById(partyId);
    if (!user || !party) return res.status(404).json({ error: 'Party not found.' });
    if (user.is_banned) return res.status(403).json({ error: 'Account suspended.' });

    const pt = await db.getParticipant(partyId, userId);
    const allowed = party.host_id === userId || user.role === 'admin' || pt?.payment_status === 'approved';
    if (!allowed) {
      return res.status(403).json({ error: 'Locked: Party entry approval required.' });
    }

    const saved = await db.addMessage({
      state: party.state,
      party_id: party.id,
      user_id: user.id,
      user_name: user.full_name,
      message,
    });
    broadcastToRoom(`party:${party.id}`, 'message:created', saved);
    return res.status(201).json(saved);
  });

  // 7. Private 1-on-1 Host <-> Admin Approval Chats
  app.get('/api/host-admin-chats/:partyId', async (req, res) => {
    const partyId = req.params.partyId;
    const userId = String(req.query.userId || '');
    const user = await db.getUserById(userId);
    const party = await db.getPartyById(partyId);
    if (!user || !party) return res.status(404).json({ error: 'Not found' });
    if (party.host_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Private chat is strictly between Host and Admin.' });
    }
    const messages = await db.getHostAdminChats(partyId);
    return res.json({ messages });
  });

  app.post('/api/host-admin-chats/:partyId', async (req, res) => {
    const partyId = req.params.partyId;
    const { userId, message } = req.body as { userId?: string; message?: string };
    if (!userId || !message?.trim()) return res.status(400).json({ error: 'userId and message required' });
    const user = await db.getUserById(userId);
    const party = await db.getPartyById(partyId);
    if (!user || !party) return res.status(404).json({ error: 'Not found' });
    if (party.host_id !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: 'Private chat is strictly between Host and Admin.' });
    }

    const saved = await db.addHostAdminChat({
      party_id: partyId,
      sender_id: user.id,
      sender_role: user.role === 'admin' ? 'admin' : 'host',
      sender_name: user.full_name,
      message,
    });
    broadcastToRoom(`host_admin:${partyId}`, 'host_admin:message', saved);
    return res.status(201).json(saved);
  });

  // 8. User Safety Reports (saves to user_reports)
  const handleUserReport = async (req: express.Request, res: express.Response) => {
    const { reporterId, reportedUserId, reportedUserName, state, partyId, reason } = req.body as {
      reporterId?: string;
      reportedUserId?: string;
      reportedUserName?: string;
      state?: string;
      partyId?: string | null;
      reason?: string;
    };
    if (!reporterId || !reportedUserId || !state || !isValidState(state) || !reason?.trim()) {
      return res.status(400).json({ error: 'Reporter, reported user, state, and reason are required.' });
    }
    const reporter = await db.getUserById(reporterId);
    if (!reporter) return res.status(404).json({ error: 'Reporter not found.' });

    const created = await db.createSafetyReport({
      reporter_id: reporter.id,
      reporter_name: reporter.full_name,
      reported_user_id: reportedUserId,
      reported_user_name: reportedUserName || 'Member',
      state,
      party_id: partyId || null,
      reason: reason.trim(),
    });
    broadcastToRoom('admin:global', 'report:created', created);
    return res.status(201).json(created);
  };

  app.post('/api/user-reports', handleUserReport);
  app.post('/api/safety-reports', handleUserReport);

  // 9. Admin Dashboard Endpoints
  app.get('/api/admin/overview', async (req, res) => {
    const adminId = String(req.query.adminId || '');
    const admin = await db.getUserById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin privileges required.' });
    }
    const [settings, parties, disputes, safetyReports, users, passes] = await Promise.all([
      db.getSettings(),
      db.getAllPartiesAdmin(),
      db.getDisputedParticipantsAdmin(),
      db.getSafetyReports(),
      db.getProfiles(),
      db.getAllPasses(),
    ]);
    return res.json({ settings, parties, disputes, safetyReports, users, passes });
  });

  app.put('/api/admin/settings', async (req, res) => {
    const { adminId, party_chat_fee } = req.body as { adminId?: string; party_chat_fee?: number };
    const admin = await db.getUserById(String(adminId || ''));
    if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Admin required.' });

    const fee = Number(party_chat_fee);
    if (!Number.isFinite(fee) || fee < 1 || fee > 9999) {
      return res.status(400).json({ error: 'Fee must be between ₹1 and ₹9,999.' });
    }
    const updated = await db.updatePartyChatFee(Math.round(fee));
    broadcastToRoom('admin:global', 'settings:updated', updated);
    return res.json(updated);
  });

  app.post('/api/admin/parties/:id/approve', async (req, res) => {
    const { adminId } = req.body as { adminId?: string };
    const admin = await db.getUserById(String(adminId || ''));
    if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Admin required.' });

    const party = await db.approveParty(req.params.id);
    if (!party) return res.status(404).json({ error: 'Party not found.' });
    broadcastToRoom(`host_admin:${party.id}`, 'party:approved', party);
    broadcastToRoom(`state:${party.state}`, 'party:approved', party);
    return res.json(party);
  });

  app.post('/api/admin/participants/:id/resolve', async (req, res) => {
    const { adminId, status } = req.body as { adminId?: string; status?: 'approved' | 'rejected' };
    const admin = await db.getUserById(String(adminId || ''));
    if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Admin required.' });
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'Status must be approved or rejected.' });
    }
    const resolved = await db.resolveParticipantStatus(req.params.id, status);
    if (!resolved) return res.status(404).json({ error: 'Participant record not found.' });
    broadcastToRoom(`party:${resolved.party_id}`, 'participant:updated', resolved);
    return res.json(resolved);
  });

  app.post('/api/admin/users/:id/ban', async (req, res) => {
    const { adminId, is_banned } = req.body as { adminId?: string; is_banned?: boolean };
    const admin = await db.getUserById(String(adminId || ''));
    if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Admin required.' });
    if (req.params.id === admin.id) return res.status(400).json({ error: 'Cannot ban your own admin account.' });

    const updated = await db.toggleUserBan(req.params.id, Boolean(is_banned));
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    return res.json(updated);
  });

  app.post('/api/admin/reports/:id/resolve', async (req, res) => {
    const { adminId } = req.body as { adminId?: string };
    const admin = await db.getUserById(String(adminId || ''));
    if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Admin required.' });
    const resolved = await db.resolveSafetyReport(req.params.id);
    if (!resolved) return res.status(404).json({ error: 'Report not found.' });
    return res.json(resolved);
  });

  // Vite / Static Frontend Serving
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`UlaTrip server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
