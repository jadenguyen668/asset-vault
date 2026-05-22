import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const STORAGE_FETCH_TIMEOUT_MS = 15000;

function signToken(payload: Record<string, unknown>): string {
  const secret = process.env.R2_WORKER_SECRET!;
  const data = JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 });
  const hmac = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return Buffer.from(data).toString('base64url') + '.' + hmac;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number, timeoutMessage: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(timeoutMessage);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path } = await request.json();
    const normalizedPath = String(path || '').split('/').filter(Boolean).join('/');
    if (!normalizedPath) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    const token = signToken({ sub: user.id, path: normalizedPath, action: 'download' });
    const encodedPath = normalizedPath.split('/').map(encodeURIComponent).join('/');
    const workerUrl = `${process.env.R2_WORKER_URL}/download/${encodedPath}?token=${token}`;

    const upstream = await fetchWithTimeout(
      workerUrl,
      {},
      STORAGE_FETCH_TIMEOUT_MS,
      `Timed out while downloading "${normalizedPath}"`
    );

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      return NextResponse.json(
        { error: `Download failed for "${normalizedPath}" (${upstream.status}${detail ? `: ${detail}` : ''})` },
        { status: upstream.status >= 400 && upstream.status < 600 ? upstream.status : 500 }
      );
    }

    const headers = new Headers();
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/octet-stream');
    headers.set('Cache-Control', upstream.headers.get('Cache-Control') || 'private, max-age=60');

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to download file' }, { status: 500 });
  }
}
