import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// GET - Get assistant profile settings
export async function GET() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/live-assistant-profile`;

    const response = await fetch(n8nUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        cookie: `auth=${jwt};`,
      },
    });

    if (!response.ok) {
      console.error('n8n live assistant profile error:', response.status);
      return NextResponse.json({
        success: false,
        error: 'Failed to load assistant profile'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Live assistant profile error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load assistant profile'
    }, { status: 500 });
  }
}

// POST - Update assistant profile settings
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, goals, instructions, personality, defaultAudience, defaultLanguage } = body;

    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/live-assistant-profile`;

    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `auth=${jwt};`,
      },
      body: JSON.stringify({
        name: name || null,
        goals: goals || null,
        instructions: instructions || null,
        personality: personality || null,
        defaultAudience: defaultAudience || null,
        defaultLanguage: defaultLanguage || 'nl',
      }),
    });

    if (!response.ok) {
      console.error('n8n live assistant profile update error:', response.status);
      return NextResponse.json({
        success: false,
        error: 'Failed to update assistant profile'
      }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Live assistant profile update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update assistant profile'
    }, { status: 500 });
  }
}
