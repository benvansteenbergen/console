import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { fetchFromN8n, safeJsonParse } from '@/lib/api-utils';

const ACTIONS = ['create', 'rename', 'delete'];

export async function GET() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const res = await fetchFromN8n('/webhook/knowledge-base-folders', jwt);
  const data = await safeJsonParse(res, 'knowledge-base-folders');

  if (!data) {
    return NextResponse.json({ success: true, folders: [] });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { action, folder_id, name } = body;

  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 });
  }
  if ((action === 'create' || action === 'rename') && !String(name || '').trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }
  if ((action === 'rename' || action === 'delete') && !folder_id) {
    return NextResponse.json({ error: 'folder_id required' }, { status: 400 });
  }

  const res = await fetchFromN8n('/webhook/knowledge-base-folders', jwt, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, folder_id, name }),
  });

  const data = await safeJsonParse(res, 'knowledge-base-folders');

  if (!data) {
    return NextResponse.json({ error: 'upstream error' }, { status: 502 });
  }

  return NextResponse.json(data);
}
