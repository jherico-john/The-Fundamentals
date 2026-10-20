import { NextRequest, NextResponse } from 'next/server';
import { verifyCustomerSession, CUST_COOKIE, verifyPurchaseCookie, PURCHASE_COOKIE } from '@/lib/tokens';
import { getCustomerPurchases, claimPurchaseForCustomer } from '@/lib/supabase';
import { PRODUCTS, getDownloadPageUrl } from '@/lib/products';

// Lists the signed-in customer's purchases, and attaches purchases made on this
// device BEFORE signing up (via the purchase cookies) to the account.
export async function GET(req: NextRequest) {
  const s = verifyCustomerSession(req.cookies.get(CUST_COOKIE)?.value || '');
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  for (const p of PRODUCTS) {
    const c = req.cookies.get(`${PURCHASE_COOKIE}_${p.slug}`)?.value;
    const v = c && verifyPurchaseCookie(c);
    if (v) { try { await claimPurchaseForCustomer(v.refNo, s.id); } catch { /* ignore */ } }
  }
  const rows = await getCustomerPurchases(s.id);
  const purchases = rows.map((r: any) => ({
    id: r.id, ref: r.reference_number, amount: Number(r.amount), name: r.product_name, slug: r.product_slug,
    channel: r.payment_channel, at: r.purchased_at, downloadPage: r.product_slug ? getDownloadPageUrl(r.product_slug) : '',
  }));
  return NextResponse.json({ purchases });
}
