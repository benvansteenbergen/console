// app/api/delete-document/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('session')?.value;

  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${process.env.N8N_BASE_URL}/webhook/delete-document?fileId=${fileId}`,
      {
        method: 'POST',
        headers: { cookie: `auth=${jwt};` },
      }
    );

    if (!res.ok) {
      console.error('N8N delete failed:', res.status, await res.text());
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
