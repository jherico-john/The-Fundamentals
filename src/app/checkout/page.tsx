'use client';
// /checkout — The Fundamentals product page (slug: 'fundamentals')
// v6: payment-only checkout. "What's Inside" and the testimonials are removed (the
// funnel page already shows them). Section order: title & description → video →
// fixed "go to payment" button → step-by-step tutorial → price & payment →
// having a problem. See CheckoutFlow.
// UNCHANGED: Meta Lead + TikTok ViewContent + Google Ads view-content events.
import { useEffect } from 'react';
import NavBar from '@/components/NavBar';
import CheckoutFlow from '@/components/CheckoutFlow';
import SiteFooter from '@/components/SiteFooter';
import { useGoogleAds } from '@/lib/useGoogleAds';
import { getProductBySlug } from '@/lib/products';
import { useMetaPixel } from '@/lib/useMetaPixel';
import { useTikTokPixel } from '@/lib/useTikTokPixel';

const PRODUCT = getProductBySlug('fundamentals')!;
const PRICE = PRODUCT.price;

export default function CheckoutPage() {
  const pixel    = useMetaPixel();
  const tiktok   = useTikTokPixel();
  const google   = useGoogleAds();

  // Read the currency inside the component at runtime, not at module level.
  // Module-level parseInt(process.env...) can yield NaN if the env var is
  // missing at build time — Meta silently drops events with NaN values.
  const leadPrice = PRICE;
  const leadCurrency = process.env.NEXT_PUBLIC_CURRENCY || 'PHP';

  // Fire Meta Lead + TikTok ViewContent + Google view-content when this checkout
  // page is displayed. Each helper skips automatically when this device already
  // bought Fundamentals.
  useEffect(() => {
    pixel.trackLead({ name: 'The Fundamentals', price: leadPrice, currency: leadCurrency, contentId: 'fundamentals' });
    tiktok.trackViewContent({ name: 'The Fundamentals', price: leadPrice, currency: leadCurrency, contentId: 'fundamentals' });
    google.trackViewContent({ slug: 'fundamentals', name: 'The Fundamentals', price: leadPrice, currency: leadCurrency });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-screen bg-bg">
      <NavBar product="The Fundamentals" />

      <div className="max-w-5xl mx-auto px-4 py-10 md:py-12">

        {/* 1. Title & Description */}
        <section className="text-center mb-10" aria-labelledby="page-title">
          <p className="text-sm font-medium text-muted mb-3">Pay with GCash or any bank or e-wallet · Instant access</p>
          <h1 id="page-title" className="text-4xl md:text-6xl font-bold mb-4 text-fg">The Fundamentals</h1>
          <p className="text-lg text-fg2 max-w-2xl mx-auto mb-2">
            Perfect for those who have started their walk with God but are{' '}
            <strong className="text-fg font-semibold">still asking the deeper questions.</strong>
          </p>
          <p className="text-base text-muted max-w-xl mx-auto">
            Not just for beginners. <strong className="text-fg2 font-semibold">Even long-time believers</strong> gain clarity, confidence, and renewed understanding.
          </p>
        </section>

        {/* 2 – 6. Video · fixed button · tutorial · price & payment · help */}
        <CheckoutFlow
          slug="fundamentals"
          name="The Fundamentals"
          price={PRICE}
          originalPrice={PRODUCT.originalPrice}
          coverImage="/banner/banner_fundamentals.png"
          summary="Instant digital download"
        />

        <SiteFooter pageName="The Fundamentals" />
      </div>
    </main>
  );
}
