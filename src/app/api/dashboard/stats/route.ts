import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, ADMIN_COOKIE } from '@/lib/tokens';
import { getDashboardStats, getSalesByDay } from '@/lib/supabase';
export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req.cookies.get(ADMIN_COOKIE)?.value || ''))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [s, salesChart] = await Promise.all([getDashboardStats(), getSalesByDay(30)]);
  // v4 bug: the page read keys the view does not return (sales_last_7d …). Map them here.
  const stats = {
    total_sales: s.total_sales, total_revenue: s.total_revenue, total_customers: s.total_customers,
    total_affiliates: s.total_affiliates, total_clicks: s.total_clicks,
    total_commissions_owed: s.commissions_owed, total_commissions_paid: s.commissions_paid,
    sales_last_7d: s.sales_7d, revenue_last_7d: s.revenue_7d, sales_last_30d: s.sales_30d, revenue_last_30d: s.revenue_30d,
  };
  return NextResponse.json({ stats, salesChart });
}
