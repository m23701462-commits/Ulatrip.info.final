import { useEffect, useState, type FormEvent } from 'react';
import { Lock, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import type { CommunityChatPass, UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'login' | 'signup';
  onClose: () => void;
  onAuthenticated: (user: UserProfile, passes: CommunityChatPass[]) => void;
}

async function ensureSupabaseProfile(authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}, overrides?: { full_name?: string; phone?: string }): Promise<{
  user: UserProfile;
  passes: CommunityChatPass[];
}> {
  if (!supabase) {
    throw new Error('Supabase Authentication is not configured.');
  }

  const userEmail = (authUser.email || '').trim().toLowerCase();
  const metaName = (authUser.user_metadata?.full_name as string | undefined) || '';
  const metaPhone = (authUser.user_metadata?.phone as string | undefined) || '';
  const resolvedName =
    overrides?.full_name?.trim() || metaName.trim() || (userEmail ? userEmail.split('@')[0] : 'Traveler');
  const resolvedPhone = overrides?.phone?.trim() || metaPhone.trim() || '';

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (existingProfile) {
    const { data: passes } = await supabase
      .from('community_chat_passes')
      .select('*')
      .eq('user_id', existingProfile.id);
    return {
      user: existingProfile as UserProfile,
      passes: (passes || []) as CommunityChatPass[],
    };
  }

  const newRow = {
    id: authUser.id,
    email: userEmail,
    full_name: resolvedName,
    phone: resolvedPhone,
    role: userEmail === 'mgsolition@gmail.com' ? ('admin' as const) : ('user' as const),
    is_banned: false,
  };

  const { data: insertedProfile, error: insertError } = await supabase
    .from('profiles')
    .insert(newRow)
    .select()
    .maybeSingle();

  if (!insertError && insertedProfile) {
    const { data: passes } = await supabase
      .from('community_chat_passes')
      .select('*')
      .eq('user_id', insertedProfile.id);
    return {
      user: insertedProfile as UserProfile,
      passes: (passes || []) as CommunityChatPass[],
    };
  }

  return api.loadProfileAndPasses(authUser.id, {
    email: userEmail,
    full_name: resolvedName,
    phone: resolvedPhone,
  });
}

export function AuthModal({
  isOpen,
  initialTab = 'login',
  onClose,
  onAuthenticated,
}: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup'>(initialTab);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setError('');
      setNotice('');
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!supabase) {
      setError(
        'Supabase Authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.'
      );
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }
      if (!data.user) {
        throw new Error('Authentication failed. Please check your email and password.');
      }

      const { user, passes } = await ensureSupabaseProfile(data.user);
      onAuthenticated(user, passes);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!supabase) {
      setError(
        'Supabase Authentication is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.'
      );
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim();
      const cleanPhone = phone.trim();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
          },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }
      if (!data.user) {
        throw new Error('Account creation failed. Please try again.');
      }

      if (!data.session) {
        // Attempt profile row creation if RLS allows anon/authenticated insert, otherwise login auto-creates it
        await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            full_name: cleanName || normalizedEmail.split('@')[0],
            email: normalizedEmail,
            phone: cleanPhone,
            role: normalizedEmail === 'mgsolition@gmail.com' ? 'admin' : 'user',
            is_banned: false,
          })
          .select()
          .maybeSingle();

        setNotice(
          'Account created! Please check your email inbox to confirm your address, then log in.'
        );
        setTab('login');
        return;
      }

      const { user, passes } = await ensureSupabaseProfile(data.user, {
        full_name: cleanName,
        phone: cleanPhone,
      });
      onAuthenticated(user, passes);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              {tab === 'login' ? 'Log In to UlaTrip' : 'Create UlaTrip Account'}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Secured by Supabase Authentication · Verified Member Access
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="cursor-pointer rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Two Clean Tabs: Log In | Create Account */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError('');
              setNotice('');
            }}
            className={`cursor-pointer rounded-lg py-2 text-xs font-semibold transition-colors ${
              tab === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setError('');
              setNotice('');
            }}
            className={`cursor-pointer rounded-lg py-2 text-xs font-semibold transition-colors ${
              tab === 'signup'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-900">
            {notice}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              <Lock className="h-4 w-4" />
              <span>{loading ? 'Logging in...' : 'Log In'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateAccount} className="mt-5 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Priya Venkatesh"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Mobile Number (WhatsApp / UPI)
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98400 12345"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
