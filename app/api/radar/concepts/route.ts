import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { fetchFromN8n, safeJsonParse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get('status');
  const unseen = request.nextUrl.searchParams.get('unseen');

  let qs = status ? `?status=${encodeURIComponent(status)}` : '';
  if (unseen === 'true') qs += `${qs ? '&' : '?'}unseen=true`;

  const res = await fetchFromN8n(`/webhook/radar-concepts-list${qs}`, jwt);
  let data = await safeJsonParse(res, 'radar-concepts-list');

  if (!data) {
    return NextResponse.json({ success: true, concepts: [] });
  }

  // n8n allIncomingItems returns an array — unwrap single item
  if (Array.isArray(data)) data = data[0];

  return NextResponse.json(data);
}
