import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET - Get unread message count for the user
export async function GET() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const n8nUrl = `${process.env.N8N_BASE_URL}/webhook/live-unread-count`;

    const response = await fetch(n8nUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        cookie: `auth=${jwt};`,
      },
    });

    if (!response.ok) {
      // Return 0 count on error to avoid breaking the UI
      return NextResponse.json({ success: true, count: 0 });
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      count: result.count || 0,
    });
  } catch (error) {
    console.error('Live unread count error:', error);
    // Return 0 count on error to avoid breaking the UI
    return NextResponse.json({ success: true, count: 0 });
  }
}
