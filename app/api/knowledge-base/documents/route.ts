import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

interface N8nDocument {
  id: string;
  title: string;
  chunks: number;
  date: number;
  visibility: 'private' | 'shared';
  canDelete: boolean;
  cluster?: string;
}

export async function GET(_request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Forward to n8n webhook
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/knowledge-base-list`;

    const response = await fetch(n8nUrl, {
      method: 'GET',
      headers: {
        cookie: `auth=${jwt};`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n list error:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch documents.'
      }, { status: response.status });
    }

    const result = await response.json();

    // Transform n8n response to expected format
    // n8n returns: [{ "doc-id": { chunks, id, title, date } }]
    // We need: { success: true, documents: [{ document_id, title, chunks, creationTimeUnix }] }

    let documents = [];

    if (Array.isArray(result) && result.length > 0) {
      const docsObject = result[0];
      documents = Object.values(docsObject).map((doc: N8nDocument) => ({
        document_id: doc.id,
        title: doc.title,
        chunks: doc.chunks,
        creationTimeUnix: doc.date,
        visibility: doc.visibility,
        canDelete: doc.canDelete,
        cluster: doc.cluster || 'no_cluster',
      }));
    }

    return NextResponse.json({
      success: true,
      documents
    });
  } catch (error) {
    console.error('List documents error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch documents.'
    }, { status: 500 });
  }
}
