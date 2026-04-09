/**
 * Supabase Client — Initializes connection using Vite env vars.
 * When VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set,
 * the app runs in local-only mode (IndexedDB).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Only create client when env vars are set; otherwise export null cast as
// SupabaseClient so downstream code compiles — those paths are guarded by
// isSupabaseConfigured() and never actually called in local-only mode.
export const supabase: SupabaseClient =
    (supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null) as unknown as SupabaseClient;

/** Returns true when Supabase env vars are configured */
export function isSupabaseConfigured(): boolean {
    return !!supabaseUrl && !!supabaseKey;
}
