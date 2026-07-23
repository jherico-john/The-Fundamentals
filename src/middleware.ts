import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, ADMIN_COOKIE } from '@/lib/tokens';
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!verifyAdminSession(req.cookies.get(ADMIN_COOKIE)?.value || ''))
      return NextResponse.redirect(new URL('/login?admin=1', req.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ['/dashboard/:path*'] };
