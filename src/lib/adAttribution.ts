// src/lib/adAttribution.ts — v5
// First-party ad attribution for the three engines: Google Ads, Meta, TikTok.
// Captures click IDs / UTMs on landing, stores them in a 30-day cookie, and the
// server stamps them on the verified purchase so the dashboard can show
// outcomes per engine.  (Pixels still do their own reporting inside each ad
// platform; this gives YOU one side-by-side view.)
import type { AdSource } from './supabase';

export const ATTR_COOKIE = 'tf_attr';
export const SESSION_COOKIE = 'tf_sid';

export interface AttrPayload {
  s: AdSource;            // source
  g?: string; f?: string; t?: string;   // gclid / fbclid / ttclid
  us?: string; um?: string; uc?: string; // utm_source / medium / campaign
  at: number;
}

export function classifySource(p: URLSearchParams, hasAffiliate = false): AdSource | null {
  const src = (p.get('utm_source') || '').toLowerCase();
  if (p.get('gclid') || p.get('gbraid') || p.get('wbraid') || /google|adwords|gads/.test(src)) return 'google';
  if (p.get('fbclid') || /facebook|^fb$|instagram|^ig$|meta/.test(src)) return 'meta';
  if (p.get('ttclid') || /tiktok|^tt$/.test(src)) return 'tiktok';
  if (hasAffiliate) return 'affiliate';
  if (src) return 'other';
  return null;
}

export function buildAttrPayload(p: URLSearchParams, source: AdSource): AttrPayload {
  return {
    s: source,
    g: p.get('gclid') || p.get('gbraid') || p.get('wbraid') || undefined,
    f: p.get('fbclid') || undefined,
    t: p.get('ttclid') || undefined,
    us: p.get('utm_source') || undefined, um: p.get('utm_medium') || undefined, uc: p.get('utm_campaign') || undefined,
    at: Math.floor(Date.now() / 1000),
  };
}

/** Server side: decode the cookie (plain JSON; it is only analytics metadata). */
export function parseAttrCookie(v: string | undefined) {
  if (!v) return null;
  try {
    const p = JSON.parse(decodeURIComponent(v)) as AttrPayload;
    if (!p || !p.s) return null;
    if (Math.floor(Date.now() / 1000) - p.at > 60 * 60 * 24 * 30) return null;
    const clip = (x?: string) => (x ? String(x).slice(0, 200) : null);
    return {
      adSource: p.s, gclid: clip(p.g), fbclid: clip(p.f), ttclid: clip(p.t),
      utmSource: clip(p.us), utmMedium: clip(p.um), utmCampaign: clip(p.uc),
    };
  } catch { return null; }
}
