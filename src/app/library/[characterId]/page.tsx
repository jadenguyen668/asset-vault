import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { CharacterViewer } from '@/components/viewer/CharacterViewer';
import { redirect, notFound } from 'next/navigation';

export default async function CharacterPage({ params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: character } = await supabase
    .from('characters')
    .select('*')
    .eq('id', parseInt(characterId))
    .single();

  if (!character) notFound();

  // Update last viewed
  await supabase.from('characters').update({ last_viewed_at: new Date().toISOString() }).eq('id', character.id);

  return (
    <div className="flex h-screen flex-col bg-bg">
      <Header />
      <CharacterViewer character={character} />
    </div>
  );
}
