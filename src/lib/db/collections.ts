import { createClient } from '@/lib/supabase/client';
import type { Collection } from '@/types/database';

export async function getAllCollections(): Promise<Collection[]> {
  const supabase = createClient();
  const { data } = await supabase.from('collections').select('*').order('created_at');
  return data || [];
}

export async function createCollection(name: string, icon?: string, color?: string): Promise<number> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('collections').insert({ name, icon: icon || '📁', color: color || '#7c5cfc', user_id: user.id }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function deleteCollection(id: number): Promise<void> {
  const res = await fetch('/api/admin/delete-collection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Delete collection failed (${res.status})`);
  }
}
