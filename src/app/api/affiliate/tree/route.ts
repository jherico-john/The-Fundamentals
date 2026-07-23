import { NextRequest, NextResponse } from 'next/server';
import { getAffiliateByCode, getReferralTree, getAllAffiliates } from '@/lib/supabase';
export async function GET(req: NextRequest) {
  try {
    if (req.nextUrl.searchParams.get('all') === 'true') {
      return NextResponse.json({ success: true, affiliates: await getAllAffiliates() });
    }
    const code = req.nextUrl.searchParams.get('code');
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    const me = await getAffiliateByCode(code);
    if (!me) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, me, tree: await getReferralTree(me.root_code) });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
