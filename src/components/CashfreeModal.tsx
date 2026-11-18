import { useState } from 'react';
import { load } from '@cashfreepayments/cashfree-js';
import { CheckCircle2, CreditCard, Lock, ShieldCheck, Smartphone, X } from 'lucide-react';
import { api } from '../lib/api';
import type { CashfreeOrderSession, CommunityChatPass, IndianState, UserProfile } from '../types';

interface CashfreeModalProps {
  session: CashfreeOrderSession | null;
  user: UserProfile | null;
  onClose: () => void;
  onSuccess: (pass: CommunityChatPass) => void;
}

export function CashfreeModal({ session, user, onClose, onSuccess }: CashfreeModalProps) {
  const [method, setMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState('traveler@okicici');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!session || !user) return null;

  const getCashfreeSdkMode = (): 'production' | 'sandbox' => {
    const envFlag = (import.meta.env.VITE_CASHFREE_ENV || '').toUpperCase();
    if (envFlag === 'SANDBOX') return 'sandbox';
    return 'production';
  };

  const handleLaunchRealSdk = async () => {
    setProcessing(true);
    setError('');
    try {
      const cashfree = await load({
        mode: getCashfreeSdkMode(),
      });
      const result = await cashfree.checkout({
        paymentSessionId: session.payment_session_id,
        redirectTarget: '_modal',
      });
      if (result.error) {
        throw new Error(result.error.message || 'Cashfree checkout cancelled.');
      }
      const verified = await api.verifyCashfreePayment(
        session.order_id,
        user.id,
        session.state,
        session.amount
      );
      onSuccess(verified.pass);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteSandboxPayment = async () => {
    setProcessing(true);
    setError('');
    try {
      const verified = await api.verifyCashfreePayment(
        session.order_id,
        user.id,
        session.state as IndianState,
        session.amount
      );
      onSuccess(verified.pass);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-5 py-4 text-white">
          <div>
            <p className="text-xs font-medium text-emerald-300">Cashfree Payments · Secured Checkout</p>
            <h3 className="font-display text-lg font-bold">
              {session.state} 30-Day State Pass
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Cashfree checkout"
            className="cursor-pointer rounded-xl p-1 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-xs text-slate-500">Order Reference</p>
              <p className="font-mono text-xs font-medium text-slate-800">{session.order_id}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Payable Total</p>
              <p className="font-mono text-lg font-bold text-emerald-700 tabular-nums">
                ₹{session.amount}
              </p>
            </div>
          </div>

          {session.mode !== 'cashfree_sandbox_preview' ? (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-slate-600">
                Click below to open the Cashfree Payment Gateway modal. Your 30-day{' '}
                <strong className="text-slate-900">{session.state}</strong> pass unlocks automatically upon completion.
              </p>
              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}
              <button
                type="button"
                disabled={processing}
                onClick={handleLaunchRealSdk}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                <Lock className="h-4 w-4" />
                <span>
                  {processing ? 'Verifying with Cashfree...' : `Pay ₹${session.amount} via Cashfree SDK`}
                </span>
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setMethod('upi')}
                  className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                    method === 'upi' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>UPI</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                    method === 'card' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('netbanking')}
                  className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                    method === 'netbanking'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>NetBanking</span>
                </button>
              </div>

              {method === 'upi' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    UPI ID (GPay / PhonePe / Paytm)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              )}

              {method === 'card' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  Cashfree Test Card · <span className="font-mono font-semibold text-slate-900">4111 •••• •••• 1111</span>
                </div>
              )}

              {method === 'netbanking' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  Instant NetBanking · HDFC / ICICI / SBI
                </div>
              )}

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}

              <button
                type="button"
                disabled={processing}
                onClick={handleCompleteSandboxPayment}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {processing
                    ? 'Verifying & Unlocking State Hub...'
                    : `Complete Cashfree Payment · ₹${session.amount}`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
