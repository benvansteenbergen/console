import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { fetchFromN8n, safeJsonParse } from '@/lib/api-utils';

/**
 * Documents + the user's folders for the knowledge base page.
 * (The older /api/knowledge-base/documents stays as-is for the legacy LiveChat.)
 */
export async function GET() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const res = await fetchFromN8n('/webhook/knowledge-base-documents', jwt);
  let data = await safeJsonParse(res, 'knowledge-base-documents');

  // n8n allIncomingItems returns an array — unwrap single item
  if (Array.isArray(data)) data = data[0];

  if (!data) {
    return NextResponse.json({ error: 'upstream error' }, { status: 502 });
  }

  return NextResponse.json(data);
}
