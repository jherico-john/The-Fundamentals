import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getCustomerByEmail } from '@/lib/supabase';
import { signCustomerSession, CUST_COOKIE, custCookieOpts, signAdminSession, ADMIN_COOKIE, adminCookieOpts } from '@/lib/tokens';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    // Admin login
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      const res = NextResponse.json({ success: true, role: 'admin' });
      res.cookies.set(ADMIN_COOKIE, signAdminSession(), adminCookieOpts);
      return res;
    }
    // Customer login
    const customer = await getCustomerByEmail(email);
    if (!customer) return NextResponse.json({ error: 'No account found with this email.' }, { status: 401 });
    const ok = await bcrypt.compare(password, customer.password_hash);
    if (!ok) return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    const res = NextResponse.json({ success: true, role: 'customer', customer: { id: customer.id, name: customer.name, email: customer.email } });
    res.cookies.set(CUST_COOKIE, signCustomerSession(customer.id, customer.email), custCookieOpts);
    return res;
  } catch (err) {
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
