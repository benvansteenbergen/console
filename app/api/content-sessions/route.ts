import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { fetchFromN8n, safeJsonParse } from '@/lib/api-utils';

interface ContentSession {
  conversationId: string;
  contentType: string;
  message: string;
  scheduledAt: string;
}

interface ContentSessionsResponse {
  success: boolean;
  sessions: ContentSession[];
}

export async function GET() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const res = await fetchFromN8n('/webhook/content-sessions', jwt);
  const data = await safeJsonParse<ContentSessionsResponse>(res, 'content-sessions');

  if (!data) {
    return NextResponse.json({ success: true, sessions: [] });
  }

  return NextResponse.json(data);
}
