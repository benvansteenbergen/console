import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { fetchFromN8n, safeJsonParse } from '@/lib/api-utils';

// POST - Trigger website scan
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL required' }, { status: 400 });
    }

    const res = await fetchFromN8n('/webhook/website-scan', jwt, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      console.error(`Website scan POST: n8n returned ${res.status}`);
      return NextResponse.json({ error: 'Failed to start scan' }, { status: res.status });
    }

    const data = await safeJsonParse(res, 'website-scan POST');
    if (!data) {
      return NextResponse.json({ error: 'Invalid response' }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Website scan error:', error);
    return NextResponse.json({ error: 'Failed to start scan' }, { status: 500 });
  }
}

// GET - Get scan results + recommendations
export async function GET() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const res = await fetchFromN8n('/webhook/website-scan', jwt, {
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error(`Website scan GET: n8n returned ${res.status}`);
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
  }

  const data = await safeJsonParse(res, 'website-scan GET');
  if (!data) {
    return NextResponse.json({ error: 'Invalid response' }, { status: 502 });
  }

  return NextResponse.json(data);
}
