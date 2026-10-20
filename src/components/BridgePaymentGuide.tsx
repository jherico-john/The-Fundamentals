'use client';
// "Paying from a bank or e-wallet" guide — the InstaPay bridge to our GCash account.
import { ArrowRightLeft } from 'lucide-react';
import { getEnabledChannels } from '@/lib/paymentChannels';

export default function BridgePaymentGuide() {
  const channels = getEnabledChannels().filter(c => !c.primary);
  return (
    <section className="mb-16 fade-up-3" data-testid="bridge-guide">
      <div className="glass-card p-6" style={{ borderColor: 'rgba(0,255,135,0.2)' }}>
        <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <ArrowRightLeft size={18} className="text-[var(--green)]" /> Paying from a bank or e-wallet?
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          GCash is our primary method, but you can also pay from the apps below. They deliver your payment to our GCash account through
          <strong className="text-gray-300"> InstaPay</strong>.
        </p>
        <ol className="space-y-2 text-sm text-gray-300 list-decimal pl-5 mb-4">
          <li>In your app choose <strong>Send to bank / e-wallet</strong> (or <em>Bank transfer</em>) and pick <strong>G-Xchange (GCash)</strong>, or scan our GCash QR from the app.</li>
          <li>Pick <strong>InstaPay</strong> as the transfer method and enter the product price shown on this page.</li>
          <li>If your app charges a transfer fee (usually ₱0–₱25) that is fine — it is accepted automatically.</li>
          <li>Save the <strong>complete receipt</strong>: amount, account number/name, fee and reference number must all be visible.</li>
          <li>Upload it above. We read the receipt automatically and unlock your download.</li>
        </ol>
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          {channels.map(c => (
            <div key={c.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
              <p className="text-white font-semibold">{c.label}</p>
              <p className="text-gray-500 mt-0.5">{c.receiptTip}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
