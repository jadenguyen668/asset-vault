/**
 * Auth Module — Supabase authentication with VNG email domain restriction.
 * Only emails ending with @vng.com.vn are allowed to sign up.
 */
import { supabase, isSupabaseConfigured } from './supabase';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

const ALLOWED_DOMAIN = '@vng.com.vn';

/** Check if email belongs to allowed domain */
export function isAllowedDomain(email: string): boolean {
    return email.toLowerCase().endsWith(ALLOWED_DOMAIN);
}

/** Sign up with email/password. Only @vng.com.vn allowed. */
export async function signUp(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    if (!isSupabaseConfigured()) return { user: null, error: 'Supabase not configured' };

    if (!isAllowedDomain(email)) {
        return { user: null, error: `Only ${ALLOWED_DOMAIN} emails are allowed` };
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { user: null, error: error.message };
    return { user: data.user, error: null };
}

/** Sign in with email/password */
export async function signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    if (!isSupabaseConfigured()) return { user: null, error: 'Supabase not configured' };

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: error.message };
    return { user: data.user, error: null };
}

/** Sign out current user */
export async function signOut(): Promise<void> {
    if (!isSupabaseConfigured()) return;
    await supabase.auth.signOut();
}

/** Get current authenticated user (null if not logged in) */
export async function getUser(): Promise<User | null> {
    if (!isSupabaseConfigured()) return null;
    const { data } = await supabase.auth.getUser();
    return data.user;
}

/** Get current session */
export async function getSession(): Promise<Session | null> {
    if (!isSupabaseConfigured()) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
}

/** Get current user ID (shortcut) */
export async function getUserId(): Promise<string | null> {
    const user = await getUser();
    return user?.id ?? null;
}

/** Listen for auth state changes */
export function onAuthChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    if (!isSupabaseConfigured()) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
}

/** Request password reset email */
export async function resetPassword(email: string): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
    if (!isAllowedDomain(email)) {
        return { error: `Only ${ALLOWED_DOMAIN} emails are allowed` };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message ?? null };
}

/** Check if user is currently authenticated */
export async function isAuthenticated(): Promise<boolean> {
    const session = await getSession();
    return session !== null;
}
