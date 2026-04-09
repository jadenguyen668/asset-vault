'use client';
import { useState } from 'react';
import type { Profile, UserRole } from '@/types/database';
import { Shield, Users } from 'lucide-react';

interface Props { users: Profile[]; }

export function AdminPanel({ users: initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const updateRole = async (userId: string, role: UserRole) => {
    await fetch('/api/admin/update-role', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role }) });
    setUsers(users.map((u) => (u.id === userId ? { ...u, role } : u)));
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-text"><Shield className="h-5 w-5 text-accent" /> User Management</h2>
      <div className="rounded-xl border border-border bg-panel">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3"><Users className="h-4 w-4 text-dim" /><span className="text-xs font-semibold text-dim">{users.length} users</span></div>
        <div className="divide-y divide-border">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">{(u.display_name || u.email)[0].toUpperCase()}</div>
              <div className="flex-1"><p className="text-sm font-semibold text-text">{u.display_name || u.email.split('@')[0]}</p><p className="text-[10px] text-dim">{u.email}</p></div>
              <select value={u.role} onChange={(e) => updateRole(u.id, e.target.value as UserRole)} className="rounded-md border border-border bg-panel-secondary px-2 py-1 text-xs text-text outline-none">
                <option value="viewer">Viewer</option><option value="user">User</option><option value="admin">Admin</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
