import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { fetchFromN8n, safeJsonParse } from '@/lib/api-utils';

/** "Ask your knowledge base": answers from the user's documents, scoped to all / folders / one document. */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { message, history, scope } = body;

  if (!String(message || '').trim()) {
    return NextResponse.json({ error: 'message required' }, { status: 400 });
  }

  const res = await fetchFromN8n('/webhook/kb-chat', jwt, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: String(message).slice(0, 4000),
      history: Array.isArray(history) ? history.slice(-10) : [],
      scope: scope || { mode: 'all' },
    }),
  });

  let data = await safeJsonParse(res, 'kb-chat');

  // n8n allIncomingItems returns an array — unwrap single item
  if (Array.isArray(data)) data = data[0];

  if (!data) {
    return NextResponse.json({ error: 'upstream error' }, { status: 502 });
  }

  return NextResponse.json(data);
}
