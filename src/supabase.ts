/**
 * Supabase Client — Initializes connection using Vite env vars.
 * When VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set,
 * the app runs in local-only mode (IndexedDB).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

/** Returns true when Supabase env vars are configured */
export function isSupabaseConfigured(): boolean {
    return !!supabaseUrl && !!supabaseKey;
}
