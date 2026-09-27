import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { KB_MAX_BYTES, kbFileType, textFileName, wordToText } from '@/lib/kbFiles';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get form data from request
    const formData = await request.formData();

    // Validate file exists
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (file.size > KB_MAX_BYTES) {
      return NextResponse.json({ success: false, error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const type = kbFileType(file.name);
    if (!type) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Only PDF and Word (.docx, .doc) files are allowed.'
      }, { status: 400 });
    }

    // Word files are converted to plain text here and sent as a .txt file; n8n reads PDF and text.
    let upload: Blob = file;
    let uploadName = file.name;
    if (type !== 'pdf') {
      const text = await wordToText(Buffer.from(await file.arrayBuffer()), type);
      if (!text) {
        return NextResponse.json({ success: false, error: 'This document has no readable text.' }, { status: 400 });
      }
      upload = new Blob([text], { type: 'text/plain' });
      uploadName = textFileName(file.name);
    }

    // Forward to n8n webhook
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/knowledge-base-upload`;

    // Create new FormData to forward to n8n
    const n8nFormData = new FormData();
    n8nFormData.append('file', upload, uploadName);
    n8nFormData.append('title', formData.get('title') as string || file.name.replace(/\.[^.]+$/, ''));
    n8nFormData.append('description', formData.get('description') as string || '');
    n8nFormData.append('cluster', formData.get('cluster') as string || 'no_cluster');
    n8nFormData.append('visibility', formData.get('visibility') === 'shared' ? 'shared' : 'private');
    n8nFormData.append('folder_id', formData.get('folder_id') as string || '');
    n8nFormData.append('file_type', type);

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        cookie: `auth=${jwt};`,
      },
      body: n8nFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n upload error:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Upload failed. Please try again.'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'Upload failed. Please try again.'
    }, { status: 500 });
  }
}
