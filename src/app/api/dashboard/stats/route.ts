import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, ADMIN_COOKIE } from '@/lib/tokens';
import { getDashboardStats, getSalesByDay } from '@/lib/supabase';
export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req.cookies.get(ADMIN_COOKIE)?.value || ''))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [stats, salesChart] = await Promise.all([getDashboardStats(), getSalesByDay(30)]);
  return NextResponse.json({ stats, salesChart });
}
