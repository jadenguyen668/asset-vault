'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';
import { Save, Key } from 'lucide-react';

interface Props { profile: Profile | null; }

export function SettingsForm({ profile }: Props) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const supabase = createClient();

  const updateProfile = async () => { if (!profile) return; await supabase.from('profiles').update({ display_name: displayName }).eq('id', profile.id); setMsg('Profile updated!'); };
  const changePassword = async () => { const { error } = await supabase.auth.updateUser({ password: newPassword }); if (error) setMsg(error.message); else { setMsg('Password updated!'); setNewPassword(''); } };

  return (
    <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-panel p-6">
      <h2 className="text-lg font-bold text-text">Account Settings</h2>
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-dim">Display Name</label>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-lg border border-border bg-panel-secondary px-4 py-2 text-sm text-text outline-none focus:border-accent" />
        <button onClick={updateProfile} className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white"><Save className="h-3.5 w-3.5" /> Save</button>
      </div>
      <hr className="border-border" />
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-dim">Change Password</label>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" minLength={6} className="w-full rounded-lg border border-border bg-panel-secondary px-4 py-2 text-sm text-text outline-none focus:border-accent" />
        <button onClick={changePassword} disabled={newPassword.length < 6} className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><Key className="h-3.5 w-3.5" /> Update Password</button>
      </div>
      {msg && <p className="rounded-md bg-green/10 px-3 py-2 text-xs text-green">{msg}</p>}
      <div className="rounded-lg bg-bg p-3"><p className="text-[10px] uppercase tracking-wider text-dim">Role</p><p className="text-sm font-semibold capitalize text-accent-light">{profile?.role || 'viewer'}</p></div>
    </div>
  );
}
