'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/stores/appStore';
import type { Profile } from '@/types/database';

export function useAuth() {
  const { profile, setProfile } = useAppStore();
  const supabase = createClient();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          await supabase.auth.signOut();
          return;
        }
        if (user) {
          const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (data) setProfile(data as Profile);
        }
      } catch (e) {
        await supabase.auth.signOut();
      }
    };
    loadProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') { setProfile(null); }
      else if (session?.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (data) setProfile(data as Profile);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, setProfile]);

  return { profile, role: profile?.role || 'viewer', isAdmin: profile?.role === 'admin', canEdit: profile?.role === 'admin' || profile?.role === 'user' };
}
