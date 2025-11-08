// app/api/move-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { fileId, targetFolderId } = body;

  if (!fileId || !targetFolderId) {
    return NextResponse.json(
      { error: 'Missing fileId or targetFolderId' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `${process.env.N8N_BASE_URL}/webhook/move-file`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `auth=${jwt};`,
        },
        body: JSON.stringify({ fileId, targetFolderId }),
      }
    );

    if (!res.ok) {
      console.error('N8N move file failed:', res.status, await res.text());
      return NextResponse.json(
        { error: 'Failed to move file' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Move file error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
