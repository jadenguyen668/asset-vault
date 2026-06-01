import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const characterId = Number(id);
    if (!Number.isFinite(characterId)) {
      return NextResponse.json({ error: 'Invalid character id' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('characters')
      .select('id, user_id, json_name, name, major_version, minor_version, json_text, atlas_text, png_paths, json_path, atlas_path')
      .eq('id', characterId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Character not found' }, { status: 404 });
    }

    return NextResponse.json({ character: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load character' }, { status: 500 });
  }
}
