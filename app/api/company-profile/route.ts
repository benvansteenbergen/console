import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { fetchFromN8n, safeJsonParse } from '@/lib/api-utils';

// GET - Fetch company profile summary + status
export async function GET() {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const res = await fetchFromN8n('/webhook/company-profile', jwt, {
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error(`Company profile GET: n8n returned ${res.status}`);
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
  }

  const data = await safeJsonParse(res, 'company-profile GET');
  if (!data) {
    return NextResponse.json({ error: 'Invalid response' }, { status: 502 });
  }

  return NextResponse.json(data);
}

// PUT - Update company profile summary
export async function PUT(request: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const res = await fetchFromN8n('/webhook/company-profile', jwt, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`Company profile PUT: n8n returned ${res.status}`);
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
  }

  const data = await safeJsonParse(res, 'company-profile PUT');
  if (!data) {
    return NextResponse.json({ error: 'Invalid response' }, { status: 502 });
  }

  return NextResponse.json(data);
}
