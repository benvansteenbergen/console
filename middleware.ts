import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Allow iframe redirect from n8n form completion to land without auth.
  // The parent page (create/[type]) is authenticated; this just lets the
  // iframe load so checkForExecution can read the execution query param.
  if (req.nextUrl.pathname.includes('/progress')) {
    return NextResponse.next();
  }

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
