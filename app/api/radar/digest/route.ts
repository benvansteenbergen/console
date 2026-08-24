import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { fetchFromN8n, safeJsonParse } from '@/lib/api-utils';

export async function GET() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const res = await fetchFromN8n('/webhook/radar-digest-pref', jwt);
  let data = await safeJsonParse(res, 'radar-digest-pref');

  if (!data) {
    return NextResponse.json({ success: true, enabled: true });
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
  const { enabled } = body;

  const res = await fetchFromN8n('/webhook/radar-digest-pref', jwt, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: enabled !== false }),
  });

  let data = await safeJsonParse(res, 'radar-digest-pref');

  if (!data) {
    return NextResponse.json({ error: 'upstream error' }, { status: 502 });
  }

  if (Array.isArray(data)) data = data[0];

  return NextResponse.json(data);
}
