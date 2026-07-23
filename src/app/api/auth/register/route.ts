import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createCustomer, getCustomerByEmail } from '@/lib/supabase';
import { signCustomerSession, CUST_COOKIE, custCookieOpts } from '@/lib/tokens';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, referredByCode } = await req.json();
    if (!name || name.trim().length < 2) return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 });
    if (!email || !email.includes('@')) return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 });
    if (!password || password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });

    const existing = await getCustomerByEmail(email);
    if (existing) return NextResponse.json({ error: 'An account with this email already exists. Please log in.' }, { status: 409 });

    const hash = await bcrypt.hash(password, 10);
    const customer = await createCustomer(name.trim(), email.toLowerCase(), hash, referredByCode || null);
    const res = NextResponse.json({ success: true, customer: { id: customer.id, name: customer.name, email: customer.email } });
    res.cookies.set(CUST_COOKIE, signCustomerSession(customer.id, customer.email), custCookieOpts);
    return res;
  } catch (err: unknown) {
    console.error('[auth/register]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Registration failed.' }, { status: 500 });
  }
}
