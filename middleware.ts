import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, COOKIE_NAME } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /admin routes except /admin/login
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = req.cookies.get(COOKIE_NAME)?.value;

    if (!token || !(await verifyAdminToken(token))) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      const res = NextResponse.redirect(loginUrl);
      if (token) res.cookies.delete(COOKIE_NAME);
      return res;
    }

    return NextResponse.next();
  }

  // If user is logged in and accesses /admin/login, redirect to /admin
  if (pathname === '/admin/login') {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (token && (await verifyAdminToken(token))) {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
