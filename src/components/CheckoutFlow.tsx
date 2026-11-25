'use client';
// CheckoutFlow — v6. The shared body of every checkout page (Fundamentals and
// all /products/* pages) so they all follow the SAME order:
//
//   1. Title & Description   → rendered by each page (above this component)
//   2. Video Tutorial        → <TutorialVideo />
//   3. Fixed Navigation Button → <JumpToPaymentButton /> (scrolls to #payment)
//   4. Step-by-Step Tutorial → <PaymentTutorial /> (+ bank / e-wallet guide)
//   5. Price & Payment Details → #payment  (price card + receipt upload)
//   6. Having a Problem?     → <SupportSection />
//
// "What's Inside" and "What Leaders Are Saying" are intentionally NOT here: the
// funnel page already covers them. The checkout page is for paying only.
import { Lock, ShieldCheck, Zap } from 'lucide-react';
import TutorialVideo from '@/components/TutorialVideo';
import JumpToPaymentButton from '@/components/JumpToPaymentButton';
import PaymentTutorial from '@/components/PaymentTutorial';
import BridgePaymentGuide from '@/components/BridgePaymentGuide';
import ReceiptUploader from '@/components/ReceiptUploader';
import SupportSection from '@/components/SupportSection';

const CUR = process.env.NEXT_PUBLIC_CURRENCY || 'PHP';

export interface CheckoutFlowProps {
  slug: string;
  name: string;
  price: number;
  originalPrice: number;
  /** Optional product image shown on the price card */
  coverImage?: string;
  /** Optional one-line summary under the product name (e.g. "6 packs included") */
  summary?: string;
  /** Optional list of included pack names (bundle only) */
  includedNames?: string[];
  /** Optional extra badge text above the price (e.g. limited-time countdown) */
  badge?: string;
}

export default function CheckoutFlow({ slug, name, price, originalPrice, coverImage, summary, includedNames, badge }: CheckoutFlowProps) {
  const off = originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0;
  return (
    <>
      <TutorialVideo />
      <JumpToPaymentButton targetId="payment" />
      <PaymentTutorial />
      <BridgePaymentGuide />

      {/* ── Price & Payment Details ── */}
      <section id="payment" className="mb-14 section-anchor" aria-labelledby="payment-heading" data-testid="payment-section">
        <div className="text-center mb-6">
          <h2 id="payment-heading" className="text-2xl md:text-3xl font-bold text-fg mb-2">Price &amp; Payment Details</h2>
          <p className="text-fg2 max-w-xl mx-auto">
            Send {CUR} {price.toLocaleString()} through GCash (or a bank or e-wallet through InstaPay), then upload your receipt below.
          </p>
        </div>

        <div className="max-w-xl mx-auto space-y-5">
          <div className="card p-5 md:p-6">
            {coverImage && (
              <div className="w-full h-32 rounded-lg mb-4 flex items-center justify-center bg-surface border border-line overflow-hidden">
                <img src={coverImage} alt={name} className="w-full h-full object-contain" />
              </div>
            )}
            <h3 className="text-xl font-bold text-fg">{name}</h3>
            <p className="text-sm text-muted mb-3">{summary || 'Instant digital download'}</p>

            {badge && <p className="alert alert-info text-sm font-semibold mb-3" data-testid="bundle-offer">{badge}</p>}

            <div className="flex items-baseline gap-3 flex-wrap mb-1">
              <span className="text-3xl font-extrabold text-fg">{CUR} {price.toLocaleString()}</span>
              {originalPrice > price && (
                <span className="text-muted line-through text-lg">{CUR} {originalPrice.toLocaleString()}</span>
              )}
              {off > 0 && <span className="text-sm font-semibold text-accent bg-accent-soft px-2 py-0.5 rounded-md">{off}% off</span>}
            </div>

            {includedNames && includedNames.length > 0 && (
              <p className="text-sm text-fg2 mt-3">
                <span className="font-semibold text-fg">Includes: </span>{includedNames.join(', ')}.
              </p>
            )}

            <ul className="mt-4 pt-4 border-t border-line grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted">
              <li className="flex items-center gap-1.5"><Lock size={14} className="text-accent" /> GCash &amp; banks</li>
              <li className="flex items-center gap-1.5"><Zap size={14} className="text-accent" /> Instant access</li>
              <li className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-accent" /> No gateway fees</li>
            </ul>
          </div>

          <ReceiptUploader productSlug={slug} productName={name} price={price} />
        </div>
      </section>

      <SupportSection />
    </>
  );
}
