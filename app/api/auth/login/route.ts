// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { parse } from 'cookie';

function redirectToLogin(code: string) {
  return NextResponse.redirect(`${process.env.CONSOLE_BASE_URL}/login?error=${code}`, 303);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const email = form.get('emailOrLdapLoginId');
  const password = form.get('password');

  if (!email || !password) {
    return redirectToLogin('missing-fields');
  }
  const apiRes = await fetch(`${process.env.N8N_BASE_URL}/rest/login`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ emailOrLdapLoginId: email, password }),
  });

  if (!apiRes.ok) {
    return redirectToLogin('invalid-credentials');
  }

  const setCookie = apiRes.headers.get('set-cookie');
  const { 'n8n-auth': n8nJwt } = parse(setCookie ?? '');

  if (!n8nJwt) {
    return redirectToLogin('token-missing');
  }

  const res = NextResponse.redirect(`${process.env.CONSOLE_BASE_URL}/dashboard`, 303);
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