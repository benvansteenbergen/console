import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// POST - Generate document from brief
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { conversationId, brief, selectedClusters, selectedDocuments } = body;

    if (!conversationId) {
      return NextResponse.json({ success: false, error: 'conversationId required' }, { status: 400 });
    }

    if (!brief) {
      return NextResponse.json({ success: false, error: 'brief required' }, { status: 400 });
    }

    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/live-production`;

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `auth=${jwt};`,
      },
      body: JSON.stringify({
        conversationId,
        brief,
        selectedClusters: selectedClusters || [],
        selectedDocuments: selectedDocuments || [],
      }),
    });

    if (!response.ok) {
      console.error('n8n live production error:', response.status);
      return NextResponse.json({
        success: false,
        error: 'Failed to generate document'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Live production error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate document'
    }, { status: 500 });
  }
}
