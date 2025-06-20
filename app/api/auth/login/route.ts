import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const res = await fetch(`${process.env.N8N_BASE_URL}/rest/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrLdapLoginId: email, password: password }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'invalid' }, { status: 401 });
  }

  const { token } = await res.json();

  /** create the response first… */
  const response = NextResponse.json({ ok: true });

  /** …then write the cookie on the *response* cookie store */
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });

  return response;
}
