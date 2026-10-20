'use client';
// ProductPageTemplate — v5
// Shared template for all non-Fundamentals product pages (Lifegroup, Pre-Encounter,
// Encounter, Post-Encounter, SOL, All-in-One Bundle).
// v5: hybrid payment copy, Meta + TikTok + Google Ads on every page, bundle
// "what's included" + limited-time countdown, footer with the page name.

import { useEffect, useState } from 'react';
import { CheckCircle2, Zap, Star, Lock, BookOpen, Play, Shield } from 'lucide-react';
import NavBar from '@/components/NavBar';
import ReceiptUploader from '@/components/ReceiptUploader';
import PaymentTutorial from '@/components/PaymentTutorial';
import BridgePaymentGuide from '@/components/BridgePaymentGuide';
// - [Not available] import AffiliateSidebar from '@/components/AffiliateSidebar';
import SupportSection from '@/components/SupportSection';
import SiteFooter from '@/components/SiteFooter';
import { useGoogleAds } from '@/lib/useGoogleAds';
import { PRODUCTS, BUNDLE_OFFER_ENDS, getIndividualProducts, type ProductSlug } from '@/lib/products';
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
  lessons: number;
  coverImage?: string;
  affiliateProductLink?: string;
  features: { label: string; sub: string }[];
  testimonials: { name: string; role: string; text: string }[];
  downloadPageUrl: string;
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

  // Fire Meta Lead + TikTok ViewContent when any product's checkout page loads.
  // config.name and config.price are dynamic — correct per product automatically.
  useEffect(() => {
    const safePrice = Number.isFinite(config.price) ? config.price : 0;
    const safeCurrency = CUR || 'PHP';
    // Each helper skips automatically when this device already bought the product
    pixel.trackLead({ name: config.name, price: safePrice, currency: safeCurrency, contentId: config.slug });
    tiktok.trackViewContent({ name: config.name, price: safePrice, currency: safeCurrency, contentId: config.slug });
    google.trackViewContent({ slug: config.slug, name: config.name, price: safePrice, currency: safeCurrency });
  }, [config.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="relative min-h-screen bg-radial-glow">
      <NavBar product={config.name} />

      <div className="max-w-5xl mx-auto px-4 py-12 relative z-10">

        {/* Hero */}
        <section className="text-center mb-14 fade-up">
          <div className="inline-flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-full px-4 py-1.5 text-xs text-[var(--green)] font-medium mb-6 tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse inline-block" />
            Pay via GCash or any bank / e-wallet · Instant Access
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4"
            style={{ fontFamily: 'Bebas Neue, Impact, sans-serif', color: '#fff', lineHeight: 1.05 }}>
            <span style={{ color: 'var(--green)' }}>{config.name}</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-2">{config.tagline}</p>
          <p className="text-sm text-gray-400 max-w-xl mx-auto">{config.description}</p>
          {isBundle && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--green)] bg-[var(--green-deeper)] bg-opacity-30 px-4 py-1.5 text-xs font-bold text-[var(--green)]" data-testid="bundle-offer">
              🔥 LIMITED-TIME LAUNCH PRICE{left ? ` · ${left}` : ''}
            </div>
          )}
        </section>

        {/* Main grid: features left, price + payment right */}
        <div className="grid md:grid-cols-5 gap-8 mb-16">

          <div className="md:col-span-3 space-y-4 fade-up-1">
            <h2 className="text-xl font-bold text-white mb-4">{isBundle ? 'Everything You Get' : "What's Inside"}</h2>
            {isBundle && included.map(p => (
              <div key={p.slug} className="glass-card p-4 flex items-center gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--green-deeper)] bg-opacity-40 flex items-center justify-center text-[var(--green)]"><BookOpen size={16} /></div>
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">{p.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{p.tagline}</p>
                </div>
                <span className="text-gray-500 line-through text-xs">{CUR} {p.price.toLocaleString()}</span>
                <CheckCircle2 size={16} className="text-[var(--green)] flex-shrink-0" />
              </div>
            ))}
            {config.features.map((f, i) => (
              <div key={i} className="glass-card p-4 flex items-start gap-4 hover:border-[var(--green-dark)] transition-colors">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--green-deeper)] bg-opacity-40 flex items-center justify-center text-[var(--green)]">
                  <Play size={16} />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{f.label}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{f.sub}</p>
                </div>
                <CheckCircle2 size={16} className="text-[var(--green)] ml-auto flex-shrink-0 mt-0.5" />
              </div>
            ))}
          </div>

          <div className="md:col-span-2 fade-up-2">
            <div className="glass-card p-6 sticky top-20 glow-pulse" style={{ borderColor: 'rgba(0,255,135,0.3)' }}>
              {/*
              <div className="w-full h-28 rounded-xl mb-4 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0D3B20, #051A0D)' }}>
                <div className="text-center">
                  <BookOpen size={32} className="text-[var(--green)] mx-auto mb-1 float-anim" />
                  <p className="text-xs text-[var(--green)] tracking-widest uppercase font-semibold">
                    {config.lessons} Lessons
                  </p>
                </div>
              </div>
              */}
              <div
                className="w-full h-28 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0D3B20, #051A0D)' }}
              >
                {config.coverImage ? (
                  <img
                    src={config.coverImage}
                    alt={config.name}
                    className="w-full h-full object-contain float-anim z-10"
                  />
                ) : (
                  <div className="text-center z-10">
                    <BookOpen
                      size={32}
                      className="text-[var(--green)] mx-auto mb-1 float-anim"
                    />
                    <p className="text-xs text-[var(--green)] tracking-widest uppercase font-semibold">
                      {config.lessons} Lessons
                    </p>
                  </div>
                )}
              
                <div className="absolute -top-2 -right-2 w-16 h-24 rounded-lg bg-[var(--surface)] border border-[var(--border)] rotate-6 opacity-40" />
                <div className="absolute -top-1 right-2 w-16 h-24 rounded-lg bg-[var(--surface)] border border-[var(--border)] rotate-3 opacity-60" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1"
                style={{ fontFamily: 'Bebas Neue, Impact, sans-serif' }}>{config.name}</h3>
              <p className="text-xs text-gray-400 mb-3">
                {isBundle ? `Instant Digital Download · ${included.length} complete packs` : `Instant Digital Download · ${config.lessons} Ready-to-Teach Sessions`}
              </p>

              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-extrabold text-[var(--green)]">
                  {CUR} {config.price.toLocaleString()}
                </span>
                <span className="text-gray-500 line-through text-base">
                  {CUR} {config.originalPrice.toLocaleString()}
                </span>
                <span className="bg-[var(--green-deeper)] text-[var(--green)] text-xs font-bold px-2 py-0.5 rounded-full">
                  {Math.max(0, Math.round((1 - config.price / config.originalPrice) * 100))}% OFF
                </span>
              </div>

              <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pb-4 border-b border-[var(--border)] mb-4">
                <span className="flex items-center gap-1"><Lock size={10} className="text-[var(--green)]" /> GCash &amp; Banks</span>
                <span className="flex items-center gap-1"><Zap size={10} className="text-[var(--green)]" /> Instant Download</span>
                <span className="flex items-center gap-1"><Shield size={10} className="text-[var(--green)]" /> No Gateway Fees</span>
              </div>

              <ReceiptUploader
                productSlug={config.slug}
                productName={config.name}
                price={config.price}
                downloadPage={config.downloadPageUrl}
              />
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <section className="mb-16 fade-up-3">
          <h2 className="text-2xl font-bold text-white text-center mb-8">What Leaders Are Saying</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {config.testimonials.map((t, i) => (
              <div key={i} className="glass-card p-5">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={13} className="text-[var(--green)] fill-[var(--green)]" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4 italic">&ldquo;{t.text}&rdquo;</p>
                <p className="font-semibold text-white text-sm">{t.name}</p>
                <p className="text-gray-500 text-xs">{t.role}</p>
              </div>
            ))}
          </div>
        </section>

        <PaymentTutorial />
        <BridgePaymentGuide />

        {/* Affiliate sidebar — shows ALL products EXCEPT this one 
        <AffiliateSidebar
          currentProductSlug={config.slug}
          currentProductName={config.name}
        />
        */}

        <SupportSection />

        <SiteFooter pageName={config.name} />
      </div>
    </main>
  );
}
