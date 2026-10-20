'use client';
// Client-side "has this device already bought?" helper (reads the tf_buyer cookie
// that /api/verify-receipt sets). Used by all three ad engines so past buyers
// are not counted as fresh prospects and are excluded from remarketing → saves
// ad spend. The cookie is only a hint for ad logic; downloads are still
// protected server-side by signed tokens.
import { getIndividualProducts } from './products';

export function getBuyerSlugs(): string[] {
  if (typeof document === 'undefined') return [];
  const m = document.cookie.match(/(?:^|;\s*)tf_buyer=([^;]+)/);
  if (!m) return [];
  try {
    const b64 = decodeURIComponent(m[1]).split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
    return Array.isArray(json.s) ? json.s : [];
  } catch { return []; }
}

export function hasBought(slug: string): boolean {
  const s = getBuyerSlugs();
  if (slug === 'sunyl') slug = 'lifegroup';
  return s.includes(slug) || s.includes('bundle');
}

/** Bought every individual product (or the bundle) → nothing left to advertise. */
export function boughtEverything(): boolean {
  const s = getBuyerSlugs();
  return s.includes('bundle') || getIndividualProducts().every(p => s.includes(p.slug));
}
