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
    const textExcerpt = formData.get('excerpt') as string;

    if (!textExcerpt || textExcerpt.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No text excerpt provided'
      }, { status: 400 });
    }

    // Forward to n8n webhook
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/knowledge-base-analyze`;

    const n8nFormData = new FormData();
    n8nFormData.append('excerpt', textExcerpt);

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        cookie: `auth=${jwt};`,
      },
      body: n8nFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n knowledge-base-analyze error:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Cannot connect to helper agent. But can proceed.'
      });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({
      success: false,
      error: 'Cannot connect to helper agent. But can proceed.'
    });
  }
}
