import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { fetchFromN8n, safeJsonParse } from '@/lib/api-utils';

export async function GET() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const res = await fetchFromN8n('/webhook/studio-formats', jwt, {
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error(`Studio formats: n8n returned ${res.status}`);
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
  }

  const data = await safeJsonParse(res, 'studio-formats');
  if (!data) {
    return NextResponse.json({ error: 'Invalid response' }, { status: 502 });
  }

  return NextResponse.json(data);
}
