// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  /* 1 – read form */
  const form  = await req.formData();
  const email = form.get('emailOrLdapLoginId') as string | null;
  const pw    = form.get('password')           as string | null;
  if (!email || !pw) {
    return NextResponse.json({ error: 'missing-fields' }, { status: 400 });
  }

  /* 2 – forward to n8n */
  const r = await fetch(`${process.env.N8N_BASE_URL}/rest/login`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ emailOrLdapLoginId: email, password: pw }),
  });
  if (!r.ok) return NextResponse.json({ error: 'invalid' }, { status: 401 });

  /* 3 – grab the auth cookie from n8n */
  const rawSetCookie = r.headers.get('set-cookie');         // whole header
  const jwt = rawSetCookie
    ?.match(/n8n-auth=([^;]+)/)?.[1];                       // extract value

  if (!jwt) {
    return NextResponse.json({ error: 'no-token' }, { status: 500 });
  }

  /* 4 – set our own cookie + redirect */
  const host  = req.headers.get('host')!;
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const res   = NextResponse.redirect(
    new URL('/dashboard', `${proto}://${host}`), { status: 303 },
  );

  res.cookies.set('session', jwt, {
    httpOnly: true,
    secure  : proto === 'https',
    sameSite: 'lax',
    path    : '/',
  });

  return res;
}
