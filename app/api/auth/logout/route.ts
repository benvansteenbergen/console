// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true });

  // Clear the session cookie by setting it with maxAge: 0
  res.cookies.set({
    name: 'session',
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0, // Expire immediately
    path: '/',
  });

  return res;
}
