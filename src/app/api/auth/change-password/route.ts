import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getCustomerByEmail, getCustomerById, updateCustomerPassword } from '@/lib/supabase';
import { verifyCustomerSession, CUST_COOKIE } from '@/lib/tokens';
export async function POST(req: NextRequest) {
  const cust = req.cookies.get(CUST_COOKIE)?.value;
  if (!cust) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  const session = verifyCustomerSession(cust);
  if (!session) return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
  const { oldPassword, newPassword } = await req.json();
  if (!newPassword || newPassword.length < 6) return NextResponse.json({ error: 'New password must be at least 6 characters.' }, { status: 400 });
  const customer = await getCustomerByEmail(session.email);
  if (!customer) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  const ok = await bcrypt.compare(oldPassword, customer.password_hash);
  if (!ok) return NextResponse.json({ error: 'Old password is incorrect.' }, { status: 401 });
  await updateCustomerPassword(session.id, await bcrypt.hash(newPassword, 10));
  return NextResponse.json({ success: true });
}
