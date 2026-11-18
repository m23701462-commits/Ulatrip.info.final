-- UlaTrip Community & Party Hub (ulatrip.info)
-- Supabase PostgreSQL Schema & Row-Level Security Migration

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Platform Settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  party_chat_fee INTEGER NOT NULL DEFAULT 199,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.platform_settings (id, party_chat_fee)
VALUES (1, 199)
ON CONFLICT (id) DO NOTHING;

-- 2. Member Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'member', 'admin')),
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Per-State Community Chat Passes (30-Day Cashfree Auto-Unlock)
CREATE TABLE IF NOT EXISTS public.community_chat_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unlocked_state TEXT NOT NULL CHECK (unlocked_state IN (
    'Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Delhi'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'expired')),
  order_id TEXT NOT NULL,
  payment_id TEXT,
  amount_paid INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, unlocked_state)
);

-- 4. Parties & Meetups
CREATE TABLE IF NOT EXISTS public.parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  host_name TEXT NOT NULL,
  host_phone TEXT NOT NULL,
  host_email TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN (
    'Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Delhi'
  )),
  city TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('Home Party', 'Public Place Chai / Food Meetup')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TEXT NOT NULL,
  entry_fee INTEGER NOT NULL DEFAULT 0,
  host_upi_id TEXT DEFAULT '',
  max_guests INTEGER NOT NULL DEFAULT 15,
  secret_address TEXT NOT NULL,
  image_url TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  safety_pledge_accepted BOOLEAN NOT NULL DEFAULT TRUE,
  terms_accepted BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Party Participants & Entry Disputes
CREATE TABLE IF NOT EXISTS public.party_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'rejected')),
  utr_number TEXT,
  dispute_reported BOOLEAN NOT NULL DEFAULT FALSE,
  dispute_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (party_id, user_id)
);

-- 6. State Group Chat & Party Private Chat Messages
-- party_id IS NULL => State-level Group Chat
-- party_id IS NOT NULL => Event-specific Private Chat
CREATE TABLE IF NOT EXISTS public.party_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL,
  party_id UUID REFERENCES public.parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Private 1-on-1 Host <-> Admin Approval Chats
CREATE TABLE IF NOT EXISTS public.party_host_admin_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('host', 'admin')),
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. User Reports
CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reporter_name TEXT NOT NULL,
  reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_name TEXT NOT NULL,
  state TEXT NOT NULL,
  party_id UUID REFERENCES public.parties(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Realtime on chat & pass tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.party_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.party_host_admin_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_chat_passes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.parties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_reports;
