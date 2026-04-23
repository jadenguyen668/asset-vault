import { createServerSupabaseClient } from '@/lib/supabase/server';
import { LibraryView } from '@/components/library/LibraryView';
import { Header } from '@/components/layout/Header';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const supabase = await createServerSupabaseClient();
  const { data: characters } = await supabase.from('characters').select('*').order('last_viewed_at', { ascending: false }).limit(100);
  const { data: projects } = await supabase.from('projects').select('*').order('created_at');
  const { data: collections } = await supabase.from('collections').select('*').order('created_at');

  // Fetch profiles separately and merge into characters
  let enrichedCharacters = characters || [];
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
