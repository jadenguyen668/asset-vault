'use client';
import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/appStore';
import { LogOut, Settings, Shield, User } from 'lucide-react';

export function UserMenu() {
  const profile = useAppStore((s) => s.profile);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = () => {
    try {
      localStorage.removeItem('spine_library_profile');
      document.cookie = 'admin_session=; path=/; max-age=0';
      supabase.auth.signOut().catch(() => {});
    } catch { /* ignore */ }
    window.location.replace('/login');
  };

  // Always show menu - even without profile, at minimum show sign out
  const initial = profile ? (profile.display_name || profile.email)[0].toUpperCase() : '?';
  const displayName = profile ? (profile.display_name || profile.email.split('@')[0]) : 'User';
  const displayEmail = profile?.email || '';
  const displayRole = profile?.role || 'user';

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">{initial}</button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-48 rounded-lg border border-border bg-panel shadow-xl">
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-xs font-semibold text-text">{displayName}</p>
            {displayEmail && <p className="truncate text-[10px] text-dim">{displayEmail}</p>}
            <span className="mt-1 inline-block rounded bg-accent/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-accent-light">{displayRole}</span>
          </div>
          <div className="p-1">
            {profile && <button onClick={() => { router.push('/settings'); setOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-text hover:bg-accent/10"><Settings className="h-3.5 w-3.5" /> Settings</button>}
            {profile?.role === 'admin' && <button onClick={() => { router.push('/admin'); setOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-text hover:bg-accent/10"><Shield className="h-3.5 w-3.5" /> Admin Panel</button>}
            <button onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-red hover:bg-red/10"><LogOut className="h-3.5 w-3.5" /> Sign Out</button>
          </div>
        </div>
      )}
    </div>
  );
}
