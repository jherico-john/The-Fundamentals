// src/middleware.ts — v5
// /dashboard  → admin only.   /account → any signed-in customer (or admin).
// Edge-safe (Web Crypto). Redirects carry ?next= so login returns you to the
// page you wanted, and a signed-in CUSTOMER who opens /dashboard is sent to
// /account instead of being bounced to a login screen that cannot help them.
import { NextRequest, NextResponse } from 'next/server';
import { isAdminEdge, isCustomerEdge } from '@/lib/tokensEdge';

const ADMIN_COOKIE = 'adm_sess';
const CUST_COOKIE = 'cust_sess';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const admin = await isAdminEdge(req.cookies.get(ADMIN_COOKIE)?.value);
  const customer = await isCustomerEdge(req.cookies.get(CUST_COOKIE)?.value);

  if (pathname.startsWith('/dashboard')) {
    if (admin) return NextResponse.next();
    const url = req.nextUrl.clone();
    if (customer) { url.pathname = '/account'; url.search = ''; return NextResponse.redirect(url); }
    url.pathname = '/login'; url.search = `?next=${encodeURIComponent(pathname)}&admin=1`;
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith('/account')) {
    if (admin || customer) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = '/login'; url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ['/dashboard/:path*', '/account/:path*'] };
