import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createCustomer, getCustomerByEmail } from '@/lib/supabase';
import { signCustomerSession, CUST_COOKIE, custCookieOpts } from '@/lib/tokens';
import { rateLimit, clientIp } from '@/lib/rateLimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// v6 hardening: rate limit, input validation, no internal error text returned to the browser.
export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`register:${clientIp(req)}`, 8, 3600);
    if (!rl.ok) return NextResponse.json({ error: 'Too many sign-up attempts. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });

    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name : '';
    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 254) : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const referredByCode = typeof body.referredByCode === 'string' ? body.referredByCode.slice(0, 64) : null;
    if (!name || name.trim().length < 2 || name.length > 100) return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 });
    if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 });
    // bcrypt only uses the first 72 bytes, so longer passwords are rejected up front.
    if (!password || password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    if (Buffer.byteLength(password) > 72) return NextResponse.json({ error: 'Password is too long (maximum 72 characters).' }, { status: 400 });

    const existing = await getCustomerByEmail(email);
    if (existing) return NextResponse.json({ error: 'An account with this email already exists. Please log in.' }, { status: 409 });

    const hash = await bcrypt.hash(password, 12);
    const customer = await createCustomer(name.trim(), email.toLowerCase(), hash, referredByCode || null);
    const res = NextResponse.json({ success: true, customer: { id: customer.id, name: customer.name, email: customer.email } });
    res.cookies.set(CUST_COOKIE, signCustomerSession(customer.id, customer.email), custCookieOpts);
    return res;
  } catch (err: unknown) {
    console.error('[auth/register]', err);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
