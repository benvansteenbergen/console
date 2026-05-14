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
    const { conversationId, message, contentFormat, useKnowledgeBase, usePersonalVoice } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const res = await fetchFromN8n('/webhook/studio-message', jwt, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: conversationId || null,
        message,
        contentFormat: contentFormat || null,
        useKnowledgeBase: useKnowledgeBase !== false,
        usePersonalVoice: usePersonalVoice !== false,
      }),
    });

    if (!res.ok) {
      console.error(`Studio message: n8n returned ${res.status}`);
      return NextResponse.json({ error: 'Failed to send message' }, { status: res.status });
    }

    const data = await safeJsonParse(res, 'studio-message');
    if (!data) {
      return NextResponse.json({ error: 'Invalid response' }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Studio message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
