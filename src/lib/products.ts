// src/lib/products.ts — v5
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
  'post-encounter': num(process.env.NEXT_PUBLIC_PRODUCT_POST_ENCOUNTER_PRICE, 697),
  sol:              num(process.env.NEXT_PUBLIC_PRODUCT_SOL_PRICE, 1997),
};
const INDIVIDUAL_TOTAL = Object.values(P).reduce((a, b) => a + b, 0);
// Sample limited-time bundle price (₱4,982 of products for ₱2,997). Change in env.
const BUNDLE_PRICE = num(process.env.NEXT_PUBLIC_PRODUCT_BUNDLE_PRICE, 2997);

export const PRODUCTS: ProductMeta[] = [
  {
    slug: 'fundamentals', name: 'The Fundamentals', shortName: 'Fundamentals',
    path: '/checkout',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_FUNDAMENTALS || 'https://jhericojohnbalasa.systeme.io/fundementals-truth',
    price: P.fundamentals, originalPrice: 997, lessons: 16,
    tagline: '16 Core Christian Truths — ready-to-teach PPT sessions',
  },
  {
    slug: 'pre-encounter', name: 'Pre-Encounter', shortName: 'Pre-Encounter',
    path: '/products/pre-encounter',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_PRE_ENCOUNTER || 'https://jhericojohnbalasa.systeme.io/pre-encounter-truth',
    price: P['pre-encounter'], originalPrice: 597, lessons: 6,
    tagline: 'Prepare hearts and minds before the Encounter experience',
  },
  {
    slug: 'lifegroup', name: 'Lifegroup Essentials', shortName: 'Lifegroup',
    path: '/products/lifegroup',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_LIFEGROUP || 'https://jhericojohnbalasa.systeme.io/lifegroup-truth',
    price: P.lifegroup, originalPrice: 797, lessons: 12,
    tagline: 'Lead thriving lifegroups with confidence and depth',
  },
  {
    slug: 'encounter', name: 'Encounter', shortName: 'Encounter',
    path: '/products/encounter',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_ENCOUNTER || 'https://jhericojohnbalasa.systeme.io/encounter-truth',
    price: P.encounter, originalPrice: 1997, lessons: 8,
    tagline: 'A transformative weekend experience — fully prepared',
  },
  {
    slug: 'post-encounter', name: 'Post-Encounter', shortName: 'Post-Encounter',
    path: '/products/post-encounter',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_POST_ENCOUNTER || 'https://jhericojohnbalasa.systeme.io/post-encounter-truth',
    price: P['post-encounter'], originalPrice: 1397, lessons: 6,
    tagline: 'Sustain the fire after the Encounter weekend',
  },
  {
    slug: 'sol', name: 'SOL', shortName: 'SOL',
    path: '/products/sol',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_SOL || 'https://jhericojohnbalasa.systeme.io/sol-truth',
    price: P.sol, originalPrice: 3997, lessons: 24,
    tagline: 'The complete leadership formation track — built to be taught',
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

// ── Server-side env keys (file delivery + thank-you page) ────────────────────
// Server routes read these dynamically, which is fine (not client-inlined).
export const FILE_ENV: Record<ProductSlug, { file: string[]; page: string[] }> = {
  'fundamentals':   { file: ['PRODUCT_FILE_URL_FUNDAMENTALS'],   page: ['NEXT_PUBLIC_DOWNLOAD_PAGE_URL_FUNDAMENTALS'] },
  'pre-encounter':  { file: ['PRODUCT_FILE_URL_PRE_ENCOUNTER'],  page: ['NEXT_PUBLIC_DOWNLOAD_PAGE_URL_PRE_ENCOUNTER'] },
  // SUNYL env vars remain as fallbacks so the existing Mediafire link keeps working
  'lifegroup':      { file: ['PRODUCT_FILE_URL_LIFEGROUP', 'PRODUCT_FILE_URL_SUNYL'],
                      page: ['NEXT_PUBLIC_DOWNLOAD_PAGE_URL_LIFEGROUP', 'NEXT_PUBLIC_DOWNLOAD_PAGE_URL_SUNYL'] },
  'encounter':      { file: ['PRODUCT_FILE_URL_ENCOUNTER'],      page: ['NEXT_PUBLIC_DOWNLOAD_PAGE_URL_ENCOUNTER'] },
  'post-encounter': { file: ['PRODUCT_FILE_URL_POST_ENCOUNTER'], page: ['NEXT_PUBLIC_DOWNLOAD_PAGE_URL_POST_ENCOUNTER'] },
  'sol':            { file: ['PRODUCT_FILE_URL_SOL'],            page: ['NEXT_PUBLIC_DOWNLOAD_PAGE_URL_SOL'] },
  'bundle':         { file: ['PRODUCT_FILE_URL_BUNDLE'],         page: ['NEXT_PUBLIC_DOWNLOAD_PAGE_URL_BUNDLE'] },
};

function firstEnv(keys: string[]): string {
  for (const k of keys) {
    const v = process.env[k];
    if (v && !v.startsWith('PASTE_')) return v;
  }
  return '';
}

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
