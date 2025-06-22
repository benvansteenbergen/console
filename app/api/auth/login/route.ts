// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { parse } from 'cookie';

export async function POST(req: Request) {
  const form = await req.formData();
  const email = form.get('emailOrLdapLoginId');
  const password = form.get('password');

  if (!email || !password) {
    return NextResponse.json({ error: 'missing-fields' }, { status: 400 });
  }

  const apiRes = await fetch(`${process.env.N8N_BASE_URL}/rest/login`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ emailOrLdapLoginId: email, password }),
  });

  if (!apiRes.ok) {
    return NextResponse.json({ error: 'invalid-credentials' }, { status: 401 });
  }

  const setCookie = apiRes.headers.get('set-cookie');
  const { 'n8n-auth': n8nJwt } = parse(setCookie ?? '');

  if (!n8nJwt) {
    return NextResponse.json({ error: 'token-missing' }, { status: 502 });
  }

  // TODO: optionally decode & verify the JWT here

  const res = NextResponse.redirect(new URL('/dashboard', req.url), { status: 303 });
  res.cookies.set({
    name   : 'session',
    value  : n8nJwt,
    httpOnly: true,
    secure : true,
    sameSite: 'lax',
    maxAge : 60 * 60 * 8, // 8 h
    path   : '/',
  });
  return res;
}