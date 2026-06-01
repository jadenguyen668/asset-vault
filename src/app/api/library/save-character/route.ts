import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Character } from '@/types/database';

type SaveCharacterPayload = Omit<Character, 'id' | 'created_at'>;

function buildRow(char: SaveCharacterPayload, userId: string) {
  const row: Record<string, any> = {
    user_id: userId,
    name: char.name || 'Untitled',
    json_name: char.json_name,
    asset_type: char.asset_type || 'spine',
    mime_type: char.mime_type || null,
    spine_version: char.spine_version || '',
    major_version: char.major_version ?? 3,
    minor_version: char.minor_version ?? 8,
    json_text: '',
    atlas_text: '',
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

  for (const [key, value] of Object.entries(optionalFields)) {
    if (value !== undefined) row[key] = value;
  }

  return row;
}

async function saveCharacterServer(char: SaveCharacterPayload, userId: string) {
  const supabase = await createServerSupabaseClient();
  const jsonText = char.json_text || '';
  const atlasText = char.atlas_text || '';
  const row = buildRow(char, userId);

  let charId: number;
  const { data: existing, error: existingError } = await supabase
    .from('characters')
    .select('id')
    .eq('json_name', char.json_name)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from('characters')
      .update(row)
      .eq('id', existing.id)
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    charId = existing.id;
  } else {
    let insertRow = { ...row };
    let insertedId: number | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from('characters')
        .insert(insertRow)
        .select('id')
        .single();

      if (!error) {
        insertedId = data.id;
        break;
      }

      const colMatch = error.message?.match(/Could not find the '(\w+)' column/);
      if (colMatch) {
        delete insertRow[colMatch[1]];
        continue;
      }

      throw new Error(error.message);
    }

    if (insertedId === null) {
      throw new Error('saveCharacter insert failed after retries');
    }

    charId = insertedId;
  }

  const totalTextSize = (jsonText?.length || 0) + (atlasText?.length || 0);
  const maxSupabaseText = 4 * 1024 * 1024;
  if ((jsonText || atlasText) && totalTextSize < maxSupabaseText) {
    const { error: textError } = await supabase
      .from('characters')
      .update({ json_text: jsonText, atlas_text: atlasText })
      .eq('id', charId)
      .eq('user_id', userId);

    if (textError) {
      console.error('[save-character] Heavy text update failed:', textError);
    }
  }

  return charId;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { char } = await request.json();

    if (!char?.json_name || !char?.name) {
      return NextResponse.json({ error: 'Missing character payload' }, { status: 400 });
    }

    const id = await saveCharacterServer(char, user.id);
    return NextResponse.json({ id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save character' }, { status: 500 });
  }
}
