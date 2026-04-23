'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/stores/appStore';
import type { Profile } from '@/types/database';

const PROFILE_STORAGE_KEY = 'spine_library_profile';

function saveProfileToStorage(p: Profile | null) {
  try {
    if (p) localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
    else localStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch { /* ignore */ }
}

function loadProfileFromStorage(): Profile | null {
  try {
    const s = localStorage.getItem(PROFILE_STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

async function ensureProfile(supabase: ReturnType<typeof createClient>, user: { id: string; email?: string; user_metadata?: any }): Promise<Profile | null> {
  // Try to get existing profile
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (data) return data as Profile;

  // Auto-create profile if missing
  const newProfile = {
    id: user.id,
    email: user.email || '',
    display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
    role: user.user_metadata?.role || 'user',
  };
  const { data: created, error } = await supabase.from('profiles').insert(newProfile).select('*').single();
  if (error) {
    console.warn('[useAuth] Failed to auto-create profile:', error.message);
    return null;
  }
  console.log('[useAuth] Auto-created profile for', user.email);
  return created as Profile;
}

export function useAuth() {
  const { profile, setProfile } = useAppStore();
  const supabase = createClient();

  useEffect(() => {
    // Restore profile from localStorage immediately if store is empty
    if (!profile) {
      const cached = loadProfileFromStorage();
      if (cached) setProfile(cached);
    }

    const loadProfile = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          // Don't signOut or clear profile - keep existing profile
          console.warn('[useAuth] getUser error (ignored):', error.message);
          return;
        }
        if (user) {
          const p = await ensureProfile(supabase, user);
          if (p) {
            setProfile(p);
            saveProfileToStorage(p);
          }
        }
      } catch (e) {
        console.warn('[useAuth] Auth check failed (ignored)');
      }
    };
    loadProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        saveProfileToStorage(null);
      } else if (session?.user) {
        const p = await ensureProfile(supabase, session.user);
        if (p) {
          setProfile(p);
          saveProfileToStorage(p);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, setProfile]);

  return { profile, role: profile?.role || 'viewer', isAdmin: profile?.role === 'admin', canEdit: profile?.role === 'admin' || profile?.role === 'user' };
}
