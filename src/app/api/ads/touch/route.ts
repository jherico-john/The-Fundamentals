// Records an ad landing (one per session per source) for the dashboard's
// Google / Meta / TikTok outcome view. Cheap, unauthenticated, rate-limited by
// the once-per-session client logic; never blocks the page.
import { NextRequest, NextResponse } from 'next/server';
import { recordAdTouch, type AdSource } from '@/lib/supabase';

const OK: AdSource[] = ['google', 'meta', 'tiktok', 'affiliate', 'organic', 'other'];
const clip = (v: unknown, n = 200) => (typeof v === 'string' && v ? v.slice(0, n) : null);

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const adSource = OK.includes(b.source) ? (b.source as AdSource) : 'other';
    await recordAdTouch({
      adSource, sessionId: clip(b.sessionId, 64), gclid: clip(b.gclid), fbclid: clip(b.fbclid), ttclid: clip(b.ttclid),
      utmSource: clip(b.utmSource), utmMedium: clip(b.utmMedium), utmCampaign: clip(b.utmCampaign),
      landingPath: clip(b.path, 300), productSlug: clip(b.productSlug, 60),
    });
  } catch { /* analytics must never error the page */ }
  return NextResponse.json({ ok: true });
}
