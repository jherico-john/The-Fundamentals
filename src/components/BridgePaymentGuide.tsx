'use client';
// "Paying from a bank or e-wallet?" guide — the InstaPay bridge to our GCash account.
// v6: plain-language rewrite, theme-aware, no decorative icons.
import { getEnabledChannels } from '@/lib/paymentChannels';

export default function BridgePaymentGuide() {
  const channels = getEnabledChannels().filter(c => !c.primary);
  return (
    <section className="mb-14 section-anchor" data-testid="bridge-guide" aria-labelledby="bridge-heading">
      <div className="card p-5 md:p-6 max-w-3xl mx-auto">
        <h2 id="bridge-heading" className="text-xl md:text-2xl font-bold text-fg mb-2">Paying from a bank or e-wallet?</h2>
        <p className="text-base text-fg2 mb-4">
          GCash is the easiest way to pay. You can also pay from the apps listed below. Your payment reaches our GCash account through <strong className="text-fg">InstaPay</strong>.
        </p>
        <ol className="space-y-2 text-base text-fg2 list-decimal pl-6 mb-5 leading-relaxed">
          <li>In your app, choose <strong className="text-fg">Send to bank / e-wallet</strong> (some apps call it <em>Bank Transfer</em>). Pick <strong className="text-fg">GCash</strong> (also shown as <em>G-Xchange</em>), or scan our GCash QR code from your app.</li>
          <li>Choose <strong className="text-fg">InstaPay</strong> as the transfer type and type the exact price shown on this page.</li>
          <li>If your app adds a transfer fee (usually ₱0 to ₱25), that is fine. It is accepted automatically.</li>
          <li>Save the <strong className="text-fg">complete receipt</strong>. The amount, account number or name, fee and reference number must all be visible.</li>
          <li>Upload the receipt in the Price &amp; Payment section. We check it automatically.</li>
        </ol>
        {channels.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">Apps you can pay from</h3>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {channels.map(c => (
                <div key={c.id} className="rounded-lg border border-line bg-surface px-3 py-2.5">
                  <p className="text-fg font-semibold">{c.label}</p>
                  <p className="text-muted mt-0.5">{c.receiptTip}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
