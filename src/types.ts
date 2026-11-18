export const INDIAN_STATES = [
  'Tamil Nadu',
  'Kerala',
  'Karnataka',
  'Andhra Pradesh',
  'Telangana',
  'Maharashtra',
  'Delhi',
] as const;

export type IndianState = (typeof INDIAN_STATES)[number];

export type EventType = 'Home Party' | 'Public Place Chai / Food Meetup';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'user' | 'member' | 'admin';
  is_banned: boolean;
  created_at: string;
}

export interface PlatformSettings {
  id: number;
  party_chat_fee: number;
  updated_at: string;
}

export interface CommunityChatPass {
  id: string;
  user_id: string;
  unlocked_state: IndianState;
  status: 'pending' | 'approved' | 'expired';
  order_id: string;
  payment_id?: string;
  amount_paid: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface PartyEvent {
  id: string;
  host_id: string;
  host_name: string;
  host_phone: string;
  host_email: string;
  state: IndianState;
  city: string;
  event_type: EventType;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  entry_fee: number;
  host_upi_id: string;
  max_guests: number;
  secret_address?: string;
  image_url: string;
  is_approved: boolean;
  safety_pledge_accepted: boolean;
  terms_accepted: boolean;
  created_at: string;
  participant_count?: number;
  my_participation?: PartyParticipant | null;
}

export interface PartyParticipant {
  id: string;
  party_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  payment_status: 'pending' | 'approved' | 'rejected';
  utr_number?: string;
  dispute_reported: boolean;
  dispute_note?: string;
  created_at: string;
  party_title?: string;
  party_state?: IndianState;
  entry_fee?: number;
}

export interface PartyMessage {
  id: string;
  state: IndianState;
  party_id: string | null;
  user_id: string;
  user_name: string;
  message: string;
  created_at: string;
}

export interface HostAdminChatMessage {
  id: string;
  party_id: string;
  sender_id: string;
  sender_role: 'host' | 'admin';
  sender_name: string;
  message: string;
  created_at: string;
}

export interface SafetyReport {
  id: string;
  reporter_id: string;
  reporter_name: string;
  reported_user_id: string;
  reported_user_name: string;
  state: IndianState;
  party_id: string | null;
  reason: string;
  status: 'open' | 'resolved';
  created_at: string;
}

export interface CashfreeOrderSession {
  mode: 'cashfree_live' | 'cashfree_sandbox_preview';
  order_id: string;
  payment_session_id: string;
  amount: number;
  state: IndianState;
  cashfree_env: 'SANDBOX' | 'PRODUCTION';
}
