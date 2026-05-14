import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { fetchFromN8n, safeJsonParse } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { content, title, format } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 });
    }

    const res = await fetchFromN8n('/webhook/studio-save', jwt, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title, format }),
    });

    if (!res.ok) {
      console.error(`Studio save: n8n returned ${res.status}`);
      return NextResponse.json({ error: 'Failed to save' }, { status: res.status });
    }

    const data = await safeJsonParse(res, 'studio-save');
    if (!data) {
      return NextResponse.json({ error: 'Invalid response' }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Studio save error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
