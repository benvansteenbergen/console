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

    // Handle both single screenshot (legacy) and multiple screenshots
    const singleScreenshot = formData.get('screenshot') as File | null;
    const multipleScreenshots = formData.getAll('screenshots') as File[];

    const screenshots: File[] = [];

    if (singleScreenshot) {
      screenshots.push(singleScreenshot);
    }

    if (multipleScreenshots.length > 0) {
      screenshots.push(...multipleScreenshots);
    }

    if (screenshots.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one screenshot is required' }, { status: 400 });
    }

    // Forward to n8n webhook with multipart/form-data
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/datasource-linkedin-company-analyse`;

    const n8nFormData = new FormData();

    // Append all screenshots
    screenshots.forEach((screenshot, index) => {
      n8nFormData.append(`screenshot_${index}`, screenshot);
    });

    // Also send count for n8n to know how many to process
    n8nFormData.append('screenshot_count', screenshots.length.toString());

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        cookie: `auth=${jwt};`,
      },
      body: n8nFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n LinkedIn company analyse error:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Failed to analyse LinkedIn company page.'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('LinkedIn company analyse error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyse LinkedIn company page.'
    }, { status: 500 });
  }
}
