import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/** True only when real Supabase credentials are configured. */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey && url.startsWith('http'));
}

let browserClient: SupabaseClient | null = null;

/**
 * Browser client. When Supabase is not configured yet it is created against
 * placeholder values so the app still builds and renders (pages fall back to
 * the local catalog / empty states). It never makes a request in that mode
 * because callers must check isSupabaseConfigured() first.
 */
export function getSupabase(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(
      isSupabaseConfigured() ? url : 'https://placeholder.supabase.co',
      isSupabaseConfigured() ? anonKey : 'placeholder-anon-key',
    );
  }
  return browserClient;
}

/** Server-only service-role client. Returns null when not configured. */
export function getSupabaseAdmin(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!isSupabaseConfigured() || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
