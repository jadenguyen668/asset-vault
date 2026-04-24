import { createServerSupabaseClient } from '@/lib/supabase/server';
import { LibraryView } from '@/components/library/LibraryView';
import { Header } from '@/components/layout/Header';
import type { Character } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const supabase = await createServerSupabaseClient();
  const LIGHT_COLUMNS = [
    'id', 'user_id', 'asset_type', 'name', 'json_name',
    'spine_version', 'major_version', 'minor_version',
    'bone_count', 'slot_count', 'anim_count', 'anim_names', 'skin_count',
    'file_size', 'json_size', 'atlas_size', 'png_sizes',
    'thumbnail', 'tags', 'notes', 'status',
    'project_id', 'collection_ids', 'allow_download', 'preview_config',
    'json_path', 'atlas_path',
    'imported_at', 'last_viewed_at',
  ].join(', ');
  const { data: characters, error: charError } = await supabase.from('characters')
    .select(LIGHT_COLUMNS)
    .order('last_viewed_at', { ascending: false })
    .limit(200);
  if (charError) console.error('[LibraryPage] Query error:', charError);
  const { data: projects } = await supabase.from('projects').select('*').order('created_at');
  const { data: collections } = await supabase.from('collections').select('*').order('created_at');

  // Fetch profiles separately and merge into characters
  let enrichedCharacters = (characters || []) as unknown as Character[];
  if (enrichedCharacters.length > 0) {
    const userIds = [...new Set(enrichedCharacters.map(c => c.user_id).filter(Boolean))];
    const { data: profiles } = await supabase.from('profiles').select('id, email, display_name').in('id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    enrichedCharacters = enrichedCharacters.map(c => ({
      ...c,
      profiles: profileMap.get(c.user_id) || null,
    }));
  }

  return (
    <div className="flex h-screen flex-col bg-bg">
      <Header />
      <LibraryView initialCharacters={enrichedCharacters} initialProjects={projects || []} initialCollections={collections || []} />
    </div>
  );
}
