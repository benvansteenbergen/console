import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Forward to n8n webhook
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/tone-of-voice`;

    const response = await fetch(n8nUrl, {
      method: 'GET',
      headers: {
        cookie: `auth=${jwt};`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n tone-of-voice error:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch tone of voice options.'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Tone of voice error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tone of voice options.'
    }, { status: 500 });
  }
}
