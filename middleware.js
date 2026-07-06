import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from './lib/auth.config.js';
import {
  getDefaultHomePath,
  isApiAllowedForRole,
  isPathAllowedForRole,
} from './lib/permissions.js';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;
  const role = req.auth?.user?.role;

  if (pathname.startsWith('/login')) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(getDefaultHomePath(role), req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/api/')) {
    if (!isApiAllowedForRole(role, pathname)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (pathname === '/' || pathname === '/dashboard') {
    const home = getDefaultHomePath(role);
    if (pathname !== home) {
      return NextResponse.redirect(new URL(home, req.url));
    }
  }

  if (!isPathAllowedForRole(role, pathname)) {
    return NextResponse.redirect(new URL(getDefaultHomePath(role), req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
