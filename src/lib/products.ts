// src/lib/products.ts — v6
// ─────────────────────────────────────────────────────────────────────────────
// Central product registry — single source of truth for every product.
// Every page, component and API route reads from here.
//
// v5 changes:
//   • SUNYL is retired as a separate product. It is the SAME product as
//     Lifegroup Essentials, so `sunyl` is now a legacy ALIAS of `lifegroup`
//     (old links, cookies and env vars keep working).
//   • Added: Post-encounter (697), SOL (1997), All-in-one Bundle (sample 2997).
//   • Env reads use LITERAL `process.env.NEXT_PUBLIC_…` so Next can inline them
//     in client bundles (dynamic process.env[key] is NOT inlined client-side).
//
// v6 changes:
//   • Post-Encounter 497, SOL 1, 2 & 3 (Lesson 1–11 · 2–11 · 3–11) 1597.
//   • ONE redirect after payment: the funnel Thank You page. The MediaFire file
//     links are discontinued (kept commented out in the .env templates) — the
//     download links now live on the Thank You page itself.
//   • Thank You page URL can be set server-side only (DOWNLOAD_PAGE_URL_<SLUG>)
//     so it is not shipped in the browser bundle; NEXT_PUBLIC_DOWNLOAD_PAGE_URL_*
//     still works as a fallback.
//
// To add a product: add its env vars, add one entry below, create a page that
// uses ProductPageTemplate, and add its file env key in FILE_ENV below.
// ─────────────────────────────────────────────────────────────────────────────

export type ProductSlug =
  | 'fundamentals' | 'pre-encounter' | 'lifegroup' | 'encounter'
  | 'post-encounter' | 'sol' | 'bundle';

export interface ProductMeta {
  slug: ProductSlug;
  name: string;
  shortName: string;
  path: string;
  affiliateLink: string;
  /** Catalog price shown in the UI and sent to ad pixels (never the threshold) */
  price: number;
  /** "Was" price used for the strike-through */
  originalPrice: number;
  lessons: number;
  tagline: string;
  /** Slugs unlocked by buying this product (bundle → every individual product) */
  includes?: ProductSlug[];
}

function num(v: string | undefined, fallback: number): number {
  const n = parseInt(v || '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Legacy SUNYL env vars still work as a fallback for Lifegroup.
const LIFEGROUP_PRICE = num(
  process.env.NEXT_PUBLIC_PRODUCT_LIFEGROUP_PRICE || process.env.NEXT_PUBLIC_PRODUCT_SUNYL_PRICE, 397);

const P = {
  fundamentals:     num(process.env.NEXT_PUBLIC_PRODUCT_FUNDAMENTALS_PRICE, 597),
  'pre-encounter':  num(process.env.NEXT_PUBLIC_PRODUCT_PRE_ENCOUNTER_PRICE, 297),
  lifegroup:        LIFEGROUP_PRICE,
  encounter:        num(process.env.NEXT_PUBLIC_PRODUCT_ENCOUNTER_PRICE, 997),
  'post-encounter': num(process.env.NEXT_PUBLIC_PRODUCT_POST_ENCOUNTER_PRICE, 497),
  sol:              num(process.env.NEXT_PUBLIC_PRODUCT_SOL_PRICE, 1597),
};
const INDIVIDUAL_TOTAL = Object.values(P).reduce((a, b) => a + b, 0);
// Limited-time bundle price (set NEXT_PUBLIC_PRODUCT_BUNDLE_PRICE). Default is a sample value.
const BUNDLE_PRICE = num(process.env.NEXT_PUBLIC_PRODUCT_BUNDLE_PRICE, 2997);

export const PRODUCTS: ProductMeta[] = [
  {
    slug: 'fundamentals', name: 'The Fundamentals', shortName: 'Fundamentals',
    path: '/checkout',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_FUNDAMENTALS || 'https://jhericojohnbalasa.systeme.io/069be7f8',
    price: P.fundamentals, originalPrice: 997, lessons: 16,
    tagline: '16 Core Christian Truths — ready-to-teach PPT sessions',
  },
  {
    slug: 'pre-encounter', name: 'Pre-Encounter', shortName: 'Pre-Encounter',
    path: '/products/pre-encounter',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_PRE_ENCOUNTER || 'https://jhericojohnbalasa.systeme.io/19020584',
    price: P['pre-encounter'], originalPrice: 597, lessons: 6,
    tagline: 'Prepare hearts and minds before the Encounter experience',
  },
  {
    slug: 'lifegroup', name: 'Lifegroup Essentials', shortName: 'Lifegroup',
    path: '/products/lifegroup',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_LIFEGROUP || 'https://jhericojohnbalasa.systeme.io/509465cd',
    price: P.lifegroup, originalPrice: 797, lessons: 12,
    tagline: 'Lead thriving lifegroups with confidence and depth',
  },
  {
    slug: 'encounter', name: 'Encounter', shortName: 'Encounter',
    path: '/products/encounter',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_ENCOUNTER || 'https://jhericojohnbalasa.systeme.io/fe6336c4',
    price: P.encounter, originalPrice: 1997, lessons: 8,
    tagline: 'A transformative weekend experience — fully prepared',
  },
  {
    slug: 'post-encounter', name: 'Post-Encounter', shortName: 'Post-Encounter',
    path: '/products/post-encounter',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_POST_ENCOUNTER || 'https://jhericojohnbalasa.systeme.io/cd76680e',
    price: P['post-encounter'], originalPrice: 1397, lessons: 6,
    tagline: 'Sustain the fire after the Encounter weekend',
  },
  {
    slug: 'sol', name: 'SOL 1, 2 & 3', shortName: 'SOL',
    path: '/products/sol',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_SOL || 'https://jhericojohnbalasa.systeme.io/7d4bc249',
    price: P.sol, originalPrice: 3997, lessons: 0,
    tagline: 'SOL 1, 2 and 3 — Lesson 1–11, Lesson 2–11 and Lesson 3–11, ready to teach',
  },
  {
    slug: 'bundle', name: 'Complete Ministry Bundle', shortName: 'All-in-One Bundle',
    path: '/products/bundle',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_BUNDLE || 'https://jhericojohnbalasa.systeme.io/bundle-truth',
    price: BUNDLE_PRICE, originalPrice: INDIVIDUAL_TOTAL, lessons: 0,
    tagline: 'Every pack in one package — limited-time launch price',
    includes: ['fundamentals', 'pre-encounter', 'lifegroup', 'encounter', 'post-encounter', 'sol'],
  },
];

/** Legacy slugs that now resolve to a current product. */
export const SLUG_ALIASES: Record<string, ProductSlug> = { sunyl: 'lifegroup' };

export function resolveSlug(slug: string): ProductSlug | null {
  const s = SLUG_ALIASES[slug] || slug;
  return PRODUCTS.some(p => p.slug === s) ? (s as ProductSlug) : null;
}

export function getProductBySlug(slug: string): ProductMeta | undefined {
  const s = resolveSlug(slug);
  return s ? PRODUCTS.find(p => p.slug === s) : undefined;
}

/** Every product EXCEPT `excludeSlug` (bundle excluded from affiliate cards). */
export function getOtherProducts(excludeSlug: string): ProductMeta[] {
  const ex = resolveSlug(excludeSlug) || excludeSlug;
  return PRODUCTS.filter(p => p.slug !== ex && p.slug !== 'bundle');
}

/** Individual (non-bundle) products. */
export function getIndividualProducts(): ProductMeta[] {
  return PRODUCTS.filter(p => p.slug !== 'bundle');
}

export const BUNDLE_OFFER_ENDS = process.env.NEXT_PUBLIC_BUNDLE_OFFER_ENDS || '';

// ── Server-side env keys (thank-you page + legacy file links) ────────────────
// Server routes read these dynamically, which is fine (not client-inlined).
// `file` = DISCONTINUED MediaFire direct-download links. They are no longer used
// by any route (v6: single redirect to the Thank You page). Kept only so the
// links can be re-enabled later without touching the registry.
export const FILE_ENV: Record<ProductSlug, { file: string[]; page: string[] }> = {
  'fundamentals':   { file: ['PRODUCT_FILE_URL_FUNDAMENTALS'],   page: ['DOWNLOAD_PAGE_URL_FUNDAMENTALS', 'NEXT_PUBLIC_DOWNLOAD_PAGE_URL_FUNDAMENTALS'] },
  'pre-encounter':  { file: ['PRODUCT_FILE_URL_PRE_ENCOUNTER'],  page: ['DOWNLOAD_PAGE_URL_PRE_ENCOUNTER', 'NEXT_PUBLIC_DOWNLOAD_PAGE_URL_PRE_ENCOUNTER'] },
  // SUNYL env vars remain as fallbacks so the existing Mediafire link keeps working
  'lifegroup':      { file: ['PRODUCT_FILE_URL_LIFEGROUP', 'PRODUCT_FILE_URL_SUNYL'],
                      page: ['DOWNLOAD_PAGE_URL_LIFEGROUP', 'NEXT_PUBLIC_DOWNLOAD_PAGE_URL_LIFEGROUP', 'NEXT_PUBLIC_DOWNLOAD_PAGE_URL_SUNYL'] },
  'encounter':      { file: ['PRODUCT_FILE_URL_ENCOUNTER'],      page: ['DOWNLOAD_PAGE_URL_ENCOUNTER', 'NEXT_PUBLIC_DOWNLOAD_PAGE_URL_ENCOUNTER'] },
  'post-encounter': { file: ['PRODUCT_FILE_URL_POST_ENCOUNTER'], page: ['DOWNLOAD_PAGE_URL_POST_ENCOUNTER', 'NEXT_PUBLIC_DOWNLOAD_PAGE_URL_POST_ENCOUNTER'] },
  'sol':            { file: ['PRODUCT_FILE_URL_SOL'],            page: ['DOWNLOAD_PAGE_URL_SOL', 'NEXT_PUBLIC_DOWNLOAD_PAGE_URL_SOL'] },
  'bundle':         { file: ['PRODUCT_FILE_URL_BUNDLE'],         page: ['DOWNLOAD_PAGE_URL_BUNDLE', 'NEXT_PUBLIC_DOWNLOAD_PAGE_URL_BUNDLE'] },
};

function firstEnv(keys: string[]): string {
  for (const k of keys) {
    const v = process.env[k];
    if (v && !v.startsWith('PASTE_')) return v;
  }
  return '';
}

/** @deprecated v6 — direct MediaFire redirect is discontinued; not called by any route. */
export function getFileUrl(slug: ProductSlug): string { return firstEnv(FILE_ENV[slug].file); }
export function getDownloadPageUrl(slug: ProductSlug): string {
  return firstEnv(FILE_ENV[slug].page) || firstEnv(FILE_ENV.fundamentals.page);
}

/**
 * Server-side price lookup (catalog price). Falls back to the registry value.
 * Used by receipt verification so the browser can never dictate the price.
 */
export function getCatalogPrice(slug: string): number | null {
  const p = getProductBySlug(slug);
  return p ? p.price : null;
}

/** Every product slug a purchase of `slug` unlocks (bundle → all; else itself). */
export function getUnlockedSlugs(slug: string): ProductSlug[] {
  const p = getProductBySlug(slug);
  if (!p) return [];
  return p.includes ? [...p.includes, p.slug] : [p.slug];
}
