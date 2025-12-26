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
    const { slug } = body;

    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug is required' }, { status: 400 });
    }

    // Forward to n8n webhook
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/datasource-linkedin-personal`;

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `auth=${jwt};`,
      },
      body: JSON.stringify({ slug }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n LinkedIn personal connection error:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Failed to connect LinkedIn profile.'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('LinkedIn personal connection error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to connect LinkedIn profile.'
    }, { status: 500 });
  }
}
