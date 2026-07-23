import { NextRequest, NextResponse } from 'next/server';
import { getAffiliateByCode, recordClick } from '@/lib/supabase';
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const { code } = params;
  let dest = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/checkout`;
  try {
    const aff = await getAffiliateByCode(code);
    if (aff?.product_link) dest = aff.product_link;
    recordClick(code).catch(() => {});
  } catch { /* non-fatal */ }
  const res = NextResponse.redirect(dest, { status: 302 });
  res.cookies.set('affiliate_ref', code, { path: '/', maxAge: 60*60*24*30, sameSite: 'lax' });
  return res;
}
