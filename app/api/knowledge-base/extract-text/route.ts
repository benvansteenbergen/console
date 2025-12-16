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
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Forward to n8n webhook
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/knowledge-base-extract-text`;

    const n8nFormData = new FormData();
    n8nFormData.append('file', file);

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        cookie: `auth=${jwt};`,
      },
      body: n8nFormData,
    });

    if (!response.ok) {
      console.error('n8n extract-text error:', response.status);
      return NextResponse.json({
        success: false,
        error: 'Failed to extract text from PDF'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Extract text error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to extract text from PDF'
    }, { status: 500 });
  }
}
