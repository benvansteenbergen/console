import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { fetchFromN8n, safeJsonParse } from '@/lib/api-utils';

/** Move documents into a folder ('' = Unfiled). Only the user's own documents are moved. */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { document_ids, folder_id } = body;

  if (!Array.isArray(document_ids) || document_ids.length === 0) {
    return NextResponse.json({ error: 'document_ids required' }, { status: 400 });
  }

  const res = await fetchFromN8n('/webhook/knowledge-base-move', jwt, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_ids: document_ids.slice(0, 200), folder_id: folder_id || '' }),
  });

  let data = await safeJsonParse(res, 'knowledge-base-move');

  // n8n allIncomingItems returns an array — unwrap single item
  if (Array.isArray(data)) data = data[0];

  if (!data) {
    return NextResponse.json({ error: 'upstream error' }, { status: 502 });
  }

  return NextResponse.json(data);
}
