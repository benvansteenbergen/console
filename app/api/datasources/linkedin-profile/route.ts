import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch LinkedIn profile from n8n
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/datasource-linkedin-profile`;

    const response = await fetch(n8nUrl, {
      method: 'GET',
      headers: {
        cookie: `auth=${jwt};`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n LinkedIn profile fetch error:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch LinkedIn profile.'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('LinkedIn profile fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch LinkedIn profile.'
    }, { status: 500 });
  }
}
