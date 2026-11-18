import { useEffect, useRef } from 'react';
import { hasClientSupabase, supabase } from './supabase';
import type {
  CashfreeOrderSession,
  CommunityChatPass,
  HostAdminChatMessage,
  IndianState,
  PartyEvent,
  PartyMessage,
  PartyParticipant,
  PlatformSettings,
  SafetyReport,
  UserProfile,
} from '../types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const text = await res.text();
  let data: (T & { error?: string }) | null = null;
  try {
    data = JSON.parse(text) as T & { error?: string };
  } catch {
    throw new Error(
      `API ${url} returned invalid non-JSON response (${res.status}). Check Vercel /api routes.`
    );
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  async loadProfileAndPasses(
    userId: string,
    fallback?: { email?: string; full_name?: string; phone?: string }
  ): Promise<{ user: UserProfile; passes: CommunityChatPass[] }> {
    if (hasClientSupabase && supabase) {
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) {
        const cleanEmail = (fallback?.email || '').trim().toLowerCase();
        const fallbackName =
          fallback?.full_name?.trim() || (cleanEmail ? cleanEmail.split('@')[0] : 'Traveler');
        const newProfile = {
          id: userId,
          email: cleanEmail,
          full_name: fallbackName,
          phone: fallback?.phone?.trim() || '',
          role: cleanEmail === 'mgsolition@gmail.com' ? ('admin' as const) : ('user' as const),
          is_banned: false,
        };

        const { data: inserted, error: insertErr } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .maybeSingle();

        if (!insertErr && inserted) {
          profile = inserted;
        } else if (cleanEmail) {
          const { data: byEmail } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();
          profile = byEmail || { ...newProfile, created_at: new Date().toISOString() };
        } else {
          profile = { ...newProfile, created_at: new Date().toISOString() };
        }
      }

      const { data: passes } = await supabase
        .from('community_chat_passes')
        .select('*')
        .eq('user_id', (profile as UserProfile).id);

      return {
        user: profile as UserProfile,
        passes: (passes || []) as CommunityChatPass[],
      };
    }

    return request<{ user: UserProfile; passes: CommunityChatPass[] }>(
      `/api/auth/me?userId=${encodeURIComponent(userId)}`
    );
  },

  async getSettings(): Promise<PlatformSettings> {
    if (hasClientSupabase && supabase) {
      const { data } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (data) return data as PlatformSettings;
      return { id: 1, party_chat_fee: 199, updated_at: new Date().toISOString() };
    }
    return request<PlatformSettings>('/api/settings');
  },

  createCashfreeOrder(payload: {
    userId: string;
    state: IndianState;
    amount: number;
    userName: string;
    userEmail: string;
    userPhone: string;
  }) {
    return request<CashfreeOrderSession>('/api/create-cashfree-order', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  verifyCashfreePayment(orderId: string, userId: string, state: IndianState, amount?: number) {
    return request<{ verified: boolean; pass: CommunityChatPass }>('/api/verify-cashfree-payment', {
      method: 'POST',
      body: JSON.stringify({ orderId, userId, state, amount }),
    });
  },

  async getStateChat(
    state: IndianState,
    userId: string
  ): Promise<{ messages: PartyMessage[]; pass: CommunityChatPass | null }> {
    if (hasClientSupabase && supabase) {
      const { data: pass } = await supabase
        .from('community_chat_passes')
        .select('*')
        .eq('user_id', userId)
        .eq('unlocked_state', state)
        .eq('status', 'approved')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (!pass) {
        throw new Error(`Locked: Active paid pass required for ${state}.`);
      }

      const { data: messages, error } = await supabase
        .from('party_messages')
        .select('*')
        .eq('state', state)
        .is('party_id', null)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return {
        messages: (messages || []) as PartyMessage[],
        pass: pass as CommunityChatPass,
      };
    }

    return request<{ messages: PartyMessage[]; pass: CommunityChatPass | null }>(
      `/api/state-chat?state=${encodeURIComponent(state)}&userId=${encodeURIComponent(userId)}`
    );
  },

  async sendStateChat(state: IndianState, userId: string, message: string): Promise<PartyMessage> {
    if (hasClientSupabase && supabase) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, is_banned')
        .eq('id', userId)
        .maybeSingle();
      if (profile?.is_banned) throw new Error('Your account has been suspended.');

      const { data: pass } = await supabase
        .from('community_chat_passes')
        .select('id')
        .eq('user_id', userId)
        .eq('unlocked_state', state)
        .eq('status', 'approved')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (!pass) throw new Error(`Locked: Unlock ${state} pass before chatting.`);

      const { data, error } = await supabase
        .from('party_messages')
        .insert({
          state,
          party_id: null,
          user_id: userId,
          user_name: profile?.full_name || 'Traveler',
          message: message.trim(),
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as PartyMessage;
    }

    return request<PartyMessage>('/api/state-chat', {
      method: 'POST',
      body: JSON.stringify({ state, userId, message }),
    });
  },

  async getParties(state: IndianState, userId: string): Promise<{ parties: PartyEvent[] }> {
    if (hasClientSupabase && supabase) {
      const { data: parties, error } = await supabase
        .from('parties')
        .select('*')
        .eq('state', state)
        .eq('is_approved', true)
        .order('event_date', { ascending: true });
      if (error) throw new Error(error.message);

      const { data: participants } = await supabase.from('party_participants').select('*');
      const allParts = (participants || []) as PartyParticipant[];

      const hydrated = ((parties || []) as PartyEvent[]).map((party) => {
        const partyParts = allParts.filter((pt) => pt.party_id === party.id);
        const approvedCount = partyParts.filter((pt) => pt.payment_status === 'approved').length;
        const myPart = partyParts.find((pt) => pt.user_id === userId) || null;
        const canSeeAddress = party.host_id === userId || myPart?.payment_status === 'approved';
        return {
          ...party,
          secret_address: canSeeAddress ? party.secret_address : undefined,
          participant_count: approvedCount,
          my_participation: myPart,
        };
      });
      return { parties: hydrated };
    }

    return request<{ parties: PartyEvent[] }>(
      `/api/parties?state=${encodeURIComponent(state)}&userId=${encodeURIComponent(userId)}`
    );
  },

  async getMySubmittedParties(userId: string): Promise<{ parties: PartyEvent[] }> {
    if (hasClientSupabase && supabase) {
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .eq('host_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return { parties: (data || []) as PartyEvent[] };
    }
    return request<{ parties: PartyEvent[] }>(`/api/parties/mine?userId=${encodeURIComponent(userId)}`);
  },

  async createParty(payload: {
    host_id: string;
    state: IndianState;
    city: string;
    event_type: 'Home Party' | 'Public Place Chai / Food Meetup';
    title: string;
    description: string;
    event_date: string;
    event_time: string;
    entry_fee: number;
    host_upi_id: string;
    max_guests: number;
    secret_address: string;
    safety_pledge_accepted: boolean;
    terms_accepted: boolean;
  }): Promise<PartyEvent> {
    if (hasClientSupabase && supabase) {
      const { data: host } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', payload.host_id)
        .maybeSingle();
      if (!host) throw new Error('Host profile not found.');
      if (host.is_banned) throw new Error('Suspended users cannot host events.');

      const defaultImg =
        payload.event_type === 'Home Party'
          ? '/src/assets/images/event_home_dinner_1795024062719.jpg'
          : '/src/assets/images/event_chai_meetup_1795024062815.jpg';

      const { data: created, error } = await supabase
        .from('parties')
        .insert({
          ...payload,
          host_name: host.full_name,
          host_phone: host.phone,
          host_email: host.email,
          image_url: defaultImg,
          is_approved: false,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      await supabase.from('party_host_admin_chats').insert({
        party_id: created.id,
        sender_id: host.id,
        sender_role: 'host',
        sender_name: host.full_name,
        message: `Submitted "${payload.title}" in ${payload.city}, ${payload.state} for Admin safety verification.`,
      });
      return created as PartyEvent;
    }

    return request<PartyEvent>('/api/parties', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async joinParty(
    partyId: string,
    userId: string,
    utr_number?: string
  ): Promise<{ participant: PartyParticipant; secret_address?: string }> {
    if (hasClientSupabase && supabase) {
      const { data: user } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      const { data: party } = await supabase.from('parties').select('*').eq('id', partyId).maybeSingle();
      if (!user || !party) throw new Error('Event or user not found.');
      if (user.is_banned) throw new Error('Suspended account cannot join events.');

      const isFree = Number(party.entry_fee) === 0;
      if (!isFree && !/^\d{12}$/.test((utr_number || '').trim())) {
        throw new Error('Please enter a valid 12-digit numeric UTR reference.');
      }

      const { data: pt, error } = await supabase
        .from('party_participants')
        .upsert(
          {
            party_id: partyId,
            user_id: userId,
            user_name: user.full_name,
            user_email: user.email,
            user_phone: user.phone,
            payment_status: isFree ? 'approved' : 'pending',
            utr_number: isFree ? null : utr_number?.trim(),
          },
          { onConflict: 'party_id,user_id' }
        )
        .select()
        .single();
      if (error) throw new Error(error.message);
      return {
        participant: pt as PartyParticipant,
        secret_address: isFree ? (party.secret_address as string) : undefined,
      };
    }

    return request<{ participant: PartyParticipant; secret_address?: string }>(
      `/api/parties/${encodeURIComponent(partyId)}/join`,
      {
        method: 'POST',
        body: JSON.stringify({ userId, utr_number }),
      }
    );
  },

  async reportDispute(
    partyId: string,
    userId: string,
    note?: string
  ): Promise<{ participant: PartyParticipant }> {
    if (hasClientSupabase && supabase) {
      const { data, error } = await supabase
        .from('party_participants')
        .update({
          dispute_reported: true,
          dispute_note:
            note?.trim() || 'I Paid, But Not Entered in Party Chat — requesting manual UTR verification.',
        })
        .eq('party_id', partyId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { participant: data as PartyParticipant };
    }

    return request<{ participant: PartyParticipant }>(
      `/api/parties/${encodeURIComponent(partyId)}/dispute`,
      {
        method: 'POST',
        body: JSON.stringify({ userId, note }),
      }
    );
  },

  async getPartyParticipants(
    partyId: string,
    userId: string
  ): Promise<{ participants: PartyParticipant[] }> {
    if (hasClientSupabase && supabase) {
      const { data, error } = await supabase
        .from('party_participants')
        .select('*')
        .eq('party_id', partyId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return { participants: (data || []) as PartyParticipant[] };
    }
    return request<{ participants: PartyParticipant[] }>(
      `/api/parties/${encodeURIComponent(partyId)}/participants?userId=${encodeURIComponent(userId)}`
    );
  },

  async approveParticipantByHost(
    participantId: string,
    hostId: string,
    status: 'approved' | 'rejected'
  ): Promise<{ participant: PartyParticipant }> {
    if (hasClientSupabase && supabase) {
      const { data, error } = await supabase
        .from('party_participants')
        .update({ payment_status: status, dispute_reported: false })
        .eq('id', participantId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { participant: data as PartyParticipant };
    }
    return request<{ participant: PartyParticipant }>(
      `/api/participants/${encodeURIComponent(participantId)}/approve-by-host`,
      {
        method: 'POST',
        body: JSON.stringify({ hostId, status }),
      }
    );
  },

  async getPartyMessages(
    partyId: string,
    userId: string
  ): Promise<{ messages: PartyMessage[]; secret_address?: string }> {
    if (hasClientSupabase && supabase) {
      const { data: party } = await supabase.from('parties').select('*').eq('id', partyId).single();
      const { data: messages, error } = await supabase
        .from('party_messages')
        .select('*')
        .eq('party_id', partyId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return {
        messages: (messages || []) as PartyMessage[],
        secret_address: party?.secret_address as string | undefined,
      };
    }

    return request<{ messages: PartyMessage[]; secret_address?: string }>(
      `/api/parties/${encodeURIComponent(partyId)}/messages?userId=${encodeURIComponent(userId)}`
    );
  },

  async sendPartyMessage(partyId: string, userId: string, message: string): Promise<PartyMessage> {
    if (hasClientSupabase && supabase) {
      const { data: user } = await supabase
        .from('profiles')
        .select('full_name, is_banned')
        .eq('id', userId)
        .maybeSingle();
      const { data: party } = await supabase.from('parties').select('state').eq('id', partyId).maybeSingle();
      if (!user || !party) throw new Error('Event or user not found.');
      if (user.is_banned) throw new Error('Account suspended.');

      const { data, error } = await supabase
        .from('party_messages')
        .insert({
          state: party.state,
          party_id: partyId,
          user_id: userId,
          user_name: user.full_name,
          message: message.trim(),
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as PartyMessage;
    }

    return request<PartyMessage>(`/api/parties/${encodeURIComponent(partyId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ userId, message }),
    });
  },

  async getHostAdminChats(
    partyId: string,
    userId: string
  ): Promise<{ messages: HostAdminChatMessage[] }> {
    if (hasClientSupabase && supabase) {
      const { data, error } = await supabase
        .from('party_host_admin_chats')
        .select('*')
        .eq('party_id', partyId)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return { messages: (data || []) as HostAdminChatMessage[] };
    }
    return request<{ messages: HostAdminChatMessage[] }>(
      `/api/host-admin-chats/${encodeURIComponent(partyId)}?userId=${encodeURIComponent(userId)}`
    );
  },

  async sendHostAdminChat(
    partyId: string,
    userId: string,
    message: string
  ): Promise<HostAdminChatMessage> {
    if (hasClientSupabase && supabase) {
      const { data: user } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', userId)
        .maybeSingle();
      if (!user) throw new Error('User not found.');
      const { data, error } = await supabase
        .from('party_host_admin_chats')
        .insert({
          party_id: partyId,
          sender_id: userId,
          sender_role: user.role === 'admin' ? 'admin' : 'host',
          sender_name: user.full_name,
          message: message.trim(),
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as HostAdminChatMessage;
    }

    return request<HostAdminChatMessage>(`/api/host-admin-chats/${encodeURIComponent(partyId)}`, {
      method: 'POST',
      body: JSON.stringify({ userId, message }),
    });
  },

  async createSafetyReport(payload: {
    reporterId: string;
    reportedUserId: string;
    reportedUserName: string;
    state: IndianState;
    partyId: string | null;
    reason: string;
  }): Promise<SafetyReport> {
    if (hasClientSupabase && supabase) {
      const { data: reporter } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', payload.reporterId)
        .maybeSingle();
      const { data, error } = await supabase
        .from('user_reports')
        .insert({
          reporter_id: payload.reporterId,
          reporter_name: reporter?.full_name || 'Member',
          reported_user_id: payload.reportedUserId,
          reported_user_name: payload.reportedUserName,
          state: payload.state,
          party_id: payload.partyId,
          reason: payload.reason,
          status: 'open',
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as SafetyReport;
    }

    return request<SafetyReport>('/api/user-reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAdminOverview(adminId: string) {
    if (hasClientSupabase && supabase) {
      const [settingsRes, partiesRes, disputesRes, reportsRes, usersRes, passesRes] =
        await Promise.all([
          supabase.from('platform_settings').select('*').eq('id', 1).maybeSingle(),
          supabase.from('parties').select('*').order('created_at', { ascending: false }),
          supabase.from('party_participants').select('*').eq('dispute_reported', true),
          supabase.from('user_reports').select('*').order('created_at', { ascending: false }),
          supabase.from('profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('community_chat_passes').select('*'),
        ]);

      const allParties = (partiesRes.data || []) as PartyEvent[];
      const disputes = ((disputesRes.data || []) as PartyParticipant[]).map((pt) => {
        const party = allParties.find((e) => e.id === pt.party_id);
        return {
          ...pt,
          party_title: party?.title || 'Event',
          party_state: party?.state,
          entry_fee: party?.entry_fee,
        };
      });

      return {
        settings: (settingsRes.data || {
          id: 1,
          party_chat_fee: 199,
          updated_at: new Date().toISOString(),
        }) as PlatformSettings,
        parties: allParties,
        disputes,
        safetyReports: (reportsRes.data || []) as SafetyReport[],
        users: (usersRes.data || []) as UserProfile[],
        passes: (passesRes.data || []) as CommunityChatPass[],
      };
    }

    return request<{
      settings: PlatformSettings;
      parties: PartyEvent[];
      disputes: PartyParticipant[];
      safetyReports: SafetyReport[];
      users: UserProfile[];
      passes: CommunityChatPass[];
    }>(`/api/admin/overview?adminId=${encodeURIComponent(adminId)}`);
  },

  async updateAdminSettings(adminId: string, party_chat_fee: number): Promise<PlatformSettings> {
    if (hasClientSupabase && supabase) {
      const { data, error } = await supabase
        .from('platform_settings')
        .upsert({ id: 1, party_chat_fee, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as PlatformSettings;
    }

    return request<PlatformSettings>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ adminId, party_chat_fee }),
    });
  },

  async approvePartyAdmin(partyId: string, adminId: string): Promise<PartyEvent> {
    if (hasClientSupabase && supabase) {
      const { data, error } = await supabase
        .from('parties')
        .update({ is_approved: true })
        .eq('id', partyId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as PartyEvent;
    }

    return request<PartyEvent>(`/api/admin/parties/${encodeURIComponent(partyId)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ adminId }),
    });
  },

  async resolveParticipantAdmin(
    participantId: string,
    adminId: string,
    status: 'approved' | 'rejected'
  ): Promise<PartyParticipant> {
    if (hasClientSupabase && supabase) {
      const { data, error } = await supabase
        .from('party_participants')
        .update({ payment_status: status, dispute_reported: false })
        .eq('id', participantId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as PartyParticipant;
    }

    return request<PartyParticipant>(
      `/api/admin/participants/${encodeURIComponent(participantId)}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify({ adminId, status }),
      }
    );
  },

  async toggleUserBanAdmin(
    userId: string,
    adminId: string,
    is_banned: boolean
  ): Promise<UserProfile> {
    if (hasClientSupabase && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_banned })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as UserProfile;
    }

    return request<UserProfile>(`/api/admin/users/${encodeURIComponent(userId)}/ban`, {
      method: 'POST',
      body: JSON.stringify({ adminId, is_banned }),
    });
  },

  async resolveReportAdmin(reportId: string, adminId: string): Promise<SafetyReport> {
    if (hasClientSupabase && supabase) {
      const { data, error } = await supabase
        .from('user_reports')
        .update({ status: 'resolved' })
        .eq('id', reportId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as SafetyReport;
    }

    return request<SafetyReport>(`/api/admin/reports/${encodeURIComponent(reportId)}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ adminId }),
    });
  },
};

export function useRealtimeRoom(
  room: string | null,
  onEvent: (event: string, payload: unknown) => void
): void {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!room) return;

    if (hasClientSupabase && supabase) {
      const sb = supabase;
      const channel = sb
        .channel(`room:${room}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'party_messages' },
          (payload) => {
            onEventRef.current('message:created', payload.new);
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'party_host_admin_chats' },
          (payload) => {
            onEventRef.current('host_admin:message', payload.new);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'parties' },
          (payload) => {
            onEventRef.current('party:approved', payload.new);
          }
        )
        .subscribe();

      return () => {
        void sb.removeChannel(channel);
      };
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let closedByUser = false;

    const connect = () => {
      socket = new WebSocket(wsUrl);
      socket.onopen = () => {
        socket?.send(JSON.stringify({ type: 'subscribe', room }));
      };
      socket.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data as string) as {
            room: string;
            event: string;
            payload: unknown;
          };
          if (data.room === room) {
            onEventRef.current(data.event, data.payload);
          }
        } catch {
          // ignore
        }
      };
      socket.onclose = () => {
        if (!closedByUser) {
          reconnectTimer = window.setTimeout(connect, 2500);
        }
      };
    };

    connect();

    return () => {
      closedByUser = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'unsubscribe', room }));
      }
      socket?.close();
    };
  }, [room]);
}
