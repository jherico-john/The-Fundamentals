import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, ADMIN_COOKIE, verifyCustomerSession, CUST_COOKIE } from '@/lib/tokens';
import { getCustomerById } from '@/lib/supabase';
export async function GET(req: NextRequest) {
  const adm = req.cookies.get(ADMIN_COOKIE)?.value;
  if (adm && verifyAdminSession(adm)) return NextResponse.json({ authenticated: true, role: 'admin', email: process.env.ADMIN_EMAIL });
  const cust = req.cookies.get(CUST_COOKIE)?.value;
  if (cust) {
    const s = verifyCustomerSession(cust);
    if (s) {
      const c = await getCustomerById(s.id);
      if (c) return NextResponse.json({ authenticated: true, role: 'customer', customer: c });
    }
  }
  return NextResponse.json({ authenticated: false });
}
