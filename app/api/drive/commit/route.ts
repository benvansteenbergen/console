import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const jwt = cookieStore.get('session')?.value;

    if (!jwt) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { fileId, content } = await req.json();

    if (!fileId || !content) {
      return NextResponse.json(
        { error: 'fileId and content are required' },
        { status: 400 }
      );
    }

    // Call n8n save-document webhook (PUT method)
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/save-document`;

    const response = await fetch(n8nUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        cookie: `auth=${jwt};`,
      },
      body: JSON.stringify({
        fileId,
        content, // Markdown content - n8n will convert to HTML if needed
      }),
    });

    if (!response.ok) {
      console.error('n8n save-document error:', response.status);
      return NextResponse.json(
        { error: 'Failed to save document' },
        { status: 502 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      fileId,
      content,
      ...data,
    });
  } catch (error) {
    console.error('Commit API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
