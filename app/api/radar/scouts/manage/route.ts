import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { fetchFromN8n, safeJsonParse } from '@/lib/api-utils';

const ACTIONS = ['rename', 'pause', 'resume', 'archive'];

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { scout_id, action, name } = body;

  if (!scout_id || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'scout_id and a valid action required' }, { status: 400 });
  }
  if (action === 'rename' && !String(name || '').trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  const res = await fetchFromN8n('/webhook/radar-scout-manage', jwt, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scout_id, action, name }),
  });

  const data = await safeJsonParse(res, 'radar-scout-manage');

  if (!data) {
    return NextResponse.json({ error: 'upstream error' }, { status: 502 });
  }

  return NextResponse.json(data);
}
