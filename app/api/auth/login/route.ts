import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { emailOrLdapLoginId, password } = await req.json();

  const res = await fetch(`${process.env.N8N_BASE_URL}/rest/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrLdapLoginId, password }),
  });
  if (!res.ok) return NextResponse.json({ error: 'invalid' }, { status: 401 });

  const { token } = await res.json();                 // or use API key

  const response = NextResponse.redirect(
    new URL('/dashboard', req.url),                   // 303 → /dashboard
  );
  response.cookies.set('session', token, {            // write cookie here
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
