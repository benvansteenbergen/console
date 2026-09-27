import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { fetchFromN8n, safeJsonParse } from '@/lib/api-utils';

export async function GET() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const res = await fetchFromN8n('/webhook/radar-scouts-list', jwt);
  let data = await safeJsonParse(res, 'radar-scouts-list');

  if (!data) {
    return NextResponse.json({ success: true, scouts: [] });
  }

  // n8n allIncomingItems returns an array — unwrap single item
  if (Array.isArray(data)) data = data[0];

  return NextResponse.json(data);
}
