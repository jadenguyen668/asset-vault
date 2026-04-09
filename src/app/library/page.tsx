import { createServerSupabaseClient } from '@/lib/supabase/server';
import { LibraryView } from '@/components/library/LibraryView';
import { Header } from '@/components/layout/Header';

export default async function LibraryPage() {
  const supabase = await createServerSupabaseClient();
  const { data: characters } = await supabase.from('characters').select('*').order('last_viewed_at', { ascending: false }).limit(100);
  const { data: projects } = await supabase.from('projects').select('*').order('created_at');
  const { data: collections } = await supabase.from('collections').select('*').order('created_at');

  return (
    <div className="flex h-screen flex-col bg-bg">
      <Header />
      <LibraryView initialCharacters={characters || []} initialProjects={projects || []} initialCollections={collections || []} />
    </div>
  );
}
