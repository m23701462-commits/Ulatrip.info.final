import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  IndianRupee,
  MessageSquare,
  Send,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { api, useRealtimeRoom } from '../lib/api';
import type {
  CommunityChatPass,
  HostAdminChatMessage,
  PartyEvent,
  PartyParticipant,
  PlatformSettings,
  SafetyReport,
  UserProfile,
} from '../types';

interface AdminDashboardProps {
  user: UserProfile | null;
  onRequireAdminAuth: () => void;
  onFeeUpdated: (newFee: number) => void;
}

type AdminTab = 'fees' | 'approvals' | 'disputes' | 'safety';

export function AdminDashboard({ user, onRequireAdminAuth, onFeeUpdated }: AdminDashboardProps) {
  const [tab, setTab] = useState<AdminTab>('approvals');
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [feeInput, setFeeInput] = useState('199');
  const [feeSavedMsg, setFeeSavedMsg] = useState('');
  const [parties, setParties] = useState<PartyEvent[]>([]);
  const [disputes, setDisputes] = useState<PartyParticipant[]>([]);
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [passes, setPasses] = useState<CommunityChatPass[]>([]);
  const [selectedParty, setSelectedParty] = useState<PartyEvent | null>(null);
  const [hostAdminChats, setHostAdminChats] = useState<HostAdminChatMessage[]>([]);
  const [chatReply, setChatReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = Boolean(user && user.role === 'admin');

  const loadOverview = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdminOverview(user.id);
      setSettings(data.settings);
      setFeeInput(String(data.settings.party_chat_fee));
      setParties(data.parties);
      setDisputes(data.disputes);
      setReports(data.safetyReports);
      setUsers(data.users);
      setPasses(data.passes);
      if (!selectedParty && data.parties.length > 0) {
        const pendingFirst = data.parties.find((p) => !p.is_approved) || data.parties[0];
        setSelectedParty(pendingFirst);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user, selectedParty]);

  useEffect(() => {
    if (isAdmin) {
      void loadOverview();
    }
  }, [isAdmin, loadOverview]);

  useEffect(() => {
    if (!isAdmin || !user || !selectedParty) return;
    void api
      .getHostAdminChats(selectedParty.id, user.id)
      .then((res) => setHostAdminChats(res.messages))
      .catch(() => setHostAdminChats([]));
  }, [isAdmin, user, selectedParty]);

  useRealtimeRoom(isAdmin ? 'admin:global' : null, () => {
    void loadOverview();
  });

  useRealtimeRoom(
    isAdmin && selectedParty ? `host_admin:${selectedParty.id}` : null,
    (event, payload) => {
      if (event === 'host_admin:message') {
        const msg = payload as HostAdminChatMessage;
        setHostAdminChats((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
    }
  );

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="mt-3 font-display text-2xl font-bold text-slate-900">
            Admin Console Access Required
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in with the Platform Admin profile (<span className="font-mono">mgsolition@gmail.com</span>) to configure state fees, approve host parties, resolve UTR disputes, and moderate safety reports.
          </p>
          <button
            type="button"
            onClick={onRequireAdminAuth}
            className="mt-5 cursor-pointer rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Sign In as Admin
          </button>
        </div>
      </main>
    );
  }

  const handleSaveFee = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFeeSavedMsg('');
    setError('');
    try {
      const updated = await api.updateAdminSettings(user.id, Number(feeInput));
      setSettings(updated);
      onFeeUpdated(updated.party_chat_fee);
      setFeeSavedMsg(`Updated party_chat_fee to ₹${updated.party_chat_fee}/month across the platform.`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleApproveParty = async (partyId: string) => {
    if (!user) return;
    try {
      const updated = await api.approvePartyAdmin(partyId, user.id);
      setParties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSelectedParty(updated);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSendAdminChat = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !selectedParty || !chatReply.trim()) return;
    try {
      const saved = await api.sendHostAdminChat(selectedParty.id, user.id, chatReply.trim());
      setHostAdminChats((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
      setChatReply('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleResolveDispute = async (participantId: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    try {
      await api.resolveParticipantAdmin(participantId, user.id, status);
      await loadOverview();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleToggleBan = async (targetUser: UserProfile) => {
    if (!user) return;
    try {
      const updated = await api.toggleUserBanAdmin(targetUser.id, user.id, !targetUser.is_banned);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    if (!user) return;
    try {
      const updated = await api.resolveReportAdmin(reportId, user.id);
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const pendingPartiesCount = parties.filter((p) => !p.is_approved).length;
  const openReportsCount = reports.filter((r) => r.status === 'open').length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-emerald-600">Platform Governance · /admin</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            UlaTrip Admin Operations Console
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 tabular-nums">
          <span>Active Passes: {passes.length}</span>
          <span aria-hidden="true">·</span>
          <span>Pending Parties: {pendingPartiesCount}</span>
          <span aria-hidden="true">·</span>
          <span>Open Disputes: {disputes.length}</span>
        </div>
      </div>

      {/* Admin Tab Switcher */}
      <div className="mt-6 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab('fees')}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            tab === 'fees' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
          <span>Fee Settings</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('approvals')}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            tab === 'approvals'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
          <span className="tabular-nums">
            Party Approvals &amp; Host Chats ({pendingPartiesCount})
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab('disputes')}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            tab === 'disputes'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <span className="tabular-nums">Party Entry Disputes ({disputes.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('safety')}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            tab === 'safety' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
          <span className="tabular-nums">Safety Reports &amp; User Management ({openReportsCount})</span>
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {loading && !settings ? (
        <p className="mt-6 text-sm text-slate-500">Loading admin overview...</p>
      ) : (
        <div className="mt-6">
          {/* 1. Fee Settings */}
          {tab === 'fees' && (
            <div className="max-w-lg rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
              <h2 className="font-display text-lg font-bold text-slate-900">
                State Community Pass Fee (`party_chat_fee`)
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Sets the 30-day Cashfree unlock fee per state across the landing page gate and state unlock screen.
              </p>

              <form onSubmit={handleSaveFee} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Monthly State Pass Fee (INR ₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    required
                    value={feeInput}
                    onChange={(e) => setFeeInput(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-base font-bold text-slate-900 focus:border-emerald-600 focus:outline-none tabular-nums"
                  />
                </div>
                {feeSavedMsg && (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
                    {feeSavedMsg}
                  </p>
                )}
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Save Fee Settings
                </button>
              </form>
            </div>
          )}

          {/* 2. Party Approvals & Host Private Chats */}
          {tab === 'approvals' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-3 lg:col-span-5">
                {parties.map((party) => (
                  <button
                    key={party.id}
                    type="button"
                    onClick={() => setSelectedParty(party)}
                    className={`w-full cursor-pointer rounded-xl border p-4 text-left transition-colors ${
                      selectedParty?.id === party.id
                        ? 'border-emerald-600 bg-emerald-50/40'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-600">
                        {party.state} · {party.city}
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          party.is_approved ? 'text-emerald-600' : 'text-amber-700'
                        }`}
                      >
                        {party.is_approved ? 'APPROVED' : 'PENDING'}
                      </span>
                    </div>
                    <h3 className="mt-1 font-display text-base font-bold text-slate-900">
                      {party.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600">
                      Host: {party.host_name} · {party.event_type}
                    </p>
                  </button>
                ))}
              </div>

              <div className="lg:col-span-7">
                {selectedParty ? (
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                    <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold text-emerald-600">
                          {selectedParty.event_type} · {selectedParty.city}, {selectedParty.state}
                        </p>
                        <h3 className="mt-1 font-display text-xl font-bold text-slate-900">
                          {selectedParty.title}
                        </h3>
                      </div>
                      {!selectedParty.is_approved ? (
                        <button
                          type="button"
                          onClick={() => void handleApproveParty(selectedParty.id)}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 whitespace-nowrap shrink-0"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Allow / Approve Party</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                          APPROVED &amp; LIVE
                        </span>
                      )}
                    </div>

                    {/* Creator Contact Details */}
                    <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-3">
                      <div>
                        <p className="text-slate-500">Creator Name</p>
                        <p className="mt-0.5 font-semibold text-slate-900">{selectedParty.host_name}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Phone</p>
                        <p className="mt-0.5 font-mono font-semibold text-slate-900">
                          {selectedParty.host_phone}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Email</p>
                        <p className="mt-0.5 font-mono font-semibold text-slate-900 break-all">
                          {selectedParty.host_email}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-600">
                      <strong className="text-slate-800">Secret Address:</strong> {selectedParty.secret_address}
                    </div>

                    {/* 1-on-1 Private Host <-> Admin Chat */}
                    <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
                      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                        <h4 className="font-display text-xs font-bold text-slate-800">
                          Private 1-on-1 Host &amp; Admin Verification Chat
                        </h4>
                      </div>
                      <div className="h-56 space-y-2.5 overflow-y-auto bg-white p-4">
                        {hostAdminChats.length === 0 ? (
                          <p className="text-xs text-slate-500">
                            No messages yet. Message the host to verify ID or venue safety.
                          </p>
                        ) : (
                          hostAdminChats.map((msg) => (
                            <div
                              key={msg.id}
                              className={`rounded-lg border px-3 py-2 text-xs ${
                                msg.sender_role === 'admin'
                                  ? 'border-emerald-200 bg-emerald-50 text-slate-900'
                                  : 'border-slate-200 bg-slate-50 text-slate-900'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                                <span>
                                  {msg.sender_name} ({msg.sender_role.toUpperCase()})
                                </span>
                                <span className="font-mono">
                                  {new Date(msg.created_at).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="mt-1 text-slate-800">{msg.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                      <form
                        onSubmit={handleSendAdminChat}
                        className="flex gap-2 border-t border-slate-200 bg-slate-50 p-3"
                      >
                        <input
                          type="text"
                          value={chatReply}
                          onChange={(e) => setChatReply(e.target.value)}
                          placeholder="Message host privately..."
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Send</span>
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Select a party to inspect.</p>
                )}
              </div>
            </div>
          )}

          {/* 3. Party Entry Disputes */}
          {tab === 'disputes' && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Party Entry Disputes ("I Paid, But Not Entered in Party Chat")
                </h2>
              </div>
              {disputes.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No active party entry disputes. All UTR verifications are clear.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Member</th>
                        <th className="px-4 py-3 font-semibold">Event &amp; State</th>
                        <th className="px-4 py-3 font-semibold">12-Digit UTR</th>
                        <th className="px-4 py-3 font-semibold">Note</th>
                        <th className="px-4 py-3 text-right font-semibold">Resolution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {disputes.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{d.user_name}</p>
                            <p className="font-mono text-[11px] text-slate-500">
                              {d.user_phone} · {d.user_email}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{d.party_title}</p>
                            <p className="text-slate-500">
                              {d.party_state} · ₹{d.entry_fee}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 tabular-nums">
                            {d.utr_number || '—'}
                          </td>
                          <td className="max-w-xs px-4 py-3 text-slate-600">{d.dispute_note}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex gap-2">
                              <button
                                type="button"
                                onClick={() => void handleResolveDispute(d.id, 'approved')}
                                className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 whitespace-nowrap"
                              >
                                Approve &amp; Enter Chat
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleResolveDispute(d.id, 'rejected')}
                                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 4. Safety Reports & User Ban */}
          {tab === 'safety' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden lg:col-span-7">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="font-display text-lg font-bold text-slate-900">Safety Reports</h2>
                </div>
                {reports.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500">No safety reports logged.</p>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {reports.map((rep) => {
                      const reportedMember = users.find((u) => u.id === rep.reported_user_id);
                      return (
                        <div key={rep.id} className="p-4 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900">
                              Reported: {rep.reported_user_name} ({rep.state})
                            </span>
                            <span
                              className={`font-mono font-bold ${
                                rep.status === 'open' ? 'text-red-600' : 'text-emerald-600'
                              }`}
                            >
                              {rep.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="mt-1 text-slate-700">{rep.reason}</p>
                          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                            <span>By {rep.reporter_name}</span>
                            <div className="flex items-center gap-2">
                              {reportedMember && reportedMember.role !== 'admin' && (
                                <button
                                  type="button"
                                  onClick={() => void handleToggleBan(reportedMember)}
                                  className={`cursor-pointer rounded px-2.5 py-1 font-semibold ${
                                    reportedMember.is_banned
                                      ? 'border border-slate-300 bg-white text-slate-700'
                                      : 'bg-red-600 text-white hover:bg-red-700'
                                  }`}
                                >
                                  {reportedMember.is_banned ? 'Unban User' : 'Ban User'}
                                </button>
                              )}
                              {rep.status === 'open' && (
                                <button
                                  type="button"
                                  onClick={() => void handleResolveReport(rep.id)}
                                  className="cursor-pointer rounded bg-slate-900 px-2.5 py-1 font-semibold text-white"
                                >
                                  Mark Resolved
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden lg:col-span-5">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    Member Directory &amp; Ban Controls
                  </h2>
                </div>
                <div className="divide-y divide-slate-200">
                  {users.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-3 p-4 text-xs">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {member.full_name}{' '}
                          {member.role === 'admin' && (
                            <span className="font-mono text-emerald-600">(ADMIN)</span>
                          )}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500">{member.email}</p>
                      </div>
                      {member.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => void handleToggleBan(member)}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                            member.is_banned
                              ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          <Ban className="h-3.5 w-3.5" />
                          <span>{member.is_banned ? 'Unban User' : 'Ban User'}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
