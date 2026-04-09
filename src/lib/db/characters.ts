import { createClient } from '@/lib/supabase/client';
import type { Character } from '@/types/database';

export async function saveCharacter(char: Omit<Character, 'id' | 'created_at'>): Promise<number> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const row = { ...char, user_id: user.id };
  const { data: existing } = await supabase.from('characters').select('id').eq('json_name', char.json_name).eq('user_id', user.id).maybeSingle();
  if (existing) { await supabase.from('characters').update(row).eq('id', existing.id); return existing.id; }
  const { data, error } = await supabase.from('characters').insert(row).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function getAllCharacters(): Promise<Character[]> {
  const supabase = createClient();
  const { data } = await supabase.from('characters').select('*').order('last_viewed_at', { ascending: false });
  return data || [];
}

export async function getCharacter(id: number): Promise<Character | null> {
  const supabase = createClient();
  const { data } = await supabase.from('characters').select('*').eq('id', id).maybeSingle();
  return data;
}

export async function deleteCharacter(id: number): Promise<void> {
  const supabase = createClient();
  await supabase.from('characters').delete().eq('id', id);
}

export async function updateCharacterMeta(id: number, meta: Partial<Pick<Character, 'name' | 'tags' | 'notes' | 'status' | 'project_id' | 'collection_ids' | 'visibility'>>): Promise<void> {
  const supabase = createClient();
  await supabase.from('characters').update(meta).eq('id', id);
}

export async function updateLastViewed(id: number): Promise<void> {
  const supabase = createClient();
  await supabase.from('characters').update({ last_viewed_at: new Date().toISOString() }).eq('id', id);
}

export async function updateThumbnail(id: number, thumbnail: string): Promise<void> {
  const supabase = createClient();
  await supabase.from('characters').update({ thumbnail }).eq('id', id);
}

export async function searchCharacters(query: string): Promise<Character[]> {
  const supabase = createClient();
  const q = `%${query}%`;
  const { data } = await supabase.from('characters').select('*').or(`name.ilike.${q},json_name.ilike.${q},notes.ilike.${q}`).order('last_viewed_at', { ascending: false });
  return data || [];
}
