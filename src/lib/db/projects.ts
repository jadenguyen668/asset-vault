import { createClient } from '@/lib/supabase/client';
import type { Project } from '@/types/database';

export async function getAllProjects(): Promise<Project[]> {
  const supabase = createClient();
  const { data } = await supabase.from('projects').select('*').order('created_at');
  return data || [];
}

export async function createProject(name: string, code: string, color?: string): Promise<number> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('projects').insert({ name, code, color: color || '#7c5cfc', user_id: user.id }).select('id').single();
  if (error) throw error;
  return data.id;
}
