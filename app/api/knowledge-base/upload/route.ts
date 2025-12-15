import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['.pdf'];
    const fileExtension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Only PDF files are allowed.'
      }, { status: 400 });
    }

    // Forward to n8n webhook
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/knowledge-base-upload`;

    // Create new FormData to forward to n8n
    const n8nFormData = new FormData();
    n8nFormData.append('file', file);
    n8nFormData.append('title', formData.get('title') as string || file.name);
    n8nFormData.append('description', formData.get('description') as string || '');
    n8nFormData.append('tags', formData.get('tags') as string || '');
    n8nFormData.append('visibility', formData.get('visibility') as string || 'private');

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
