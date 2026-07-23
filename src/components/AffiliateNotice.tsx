'use client';

import { useState } from 'react';
import { X, Info } from 'lucide-react';

export default function AffiliateNotice() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div
      className="
        fixed
        bottom-4
        left-1/2
        -translate-x-1/2
        z-[999]
        w-[calc(100%-24px)]
        max-w-4xl
        rounded-2xl
        border
        backdrop-blur-xl
        shadow-2xl
        px-5
        py-4
        flex
        items-start
        gap-4
      "
      style={{
        background: 'rgba(10,46,24,.94)',
        borderColor: 'var(--border)',
      }}
    >
      <div
        className="
          w-11
          h-11
          rounded-full
          flex
          items-center
          justify-center
          shrink-0
        "
        style={{
          background: 'rgba(0,255,135,.12)',
          color: 'var(--green)',
        }}
      >
        <Info size={20} />
      </div>

      <div className="flex-1">
        <h3
          className="font-semibold text-sm mb-1"
          style={{ color: 'var(--green)' }}
        >
          Affiliate & Commission Notice
        </h3>

        <p className="text-sm text-gray-300 leading-relaxed">
          All product is currently{' '}
          <span
            className="font-semibold"
            style={{ color: 'var(--green)' }}
          >
            not eligible
          </span>{' '}
          for affiliate commissions or referral rewards. Any purchase made through
          shared links will not generate commissions at this time.
        </p>
      </div>

      <button
        onClick={() => setOpen(false)}
        aria-label="Close notice"
        className="
          rounded-lg
          p-2
          transition
          hover:bg-white/10
          text-gray-400
          hover:text-white
        "
      >
        <X size={18} />
      </button>
    </div>
  );
}