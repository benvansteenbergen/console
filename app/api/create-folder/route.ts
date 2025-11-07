// app/api/create-folder/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { parentFolder, folderName } = body;

  if (!parentFolder || !folderName) {
    return NextResponse.json(
      { error: 'Missing parentFolder or folderName' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `${process.env.N8N_BASE_URL}/webhook/create-folder`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `auth=${jwt};`,
        },
        body: JSON.stringify({ parentFolder, folderName }),
      }
    );

    if (!res.ok) {
      console.error('N8N create folder failed:', res.status, await res.text());
      return NextResponse.json(
        { error: 'Failed to create folder' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Create folder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
