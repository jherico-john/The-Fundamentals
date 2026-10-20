'use client';
// Captures ad click IDs / UTMs (gclid, fbclid, ttclid, utm_*), stores a 30-day
// attribution cookie that /api/verify-receipt stamps on the purchase, and logs
// one landing per session per source for the dashboard's outcome view.
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { classifySource, buildAttrPayload, ATTR_COOKIE, SESSION_COOKIE } from '@/lib/adAttribution';

function getCookie(n: string) { const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + n + '=([^;]+)')); return m ? decodeURIComponent(m[1]) : null; }
function setCookie(n: string, v: string, days: number) { document.cookie = `${n}=${encodeURIComponent(v)}; path=/; max-age=${days * 86400}; SameSite=Lax`; }

export default function AdAttributionTracker() {
  const sp = useSearchParams();
  const path = usePathname();

  useEffect(() => {
    try {
      let sid = getCookie(SESSION_COOKIE);
      if (!sid) { sid = (crypto.randomUUID?.() || Math.random().toString(36).slice(2)) + ''; setCookie(SESSION_COOKIE, sid, 1); }

      const hasAff = !!getCookie('affiliate_ref');
      const fresh = classifySource(new URLSearchParams(sp.toString()), false);
      let source = fresh;
      if (fresh) setCookie(ATTR_COOKIE, JSON.stringify(buildAttrPayload(new URLSearchParams(sp.toString()), fresh)), 30);
      if (!source) {
        try { const saved = JSON.parse(getCookie(ATTR_COOKIE) || 'null'); if (saved?.s) source = saved.s; } catch { /* ignore */ }
      }
      if (!source) source = hasAff ? 'affiliate' : 'organic';

      const key = `tf_touch_${source}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      const q = new URLSearchParams(sp.toString());
      const slug = path?.startsWith('/products/') ? path.split('/')[2] : path === '/checkout' ? 'fundamentals' : null;
      fetch('/api/ads/touch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({
          source, sessionId: sid, path, productSlug: slug,
          gclid: q.get('gclid') || q.get('gbraid') || q.get('wbraid'), fbclid: q.get('fbclid'), ttclid: q.get('ttclid'),
          utmSource: q.get('utm_source'), utmMedium: q.get('utm_medium'), utmCampaign: q.get('utm_campaign'),
        }),
      }).catch(() => {});
    } catch { /* never break the page */ }
  }, [sp, path]);
  return null;
}
