import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const hasClientSupabase = Boolean(url && anonKey && url.startsWith('http'));

export const supabase: SupabaseClient | null = hasClientSupabase
  ? createClient(url, anonKey)
  : null;
