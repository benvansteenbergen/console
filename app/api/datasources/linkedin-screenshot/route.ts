import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const screenshot = formData.get('screenshot') as File;

    if (!screenshot) {
      return NextResponse.json({ success: false, error: 'Screenshot is required' }, { status: 400 });
    }

    // Forward to n8n webhook with multipart/form-data
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/datasource-linkedin-screenshot`;

    const n8nFormData = new FormData();
    n8nFormData.append('screenshot', screenshot);

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        cookie: `auth=${jwt};`,
      },
      body: n8nFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n LinkedIn screenshot processing error:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Failed to process LinkedIn screenshot.'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('LinkedIn screenshot processing error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process LinkedIn screenshot.'
    }, { status: 500 });
  }
}
