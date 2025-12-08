import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Forward to n8n webhook
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/knowledge-base-delete?documentId=${id}`;

    const response = await fetch(n8nUrl, {
      method: 'DELETE',
      headers: {
        cookie: `auth=${jwt};`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n delete error:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete document.'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete document.'
    }, { status: 500 });
  }
}
