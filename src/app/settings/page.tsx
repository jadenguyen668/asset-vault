import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { redirect } from 'next/navigation';
import { SettingsForm } from '@/components/auth/SettingsForm';

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return (
    <div className="flex h-screen flex-col bg-bg"><Header /><div className="flex flex-1 items-start justify-center overflow-y-auto p-8"><SettingsForm profile={profile} /></div></div>
  );
}
