import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { fetchFromN8n, safeJsonParse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const scoutId = request.nextUrl.searchParams.get('scout_id');
  const qs = scoutId ? `?scout_id=${encodeURIComponent(scoutId)}` : '';
  const res = await fetchFromN8n(`/webhook/radar-priorities${qs}`, jwt);
  let data = await safeJsonParse(res, 'radar-priorities');

  if (!data) {
    return NextResponse.json({ success: true, markdown: '' });
  }

  // n8n allIncomingItems returns an array — unwrap single item
  if (Array.isArray(data)) data = data[0];

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { markdown, scout_id } = body;

  const res = await fetchFromN8n('/webhook/radar-priorities', jwt, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markdown, scout_id }),
  });

  const data = await safeJsonParse(res, 'radar-priorities');

  if (!data) {
    return NextResponse.json({ error: 'upstream error' }, { status: 502 });
  }

  return NextResponse.json(data);
}
