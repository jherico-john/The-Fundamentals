'use client';
// Shows the hybrid payment options: GCash is primary; every other listed app
// pays the same GCash account through InstaPay ("bridge"). Order/visibility is
// driven by NEXT_PUBLIC_PAYMENT_CHANNELS_ENABLED so channels can be rotated
// without a code change.
import { getEnabledChannels } from '@/lib/paymentChannels';
import { ArrowRightLeft, Star } from 'lucide-react';

export default function PaymentChannelsPanel() {
  const channels = getEnabledChannels();
  const others = channels.filter(c => !c.primary);
  return (
    <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3" data-testid="payment-channels">
      <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
        <Star size={11} className="text-[var(--green)]" /> Accepted payment methods
      </p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--green)] text-black">GCash · primary</span>
        {others.map(c => (
          <span key={c.id} className="px-2.5 py-1 rounded-full text-xs border border-[var(--border)] text-gray-300">{c.label}</span>
        ))}
      </div>
      <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
        <ArrowRightLeft size={11} className="mt-0.5 flex-shrink-0 text-[var(--green)]" />
        <span>
          Paying from a bank or e-wallet? Use <strong className="text-gray-300">Send to bank / e-wallet → G-Xchange (GCash) via InstaPay</strong>,
          or scan the QR below from that app. Any transfer fee charged by your app is fine — it is accepted automatically.
        </span>
      </p>
    </div>
  );
}
