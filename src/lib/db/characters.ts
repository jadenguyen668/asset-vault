import { createClient } from '@/lib/supabase/client';
import type { Character } from '@/types/database';

const ANON_USER_ID = '00000000-0000-0000-0000-000000000000';

async function getUserId(): Promise<string> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || ANON_USER_ID;
  } catch {
    return ANON_USER_ID;
  }
}

export async function saveCharacter(char: Omit<Character, 'id' | 'created_at'>): Promise<number> {
  const supabase = createClient();
  const userId = await getUserId();
  
  // Extract heavy text data — will be saved separately to avoid API payload limits
  const jsonText = char.json_text || '';
  const atlasText = char.atlas_text || '';
  
  // Build lightweight row — NO json_text/atlas_text (those are multi-MB)
  const row: Record<string, any> = {
    user_id: userId,
    name: char.name || 'Untitled',
    json_name: char.json_name,
    asset_type: char.asset_type || 'spine',
    mime_type: char.mime_type || null,
    spine_version: char.spine_version || '',
    major_version: char.major_version ?? 3,
    minor_version: char.minor_version ?? 8,
    json_text: '',  // placeholder — will be updated separately
    atlas_text: '', // placeholder — will be updated separately
    bone_count: char.bone_count ?? 0,
    slot_count: char.slot_count ?? 0,
    anim_count: char.anim_count ?? 0,
    anim_names: char.anim_names || [],
    skin_count: char.skin_count ?? 0,
    file_size: char.file_size ?? 0,
    json_size: char.json_size ?? 0,
    atlas_size: char.atlas_size ?? 0,
    png_sizes: char.png_sizes || [],
    tags: char.tags || [],
    notes: char.notes || '',
    status: char.status || 'draft',
    imported_at: char.imported_at || new Date().toISOString(),
    last_viewed_at: char.last_viewed_at || new Date().toISOString(),
  };
  // Optional fields — only include if they have values
  const optionalFields: Record<string, any> = {
    allow_download: char.allow_download ?? true,
    collection_ids: char.collection_ids || [],
    preview_config: char.preview_config || undefined,
    json_path: char.json_path || undefined,
    atlas_path: char.atlas_path || undefined,
    png_paths: (char.png_paths && char.png_paths.length > 0) ? char.png_paths : undefined,
    project_id: char.project_id || undefined,
    thumbnail: char.thumbnail || undefined,
  };
  for (const [k, v] of Object.entries(optionalFields)) {
    if (v !== undefined) row[k] = v;
  }

  console.log('[saveCharacter] userId:', userId, '| json_name:', row.json_name);

  // Phase 1: Save lightweight metadata
  let charId: number;
  const { data: existing } = await supabase.from('characters').select('id').eq('json_name', char.json_name).eq('user_id', userId).maybeSingle();
  if (existing) {
    const { error: updateError } = await supabase.from('characters').update(row).eq('id', existing.id);
    if (updateError) { console.error('[saveCharacter] UPDATE error:', updateError); throw updateError; }
    console.log('[saveCharacter] Updated existing id:', existing.id);
    charId = existing.id;
  } else {
    // Try insert — auto-retry by stripping unknown columns if DB schema is out of date
    let insertRow = { ...row };
    let insertedId: number | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase.from('characters').insert(insertRow).select('id').single();
      if (!error) {
        console.log('[saveCharacter] Inserted new id:', data.id);
        insertedId = data.id;
        break;
      }
      const colMatch = error.message?.match(/Could not find the '(\w+)' column/);
      if (colMatch) {
        const badCol = colMatch[1];
        console.warn(`[saveCharacter] Column '${badCol}' not found, stripping and retrying...`);
        delete insertRow[badCol];
        continue;
      }
      console.error('[saveCharacter] INSERT error:', error);
      throw error;
    }
    if (insertedId === null) throw new Error('saveCharacter insert failed after retries');
    charId = insertedId;
  }

  // Phase 2: Save heavy text data separately (avoids single-request payload limits)
  // Skip for files > 4MB total — they'll be stored on R2 only
  const totalTextSize = (jsonText?.length || 0) + (atlasText?.length || 0);
  const MAX_SUPABASE_TEXT = 4 * 1024 * 1024; // 4MB
  if ((jsonText || atlasText) && totalTextSize < MAX_SUPABASE_TEXT) {
    console.log('[saveCharacter] Saving text to Supabase for id:', charId, `json: ${(jsonText.length / 1024).toFixed(0)}KB, atlas: ${(atlasText.length / 1024).toFixed(0)}KB`);
    const { error: textError } = await supabase.from('characters').update({ json_text: jsonText, atlas_text: atlasText }).eq('id', charId);
    if (textError) {
      console.error('[saveCharacter] Heavy text update failed:', textError);
    }
  } else if (totalTextSize >= MAX_SUPABASE_TEXT) {
    console.log(`[saveCharacter] Text too large for Supabase (${(totalTextSize / 1024 / 1024).toFixed(1)}MB) — will rely on R2 storage`);
  }

  return charId;
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
  const res = await fetch('/api/admin/delete-character', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Delete failed (${res.status})`);
  }
}

export async function updateCharacterMeta(id: number, meta: Partial<Pick<Character, 'name' | 'tags' | 'notes' | 'status' | 'project_id' | 'collection_ids'>>): Promise<void> {
  const supabase = createClient();
  await supabase.from('characters').update(meta).eq('id', id);
}

export async function updateLastViewed(id: number): Promise<void> {
  const supabase = createClient();
  await supabase.from('characters').update({ last_viewed_at: new Date().toISOString() }).eq('id', id);
}

export async function updatePreviewConfig(id: number, preview_config: Record<string, any>): Promise<void> {
  const supabase = createClient();
  await supabase.from('characters').update({ preview_config }).eq('id', id);
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

export async function findDuplicates(jsonNames: string[]): Promise<Map<string, Character>> {
  if (!jsonNames.length) return new Map();
  const supabase = createClient();
  const userId = await getUserId();
  const { data } = await supabase.from('characters').select('*').in('json_name', jsonNames).eq('user_id', userId);
  const duplicates = new Map<string, Character>();
  if (data) {
    for (const char of data) {
      duplicates.set(char.json_name, char);
    }
  }
  return duplicates;
}
