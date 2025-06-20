// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  /* 1️⃣  Extract fields from the HTML form */
  const form = await req.formData();
  const emailOrLdapLoginId = form.get('emailOrLdapLoginId') as string | null;
  const password           = form.get('password')            as string | null;

  if (!emailOrLdapLoginId || !password) {
    return NextResponse.json({ error: 'missing-fields' }, { status: 400 });
  }

  /* 2️⃣  Forward to n8n */
  const r = await fetch(`${process.env.N8N_BASE_URL}/rest/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrLdapLoginId, password }),
  });

  if (!r.ok) {
    return NextResponse.json({ error: 'invalid' }, { status: 401 });
  }

  const { token } = await r.json();

  /* 3️⃣  Set cookie + redirect */
  const res = NextResponse.redirect('/dashboard');  // ← same-origin redirect
  res.cookies.set('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
  return res;
}
