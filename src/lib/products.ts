// src/lib/products.ts
// ─────────────────────────────────────────────────────────────────────────────
// Central product registry — single source of truth for all 6 ministry products.
// Every page, component, and API route reads from here.
// To add a new product:
//   1. Add its 3 env vars in .env.local (see .env.local.example)
//   2. Add one entry to PRODUCTS below
//   3. Create src/app/products/{slug}/page.tsx using ProductPageTemplate
// Nothing else needs to change.
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductMeta {
  /** Must match env var suffix: e.g. 'sunyl' → PRODUCT_FILE_URL_SUNYL */
  slug: string;
  name: string;
  shortName: string;
  /** Path on this site where the product lives */
  path: string;
  /** Systeme.io public preview / landing page — what affiliates share */
  affiliateLink: string;
  price: number;
  lessons: number;
  tagline: string;
}

export const PRODUCTS: ProductMeta[] = [
  {
    slug: 'fundamentals',
    name: 'The Fundamentals',
    shortName: 'Fundamentals',
    path: '/checkout',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_FUNDAMENTALS
      || 'https://jhericojohnbalasa.systeme.io/fundementals-truth',
    price: parseInt(process.env.NEXT_PUBLIC_PRODUCT_FUNDAMENTALS_PRICE || '497'),
    lessons: 16,
    tagline: '16 Core Christian Truths — ready-to-teach PPT sessions',
  },
  {
    slug: 'pre-encounter',
    name: 'Pre-Encounter',
    shortName: 'Pre-Encounter',
    path: '/products/pre-encounter',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_PRE_ENCOUNTER
      || 'https://jhericojohnbalasa.systeme.io/pre-encounter-truth',
    price: parseInt(process.env.NEXT_PUBLIC_PRODUCT_PRE_ENCOUNTER_PRICE || '397'),
    lessons: 6,
    tagline: 'Prepare hearts and minds before the Encounter experience',
  },
  {
    slug: 'sunyl',
    name: 'SUNYL 12 Lessons',
    shortName: 'SUNYL',
    path: '/products/sunyl',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_SUNYL
      || 'https://jhericojohnbalasa.systeme.io/sunyl-truth',
    price: parseInt(process.env.NEXT_PUBLIC_PRODUCT_SUNYL_PRICE || '397'),
    lessons: 12,
    tagline: '12 lessons to ground new youth leaders in the Word',
  },
  {
    slug: 'encounter',
    name: 'Encounter',
    shortName: 'Encounter',
    path: '/products/encounter',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_ENCOUNTER
      || 'https://jhericojohnbalasa.systeme.io/encounter-truth',
    price: parseInt(process.env.NEXT_PUBLIC_PRODUCT_ENCOUNTER_PRICE || '397'),
    lessons: 8,
    tagline: 'A transformative weekend experience — fully prepared',
  },
  {
    slug: 'post-encounter',
    name: 'Post-Encounter',
    shortName: 'Post-Encounter',
    path: '/products/post-encounter',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_POST_ENCOUNTER
      || 'https://jhericojohnbalasa.systeme.io/post-encounter-truth',
    price: parseInt(process.env.NEXT_PUBLIC_PRODUCT_POST_ENCOUNTER_PRICE || '397'),
    lessons: 6,
    tagline: 'Sustain the fire after the Encounter weekend',
  },
  {
    slug: 'lifegroup',
    name: 'Lifegroup Fundamentals',
    shortName: 'Lifegroup',
    path: '/products/lifegroup',
    affiliateLink: process.env.NEXT_PUBLIC_AFFILIATE_LINK_LIFEGROUP
      || 'https://jhericojohnbalasa.systeme.io/lifegroup-truth',
    price: parseInt(process.env.NEXT_PUBLIC_PRODUCT_LIFEGROUP_PRICE || '397'),
    lessons: 10,
    tagline: 'Lead thriving lifegroups with confidence and depth',
  },
];

/** Returns every product EXCEPT the one at `excludeSlug` */
export function getOtherProducts(excludeSlug: string): ProductMeta[] {
  return PRODUCTS.filter(p => p.slug !== excludeSlug);
}

export function getProductBySlug(slug: string): ProductMeta | undefined {
  return PRODUCTS.find(p => p.slug === slug);
}
