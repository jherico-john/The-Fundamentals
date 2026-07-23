'use client';
// AffiliateSidebar — v4 final
// Shows the "Share & Earn Commission" section on every product page.
// Displays cards for OTHER products (never the current page's own product).
// Each card: clicking the area opens a preview in a new tab; copy-button
// generates + copies the affiliate link (requires GCash number first).

import { useState, useEffect } from 'react';
import {
  Copy, Check, AlertTriangle, Link as LinkIcon, ExternalLink,
  TrendingUp, Users, DollarSign, Share2, BookOpen,
} from 'lucide-react';
import { getOtherProducts, type ProductMeta } from '@/lib/products';

interface Props {
  /** Slug of the product on this page — its own card won't appear */
  currentProductSlug: string;
  currentProductName: string;
}

interface AffRec {
  referral_code: string;
  referral_link: string;
  tier: string;
  earnings: number;
  click_count: number;
}

// ── Commission Flow Illustration (SVG) ───────────────────────────────────────
function ShareEarnIllustration() {
  return (
    <svg viewBox="0 0 360 148" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" aria-hidden="true">
      <defs>
        <linearGradient id="sBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#051A0D" />
          <stop offset="100%" stopColor="#0D3B20" />
        </linearGradient>
        <linearGradient id="sGrn" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00FF87" />
          <stop offset="100%" stopColor="#00C46A" />
        </linearGradient>
        <linearGradient id="sBlu" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0070CD" />
          <stop offset="100%" stopColor="#0057A8" />
        </linearGradient>
        <filter id="sGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="sShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.35" />
        </filter>
        <marker id="aG" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
          <path d="M0,0 L7,3 L0,6 Z" fill="#00FF87" />
        </marker>
        <marker id="aB" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
          <path d="M0,0 L7,3 L0,6 Z" fill="#60a5fa" />
        </marker>
      </defs>

      {/* Background */}
      <rect width="360" height="148" rx="14" fill="url(#sBg)" />

      {/* Glow blobs */}
      <ellipse cx="48" cy="72" rx="38" ry="28" fill="rgba(0,255,135,0.06)" />
      <ellipse cx="312" cy="72" rx="38" ry="28" fill="rgba(0,112,205,0.06)" />

      {/* ── YOU ── */}
      <circle cx="50" cy="54" r="21" fill="#0A2E18" stroke="#00FF87" strokeWidth="2" filter="url(#sGlow)" />
      <circle cx="50" cy="47" r="7.5" fill="#00C46A" />
      <path d="M34 72 Q50 63 66 72" fill="#007A42" />
      <rect x="33" y="79" width="34" height="13" rx="6" fill="url(#sGrn)" />
      <text x="50" y="89" textAnchor="middle" fill="#051A0D" fontSize="7" fontWeight="bold">YOU</text>

      {/* share arrow */}
      <path d="M73 54 L112 54" stroke="#00FF87" strokeWidth="1.8" strokeDasharray="5 3" markerEnd="url(#aG)" />
      <rect x="76" y="42" width="34" height="10" rx="4" fill="rgba(0,255,135,0.12)" />
      <text x="93" y="50" textAnchor="middle" fill="#00FF87" fontSize="6.5" fontWeight="600">share link</text>

      {/* ── FRIEND ── */}
      <circle cx="135" cy="54" r="21" fill="#0A2E18" stroke="#00C46A" strokeWidth="1.5" />
      <circle cx="135" cy="47" r="7.5" fill="#007A42" />
      <path d="M119 72 Q135 63 151 72" fill="#005A30" />
      <rect x="116" y="79" width="38" height="13" rx="6" fill="rgba(0,196,106,0.18)" stroke="#00C46A" strokeWidth="0.8" />
      <text x="135" y="89" textAnchor="middle" fill="#00C46A" fontSize="6.5" fontWeight="bold">FRIEND</text>

      {/* buy arrow */}
      <path d="M158 54 L190 54" stroke="#60a5fa" strokeWidth="1.8" strokeDasharray="5 3" markerEnd="url(#aB)" />
      <rect x="161" y="42" width="26" height="10" rx="4" fill="rgba(96,165,250,0.12)" />
      <text x="174" y="50" textAnchor="middle" fill="#60a5fa" fontSize="6" fontWeight="600">buys</text>

      {/* ── PRODUCT box ── */}
      <rect x="194" y="36" width="62" height="37" rx="9" fill="#0A2E18" stroke="#1A5C35" strokeWidth="1.2" filter="url(#sShadow)" />
      <rect x="202" y="43" width="46" height="5" rx="2.5" fill="#1A5C35" />
      <rect x="206" y="52" width="38" height="5" rx="2.5" fill="url(#sGrn)" opacity="0.7" />
      <text x="225" y="66" textAnchor="middle" fill="#00FF87" fontSize="10" fontWeight="bold">₱497</text>

      {/* commission arrow back */}
      <path d="M194 62 L76 96 L50 96 L50 80" stroke="url(#sGrn)" strokeWidth="1.8" markerEnd="url(#aG)" />
      <rect x="94" y="94" width="72" height="11" rx="4" fill="rgba(0,255,135,0.1)" />
      <text x="130" y="103" textAnchor="middle" fill="#00FF87" fontSize="6.5" fontWeight="600">10% commission → you</text>

      {/* ── Earnings badge ── */}
      <rect x="272" y="28" width="76" height="46" rx="10" fill="rgba(0,255,135,0.1)" stroke="#00FF87" strokeWidth="1.2" filter="url(#sGlow)" />
      <text x="310" y="45" textAnchor="middle" fill="#a3f0cc" fontSize="7">Your Earnings</text>
      <text x="310" y="62" textAnchor="middle" fill="#00FF87" fontSize="17" fontWeight="bold">+₱49</text>
      <text x="310" y="69" textAnchor="middle" fill="#00C46A" fontSize="6">.70 per sale</text>

      {/* GCash payout badge */}
      <rect x="272" y="84" width="76" height="24" rx="7" fill="url(#sBlu)" opacity="0.92" />
      <text x="310" y="94" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="bold">Paid via GCash</text>
      <text x="310" y="103" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="6">every 3 days</text>

      {/* Sparkles */}
      {([[14,17],[176,14],[244,17],[350,22]] as [number,number][]).map(([x,y], i) => (
        <g key={i} filter="url(#sGlow)">
          <polygon
            points={`${x},${y-5} ${x+1.7},${y-1.7} ${x+5},${y} ${x+1.7},${y+1.7} ${x},${y+5} ${x-1.7},${y+1.7} ${x-5},${y} ${x-1.7},${y-1.7}`}
            fill="#00FF87" opacity="0.55"
          />
        </g>
      ))}

      {/* Caption */}
      <text x="10" y="140" fill="#1A5C35" fontSize="6.2">Share your link → Friend buys → You earn 10% — automatically tracked in your dashboard</text>
    </svg>
  );
}

// ── Product Card (clickable area → preview; copy button → affiliate link) ────
function ProductCard({ product, mobile, name, onGenerate, aff, copied, busy }: {
  product: ProductMeta;
  mobile: string;
  name: string;
  onGenerate: (product: ProductMeta) => void;
  aff: AffRec | null;
  copied: string | null;
  busy: string | null;
}) {
  const isBusy   = busy === product.slug;
  const myAff    = aff;
  const isCopied = copied === product.slug;

  return (
    <div className="glass-card overflow-hidden hover:border-[var(--green-dark)] transition-colors duration-200"
      style={{ borderColor: 'rgba(0,255,135,0.15)' }}>
      {/* Clickable preview area */}
      <a
        href={product.affiliateLink}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-4 pb-3 hover:bg-[var(--green)] hover:bg-opacity-5 transition-colors"
        title={`Preview ${product.name}`}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,255,135,0.12)' }}>
            <BookOpen size={18} className="text-[var(--green)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="font-bold text-white text-sm leading-tight">{product.shortName}</p>
              <ExternalLink size={11} className="text-gray-500 flex-shrink-0" />
            </div>
            <p className="text-gray-400 text-xs leading-snug truncate">{product.tagline}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[var(--green)] font-bold text-xs">₱{product.price.toLocaleString()}</span>
              <span className="text-gray-600 text-[10px]">·</span>
              <span className="text-gray-500 text-[10px]">{product.lessons} lessons</span>
            </div>
          </div>
        </div>
      </a>

      {/* Copy affiliate link button */}
      <div className="px-4 pb-4">
        <button
          onClick={(e) => { e.stopPropagation(); onGenerate(product); }}
          disabled={isBusy}
          className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg font-semibold text-xs transition-all ${
            isCopied
              ? 'bg-[var(--green-deeper)] bg-opacity-30 text-[var(--green)] border border-[var(--green-deeper)]'
              : 'border border-[var(--border)] text-gray-300 hover:text-white hover:border-[var(--green)] hover:bg-[var(--green)] hover:bg-opacity-5'
          } disabled:opacity-60`}
        >
          {isBusy ? (
            <><span className="animate-spin text-xs">⟳</span> Generating…</>
          ) : isCopied ? (
            <><Check size={12} /> Affiliate Link Copied!</>
          ) : myAff ? (
            <><Copy size={12} /> Copy My Affiliate Link</>
          ) : (
            <><LinkIcon size={12} /> Get Affiliate Link</>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AffiliateSidebar({ currentProductSlug, currentProductName }: Props) {
  const otherProducts = getOtherProducts(currentProductSlug);

  const [mobile, setMobile]   = useState('');
  const [name, setName]       = useState('');
  const [err, setErr]         = useState('');
  const [touched, setTouched] = useState(false);
  // Map slug → AffRec (after generation)
  const [affMap, setAffMap]   = useState<Record<string, AffRec>>({});
  const [copied, setCopied]   = useState<string | null>(null);
  const [busy, setBusy]       = useState<string | null>(null);

  // Pre-fill name from customer session
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.name) setName(d.name); })
      .catch(() => {});
  }, []);

  const refCode = () => {
    const m = document.cookie.match(/affiliate_ref=([^;]+)/);
    return m ? m[1] : null;
  };

  const handleGenerate = async (product: ProductMeta) => {
    setTouched(true);

    if (!mobile.replace(/\D/g, '') || mobile.replace(/\D/g, '').length < 10) {
      setErr('Enter your GCash number below so we can pay your commission.');
      return;
    }

    // If we already have an affiliate record for this product, just copy
    if (affMap[product.slug]) {
      await navigator.clipboard.writeText(affMap[product.slug].referral_link);
      setCopied(product.slug);
      setTimeout(() => setCopied(null), 2500);
      return;
    }

    setBusy(product.slug);
    setErr('');
    try {
      const res  = await fetch('/api/affiliate/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || 'Affiliate',
          mobileNumber: mobile,
          productLink: product.affiliateLink,
          referredByCode: refCode(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Could not generate link. Please try again.'); return; }
      setAffMap(prev => ({ ...prev, [product.slug]: data.affiliate }));
      await navigator.clipboard.writeText(data.affiliate.referral_link);
      setCopied(product.slug);
      setTimeout(() => setCopied(null), 2500);
    } catch { setErr('Network error. Please try again.'); }
    finally { setBusy(null); }
  };

  return (
    <section className="mb-16">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-full px-4 py-1.5 text-xs text-[var(--green)] font-medium mb-3 tracking-wider uppercase">
          <Share2 size={11} /> Affiliate Program
        </div>
        <h2 className="text-white mb-2"
          style={{ fontFamily: 'Bebas Neue,Impact,sans-serif', fontSize: '2rem', fontWeight: 700 }}>
          Share & Earn Commission
        </h2>
        <p className="text-gray-400 text-sm max-w-lg mx-auto">
          Share our other ministry products with friends and earn{' '}
          <strong className="text-[var(--green)]">10% commission</strong> on every sale.
          Paid via GCash every 3 days — no paperwork needed.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">

        {/* Illustration */}
        <div className="glass-card p-4 mb-6 overflow-hidden" style={{ borderColor: 'rgba(0,255,135,0.2)' }}>
          <ShareEarnIllustration />
          {/* Stats row below illustration */}
          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-[var(--border)]">
            {[
              { icon: <DollarSign size={14} />, label: 'Commission',  value: '10% per sale',   color: '#00FF87' },
              { icon: <Users size={14} />,      label: 'Multi-Tier',  value: 'Earn from chain', color: '#00C46A' },
              { icon: <TrendingUp size={14} />, label: 'Payout',      value: 'GCash · 3 days', color: '#0070CD' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1" style={{ color: s.color }}>
                  {s.icon}
                  <span className="text-xs font-semibold">{s.label}</span>
                </div>
                <p className="text-white text-xs font-bold">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* GCash number input — required before copying any link */}
        <div className="glass-card p-5 mb-5" style={{ borderColor: 'rgba(0,255,135,0.15)' }}>
          <div className="flex items-start gap-2 mb-3 p-2.5 bg-yellow-950 bg-opacity-40 border border-yellow-800 rounded-lg text-xs text-yellow-300">
            <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
            <span>
              <strong>Required before copying any link:</strong> Enter your GCash number so we can send your commission.
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setErr(''); }}
                placeholder="Juan dela Cruz"
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                GCash Number <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={e => { setMobile(e.target.value); setErr(''); }}
                placeholder="09XX XXX XXXX"
                className={`w-full bg-[var(--bg)] border rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none transition-colors ${
                  touched && !mobile.replace(/\D/g,'')
                    ? 'border-red-700 focus:border-red-500'
                    : 'border-[var(--border)] focus:border-[var(--green)]'
                }`}
              />
            </div>
          </div>
          {(err || (touched && !mobile.replace(/\D/g,''))) && (
            <p className="text-xs text-red-400 flex items-center gap-1.5 mt-2">
              <AlertTriangle size={11} />
              {err || 'GCash number is required before you can copy your affiliate link.'}
            </p>
          )}
          <p className="text-[10px] text-gray-600 mt-2">
            We use your GCash number to pay commissions manually every 3 days. Your info is stored securely.
          </p>
        </div>

        {/* Product cards grid — all OTHER products */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-3 flex items-center gap-2">
            <ExternalLink size={12} className="text-[var(--green)]" />
            Click a product card to preview it · Click &quot;Get Affiliate Link&quot; to copy your referral link
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {otherProducts.map(product => (
              <ProductCard
                key={product.slug}
                product={product}
                mobile={mobile}
                name={name}
                onGenerate={handleGenerate}
                aff={affMap[product.slug] || null}
                copied={copied}
                busy={busy}
              />
            ))}
          </div>
        </div>

        {/* If any links generated, show summary */}
        {Object.keys(affMap).length > 0 && (
          <div className="glass-card p-4 mt-4 space-y-2" style={{ borderColor: 'rgba(0,255,135,0.2)' }}>
            <p className="text-xs font-semibold text-[var(--green)] mb-2">Your Generated Affiliate Links:</p>
            {Object.entries(affMap).map(([slug, rec]) => {
              const prod = otherProducts.find(p => p.slug === slug);
              return (
                <div key={slug} className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs w-28 flex-shrink-0">{prod?.shortName || slug}:</span>
                  <input
                    readOnly
                    value={rec.referral_link}
                    className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-[var(--green)] text-[10px] font-mono select-all"
                  />
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(rec.referral_link);
                      setCopied(slug); setTimeout(() => setCopied(null), 2000);
                    }}
                    className="p-1.5 rounded border border-[var(--border)] hover:border-[var(--green)] text-gray-400 hover:text-white transition-colors flex-shrink-0"
                  >
                    {copied === slug ? <Check size={12} className="text-[var(--green)]" /> : <Copy size={12} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-gray-600 text-center mt-4">
          Commissions are calculated and paid manually via GCash every 3 days.
          Questions?{' '}
          <a href="mailto:jhericojohnbalasa@gmail.com" className="text-[var(--green)] hover:underline">
            jhericojohnbalasa@gmail.com
          </a>
        </p>
      </div>
    </section>
  );
}
