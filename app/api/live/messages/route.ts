import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// GET - Get messages for a conversation
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const conversationId = request.nextUrl.searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json({ success: false, error: 'conversationId required' }, { status: 400 });
  }

  try {
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/live-messages?conversationId=${conversationId}`;

    const response = await fetch(n8nUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        cookie: `auth=${jwt};`,
      },
    });

    if (!response.ok) {
      console.error('n8n live messages error:', response.status);
      return NextResponse.json({
        success: false,
        error: 'Failed to load messages'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Live messages error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load messages'
    }, { status: 500 });
  }
}

// POST - Send a message (creates conversation if needed)
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { conversationId, message, contentFormat, toneOfVoice, selectedClusters, selectedDocuments } = body;

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message required' }, { status: 400 });
    }

    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/live-message`;

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `auth=${jwt};`,
      },
      body: JSON.stringify({
        conversationId: conversationId || null,
        message,
        contentFormat: contentFormat || null,
        toneOfVoice: toneOfVoice || null,
        selectedClusters: selectedClusters || [],
        selectedDocuments: selectedDocuments || [],
      }),
    });

    if (!response.ok) {
      console.error('n8n live message error:', response.status);
      return NextResponse.json({
        success: false,
        error: 'Failed to send message'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Live message error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send message'
    }, { status: 500 });
  }
}
