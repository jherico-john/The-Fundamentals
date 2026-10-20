import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, ADMIN_COOKIE } from '@/lib/tokens';
import { getAdOutcomes, getChannelBreakdown, getProductBreakdown } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req.cookies.get(ADMIN_COOKIE)?.value || ''))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const days = Math.min(365, Math.max(1, parseInt(req.nextUrl.searchParams.get('days') || '30', 10) || 30));
  const [outcomes, channels, products] = await Promise.all([getAdOutcomes(days), getChannelBreakdown(days), getProductBreakdown(days)]);
  return NextResponse.json({ days, outcomes, channels, products });
}
