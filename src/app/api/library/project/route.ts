import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

    const { name, code, color } = await request.json();

    if (!name || !code || !color) {
      return NextResponse.json({ error: 'Missing project name, code, or color' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('projects')
      .insert([{ user_id: user.id, name, code, color }])
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create project' }, { status: 500 });
  }
}
