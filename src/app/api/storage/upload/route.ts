import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

function signToken(payload: Record<string, unknown>): string {
  const secret = process.env.R2_WORKER_SECRET!;
  const data = JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 });
  const hmac = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return Buffer.from(data).toString('base64url') + '.' + hmac;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role === 'viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { characterId, filename } = await request.json();
  const token = signToken({ sub: user.id, charId: characterId, filename, action: 'upload' });
  const url = `${process.env.R2_WORKER_URL}/upload/${user.id}/${characterId}/${filename}`;
  return NextResponse.json({ url, token });
}

export async function DELETE(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { characterId } = await request.json();
  const token = signToken({ sub: user.id, charId: characterId, action: 'delete' });
  const res = await fetch(`${process.env.R2_WORKER_URL}/delete/${user.id}/${characterId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
  if (!res.ok) return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  return NextResponse.json({ success: true });
}
