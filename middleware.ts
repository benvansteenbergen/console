import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const isProtected = req.nextUrl.pathname.startsWith('/dashboard');
  const hasSession  = !!req.cookies.get('session')?.value;

  if (isProtected && !hasSession) {
    const login = new URL('/login', req.url);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],   // add more protected paths here
};
