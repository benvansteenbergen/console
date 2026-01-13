import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// GET - Get brief and mode for a conversation
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
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/live-brief?conversationId=${conversationId}`;

    const response = await fetch(n8nUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        cookie: `auth=${jwt};`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        success: true,
        mode: 'sandbox',
        brief: {}
      });
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      mode: result.mode || 'sandbox',
      brief: result.brief || {}
    });
  } catch (error) {
    console.error('Live brief error:', error);
    return NextResponse.json({
      success: true,
      mode: 'sandbox',
      brief: {}
    });
  }
}

// POST - Update brief or mode for a conversation
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { conversationId, mode, brief } = body;

    if (!conversationId) {
      return NextResponse.json({ success: false, error: 'conversationId required' }, { status: 400 });
    }

    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/live-brief`;

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `auth=${jwt};`,
      },
      body: JSON.stringify({
        conversationId,
        mode: mode || null,
        brief: brief || null,
      }),
    });

    if (!response.ok) {
      console.error('n8n live brief update error:', response.status);
      return NextResponse.json({
        success: false,
        error: 'Failed to update brief'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Live brief update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update brief'
    }, { status: 500 });
  }
}
