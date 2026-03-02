import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const hasSession = !!req.cookies.get('session')?.value;

  if (!hasSession) {
    const login = new URL('/login', req.url);
    login.searchParams.set('returnTo', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  // All routes under (protected) group
  matcher: [
    '/dashboard/:path*',
    '/editor/:path*',
    '/content/:path*',
    '/live/:path*',
    '/settings/:path*',
    '/create/:path*',
    '/company-private-storage/:path*',
  ],
};
