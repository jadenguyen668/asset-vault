import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { redirect, notFound } from 'next/navigation';

export default async function CharacterPage({ params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: character } = await supabase.from('characters').select('*').eq('id', parseInt(characterId)).single();
  if (!character) notFound();
  await supabase.from('characters').update({ last_viewed_at: new Date().toISOString() }).eq('id', character.id);
  return (
    <div className="flex h-screen flex-col bg-bg">
      <Header />
      <div className="flex flex-1 items-center justify-center text-dim">
        <p>Viewer for: {character.name} — Spine viewer component will be mounted here</p>
      </div>
    </div>
  );
}
