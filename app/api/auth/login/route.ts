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

  /* ----- 2  build absolute URL using Host header ----- */
  const host   = req.headers.get('host')!;                     // e.g. console-production.up.railway.app
  const proto  = req.headers.get('x-forwarded-proto') ?? 'https';
  const target = new URL(`/dashboard`, `${proto}://${host}`);

  /* ----- 3  set cookie + redirect ----- */
  const res = NextResponse.redirect(target, { status: 303 });  // 303 = “See Other”
  res.cookies.set('session', token, {
    httpOnly: true,
    secure  : proto === 'https',
    sameSite: 'lax',
    path    : '/',
  });
  return res;
}
