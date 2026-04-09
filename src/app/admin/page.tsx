import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { redirect } from 'next/navigation';
import { AdminPanel } from '@/components/auth/AdminPanel';

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/library');
  const { data: users } = await supabase.from('profiles').select('*').order('created_at');
  return (
    <div className="flex h-screen flex-col bg-bg"><Header /><div className="flex-1 overflow-y-auto p-8"><AdminPanel users={users || []} /></div></div>
  );
}
