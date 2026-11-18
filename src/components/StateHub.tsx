import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Flag,
  Lock,
  MapPin,
  MessageSquare,
  PlusCircle,
  Send,
  ShieldCheck,
  Unlock,
  Users,
} from 'lucide-react';
import { api, useRealtimeRoom } from '../lib/api';
import {
  INDIAN_STATES,
  type CashfreeOrderSession,
  type CommunityChatPass,
  type EventType,
  type HostAdminChatMessage,
  type IndianState,
  type PartyEvent,
  type PartyMessage,
  type PartyParticipant,
  type UserProfile,
} from '../types';

interface StateHubProps {
  user: UserProfile | null;
  passes: CommunityChatPass[];
  partyChatFee: number;
  selectedState: IndianState;
  activeTab: 'chat' | 'join' | 'create';
  onSelectState: (state: IndianState) => void;
  onChangeTab: (tab: 'chat' | 'join' | 'create') => void;
  onRequireAuth: () => void;
  onStartCashfree: (session: CashfreeOrderSession) => void;
}

function formatExpiryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StateHub({
  user,
  passes,
  partyChatFee,
  selectedState,
  activeTab,
  onSelectState,
  onChangeTab,
  onRequireAuth,
  onStartCashfree,
}: StateHubProps) {
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [gateError, setGateError] = useState('');

  // State Group Chat
  const [stateMessages, setStateMessages] = useState<PartyMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [reportingMsg, setReportingMsg] = useState<PartyMessage | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportNotice, setReportNotice] = useState('');

  // Parties Grid & Selected Party Drawer
  const [parties, setParties] = useState<PartyEvent[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [eventFilter, setEventFilter] = useState<'All' | EventType>('All');
  const [selectedParty, setSelectedParty] = useState<PartyEvent | null>(null);
  const [partyMessages, setPartyMessages] = useState<PartyMessage[]>([]);
  const [partySecretAddress, setPartySecretAddress] = useState<string | undefined>(undefined);
  const [partyChatInput, setPartyChatInput] = useState('');
  const [utrInput, setUtrInput] = useState('');
  const [partyActionMsg, setPartyActionMsg] = useState('');
  const [partyActionErr, setPartyActionErr] = useState('');
  const [hostParticipants, setHostParticipants] = useState<PartyParticipant[]>([]);

  // Create Party & Host-Admin Private Chat
  const [eventType, setEventType] = useState<EventType>('Public Place Chai / Food Meetup');
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [eventDate, setEventDate] = useState('2026-11-30');
  const [eventTime, setEventTime] = useState('06:00 PM');
  const [entryFee, setEntryFee] = useState('0');
  const [hostUpiId, setHostUpiId] = useState('');
  const [maxGuests, setMaxGuests] = useState('15');
  const [secretAddress, setSecretAddress] = useState('');
  const [description, setDescription] = useState('');
  const [safetyPledge, setSafetyPledge] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [createStatus, setCreateStatus] = useState('');
  const [createError, setCreateError] = useState('');

  const [mySubmittedParties, setMySubmittedParties] = useState<PartyEvent[]>([]);
  const [activeHostAdminParty, setActiveHostAdminParty] = useState<PartyEvent | null>(null);
  const [hostAdminMessages, setHostAdminMessages] = useState<HostAdminChatMessage[]>([]);
  const [hostAdminInput, setHostAdminInput] = useState('');

  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const activePassMap = useMemo(() => {
    const map = new Map<IndianState, CommunityChatPass>();
    for (const p of passes) {
      if (p.status === 'approved' && new Date(p.expires_at).getTime() > nowTs) {
        map.set(p.unlocked_state, p);
      }
    }
    return map;
  }, [passes, nowTs]);

  const currentPass = activePassMap.get(selectedState) || null;
  const isUnlocked = Boolean(user && !user.is_banned && currentPass);

  const loadStateData = useCallback(async () => {
    if (!user || !isUnlocked) return;
    setChatLoading(true);
    setPartiesLoading(true);
    setChatError('');
    try {
      const [chatRes, partiesRes] = await Promise.all([
        api.getStateChat(selectedState, user.id),
        api.getParties(selectedState, user.id),
      ]);
      setStateMessages(chatRes.messages);
      setParties(partiesRes.parties);
    } catch (err) {
      setChatError((err as Error).message);
    } finally {
      setChatLoading(false);
      setPartiesLoading(false);
    }
  }, [user, isUnlocked, selectedState]);

  const loadMyParties = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getMySubmittedParties(user.id);
      setMySubmittedParties(res.parties);
      if (res.parties.length > 0 && !activeHostAdminParty) {
        setActiveHostAdminParty(res.parties[0]);
      }
    } catch {
      // ignore
    }
  }, [user, activeHostAdminParty]);

  useEffect(() => {
    setSelectedParty(null);
    setPartyActionMsg('');
    setPartyActionErr('');
    if (isUnlocked) {
      void loadStateData();
    } else {
      setStateMessages([]);
      setParties([]);
    }
  }, [selectedState, isUnlocked, loadStateData]);

  useEffect(() => {
    if (user) {
      void loadMyParties();
    }
  }, [user, loadMyParties]);

  // Real-time WebSocket subscription for State Room
  useRealtimeRoom(isUnlocked ? `state:${selectedState}` : null, (event, payload) => {
    if (event === 'message:created') {
      const msg = payload as PartyMessage;
      setStateMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    } else if (event === 'party:approved') {
      void loadStateData();
    }
  });

  // Real-time WebSocket subscription for Selected Party Chat
  useRealtimeRoom(selectedParty ? `party:${selectedParty.id}` : null, (event, payload) => {
    if (event === 'message:created') {
      const msg = payload as PartyMessage;
      setPartyMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    } else if (event === 'participant:updated' && selectedParty) {
      void openPartyDetails(selectedParty);
    }
  });

  // Real-time WebSocket subscription for Host-Admin 1-on-1 Chat
  useRealtimeRoom(
    activeHostAdminParty ? `host_admin:${activeHostAdminParty.id}` : null,
    (event, payload) => {
      if (event === 'host_admin:message') {
        const msg = payload as HostAdminChatMessage;
        setHostAdminMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      } else if (event === 'party:approved') {
        void loadMyParties();
        void loadStateData();
      }
    }
  );

  useEffect(() => {
    if (!user || !activeHostAdminParty) return;
    void api
      .getHostAdminChats(activeHostAdminParty.id, user.id)
      .then((res) => setHostAdminMessages(res.messages))
      .catch(() => setHostAdminMessages([]));
  }, [user, activeHostAdminParty]);

  const handlePayCashfree = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    setGateError('');
    setCreatingOrder(true);
    try {
      const session = await api.createCashfreeOrder({
        userId: user.id,
        state: selectedState,
        amount: partyChatFee,
        userName: user.full_name,
        userEmail: user.email,
        userPhone: user.phone,
      });
      onStartCashfree({
        ...session,
        amount: session.amount || partyChatFee,
        state: session.state || selectedState,
      });
    } catch (err) {
      setGateError((err as Error).message);
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleSendStateMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !chatInput.trim()) return;
    setChatError('');
    try {
      const saved = await api.sendStateChat(selectedState, user.id, chatInput.trim());
      setStateMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
      setChatInput('');
    } catch (err) {
      setChatError((err as Error).message);
    }
  };

  const handleSubmitReport = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !reportingMsg || !reportReason.trim()) return;
    try {
      await api.createSafetyReport({
        reporterId: user.id,
        reportedUserId: reportingMsg.user_id,
        reportedUserName: reportingMsg.user_name,
        state: selectedState,
        partyId: reportingMsg.party_id,
        reason: reportReason.trim(),
      });
      setReportNotice(`Safety report submitted against ${reportingMsg.user_name} for Admin review.`);
      setReportingMsg(null);
      setReportReason('');
    } catch (err) {
      setChatError((err as Error).message);
    }
  };

  const openPartyDetails = async (party: PartyEvent) => {
    setSelectedParty(party);
    setPartyActionMsg('');
    setPartyActionErr('');
    setPartyMessages([]);
    setPartySecretAddress(party.secret_address);
    setHostParticipants([]);

    if (!user) return;
    const isApprovedAccess =
      party.host_id === user.id ||
      user.role === 'admin' ||
      party.my_participation?.payment_status === 'approved';

    if (isApprovedAccess) {
      try {
        const res = await api.getPartyMessages(party.id, user.id);
        setPartyMessages(res.messages);
        if (res.secret_address) setPartySecretAddress(res.secret_address);
      } catch {
        // locked
      }
    }

    if (party.host_id === user.id || user.role === 'admin') {
      try {
        const ptRes = await api.getPartyParticipants(party.id, user.id);
        setHostParticipants(ptRes.participants);
      } catch {
        // ignore
      }
    }
  };

  const handleJoinParty = async (party: PartyEvent) => {
    if (!user) {
      onRequireAuth();
      return;
    }
    setPartyActionErr('');
    setPartyActionMsg('');
    try {
      const res = await api.joinParty(
        party.id,
        user.id,
        party.entry_fee > 0 ? utrInput.trim() : undefined
      );
      if (res.participant.payment_status === 'approved') {
        setPartyActionMsg('You are in! Party private chat and exact address are now unlocked.');
        if (res.secret_address) setPartySecretAddress(res.secret_address);
        const msgRes = await api.getPartyMessages(party.id, user.id);
        setPartyMessages(msgRes.messages);
      } else {
        setPartyActionMsg(
          `UTR ${res.participant.utr_number} submitted. Once the Host confirms your UPI payment, party chat and address unlock automatically.`
        );
      }
      setUtrInput('');
      await loadStateData();
      setSelectedParty((prev) =>
        prev
          ? {
              ...prev,
              secret_address: res.secret_address || prev.secret_address,
              my_participation: res.participant,
            }
          : null
      );
    } catch (err) {
      setPartyActionErr((err as Error).message);
    }
  };

  const handleRaiseDispute = async (party: PartyEvent) => {
    if (!user) return;
    setPartyActionErr('');
    setPartyActionMsg('');
    try {
      const res = await api.reportDispute(party.id, user.id);
      setPartyActionMsg(
        'Dispute alert sent to Admin ("I Paid, But Not Entered in Party Chat"). Admin will verify your UTR in /admin.'
      );
      setSelectedParty((prev) => (prev ? { ...prev, my_participation: res.participant } : null));
      await loadStateData();
    } catch (err) {
      setPartyActionErr((err as Error).message);
    }
  };

  const handleHostApproveParticipant = async (
    participantId: string,
    status: 'approved' | 'rejected'
  ) => {
    if (!user || !selectedParty) return;
    try {
      await api.approveParticipantByHost(participantId, user.id, status);
      const ptRes = await api.getPartyParticipants(selectedParty.id, user.id);
      setHostParticipants(ptRes.participants);
      await loadStateData();
    } catch (err) {
      setPartyActionErr((err as Error).message);
    }
  };

  const handleSendPartyMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !selectedParty || !partyChatInput.trim()) return;
    try {
      const saved = await api.sendPartyMessage(selectedParty.id, user.id, partyChatInput.trim());
      setPartyMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
      setPartyChatInput('');
    } catch (err) {
      setPartyActionErr((err as Error).message);
    }
  };

  const handleCreateParty = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    setCreateError('');
    setCreateStatus('');
    try {
      const created = await api.createParty({
        host_id: user.id,
        state: selectedState,
        city,
        event_type: eventType,
        title,
        description,
        event_date: eventDate,
        event_time: eventTime,
        entry_fee: Number(entryFee || 0),
        host_upi_id: hostUpiId,
        max_guests: Number(maxGuests || 15),
        secret_address: secretAddress,
        safety_pledge_accepted: safetyPledge,
        terms_accepted: termsAccepted,
      });
      setCreateStatus(
        'Party submitted! Status is Pending Admin Approval. Use the private 1-on-1 Host–Admin chat below to verify venue safety.'
      );
      setTitle('');
      setCity('');
      setSecretAddress('');
      setDescription('');
      setSafetyPledge(false);
      setTermsAccepted(false);
      const mine = await api.getMySubmittedParties(user.id);
      setMySubmittedParties(mine.parties);
      setActiveHostAdminParty(created);
    } catch (err) {
      setCreateError((err as Error).message);
    }
  };

  const handleSendHostAdminChat = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !activeHostAdminParty || !hostAdminInput.trim()) return;
    try {
      const saved = await api.sendHostAdminChat(
        activeHostAdminParty.id,
        user.id,
        hostAdminInput.trim()
      );
      setHostAdminMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
      setHostAdminInput('');
    } catch (err) {
      setCreateError((err as Error).message);
    }
  };

  const filteredParties = useMemo(() => {
    if (eventFilter === 'All') return parties;
    return parties.filter((p) => p.event_type === eventFilter);
  }, [parties, eventFilter]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Select Your State Bar */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Select Your State
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Each state community is strictly isolated. Unlock any state for 30 days via Cashfree.
            </p>
          </div>
          {user && currentPass && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-900 tabular-nums">
              ⏳ Active Pass · Expires on {formatExpiryDate(currentPass.expires_at)}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {INDIAN_STATES.map((stateName) => {
            const statePass = activePassMap.get(stateName);
            const stateUnlocked = Boolean(user && !user.is_banned && statePass);
            const isSelected = selectedState === stateName;

            return (
              <button
                key={stateName}
                type="button"
                onClick={() => onSelectState(stateName)}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 bg-white text-slate-800 hover:border-emerald-600 hover:bg-slate-50'
                }`}
              >
                {stateUnlocked ? (
                  <Unlock className={`h-3.5 w-3.5 ${isSelected ? 'text-emerald-100' : 'text-emerald-600'}`} />
                ) : (
                  <Lock className={`h-3.5 w-3.5 ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`} />
                )}
                <span>{stateName}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Authentication, Banned Guard, or Locked State Cashfree Gate */}
      {!user ? (
        <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
          <Lock className="mx-auto h-8 w-8 text-emerald-600" />
          <h2 className="mt-3 font-display text-xl font-bold text-slate-900">
            Sign in to access {selectedState} Community &amp; Parties
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            UlaTrip verifies member email and phone numbers before granting state pass purchase or event entry.
          </p>
          <button
            type="button"
            onClick={onRequireAuth}
            className="mt-5 cursor-pointer rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Sign In / Create Member Profile
          </button>
        </section>
      ) : user.is_banned ? (
        <section className="mt-6 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-600" />
          <h2 className="mt-3 font-display text-xl font-bold text-red-900">
            Account Suspended
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-red-800">
            Your UlaTrip community access has been suspended for violating our safety policies. Contact mgsolition@gmail.com for review.
          </p>
        </section>
      ) : !isUnlocked ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold text-slate-900">
            🔒 Locked: {selectedState} Community &amp; Party Hub
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600 tabular-nums">
            Pay ₹{partyChatFee}/month to unlock {selectedState} Live Group Chat, Home Parties &amp; Chai Meetups for 30 Days.
          </p>

          {gateError && (
            <p className="mx-auto mt-4 max-w-md rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {gateError}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={creatingOrder}
              onClick={handlePayCashfree}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 tabular-nums"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>
                {creatingOrder
                  ? 'Creating Cashfree Order...'
                  : `Pay ₹${partyChatFee} & Unlock Now (Cashfree)`}
              </span>
            </button>
          </div>
        </section>
      ) : (
        /* Unlocked State Hub: 3 Tabs */
        <section className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => onChangeTab('chat')}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'chat'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <span>State Group Chat</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeTab('join')}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'join'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="h-4 w-4 text-emerald-600" />
                <span>Join a Party / Meetup</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeTab('create')}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'create'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PlusCircle className="h-4 w-4 text-emerald-600" />
                <span>Create a Party / Meetup</span>
              </button>
            </div>

            <div className="text-xs font-medium text-slate-600 tabular-nums">
              {selectedState} Hub · {parties.length} Approved Events
            </div>
          </div>

          {/* TAB 1: State Group Chat */}
          {activeTab === 'chat' && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    {selectedState} Travelers Live Group Chat
                  </h2>
                  <p className="text-xs text-slate-500">
                    Strictly isolated to members unlocked for {selectedState} · Safe &amp; Alcohol-Free
                  </p>
                </div>
                {currentPass && (
                  <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                    ⏳ Active Pass · Expires on {formatExpiryDate(currentPass.expires_at)}
                  </span>
                )}
              </div>

              {reportNotice && (
                <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-2.5 text-xs font-medium text-emerald-900">
                  {reportNotice}
                </div>
              )}

              <div className="h-96 space-y-3 overflow-y-auto bg-slate-50 p-5">
                {chatLoading ? (
                  <p className="text-sm text-slate-500">Loading {selectedState} chat room...</p>
                ) : stateMessages.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      No messages in {selectedState} yet. Start the conversation!
                    </p>
                  </div>
                ) : (
                  stateMessages.map((msg) => {
                    const isMine = msg.user_id === user.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-lg rounded-xl border px-4 py-2.5 ${
                            isMine
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-200 bg-white text-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 text-[11px]">
                            <span className={`font-semibold ${isMine ? 'text-emerald-100' : 'text-slate-700'}`}>
                              {msg.user_name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`font-mono tabular-nums ${isMine ? 'text-emerald-200' : 'text-slate-400'}`}>
                                {formatTime(msg.created_at)}
                              </span>
                              {!isMine && (
                                <button
                                  type="button"
                                  onClick={() => setReportingMsg(msg)}
                                  className="inline-flex cursor-pointer items-center gap-1 font-medium text-slate-500 hover:text-red-600"
                                >
                                  <Flag className="h-3 w-3" />
                                  <span>Report User</span>
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="mt-1 text-sm leading-relaxed">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {reportingMsg && (
                <form
                  onSubmit={handleSubmitReport}
                  className="border-t border-amber-200 bg-amber-50 p-4"
                >
                  <p className="text-xs font-semibold text-amber-900">
                    Report message from {reportingMsg.user_name} to Safety Admins
                  </p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      required
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      placeholder="Describe alcohol promotion, harassment, or unsafe content..."
                      className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="cursor-pointer rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        Submit Report
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportingMsg(null)}
                        className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {chatError && (
                <p className="border-t border-red-200 bg-red-50 px-5 py-2 text-xs font-medium text-red-700">
                  {chatError}
                </p>
              )}

              <form onSubmit={handleSendStateMessage} className="flex gap-2 border-t border-slate-200 p-4">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Message ${selectedState} travelers...`}
                  className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 whitespace-nowrap shrink-0"
                >
                  <Send className="h-4 w-4" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: Join a Party / Meetup */}
          {activeTab === 'join' && (
            <div className="mt-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                  {(['All', 'Home Party', 'Public Place Chai / Food Meetup'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setEventFilter(f)}
                      className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        eventFilter === f
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {partiesLoading ? (
                <p className="text-sm text-slate-500">Loading verified events in {selectedState}...</p>
              ) : filteredParties.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center">
                  <p className="text-sm font-semibold text-slate-800">
                    No approved events match this filter in {selectedState} yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => onChangeTab('create')}
                    className="mt-3 cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Host the First Meetup in {selectedState}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredParties.map((party) => {
                    const isJoined = party.my_participation?.payment_status === 'approved';
                    const isPending = party.my_participation?.payment_status === 'pending';
                    return (
                      <article
                        key={party.id}
                        className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                      >
                        <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                          <img
                            src={party.image_url}
                            alt={party.title}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <span className="text-emerald-600">{party.event_type}</span>
                            <span aria-hidden="true">·</span>
                            <span>{party.city}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono font-semibold text-slate-900 tabular-nums">
                              {party.entry_fee === 0 ? 'FREE' : `₹${party.entry_fee}`}
                            </span>
                          </div>

                          <h3 className="mt-2 font-display text-lg font-bold text-slate-900">
                            {party.title}
                          </h3>
                          <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">
                            {party.description}
                          </p>

                          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 tabular-nums">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {party.event_date}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {party.event_time}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {party.participant_count || 0}/{party.max_guests} guests
                            </span>
                          </div>

                          <div className="mt-5 pt-3 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => void openPartyDetails(party)}
                              className="w-full cursor-pointer rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                            >
                              {isJoined
                                ? 'Open Party Chat & Address'
                                : isPending
                                ? 'UTR Pending · Check Entry Status'
                                : party.entry_fee === 0
                                ? 'View & Join Free Meetup'
                                : `View & Pay ₹${party.entry_fee} Entry`}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Selected Party Detail, Payment Verification & Private Party Chat */}
              {selectedParty && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                  <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold text-emerald-600">
                        {selectedParty.event_type} · {selectedParty.city}, {selectedParty.state}
                      </p>
                      <h3 className="mt-1 font-display text-2xl font-bold text-slate-900">
                        {selectedParty.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">{selectedParty.description}</p>
                      <p className="mt-2 text-xs text-slate-500 tabular-nums">
                        Hosted by <strong className="text-slate-800">{selectedParty.host_name}</strong> · {selectedParty.event_date} at {selectedParty.event_time} · Entry:{' '}
                        <strong className="font-mono text-slate-900">
                          {selectedParty.entry_fee === 0 ? 'Free' : `₹${selectedParty.entry_fee}`}
                        </strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedParty(null)}
                      className="cursor-pointer self-start rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Close Event View
                    </button>
                  </div>

                  {partyActionMsg && (
                    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900">
                      {partyActionMsg}
                    </div>
                  )}
                  {partyActionErr && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
                      {partyActionErr}
                    </div>
                  )}

                  {(() => {
                    const hasAccess =
                      selectedParty.host_id === user.id ||
                      user.role === 'admin' ||
                      selectedParty.my_participation?.payment_status === 'approved';
                    const isPendingUtr = selectedParty.my_participation?.payment_status === 'pending';

                    if (hasAccess) {
                      return (
                        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
                          <div className="space-y-4 lg:col-span-5">
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
                              <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                                <MapPin className="h-4 w-4" />
                                <span>Secret Venue Address Unlocked</span>
                              </p>
                              <p className="mt-2 text-sm font-medium text-slate-900">
                                {partySecretAddress || selectedParty.secret_address}
                              </p>
                              <p className="mt-2 text-xs text-slate-600">
                                Host Contact: {selectedParty.host_phone}
                              </p>
                            </div>

                            {(selectedParty.host_id === user.id || user.role === 'admin') && (
                              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <h4 className="font-display text-sm font-bold text-slate-900">
                                  Host Guest List &amp; UTR Approvals
                                </h4>
                                {hostParticipants.length === 0 ? (
                                  <p className="mt-2 text-xs text-slate-500">No RSVPs yet.</p>
                                ) : (
                                  <div className="mt-3 space-y-2">
                                    {hostParticipants.map((pt) => (
                                      <div
                                        key={pt.id}
                                        className="rounded-lg border border-slate-200 bg-white p-3 text-xs"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-semibold text-slate-900">{pt.user_name}</span>
                                          <span className="font-mono text-[11px] font-semibold text-slate-600">
                                            {pt.payment_status.toUpperCase()}
                                          </span>
                                        </div>
                                        {pt.utr_number && (
                                          <p className="mt-1 font-mono text-[11px] text-slate-600">
                                            UTR: {pt.utr_number}
                                          </p>
                                        )}
                                        {pt.payment_status !== 'approved' && (
                                          <div className="mt-2 flex gap-2">
                                            <button
                                              type="button"
                                              onClick={() => void handleHostApproveParticipant(pt.id, 'approved')}
                                              className="cursor-pointer rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                                            >
                                              Approve Entry
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => void handleHostApproveParticipant(pt.id, 'rejected')}
                                              className="cursor-pointer rounded border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                                            >
                                              Reject
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-7">
                            <div className="border-b border-slate-200 px-4 py-3">
                              <h4 className="font-display text-sm font-bold text-slate-900">
                                Private Party Chat
                              </h4>
                            </div>
                            <div className="h-64 space-y-2.5 overflow-y-auto bg-slate-50 p-4">
                              {partyMessages.length === 0 ? (
                                <p className="text-xs text-slate-500">
                                  No party messages yet. Say hello to fellow guests!
                                </p>
                              ) : (
                                partyMessages.map((pm) => (
                                  <div
                                    key={pm.id}
                                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2"
                                  >
                                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                                      <span className="font-semibold text-slate-800">{pm.user_name}</span>
                                      <span className="font-mono">{formatTime(pm.created_at)}</span>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-800">{pm.message}</p>
                                  </div>
                                ))
                              )}
                            </div>
                            <form
                              onSubmit={handleSendPartyMessage}
                              className="flex gap-2 border-t border-slate-200 p-3"
                            >
                              <input
                                type="text"
                                value={partyChatInput}
                                onChange={(e) => setPartyChatInput(e.target.value)}
                                placeholder="Coordinate arrival or ask the host..."
                                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                              />
                              <button
                                type="submit"
                                className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                Send
                              </button>
                            </form>
                          </div>
                        </div>
                      );
                    }

                    // Locked Event View (Free Join OR Paid Direct Host UPI + UTR + Dispute)
                    return (
                      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="space-y-4 lg:col-span-6">
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                              <Lock className="h-4 w-4 text-slate-500" />
                              <span>Secret Venue Address Hidden</span>
                            </p>
                            <p className="mt-1.5 text-xs text-slate-600">
                              Exact house/venue address in {selectedParty.city} unlocks immediately after your entry is approved.
                            </p>
                          </div>

                          {selectedParty.entry_fee === 0 ? (
                            <button
                              type="button"
                              onClick={() => void handleJoinParty(selectedParty)}
                              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Join Free Meetup</span>
                            </button>
                          ) : (
                            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
                              <div>
                                <p className="text-xs font-semibold text-slate-500">
                                  Step 1 · Pay Host Directly via UPI
                                </p>
                                <div className="mt-1.5 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                                  <div>
                                    <p className="text-[11px] text-slate-500">Host UPI ID</p>
                                    <p className="font-mono text-sm font-bold text-slate-900">
                                      {selectedParty.host_upi_id}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[11px] text-slate-500">Entry Fee</p>
                                    <p className="font-mono text-base font-bold text-emerald-600 tabular-nums">
                                      ₹{selectedParty.entry_fee}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-700">
                                  Step 2 · Enter 12-Digit UPI UTR Reference
                                </label>
                                <div className="mt-1.5 flex gap-2">
                                  <input
                                    type="text"
                                    maxLength={12}
                                    value={utrInput}
                                    onChange={(e) => setUtrInput(e.target.value.replace(/\D/g, ''))}
                                    placeholder="e.g. 632189440127"
                                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void handleJoinParty(selectedParty)}
                                    className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 whitespace-nowrap shrink-0"
                                  >
                                    Submit UTR
                                  </button>
                                </div>
                              </div>

                              {isPendingUtr && (
                                <div className="border-t border-slate-200 pt-3">
                                  <p className="text-xs text-slate-600">
                                    Submitted UTR:{' '}
                                    <span className="font-mono font-semibold text-slate-900">
                                      {selectedParty.my_participation?.utr_number}
                                    </span>{' '}
                                    · Status: Pending Host Approval
                                  </p>
                                  <button
                                    type="button"
                                    disabled={selectedParty.my_participation?.dispute_reported}
                                    onClick={() => void handleRaiseDispute(selectedParty)}
                                    className="mt-2.5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                                  >
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>
                                      {selectedParty.my_participation?.dispute_reported
                                        ? 'Dispute Alert Sent to Admin'
                                        : 'I Paid, But Not Entered in Party Chat'}
                                    </span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Blurred Party Chat Preview */}
                        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm p-4 lg:col-span-6">
                          <div className="blur-md select-none pointer-events-none space-y-3">
                            <p className="text-xs font-bold text-slate-900">Private Party Chat</p>
                            <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-700">
                              Host: Excited to welcome everyone! Gate code is 4412, ring bell 3B.
                            </div>
                            <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-700">
                              Guest: Bringing homemade Mysore Pak for the group! See you at 7 PM.
                            </div>
                          </div>
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/75 p-4 text-center">
                            <Lock className="h-5 w-5 text-slate-700" />
                            <p className="mt-2 text-xs font-semibold text-slate-900">
                              Party Chat Locked Until Entry Approval
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Create a Party / Meetup + Private Host-Admin Chat */}
          {activeTab === 'create' && (
            <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
              <form
                onSubmit={handleCreateParty}
                className="space-y-4 rounded-2xl border border-slate-200 bg-white shadow-sm p-6 lg:col-span-7"
              >
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    Host a Party or Meetup in {selectedState}
                  </h2>
                  <p className="mt-1 text-xs text-slate-600">
                    All submitted events undergo Admin safety review via private 1-on-1 Host–Admin chat before appearing publicly.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Event Format</label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as EventType)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                    >
                      <option value="Public Place Chai / Food Meetup">
                        Public Place Chai / Food Meetup
                      </option>
                      <option value="Home Party">Home Party</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">City</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Chennai, Kochi, Bengaluru"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Event Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Besant Nagar Evening Filter Coffee & Board Games"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Date</label>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Time</label>
                    <input
                      type="text"
                      required
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      placeholder="06:00 PM"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Max Guests</label>
                    <input
                      type="number"
                      min={2}
                      max={60}
                      required
                      value={maxGuests}
                      onChange={(e) => setMaxGuests(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Entry Fee (₹0 for Free Meetup)
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={entryFee}
                      onChange={(e) => setEntryFee(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Host UPI ID {Number(entryFee) > 0 ? '(Required)' : '(Optional if ₹0)'}
                    </label>
                    <input
                      type="text"
                      required={Number(entryFee) > 0}
                      value={hostUpiId}
                      onChange={(e) => setHostUpiId(e.target.value)}
                      placeholder="yourname@okicici"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Secret Address (Hidden until guest entry is approved)
                  </label>
                  <input
                    type="text"
                    required
                    value={secretAddress}
                    onChange={(e) => setSecretAddress(e.target.value)}
                    placeholder="Exact flat/cafe street address & landmark"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Description</label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Share food/chai details, cultural activity, and house rules..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>

                <div className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <label className="flex cursor-pointer items-start gap-2.5 text-xs text-slate-800">
                    <input
                      type="checkbox"
                      checked={safetyPledge}
                      onChange={(e) => setSafetyPledge(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-600"
                    />
                    <span className="font-medium">
                      Strictly No Alcohol, No Sexual Content, Safe Meetup Only
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2.5 text-xs text-slate-800">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-600"
                    />
                    <span className="font-medium">
                      I agree to the 3rd-Party Platform Terms (IT Act Section 79 Intermediary Disclaimer)
                    </span>
                  </label>
                </div>

                {createError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    {createError}
                  </p>
                )}
                {createStatus && (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
                    {createStatus}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full cursor-pointer rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Submit Party for Admin Approval
                </button>
              </form>

              {/* Host Submitted Parties & Private 1-on-1 Host <-> Admin Chat */}
              <div className="space-y-4 lg:col-span-5">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Your Submitted Parties &amp; Admin Verification Chat
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Private 1-on-1 chat between you and Platform Admin until your event is approved.
                  </p>

                  {mySubmittedParties.length === 0 ? (
                    <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                      Submit an event on the left to start your private verification chat with Admin.
                    </p>
                  ) : (
                    <>
                      <div className="mt-3 space-y-2">
                        {mySubmittedParties.map((mp) => (
                          <button
                            key={mp.id}
                            type="button"
                            onClick={() => setActiveHostAdminParty(mp)}
                            className={`w-full cursor-pointer rounded-lg border p-3 text-left transition-colors ${
                              activeHostAdminParty?.id === mp.id
                                ? 'border-emerald-600 bg-emerald-50/50'
                                : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-semibold text-slate-900">{mp.title}</span>
                              <span
                                className={`font-mono text-[11px] font-semibold ${
                                  mp.is_approved ? 'text-emerald-600' : 'text-amber-700'
                                }`}
                              >
                                {mp.is_approved ? 'APPROVED' : 'PENDING'}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {mp.city}, {mp.state} · {mp.event_date}
                            </p>
                          </button>
                        ))}
                      </div>

                      {activeHostAdminParty && (
                        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                          <div className="border-b border-slate-200 bg-slate-50 px-3.5 py-2.5">
                            <p className="text-xs font-bold text-slate-800">
                              1-on-1 Chat with Admin · {activeHostAdminParty.title}
                            </p>
                          </div>
                          <div className="h-56 space-y-2 overflow-y-auto bg-white p-3.5">
                            {hostAdminMessages.map((hm) => (
                              <div
                                key={hm.id}
                                className={`rounded-lg border px-3 py-2 text-xs ${
                                  hm.sender_role === 'admin'
                                    ? 'border-emerald-200 bg-emerald-50 text-slate-900'
                                    : 'border-slate-200 bg-slate-50 text-slate-900'
                                }`}
                              >
                                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                                  <span>
                                    {hm.sender_name} ({hm.sender_role.toUpperCase()})
                                  </span>
                                  <span className="font-mono">{formatTime(hm.created_at)}</span>
                                </div>
                                <p className="mt-1 text-xs text-slate-800">{hm.message}</p>
                              </div>
                            ))}
                          </div>
                          <form
                            onSubmit={handleSendHostAdminChat}
                            className="flex gap-2 border-t border-slate-200 bg-slate-50 p-2.5"
                          >
                            <input
                              type="text"
                              value={hostAdminInput}
                              onChange={(e) => setHostAdminInput(e.target.value)}
                              placeholder="Reply to Admin..."
                              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-emerald-600 focus:outline-none"
                            />
                            <button
                              type="submit"
                              className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              Send
                            </button>
                          </form>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
