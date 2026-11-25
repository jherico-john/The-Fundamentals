import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getCustomerByEmail, getCustomerById, updateCustomerPassword } from '@/lib/supabase';
import { verifyCustomerSession, CUST_COOKIE } from '@/lib/tokens';
import { rateLimit } from '@/lib/rateLimit';
export async function POST(req: NextRequest) {
  const cust = req.cookies.get(CUST_COOKIE)?.value;
  if (!cust) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
  const session = verifyCustomerSession(cust);
  if (!session) return NextResponse.json({ error: 'Session expired.' }, { status: 401 });
  const rl = rateLimit(`chpw:${session.id}`, 8, 900);
  if (!rl.ok) return NextResponse.json({ error: 'Too many attempts. Please wait a few minutes.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  const body = await req.json();
  const oldPassword = typeof body.oldPassword === 'string' ? body.oldPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  if (!newPassword || newPassword.length < 8) return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
  if (Buffer.byteLength(newPassword) > 72) return NextResponse.json({ error: 'New password is too long (maximum 72 characters).' }, { status: 400 });
  const customer = await getCustomerByEmail(session.email);
  if (!customer) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  const ok = await bcrypt.compare(oldPassword, customer.password_hash);
  if (!ok) return NextResponse.json({ error: 'Old password is incorrect.' }, { status: 401 });
  await updateCustomerPassword(session.id, await bcrypt.hash(newPassword, 12));
  return NextResponse.json({ success: true });
}
