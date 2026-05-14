import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { fetchFromN8n, safeJsonParse } from '@/lib/api-utils';

// POST - Send message in brand interview conversation
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { conversationId, message } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const res = await fetchFromN8n('/webhook/company-profile-interview', jwt, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: conversationId || null,
        message,
      }),
    });

    if (!res.ok) {
      console.error(`Interview POST: n8n returned ${res.status}`);
      return NextResponse.json({ error: 'Failed to send message' }, { status: res.status });
    }

    const data = await safeJsonParse(res, 'interview POST');
    if (!data) {
      return NextResponse.json({ error: 'Invalid response' }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Interview error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
