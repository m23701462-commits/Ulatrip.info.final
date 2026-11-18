import { useCallback, useEffect, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { CashfreeModal } from './components/CashfreeModal';
import { Footer } from './components/Footer';
import { LandingPage } from './components/LandingPage';
import { LegalPages } from './components/LegalPages';
import { Navbar, type AppRoute } from './components/Navbar';
import { StateHub } from './components/StateHub';
import { AdminDashboard } from './components/AdminDashboard';
import { api } from './lib/api';
import { supabase } from './lib/supabase';
import type {
  CashfreeOrderSession,
  CommunityChatPass,
  IndianState,
  UserProfile,
} from './types';

function parseRoute(pathname: string): AppRoute {
  if (pathname === '/admin') return '/admin';
  if (pathname === '/hub') return '/hub';
  if (pathname === '/terms') return '/terms';
  if (pathname === '/privacy') return '/privacy';
  if (pathname === '/refund') return '/refund';
  return '/';
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.pathname));
  const [hubTab, setHubTab] = useState<'chat' | 'join' | 'create'>('chat');
  const [selectedState, setSelectedState] = useState<IndianState>('Tamil Nadu');
  const [partyChatFee, setPartyChatFee] = useState<number>(199);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [passes, setPasses] = useState<CommunityChatPass[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const [cashfreeSession, setCashfreeSession] = useState<CashfreeOrderSession | null>(null);

  const navigate = useCallback((nextRoute: AppRoute, nextHubTab?: 'chat' | 'join' | 'create') => {
    setRoute(nextRoute);
    if (nextHubTab) setHubTab(nextHubTab);
    if (window.location.pathname !== nextRoute) {
      window.history.pushState({}, '', nextRoute);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseRoute(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Load dynamic platform settings (party_chat_fee) and restore real Supabase Auth session
  useEffect(() => {
    void api
      .getSettings()
      .then((s) => setPartyChatFee(s.party_chat_fee))
      .catch(() => setPartyChatFee(199));

    if (!supabase) return;

    const syncSessionUser = async (authUser: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    } | null) => {
      if (!authUser) {
        setUser(null);
        setPasses([]);
        return;
      }
      try {
        const res = await api.loadProfileAndPasses(authUser.id, {
          email: authUser.email || '',
          full_name: (authUser.user_metadata?.full_name as string | undefined) || 'Traveler',
          phone: (authUser.user_metadata?.phone as string | undefined) || '',
        });
        setUser(res.user);
        setPasses(res.passes);
      } catch {
        setUser(null);
        setPasses([]);
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      void syncSessionUser(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncSessionUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Handle Cashfree return_url verification when redirected back with ?order_id=...&state=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    const returnedState = params.get('state') as IndianState | null;
    if (orderId && returnedState && user) {
      void api
        .verifyCashfreePayment(orderId, user.id, returnedState, partyChatFee)
        .then((res) => {
          setPasses((prev) => {
            const others = prev.filter((p) => p.unlocked_state !== res.pass.unlocked_state);
            return [...others, res.pass];
          });
          setSelectedState(returnedState);
          navigate('/hub', 'chat');
          window.history.replaceState({}, '', '/hub');
        })
        .catch(() => {
          // ignore
        });
    }
  }, [user, partyChatFee, navigate]);

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthModalTab(mode);
    setAuthModalOpen(true);
  };

  const handleAuthenticated = (loggedUser: UserProfile, userPasses: CommunityChatPass[]) => {
    setUser(loggedUser);
    setPasses(userPasses);
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setPasses([]);
    if (route === '/admin') {
      navigate('/');
    }
  };

  const handleOpenPartyGate = (preferredState?: IndianState) => {
    if (preferredState) setSelectedState(preferredState);
    navigate('/hub', 'chat');
    if (!user) {
      openAuth('login');
    }
  };

  const handleHostParty = () => {
    navigate('/hub', 'create');
    if (!user) {
      openAuth('login');
    }
  };

  const handleCashfreeSuccess = (unlockedPass: CommunityChatPass) => {
    setPasses((prev) => {
      const others = prev.filter((p) => p.unlocked_state !== unlockedPass.unlocked_state);
      return [...others, unlockedPass];
    });
    setCashfreeSession(null);
    setSelectedState(unlockedPass.unlocked_state);
    navigate('/hub', 'chat');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-slate-900">
      <Navbar
        currentRoute={route}
        onNavigate={navigate}
        user={user}
        onOpenAuth={openAuth}
        onLogout={() => void handleLogout()}
      />

      <div className="flex-1">
        {route === '/' && (
          <LandingPage
            partyChatFee={partyChatFee}
            onOpenPartyGate={handleOpenPartyGate}
            onHostParty={handleHostParty}
          />
        )}

        {route === '/hub' && (
          <StateHub
            user={user}
            passes={passes}
            partyChatFee={partyChatFee}
            selectedState={selectedState}
            activeTab={hubTab}
            onSelectState={setSelectedState}
            onChangeTab={setHubTab}
            onRequireAuth={() => openAuth('login')}
            onStartCashfree={(session) => setCashfreeSession(session)}
          />
        )}

        {route === '/admin' && (
          <AdminDashboard
            user={user}
            onRequireAdminAuth={() => openAuth('login')}
            onFeeUpdated={(fee) => setPartyChatFee(fee)}
          />
        )}

        {(route === '/terms' || route === '/privacy' || route === '/refund') && (
          <LegalPages
            page={route}
            onBack={() => navigate('/')}
            onNavigate={(r) => navigate(r)}
          />
        )}
      </div>

      <Footer onNavigate={(r) => navigate(r)} />

      <AuthModal
        isOpen={authModalOpen}
        initialTab={authModalTab}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
      />

      <CashfreeModal
        session={cashfreeSession}
        user={user}
        onClose={() => setCashfreeSession(null)}
        onSuccess={handleCashfreeSuccess}
      />
    </div>
  );
}
