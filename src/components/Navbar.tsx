import { Compass, ShieldCheck } from 'lucide-react';
import type { UserProfile } from '../types';

export type AppRoute = '/' | '/hub' | '/admin' | '/terms' | '/privacy' | '/refund';

interface NavbarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute, hubTab?: 'chat' | 'join' | 'create') => void;
  user: UserProfile | null;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onLogout: () => void;
}

export function Navbar({
  currentRoute,
  onNavigate,
  user,
  onOpenAuth,
  onLogout,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <Compass className="h-4 w-4" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-slate-900">
            UlaTrip
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:text-emerald-700 ${
              currentRoute === '/' ? 'text-emerald-700 underline underline-offset-8 decoration-2' : ''
            }`}
          >
            Community
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/hub', 'chat')}
            className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:text-emerald-700 ${
              currentRoute === '/hub' ? 'text-emerald-700 underline underline-offset-8 decoration-2' : ''
            }`}
          >
            State Hub
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/hub', 'create')}
            className="cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:text-emerald-700"
          >
            Host Party
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/terms')}
            className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:text-emerald-700 ${
              currentRoute === '/terms' ? 'text-emerald-700 underline underline-offset-8 decoration-2' : ''
            }`}
          >
            Safety &amp; Terms
          </button>
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          {user && user.role === 'admin' && (
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                currentRoute === '/admin'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-emerald-600 hover:text-emerald-700'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Admin Panel</span>
            </button>
          )}

          {user ? (
            <button
              type="button"
              onClick={onLogout}
              title={`Signed in as ${user.full_name} (${user.email})`}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-xs transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              {user.full_name.split(' ')[0]} · Sign Out
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700 whitespace-nowrap shrink-0"
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
