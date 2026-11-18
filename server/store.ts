import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  CommunityChatPass,
  HostAdminChatMessage,
  IndianState,
  PartyEvent,
  PartyMessage,
  PartyParticipant,
  PlatformSettings,
  SafetyReport,
  UserProfile,
} from '../src/types.ts';

interface DatabaseState {
  platform_settings: PlatformSettings;
  profiles: UserProfile[];
  community_chat_passes: CommunityChatPass[];
  parties: PartyEvent[];
  party_participants: PartyParticipant[];
  party_messages: PartyMessage[];
  party_host_admin_chats: HostAdminChatMessage[];
  user_reports: SafetyReport[];
  pending_orders: Record<
    string,
    {
      order_id: string;
      user_id: string;
      state: IndianState;
      amount: number;
      status: 'ACTIVE' | 'PAID';
      created_at: string;
    }
  >;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'ulatrip_store.json');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseServiceKey &&
    !supabaseUrl.includes('MY_SUPABASE') &&
    supabaseUrl.startsWith('http')
);

export const supabaseAdmin: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

function futureDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function pastHours(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

function createInitialSeed(): DatabaseState {
  return {
    platform_settings: {
      id: 1,
      party_chat_fee: 199,
      updated_at: new Date().toISOString(),
    },
    profiles: [
      {
        id: 'user-admin-01',
        full_name: 'Maxwell Blackey',
        email: 'maxwellblackey@gmail.com',
        phone: '+91 98400 11223',
        role: 'admin',
        is_banned: false,
        created_at: pastHours(240),
      },
      {
        id: 'user-traveler-01',
        full_name: 'Ananya Krishnan',
        email: 'ananya.k@ulatrip.info',
        phone: '+91 98412 34567',
        role: 'member',
        is_banned: false,
        created_at: pastHours(180),
      },
      {
        id: 'user-host-01',
        full_name: 'Karthik Subramanian',
        email: 'karthik.host@ulatrip.info',
        phone: '+91 98845 67890',
        role: 'member',
        is_banned: false,
        created_at: pastHours(160),
      },
      {
        id: 'user-host-02',
        full_name: 'Meera Nair',
        email: 'meera.kochi@ulatrip.info',
        phone: '+91 94471 22334',
        role: 'member',
        is_banned: false,
        created_at: pastHours(150),
      },
      {
        id: 'user-traveler-02',
        full_name: 'Rohan Deshmukh',
        email: 'rohan.pune@ulatrip.info',
        phone: '+91 97650 88991',
        role: 'member',
        is_banned: false,
        created_at: pastHours(120),
      },
    ],
    community_chat_passes: [
      {
        id: 'pass-seed-karthik-tn',
        user_id: 'user-host-01',
        unlocked_state: 'Tamil Nadu',
        status: 'approved',
        order_id: 'CF_SEED_TN_001',
        payment_id: 'PAY_SEED_TN_001',
        amount_paid: 199,
        expires_at: futureDays(26),
        created_at: pastHours(96),
        updated_at: pastHours(96),
      },
      {
        id: 'pass-seed-meera-kl',
        user_id: 'user-host-02',
        unlocked_state: 'Kerala',
        status: 'approved',
        order_id: 'CF_SEED_KL_001',
        payment_id: 'PAY_SEED_KL_001',
        amount_paid: 199,
        expires_at: futureDays(22),
        created_at: pastHours(120),
        updated_at: pastHours(120),
      },
    ],
    parties: [
      {
        id: 'party-tn-chai-01',
        host_id: 'user-host-01',
        host_name: 'Karthik Subramanian',
        host_phone: '+91 98845 67890',
        host_email: 'karthik.host@ulatrip.info',
        state: 'Tamil Nadu',
        city: 'Chennai',
        event_type: 'Public Place Chai / Food Meetup',
        title: 'Mylapore Heritage Courtyard Filter Coffee & Walk',
        description:
          'Morning filter coffee meetup near Kapaleeshwarar Tank followed by a relaxed photo walk and breakfast tiffin. Strictly alcohol-free, solo travelers and locals welcome.',
        event_date: '2026-11-22',
        event_time: '07:30 AM',
        entry_fee: 0,
        host_upi_id: '',
        max_guests: 18,
        secret_address: 'Bharathi Courtyard Cafe, 14 North Mada Street, Mylapore, Chennai 600004',
        image_url: '/src/assets/images/event_chai_meetup_1795024062815.jpg',
        is_approved: true,
        safety_pledge_accepted: true,
        terms_accepted: true,
        created_at: pastHours(72),
      },
      {
        id: 'party-tn-home-02',
        host_id: 'user-host-01',
        host_name: 'Karthik Subramanian',
        host_phone: '+91 98845 67890',
        host_email: 'karthik.host@ulatrip.info',
        state: 'Tamil Nadu',
        city: 'Chennai',
        event_type: 'Home Party',
        title: 'Acoustic Carnatic-Indie Terrace Dinner (Alcohol-Free)',
        description:
          'Intimate vegetarian home-cooked Chettinad dinner on an airy Adyar terrace with acoustic guitar, travel stories, and board games. Strictly zero alcohol or smoking.',
        event_date: '2026-11-24',
        event_time: '07:00 PM',
        entry_fee: 350,
        host_upi_id: 'karthik.ulatrip@okaxis',
        max_guests: 12,
        secret_address: 'Flat 3B, Palm Grove Apartments, 2nd Main Road, Gandhi Nagar, Adyar, Chennai',
        image_url: '/src/assets/images/event_home_dinner_1795024062719.jpg',
        is_approved: true,
        safety_pledge_accepted: true,
        terms_accepted: true,
        created_at: pastHours(60),
      },
      {
        id: 'party-kl-walk-01',
        host_id: 'user-host-02',
        host_name: 'Meera Nair',
        host_phone: '+91 94471 22334',
        host_email: 'meera.kochi@ulatrip.info',
        state: 'Kerala',
        city: 'Kochi',
        event_type: 'Public Place Chai / Food Meetup',
        title: 'Fort Kochi Sunset Promenade & Sulaimani Chai',
        description:
          'Golden hour meetup starting near Chinese Fishing Nets, continuing to a heritage tea room for spiced Sulaimani chai and banana fritters.',
        event_date: '2026-11-23',
        event_time: '05:00 PM',
        entry_fee: 0,
        host_upi_id: '',
        max_guests: 20,
        secret_address: 'Kashi Art Cafe Courtyard Gate, Burger Street, Fort Kochi, Kerala 682001',
        image_url: '/src/assets/images/event_coastal_travel_1795024063244.jpg',
        is_approved: true,
        safety_pledge_accepted: true,
        terms_accepted: true,
        created_at: pastHours(50),
      },
      {
        id: 'party-ka-chai-01',
        host_id: 'user-host-01',
        host_name: 'Karthik Subramanian',
        host_phone: '+91 98845 67890',
        host_email: 'karthik.host@ulatrip.info',
        state: 'Karnataka',
        city: 'Bengaluru',
        event_type: 'Public Place Chai / Food Meetup',
        title: 'Indiranagar Bookshop & Irani Chai Hangout',
        description:
          'Weekend community hangout for remote workers and travelers passing through Bengaluru. Swap trail tips over bun maska and masala chai.',
        event_date: '2026-11-25',
        event_time: '04:30 PM',
        entry_fee: 0,
        host_upi_id: '',
        max_guests: 16,
        secret_address: 'Champaca Bookstore Veranda, 12th Main Road, Indiranagar, Bengaluru 560038',
        image_url: '/src/assets/images/event_chai_meetup_1795024062815.jpg',
        is_approved: true,
        safety_pledge_accepted: true,
        terms_accepted: true,
        created_at: pastHours(42),
      },
      {
        id: 'party-ap-chai-01',
        host_id: 'user-host-01',
        host_name: 'Karthik Subramanian',
        host_phone: '+91 98845 67890',
        host_email: 'karthik.host@ulatrip.info',
        state: 'Andhra Pradesh',
        city: 'Visakhapatnam',
        event_type: 'Public Place Chai / Food Meetup',
        title: 'RK Beach Sunrise Coffee & Araku Valley Meetup',
        description:
          'Early morning meetup along Beach Road featuring local Araku coffee tasting and group planning for weekend Araku Valley trips.',
        event_date: '2026-11-27',
        event_time: '06:45 AM',
        entry_fee: 0,
        host_upi_id: '',
        max_guests: 15,
        secret_address: 'Kalabharathi Cafe Deck, Beach Road, Pandurangapuram, Visakhapatnam',
        image_url: '/src/assets/images/event_coastal_travel_1795024063244.jpg',
        is_approved: true,
        safety_pledge_accepted: true,
        terms_accepted: true,
        created_at: pastHours(38),
      },
      {
        id: 'party-ts-home-01',
        host_id: 'user-traveler-02',
        host_name: 'Rohan Deshmukh',
        host_phone: '+91 97650 88991',
        host_email: 'rohan.pune@ulatrip.info',
        state: 'Telangana',
        city: 'Hyderabad',
        event_type: 'Home Party',
        title: 'Jubilee Hills Cultural Storytelling & Biryani Supper',
        description:
          'Family-friendly cultural dinner evening with Hyderabadi veg/paneer dum biryani, Irani chai, and solo travel photography sharing.',
        event_date: '2026-11-28',
        event_time: '07:30 PM',
        entry_fee: 299,
        host_upi_id: 'rohan.hyd@okicici',
        max_guests: 10,
        secret_address: 'House 82, Road No. 14, Jubilee Hills, Hyderabad 500033',
        image_url: '/src/assets/images/event_home_dinner_1795024062719.jpg',
        is_approved: true,
        safety_pledge_accepted: true,
        terms_accepted: true,
        created_at: pastHours(30),
      },
      {
        id: 'party-mh-chai-01',
        host_id: 'user-traveler-02',
        host_name: 'Rohan Deshmukh',
        host_phone: '+91 97650 88991',
        host_email: 'rohan.pune@ulatrip.info',
        state: 'Maharashtra',
        city: 'Pune',
        event_type: 'Public Place Chai / Food Meetup',
        title: 'Koregaon Park Garden Chai & Sahyadri Trekkers Circle',
        description:
          'Meet verified trekkers and travelers in Pune for masala chai, poha, and safe weekend fort-trek coordination.',
        event_date: '2026-11-26',
        event_time: '08:30 AM',
        entry_fee: 0,
        host_upi_id: '',
        max_guests: 22,
        secret_address: 'Vohuman Veranda Courtyard, Lane 6, Koregaon Park, Pune 411001',
        image_url: '/src/assets/images/event_chai_meetup_1795024062815.jpg',
        is_approved: true,
        safety_pledge_accepted: true,
        terms_accepted: true,
        created_at: pastHours(24),
      },
      {
        id: 'party-dl-home-01',
        host_id: 'user-traveler-02',
        host_name: 'Rohan Deshmukh',
        host_phone: '+91 97650 88991',
        host_email: 'rohan.pune@ulatrip.info',
        state: 'Delhi',
        city: 'New Delhi',
        event_type: 'Public Place Chai / Food Meetup',
        title: 'Lodhi Garden Morning Walk & Old Delhi Food Trail',
        description:
          'Guided community walk through Lodhi Garden tombs followed by a group metro ride to Chandni Chowk for vegetarian parathas and jalebi.',
        event_date: '2026-11-29',
        event_time: '07:00 AM',
        entry_fee: 150,
        host_upi_id: 'rohan.delhi@ybl',
        max_guests: 16,
        secret_address: 'Lodhi Garden Gate 1 (Amrita Shergill Marg Entrance), New Delhi 110003',
        image_url: '/src/assets/images/event_chai_meetup_1795024062815.jpg',
        is_approved: true,
        safety_pledge_accepted: true,
        terms_accepted: true,
        created_at: pastHours(18),
      },
      {
        id: 'party-tn-pending-03',
        host_id: 'user-host-01',
        host_name: 'Karthik Subramanian',
        host_phone: '+91 98845 67890',
        host_email: 'karthik.host@ulatrip.info',
        state: 'Tamil Nadu',
        city: 'Madurai',
        event_type: 'Home Party',
        title: 'Madurai Heritage Courtyard Jigarthanda & Folk Music',
        description:
          'Safe cultural evening in a restored Chettinad courtyard house in Madurai with traditional parai/folk storytelling and homemade snacks.',
        event_date: '2026-12-03',
        event_time: '06:30 PM',
        entry_fee: 250,
        host_upi_id: 'karthik.ulatrip@okaxis',
        max_guests: 14,
        secret_address: '28 West Chitrai Street Courtyard, Madurai 625001',
        image_url: '/src/assets/images/event_home_dinner_1795024062719.jpg',
        is_approved: false,
        safety_pledge_accepted: true,
        terms_accepted: true,
        created_at: pastHours(5),
      },
    ],
    party_participants: [
      {
        id: 'part-seed-01',
        party_id: 'party-tn-home-02',
        user_id: 'user-traveler-02',
        user_name: 'Rohan Deshmukh',
        user_email: 'rohan.pune@ulatrip.info',
        user_phone: '+91 97650 88991',
        payment_status: 'pending',
        utr_number: '632189440127',
        dispute_reported: true,
        dispute_note: 'Paid ₹350 via GPay 2 hours ago, awaiting host verification to enter party chat.',
        created_at: pastHours(2),
      },
    ],
    party_messages: [
      {
        id: 'msg-tn-01',
        state: 'Tamil Nadu',
        party_id: null,
        user_id: 'user-host-01',
        user_name: 'Karthik Subramanian',
        message: 'Vanakkam everyone! Anyone heading towards Pondicherry or Mahabalipuram this Saturday morning?',
        created_at: pastHours(6),
      },
      {
        id: 'msg-tn-02',
        state: 'Tamil Nadu',
        party_id: null,
        user_id: 'user-admin-01',
        user_name: 'Maxwell Blackey',
        message: 'Welcome to the Tamil Nadu Travelers Hub! Remember all meetups here are strictly alcohol-free & verified.',
        created_at: pastHours(4),
      },
      {
        id: 'msg-kl-01',
        state: 'Kerala',
        party_id: null,
        user_id: 'user-host-02',
        user_name: 'Meera Nair',
        message: 'Fort Kochi ferry timings are smooth today. Drop a note if you are joining the 5 PM Sulaimani chai walk!',
        created_at: pastHours(3),
      },
      {
        id: 'msg-ka-01',
        state: 'Karnataka',
        party_id: null,
        user_id: 'user-host-01',
        user_name: 'Karthik Subramanian',
        message: 'Coorg homestay group carpool leaving Indiranagar Friday 6 AM — 2 seats open.',
        created_at: pastHours(5),
      },
      {
        id: 'msg-party-tn-01',
        state: 'Tamil Nadu',
        party_id: 'party-tn-home-02',
        user_id: 'user-host-01',
        user_name: 'Karthik Subramanian',
        message: 'Looking forward to hosting everyone in Adyar! Please bring your favourite travel story or acoustic instrument.',
        created_at: pastHours(3),
      },
    ],
    party_host_admin_chats: [
      {
        id: 'hac-01',
        party_id: 'party-tn-pending-03',
        sender_id: 'user-host-01',
        sender_role: 'host',
        sender_name: 'Karthik Subramanian',
        message: 'Hi Admin, submitted the Madurai Courtyard Jigarthanda & Folk Music event. Happy to share venue photos or ID verification here.',
        created_at: pastHours(4),
      },
      {
        id: 'hac-02',
        party_id: 'party-tn-pending-03',
        sender_id: 'user-admin-01',
        sender_role: 'admin',
        sender_name: 'Maxwell Blackey',
        message: 'Thanks Karthik! Please confirm the courtyard gate closes by 9:30 PM and neighbors are informed.',
        created_at: pastHours(2),
      },
    ],
    user_reports: [
      {
        id: 'rep-01',
        reporter_id: 'user-host-02',
        reporter_name: 'Meera Nair',
        reported_user_id: 'user-traveler-02',
        reported_user_name: 'Rohan Deshmukh',
        state: 'Maharashtra',
        party_id: null,
        reason: 'Posted an unverified external link in state chat (resolved after warning).',
        status: 'resolved',
        created_at: pastHours(20),
      },
    ],
    pending_orders: {},
  };
}

function readLocalStore(): DatabaseState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const seed = createInitialSeed();
    fs.writeFileSync(STORE_PATH, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
  const raw = fs.readFileSync(STORE_PATH, 'utf8');
  const parsed = JSON.parse(raw) as DatabaseState & { safety_reports?: SafetyReport[] };
  if (!parsed.user_reports && parsed.safety_reports) {
    parsed.user_reports = parsed.safety_reports;
    delete parsed.safety_reports;
    fs.writeFileSync(STORE_PATH, JSON.stringify(parsed, null, 2), 'utf8');
  }
  return parsed;
}

function writeLocalStore(state: DatabaseState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

export const db = {
  async getSettings(): Promise<PlatformSettings> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('platform_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (data) return data as PlatformSettings;
    }
    return readLocalStore().platform_settings;
  },

  async updatePartyChatFee(fee: number): Promise<PlatformSettings> {
    const updated_at = new Date().toISOString();
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('platform_settings')
        .upsert({ id: 1, party_chat_fee: fee, updated_at })
        .select()
        .single();
      if (!error && data) return data as PlatformSettings;
    }
    const store = readLocalStore();
    store.platform_settings = { id: 1, party_chat_fee: fee, updated_at };
    writeLocalStore(store);
    return store.platform_settings;
  },

  async getProfiles(): Promise<UserProfile[]> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false });
      if (data) return data as UserProfile[];
    }
    return readLocalStore().profiles;
  },

  async getUserById(userId: string): Promise<UserProfile | null> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (data) return data as UserProfile;
    }
    return readLocalStore().profiles.find((u) => u.id === userId) || null;
  },

  async ensureUserProfile(input: {
    id: string;
    full_name?: string;
    email?: string;
    phone?: string;
  }): Promise<UserProfile> {
    const existing = await this.getUserById(input.id);
    if (existing) return existing;

    const cleanEmail = (input.email || '').trim().toLowerCase();
    const isAdminEmail =
      cleanEmail === 'mgsolition@gmail.com' || cleanEmail === 'maxwellblackey@gmail.com';
    const newProfile: UserProfile = {
      id: input.id,
      full_name:
        input.full_name?.trim() || (cleanEmail ? cleanEmail.split('@')[0] : 'UlaTrip Member'),
      email: cleanEmail || `${input.id}@ulatrip.info`,
      phone: input.phone?.trim() || '+91 98400 00000',
      role: isAdminEmail ? 'admin' : 'user',
      is_banned: false,
      created_at: new Date().toISOString(),
    };

    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .upsert(
          {
            id: newProfile.id,
            full_name: newProfile.full_name,
            email: newProfile.email,
            phone: newProfile.phone,
            role: newProfile.role,
            is_banned: false,
          },
          { onConflict: 'id' }
        )
        .select()
        .maybeSingle();
      if (data) return data as UserProfile;
    }

    const store = readLocalStore();
    store.profiles.push(newProfile);
    writeLocalStore(store);
    return newProfile;
  },

  async upsertMemberAuth(input: {
    full_name: string;
    email: string;
    phone: string;
    role?: 'user' | 'member' | 'admin';
  }): Promise<UserProfile> {
    const emailNormalized = input.email.trim().toLowerCase();
    const isAdminEmail =
      emailNormalized === 'mgsolition@gmail.com' || emailNormalized === 'maxwellblackey@gmail.com';
    if (supabaseAdmin) {
      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', emailNormalized)
        .maybeSingle();
      if (existing) {
        return existing as UserProfile;
      }
      const { data: created, error } = await supabaseAdmin
        .from('profiles')
        .insert({
          full_name: input.full_name.trim(),
          email: emailNormalized,
          phone: input.phone.trim(),
          role: isAdminEmail ? 'admin' : 'user',
        })
        .select()
        .maybeSingle();
      if (!error && created) return created as UserProfile;
    }

    const store = readLocalStore();
    const existing = store.profiles.find((p) => p.email.toLowerCase() === emailNormalized);
    if (existing) {
      if (input.full_name.trim()) existing.full_name = input.full_name.trim();
      if (input.phone.trim()) existing.phone = input.phone.trim();
      writeLocalStore(store);
      return existing;
    }
    const created: UserProfile = {
      id: `user-${crypto.randomUUID().slice(0, 8)}`,
      full_name: input.full_name.trim() || 'Traveler Member',
      email: emailNormalized,
      phone: input.phone.trim() || '+91 90000 00000',
      role: isAdminEmail ? 'admin' : 'member',
      is_banned: false,
      created_at: new Date().toISOString(),
    };
    store.profiles.push(created);
    writeLocalStore(store);
    return created;
  },

  async toggleUserBan(userId: string, banned: boolean): Promise<UserProfile | null> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .update({ is_banned: banned })
        .eq('id', userId)
        .select()
        .single();
      if (data) return data as UserProfile;
    }
    const store = readLocalStore();
    const user = store.profiles.find((u) => u.id === userId);
    if (!user) return null;
    user.is_banned = banned;
    writeLocalStore(store);
    return user;
  },

  async getUserPasses(userId: string): Promise<CommunityChatPass[]> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('community_chat_passes')
        .select('*')
        .eq('user_id', userId);
      if (data) return data as CommunityChatPass[];
    }
    return readLocalStore().community_chat_passes.filter((p) => p.user_id === userId);
  },

  async getAllPasses(): Promise<CommunityChatPass[]> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin.from('community_chat_passes').select('*');
      if (data) return data as CommunityChatPass[];
    }
    return readLocalStore().community_chat_passes;
  },

  async hasActiveStatePass(userId: string, state: IndianState): Promise<CommunityChatPass | null> {
    const passes = await this.getUserPasses(userId);
    const now = new Date();
    const active = passes.find(
      (p) =>
        p.unlocked_state === state &&
        p.status === 'approved' &&
        new Date(p.expires_at) > now
    );
    return active || null;
  },

  async savePendingOrder(order: {
    order_id: string;
    user_id: string;
    state: IndianState;
    amount: number;
  }): Promise<void> {
    const store = readLocalStore();
    store.pending_orders[order.order_id] = {
      ...order,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    writeLocalStore(store);
  },

  async getPendingOrder(orderId: string) {
    return readLocalStore().pending_orders[orderId] || null;
  },

  async approveStatePass(input: {
    user_id: string;
    unlocked_state: IndianState;
    order_id: string;
    payment_id: string;
    amount_paid: number;
  }): Promise<CommunityChatPass> {
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('community_chat_passes')
        .upsert(
          {
            user_id: input.user_id,
            unlocked_state: input.unlocked_state,
            status: 'approved',
            order_id: input.order_id,
            payment_id: input.payment_id,
            amount_paid: input.amount_paid,
            expires_at: expires,
            updated_at: nowIso,
          },
          { onConflict: 'user_id,unlocked_state' }
        )
        .select()
        .single();
      if (!error && data) return data as CommunityChatPass;
    }

    const store = readLocalStore();
    if (store.pending_orders[input.order_id]) {
      store.pending_orders[input.order_id].status = 'PAID';
    }
    const existingIdx = store.community_chat_passes.findIndex(
      (p) => p.user_id === input.user_id && p.unlocked_state === input.unlocked_state
    );
    const passRecord: CommunityChatPass = {
      id: existingIdx >= 0 ? store.community_chat_passes[existingIdx].id : `pass-${crypto.randomUUID().slice(0, 8)}`,
      user_id: input.user_id,
      unlocked_state: input.unlocked_state,
      status: 'approved',
      order_id: input.order_id,
      payment_id: input.payment_id,
      amount_paid: input.amount_paid,
      expires_at: expires,
      created_at: existingIdx >= 0 ? store.community_chat_passes[existingIdx].created_at : nowIso,
      updated_at: nowIso,
    };
    if (existingIdx >= 0) {
      store.community_chat_passes[existingIdx] = passRecord;
    } else {
      store.community_chat_passes.push(passRecord);
    }
    writeLocalStore(store);
    return passRecord;
  },

  async getPartiesForState(state: IndianState, viewerUserId?: string): Promise<PartyEvent[]> {
    let parties: PartyEvent[] = [];
    let participants: PartyParticipant[] = [];

    if (supabaseAdmin) {
      const { data: pData } = await supabaseAdmin
        .from('parties')
        .select('*')
        .eq('state', state)
        .eq('is_approved', true)
        .order('event_date', { ascending: true });
      const { data: partData } = await supabaseAdmin.from('party_participants').select('*');
      if (pData) parties = pData as PartyEvent[];
      if (partData) participants = partData as PartyParticipant[];
    } else {
      const store = readLocalStore();
      parties = store.parties.filter((p) => p.state === state && p.is_approved);
      participants = store.party_participants;
    }

    return parties.map((party) => {
      const partyParts = participants.filter((pt) => pt.party_id === party.id);
      const approvedCount = partyParts.filter((pt) => pt.payment_status === 'approved').length;
      const myPart = viewerUserId ? partyParts.find((pt) => pt.user_id === viewerUserId) || null : null;
      const canSeeAddress = party.host_id === viewerUserId || myPart?.payment_status === 'approved';
      return {
        ...party,
        secret_address: canSeeAddress ? party.secret_address : undefined,
        participant_count: approvedCount,
        my_participation: myPart,
      };
    });
  },

  async getHostSubmittedParties(hostId: string): Promise<PartyEvent[]> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('parties')
        .select('*')
        .eq('host_id', hostId)
        .order('created_at', { ascending: false });
      if (data) return data as PartyEvent[];
    }
    return readLocalStore()
      .parties.filter((p) => p.host_id === hostId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async getAllPartiesAdmin(): Promise<PartyEvent[]> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('parties')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) return data as PartyEvent[];
    }
    return [...readLocalStore().parties].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async getPartyById(partyId: string): Promise<PartyEvent | null> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin.from('parties').select('*').eq('id', partyId).single();
      if (data) return data as PartyEvent;
    }
    return readLocalStore().parties.find((p) => p.id === partyId) || null;
  },

  async createParty(
    input: Omit<PartyEvent, 'id' | 'is_approved' | 'created_at' | 'image_url'> & { image_url?: string }
  ): Promise<PartyEvent> {
    const defaultImg =
      input.event_type === 'Home Party'
        ? '/src/assets/images/event_home_dinner_1795024062719.jpg'
        : '/src/assets/images/event_chai_meetup_1795024062815.jpg';

    const newParty: PartyEvent = {
      ...input,
      id: `party-${crypto.randomUUID().slice(0, 8)}`,
      image_url: input.image_url || defaultImg,
      is_approved: false,
      created_at: new Date().toISOString(),
    };

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('parties').insert(newParty).select().single();
      if (!error && data) {
        await supabaseAdmin.from('party_host_admin_chats').insert({
          party_id: data.id,
          sender_id: input.host_id,
          sender_role: 'host',
          sender_name: input.host_name,
          message: `Submitted "${input.title}" in ${input.city}, ${input.state} for Admin safety verification.`,
        });
        return data as PartyEvent;
      }
    }

    const store = readLocalStore();
    store.parties.unshift(newParty);
    store.party_host_admin_chats.push({
      id: `hac-${crypto.randomUUID().slice(0, 8)}`,
      party_id: newParty.id,
      sender_id: input.host_id,
      sender_role: 'host',
      sender_name: input.host_name,
      message: `Submitted "${input.title}" in ${input.city}, ${input.state} for Admin safety verification.`,
      created_at: new Date().toISOString(),
    });
    writeLocalStore(store);
    return newParty;
  },

  async approveParty(partyId: string): Promise<PartyEvent | null> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('parties')
        .update({ is_approved: true })
        .eq('id', partyId)
        .select()
        .single();
      if (data) return data as PartyEvent;
    }
    const store = readLocalStore();
    const party = store.parties.find((p) => p.id === partyId);
    if (!party) return null;
    party.is_approved = true;
    writeLocalStore(store);
    return party;
  },

  async getParticipantsForParty(partyId: string): Promise<PartyParticipant[]> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('party_participants')
        .select('*')
        .eq('party_id', partyId)
        .order('created_at', { ascending: false });
      if (data) return data as PartyParticipant[];
    }
    return readLocalStore().party_participants.filter((pt) => pt.party_id === partyId);
  },

  async getParticipant(partyId: string, userId: string): Promise<PartyParticipant | null> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('party_participants')
        .select('*')
        .eq('party_id', partyId)
        .eq('user_id', userId)
        .single();
      if (data) return data as PartyParticipant;
    }
    return (
      readLocalStore().party_participants.find((pt) => pt.party_id === partyId && pt.user_id === userId) || null
    );
  },

  async upsertParticipant(input: {
    party_id: string;
    user: UserProfile;
    payment_status: 'pending' | 'approved' | 'rejected';
    utr_number?: string;
  }): Promise<PartyParticipant> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('party_participants')
        .upsert(
          {
            party_id: input.party_id,
            user_id: input.user.id,
            user_name: input.user.full_name,
            user_email: input.user.email,
            user_phone: input.user.phone,
            payment_status: input.payment_status,
            utr_number: input.utr_number || null,
          },
          { onConflict: 'party_id,user_id' }
        )
        .select()
        .single();
      if (data) return data as PartyParticipant;
    }

    const store = readLocalStore();
    const idx = store.party_participants.findIndex(
      (pt) => pt.party_id === input.party_id && pt.user_id === input.user.id
    );
    const record: PartyParticipant = {
      id: idx >= 0 ? store.party_participants[idx].id : `part-${crypto.randomUUID().slice(0, 8)}`,
      party_id: input.party_id,
      user_id: input.user.id,
      user_name: input.user.full_name,
      user_email: input.user.email,
      user_phone: input.user.phone,
      payment_status: input.payment_status,
      utr_number: input.utr_number,
      dispute_reported: idx >= 0 ? store.party_participants[idx].dispute_reported : false,
      dispute_note: idx >= 0 ? store.party_participants[idx].dispute_note : undefined,
      created_at: idx >= 0 ? store.party_participants[idx].created_at : new Date().toISOString(),
    };
    if (idx >= 0) store.party_participants[idx] = record;
    else store.party_participants.push(record);
    writeLocalStore(store);
    return record;
  },

  async reportDispute(partyId: string, userId: string, note?: string): Promise<PartyParticipant | null> {
    const disputeNote =
      note?.trim() || 'I Paid, But Not Entered in Party Chat — requesting manual UTR verification.';
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('party_participants')
        .update({ dispute_reported: true, dispute_note: disputeNote })
        .eq('party_id', partyId)
        .eq('user_id', userId)
        .select()
        .single();
      if (data) return data as PartyParticipant;
    }
    const store = readLocalStore();
    const pt = store.party_participants.find((p) => p.party_id === partyId && p.user_id === userId);
    if (!pt) return null;
    pt.dispute_reported = true;
    pt.dispute_note = disputeNote;
    writeLocalStore(store);
    return pt;
  },

  async resolveParticipantStatus(
    participantId: string,
    status: 'approved' | 'rejected'
  ): Promise<PartyParticipant | null> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('party_participants')
        .update({ payment_status: status, dispute_reported: false })
        .eq('id', participantId)
        .select()
        .single();
      if (data) return data as PartyParticipant;
    }
    const store = readLocalStore();
    const pt = store.party_participants.find((p) => p.id === participantId);
    if (!pt) return null;
    pt.payment_status = status;
    pt.dispute_reported = false;
    writeLocalStore(store);
    return pt;
  },

  async getDisputedParticipantsAdmin(): Promise<PartyParticipant[]> {
    const store = readLocalStore();
    let participants = store.party_participants;
    let parties = store.parties;

    if (supabaseAdmin) {
      const { data: pData } = await supabaseAdmin
        .from('party_participants')
        .select('*')
        .eq('dispute_reported', true);
      const { data: evData } = await supabaseAdmin.from('parties').select('*');
      if (pData) participants = pData as PartyParticipant[];
      if (evData) parties = evData as PartyEvent[];
    } else {
      participants = participants.filter((p) => p.dispute_reported);
    }

    return participants.map((pt) => {
      const party = parties.find((e) => e.id === pt.party_id);
      return {
        ...pt,
        party_title: party?.title || 'Event',
        party_state: party?.state,
        entry_fee: party?.entry_fee,
      };
    });
  },

  async getStateMessages(state: IndianState): Promise<PartyMessage[]> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('party_messages')
        .select('*')
        .eq('state', state)
        .is('party_id', null)
        .order('created_at', { ascending: true });
      if (data) return data as PartyMessage[];
    }
    return readLocalStore()
      .party_messages.filter((m) => m.state === state && m.party_id === null)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  async getPartyMessages(partyId: string): Promise<PartyMessage[]> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('party_messages')
        .select('*')
        .eq('party_id', partyId)
        .order('created_at', { ascending: true });
      if (data) return data as PartyMessage[];
    }
    return readLocalStore()
      .party_messages.filter((m) => m.party_id === partyId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  async addMessage(input: {
    state: IndianState;
    party_id: string | null;
    user_id: string;
    user_name: string;
    message: string;
  }): Promise<PartyMessage> {
    const msg: PartyMessage = {
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      state: input.state,
      party_id: input.party_id,
      user_id: input.user_id,
      user_name: input.user_name,
      message: input.message.trim(),
      created_at: new Date().toISOString(),
    };
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('party_messages').insert(msg).select().single();
      if (!error && data) return data as PartyMessage;
    }
    const store = readLocalStore();
    store.party_messages.push(msg);
    writeLocalStore(store);
    return msg;
  },

  async getHostAdminChats(partyId: string): Promise<HostAdminChatMessage[]> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('party_host_admin_chats')
        .select('*')
        .eq('party_id', partyId)
        .order('created_at', { ascending: true });
      if (data) return data as HostAdminChatMessage[];
    }
    return readLocalStore()
      .party_host_admin_chats.filter((c) => c.party_id === partyId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  async addHostAdminChat(input: {
    party_id: string;
    sender_id: string;
    sender_role: 'host' | 'admin';
    sender_name: string;
    message: string;
  }): Promise<HostAdminChatMessage> {
    const msg: HostAdminChatMessage = {
      id: `hac-${crypto.randomUUID().slice(0, 8)}`,
      party_id: input.party_id,
      sender_id: input.sender_id,
      sender_role: input.sender_role,
      sender_name: input.sender_name,
      message: input.message.trim(),
      created_at: new Date().toISOString(),
    };
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('party_host_admin_chats')
        .insert(msg)
        .select()
        .single();
      if (!error && data) return data as HostAdminChatMessage;
    }
    const store = readLocalStore();
    store.party_host_admin_chats.push(msg);
    writeLocalStore(store);
    return msg;
  },

  async getSafetyReports(): Promise<SafetyReport[]> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('user_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) return data as SafetyReport[];
    }
    return [...(readLocalStore().user_reports || [])].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );
  },

  async createSafetyReport(input: {
    reporter_id: string;
    reporter_name: string;
    reported_user_id: string;
    reported_user_name: string;
    state: IndianState;
    party_id: string | null;
    reason: string;
  }): Promise<SafetyReport> {
    const report: SafetyReport = {
      id: `rep-${crypto.randomUUID().slice(0, 8)}`,
      ...input,
      status: 'open',
      created_at: new Date().toISOString(),
    };
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('user_reports')
        .insert(report)
        .select()
        .single();
      if (!error && data) return data as SafetyReport;
    }
    const store = readLocalStore();
    if (!store.user_reports) store.user_reports = [];
    store.user_reports.unshift(report);
    writeLocalStore(store);
    return report;
  },

  async resolveSafetyReport(reportId: string): Promise<SafetyReport | null> {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('user_reports')
        .update({ status: 'resolved' })
        .eq('id', reportId)
        .select()
        .single();
      if (data) return data as SafetyReport;
    }
    const store = readLocalStore();
    const rep = (store.user_reports || []).find((r) => r.id === reportId);
    if (!rep) return null;
    rep.status = 'resolved';
    writeLocalStore(store);
    return rep;
  },
};
