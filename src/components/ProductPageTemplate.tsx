'use client';
// ProductPageTemplate — v6
// Shared checkout page for all non-Fundamentals products (Lifegroup, Pre-Encounter,
// Encounter, Post-Encounter, SOL 1, 2 & 3, All-in-One Bundle).
//
// v6: payment-only checkout. "What's Inside" and the testimonials are removed (the
// funnel page already shows them). Section order: title & description → video →
// fixed "go to payment" button → step-by-step tutorial → price & payment →
// having a problem. See CheckoutFlow.
// UNCHANGED: Meta Lead + TikTok ViewContent + Google Ads view-content events.

import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import CheckoutFlow from '@/components/CheckoutFlow';
import SiteFooter from '@/components/SiteFooter';
import { useGoogleAds } from '@/lib/useGoogleAds';
import { BUNDLE_OFFER_ENDS, getIndividualProducts, type ProductSlug } from '@/lib/products';
import { useMetaPixel } from '@/lib/useMetaPixel';
import { useTikTokPixel } from '@/lib/useTikTokPixel';

export interface ProductConfig {
  /** Must match the env var suffix and products.ts slug */
  slug: Exclude<ProductSlug, 'fundamentals'>;
  name: string;
  tagline: string;
  description: string;
  price: number;
  originalPrice: number;
  coverImage?: string;
  /** Optional one-line summary shown on the price card */
  summary?: string;
}

const CUR = process.env.NEXT_PUBLIC_CURRENCY || 'PHP';

export default function ProductPageTemplate({ config }: { config: ProductConfig }) {
  const pixel  = useMetaPixel();
  const tiktok = useTikTokPixel();
  const google = useGoogleAds();
  const isBundle = config.slug === 'bundle';
  const included = isBundle ? getIndividualProducts() : [];
  const [left, setLeft] = useState<string>('');

  // Limited-time countdown (bundle only, when NEXT_PUBLIC_BUNDLE_OFFER_ENDS is set)
  useEffect(() => {
    if (!isBundle || !BUNDLE_OFFER_ENDS) return;
    const end = Date.parse(BUNDLE_OFFER_ENDS);
    if (!Number.isFinite(end)) return;
    const tick = () => {
      const ms = end - Date.now();
      if (ms <= 0) { setLeft('Offer ended'); return; }
      const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
      setLeft(`${d}d ${h}h ${m}m left`);
    };
    tick(); const t = setInterval(tick, 30000); return () => clearInterval(t);
  }, [isBundle]);

  // Fire Meta Lead + TikTok ViewContent + Google view-content when any product's
  // checkout page loads. config.name and config.price are dynamic per product.
  useEffect(() => {
    const safePrice = Number.isFinite(config.price) ? config.price : 0;
    const safeCurrency = CUR || 'PHP';
    // Each helper skips automatically when this device already bought the product
    pixel.trackLead({ name: config.name, price: safePrice, currency: safeCurrency, contentId: config.slug });
    tiktok.trackViewContent({ name: config.name, price: safePrice, currency: safeCurrency, contentId: config.slug });
    google.trackViewContent({ slug: config.slug, name: config.name, price: safePrice, currency: safeCurrency });
  }, [config.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-screen bg-bg">
      <NavBar product={config.name} />

      <div className="max-w-5xl mx-auto px-4 py-10 md:py-12">

        {/* 1. Title & Description */}
        <section className="text-center mb-10" aria-labelledby="page-title">
          <p className="text-sm font-medium text-muted mb-3">Pay with GCash or any bank or e-wallet · Instant access</p>
          <h1 id="page-title" className="text-4xl md:text-5xl font-bold mb-4 text-fg">{config.name}</h1>
          <p className="text-lg text-fg2 max-w-2xl mx-auto mb-2">{config.tagline}</p>
          <p className="text-base text-muted max-w-2xl mx-auto">{config.description}</p>
        </section>

        {/* 2 – 6. Video · fixed button · tutorial · price & payment · help */}
        <CheckoutFlow
          slug={config.slug}
          name={config.name}
          price={config.price}
          originalPrice={config.originalPrice}
          coverImage={config.coverImage}
          summary={config.summary || (isBundle ? `Instant digital download · ${included.length} complete packs` : undefined)}
          includedNames={isBundle ? included.map(p => p.name) : undefined}
          badge={isBundle ? `Limited-time launch price${left ? ' · ' + left : ''}` : undefined}
        />

        <SiteFooter pageName={config.name} />
      </div>
    </main>
  );
}
