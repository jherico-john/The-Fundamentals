'use client';
// JumpToPaymentButton — v6. A fixed button at the bottom of the screen that takes
// the customer straight to "Price & Payment Details". It hides itself once the
// payment section is on screen, so it never covers the upload area.
import { useEffect, useState } from 'react';
import { ArrowDown } from 'lucide-react';

export default function JumpToPaymentButton({ targetId = 'payment' }: { targetId?: string }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setHidden(e.isIntersecting), { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);

  const go = () => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    // Move keyboard / screen-reader focus to the section as well.
    el.setAttribute('tabindex', '-1');
    (el as HTMLElement).focus({ preventScroll: true });
  };

  return (
    <div className="jump-bar" data-hidden={hidden} aria-hidden={hidden} data-testid="jump-to-payment">
      <div className="max-w-xl mx-auto">
        <button type="button" onClick={go} tabIndex={hidden ? -1 : 0} className="btn-primary w-full text-base px-5 min-h-[52px]">
          Go to Price &amp; Payment <ArrowDown size={18} />
        </button>
      </div>
    </div>
  );
}
