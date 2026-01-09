import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      conversationId: incomingConversationId,
      fileId,
      documentText,
      message,
      persona = 'general',
      mode = 'edit'
    } = body as {
      conversationId: string | null;
      fileId: string;
      documentText: string;
      message: string;
      persona?: string;
      mode?: 'edit' | 'feedback';
    };

    // Generate conversation ID if not provided
    const conversationId = incomingConversationId || crypto.randomUUID();

    // Forward to n8n webhook
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/review-chat`;

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `auth=${jwt};`,
      },
      body: JSON.stringify({
        conversationId,
        fileId,
        documentText,
        message,
        persona,
        mode,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n review-chat error:', errorText);
      return NextResponse.json({
        assistant_message: 'Failed to process your request. Please try again.',
        suggested_text: null,
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({
      assistant_message: 'An error occurred. Please try again.',
      suggested_text: null,
    }, { status: 500 });
  }
}
