import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// POST - Update conversation status (archive/unarchive)
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { conversationId, status } = body;

    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/live-archive`;

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `auth=${jwt};`,
      },
      body: JSON.stringify({
        conversationId,
        status: status ?? 'archived',
      }),
    });

    if (!response.ok) {
      console.error('n8n live archive error:', response.status);
      return NextResponse.json({
        success: false,
        error: 'Failed to update conversation status'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Live archive error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update conversation status'
    }, { status: 500 });
  }
}
