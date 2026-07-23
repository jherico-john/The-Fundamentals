import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, ADMIN_COOKIE } from '@/lib/tokens';
import { getAllAffiliates, getReferralTree } from '@/lib/supabase';
export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req.cookies.get(ADMIN_COOKIE)?.value || ''))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const code = req.nextUrl.searchParams.get('rootCode');
  if (code) {
    const tree = await getReferralTree(code);
    return NextResponse.json({ tree });
  }
  const affiliates = await getAllAffiliates();
  return NextResponse.json({ affiliates });
}
