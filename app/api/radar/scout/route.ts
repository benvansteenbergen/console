import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { fetchFromN8n, safeJsonParse } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { mode, message, session_id, history } = body;

  if (!mode) {
    return NextResponse.json({ error: 'mode required' }, { status: 400 });
  }

  const res = await fetchFromN8n('/webhook/radar-scout', jwt, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, message, session_id, history }),
  });

  let data = await safeJsonParse(res, 'radar-scout');

  if (!data) {
    return NextResponse.json({ error: 'upstream error' }, { status: 502 });
  }

  // n8n allIncomingItems returns an array — unwrap single item
  if (Array.isArray(data)) data = data[0];

  return NextResponse.json(data);
}
