import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET - List all conversations for the user
export async function GET() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/live-conversations`;

    const response = await fetch(n8nUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        cookie: `auth=${jwt};`,
      },
    });

    if (!response.ok) {
      console.error('n8n live conversations error:', response.status);
      return NextResponse.json({
        success: false,
        error: 'Failed to load conversations'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Live conversations error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load conversations'
    }, { status: 500 });
  }
}
