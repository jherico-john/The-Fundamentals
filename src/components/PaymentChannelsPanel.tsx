'use client';
// Shows the hybrid payment options: GCash is primary; every other listed app
// pays the same GCash account through InstaPay ("bridge"). Order/visibility is
// driven by NEXT_PUBLIC_PAYMENT_CHANNELS_ENABLED so channels can be rotated
// without a code change.
import { getEnabledChannels } from '@/lib/paymentChannels';

export default function PaymentChannelsPanel() {
  const channels = getEnabledChannels();
  const others = channels.filter(c => !c.primary);
  return (
    <div className="mt-5 rounded-xl border border-line bg-surface p-4" data-testid="payment-channels">
      <p className="text-sm font-semibold text-fg mb-2">Accepted payment methods</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-accent-solid text-on-accent">GCash (recommended)</span>
        {others.map(c => (
          <span key={c.id} className="px-3 py-1 rounded-full text-sm border border-line-strong text-fg2">{c.label}</span>
        ))}
      </div>
      <p className="text-sm text-muted">
        Paying from a bank or e-wallet? Choose <strong className="text-fg2">Send to bank / e-wallet</strong>, pick <strong className="text-fg2">GCash</strong> and use <strong className="text-fg2">InstaPay</strong>, or scan the QR code above from that app. A transfer fee from your app is fine.
      </p>
    </div>
  );
}
