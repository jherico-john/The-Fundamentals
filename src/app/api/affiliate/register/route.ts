import { NextRequest, NextResponse } from 'next/server';
import { registerAffiliate } from '@/lib/supabase';
import { verifyCustomerSession, CUST_COOKIE } from '@/lib/tokens';
export async function POST(req: NextRequest) {
  try {
    const { name, mobileNumber, productLink, referredByCode } = await req.json();
    if (!name || name.trim().length < 2) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
    const mobile = (mobileNumber || '').replace(/\D/g, '');
    if (mobile.length < 10) return NextResponse.json({ error: 'Please enter a valid GCash mobile number (10+ digits).' }, { status: 400 });
    if (!productLink?.startsWith('http')) return NextResponse.json({ error: 'Invalid product link.' }, { status: 400 });
    const cust = req.cookies.get(CUST_COOKIE)?.value;
    const session = cust ? verifyCustomerSession(cust) : null;
    const affiliate = await registerAffiliate({ name: name.trim(), mobileNumber: mobile, productLink, referredByCode: referredByCode || null, customerId: session?.id || null });
    return NextResponse.json({ success: true, affiliate });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to register affiliate.' }, { status: 500 });
  }
}
