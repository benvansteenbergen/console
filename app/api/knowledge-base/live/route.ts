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
    const { sessionId, query, selectedClusters, excludedDocuments, contentFormat, toneOfVoice } = body;

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 });
    }

    // Forward to n8n webhook
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/knowledge-base-live`;

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `auth=${jwt};`,
      },
      body: JSON.stringify({
        sessionId,
        query,
        selectedClusters: selectedClusters || [],
        excludedDocuments: excludedDocuments || [],
        contentFormat: contentFormat || null,
        toneOfVoice: toneOfVoice || null,
      }),
    });

    if (!response.ok) {
      console.error('n8n live chat error:', response.status);
      return NextResponse.json({
        success: false,
        error: 'Failed to generate content'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Live chat error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate content'
    }, { status: 500 });
  }
}
