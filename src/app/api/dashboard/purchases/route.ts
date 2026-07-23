import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, ADMIN_COOKIE } from '@/lib/tokens';
import { getRecentPurchases } from '@/lib/supabase';
export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req.cookies.get(ADMIN_COOKIE)?.value || ''))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const purchases = await getRecentPurchases(50);
  return NextResponse.json({ purchases });
}
