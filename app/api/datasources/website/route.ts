import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
    }

    // Forward to n8n webhook
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/datasource-website`;

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `auth=${jwt};`,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n website connection error:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Failed to connect website.'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Website connection error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to connect website.'
    }, { status: 500 });
  }
}
