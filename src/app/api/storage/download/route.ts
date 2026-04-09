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
  const { path } = await request.json();
  const token = signToken({ sub: user.id, path, action: 'download' });
  const url = `${process.env.R2_WORKER_URL}/download/${path}?token=${token}`;
  return NextResponse.json({ url });
}
