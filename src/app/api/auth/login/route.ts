// src/app/api/auth/login/route.ts — v6 (hardened)
// • rate-limited per client IP and per email (brute-force protection)
// • constant-time admin credential comparison
// • one generic error for unknown email / wrong password (no account enumeration),
//   and a dummy bcrypt compare for unknown emails so response time does not leak it
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getCustomerByEmail } from '@/lib/supabase';
import { signCustomerSession, CUST_COOKIE, custCookieOpts, signAdminSession, ADMIN_COOKIE, adminCookieOpts } from '@/lib/tokens';
import { rateLimit, clientIp } from '@/lib/rateLimit';

const GENERIC = 'Incorrect email or password.';
// Valid bcrypt hash of a random string — used only to equalise timing.
const DUMMY_HASH = '$2a$10$4DDPpUdCanr0UrAp4b2xEuYcSUR8Yp2KTEJzSypb8njA8Av5HPr5y';

// Hash both sides so the comparison is constant-time regardless of length.
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export async function POST(req: NextRequest) {
  try {
    const ip = rateLimit(`login-ip:${clientIp(req)}`, 20, 900);
    if (!ip.ok) return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes and try again.' }, { status: 429, headers: { 'Retry-After': String(ip.retryAfter) } });

    const body = await req.json();
    const email = String(body.email || '').trim().slice(0, 254);
    const password = String(body.password || '').slice(0, 200);
    if (!email || !password) return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });

    const em = rateLimit(`login-em:${email.toLowerCase()}`, 8, 900);
    if (!em.ok) return NextResponse.json({ error: 'Too many attempts for this account. Please wait a few minutes and try again.' }, { status: 429, headers: { 'Retry-After': String(em.retryAfter) } });

    // Admin login
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPass = process.env.ADMIN_PASSWORD || '';
    if (adminEmail && adminPass && email.toLowerCase() === adminEmail) {
      if (safeEqual(password, adminPass)) {
        const res = NextResponse.json({ success: true, role: 'admin' });
        res.cookies.set(ADMIN_COOKIE, signAdminSession(), adminCookieOpts);
        return res;
      }
      return NextResponse.json({ error: GENERIC }, { status: 401 });
    }

    // Customer login
    const customer = await getCustomerByEmail(email);
    if (!customer) { await bcrypt.compare(password, DUMMY_HASH); return NextResponse.json({ error: GENERIC }, { status: 401 }); }
    const ok = await bcrypt.compare(password, customer.password_hash);
    if (!ok) return NextResponse.json({ error: GENERIC }, { status: 401 });
    const res = NextResponse.json({ success: true, role: 'customer', customer: { id: customer.id, name: customer.name, email: customer.email } });
    res.cookies.set(CUST_COOKIE, signCustomerSession(customer.id, customer.email), custCookieOpts);
    return res;
  } catch (err) {
    console.error('[auth/login]', err);
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
