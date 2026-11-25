'use client';
// PaymentTutorial — v6 (clarity rewrite)
// Written for customers who are not comfortable with technology:
//  • every step is visible at once (no hidden slides to tap through)
//  • one action per step, plain words, short sentences, large readable text
//  • a screenshot beside the step wherever we have one
//  • a plain "what happens at the end" step: you are taken to the download page
//    in this same window — nothing opens in another tab.
const NEW_TAB = process.env.NEXT_PUBLIC_THANKYOU_OPEN_NEW_TAB !== 'false';
const GCASH_NAME = process.env.NEXT_PUBLIC_GCASH_NAME || 'J. Balasa';

interface Step {
  title: string;
  body: string[];
  tip?: string;
  img?: string;
  imgAlt?: string;
  imgCaption?: string;
}

const STEPS: Step[] = [
  {
    title: 'Open the GCash app',
    body: ['On your phone, open the GCash app and log in.'],
    tip: 'Using Maya, BDO, BPI or another bank app instead? That works too. See "Paying from a bank or e-wallet" below.',
    img: '/tutorial/t1qrph.jpg',
    imgAlt: 'GCash home screen with the Send Money and QR buttons',
  },
  {
    title: 'Choose how you want to send',
    body: [
      'Option A, scan our QR code: tap the QR button at the bottom of GCash, then scan the QR code in the Price & Payment section below.',
      'Option B, send to our number: tap "Send Money" and type our GCash number. You can copy it from the Price & Payment section below.',
    ],
    tip: 'On the same phone? Tap "Download QR Code" below, then in GCash tap "Upload QR" and pick the saved picture.',
    img: '/tutorial/t1.jpg',
    imgAlt: 'GCash QR reader with the Upload QR button',
  },
  {
    title: 'Type the exact price',
    body: ['Type the exact price shown in the Price & Payment section below. Do not round it up or down.'],
    tip: 'If your bank or app adds a small fee, that is fine. It is accepted automatically.',
    img: '/tutorial/t2.jpg',
    imgAlt: 'GCash Express Send screen with the amount field',
  },
  {
    title: 'Check the details, then tap Send',
    body: [
      `Make sure the receiver name is ${GCASH_NAME} and the amount is correct.`,
      'Then tap the "Send" button to finish paying.',
    ],
    img: '/tutorial/t3.jpg',
    imgAlt: 'GCash confirmation screen showing the receiver and the total amount',
  },
  {
    title: 'Save your receipt picture',
    body: [
      'After paying, GCash shows a success screen. Tap the "Download" button at the bottom.',
      'This saves the receipt as a picture in your phone gallery.',
    ],
    tip: 'Please use the Download button. A screenshot of your screen is often not accepted.',
    img: '/tutorial/t4.jpg',
    imgAlt: 'GCash success screen with the Download button at the bottom',
  },
  {
    title: 'Come back to this page and upload the receipt',
    body: [
      'Return to this page and scroll to "Upload Your Payment Receipt".',
      'Tap the box and choose the receipt picture you just saved.',
    ],
    img: '/tutorial/t6.jpg',
    imgAlt: 'Example of a saved GCash receipt picture',
    imgCaption: 'Your saved receipt looks like this.',
  },
  {
    title: 'Wait a few seconds. You will be taken to your downloads.',
    body: [
      'We check your receipt automatically. This takes only a few seconds.',
      NEW_TAB
        ? 'When it is approved, your download page opens in a new tab. Your files are on that page. If it does not open, tap the "Go to My Download Page" button.'
        : 'When it is approved, this page takes you to your download page in this same window. Your files are on that page. No other tab opens.',
    ],
    tip: 'Please stay on the page while it checks. Do not pay again.',
  },
];

export default function PaymentTutorial() {
  return (
    <section className="mb-14 section-anchor" id="how-to-pay" aria-labelledby="how-heading" data-testid="payment-tutorial">
      <div className="text-center mb-8">
        <h2 id="how-heading" className="text-2xl md:text-3xl font-bold text-fg mb-2">How to pay, step by step</h2>
        <p className="text-fg2 max-w-xl mx-auto">
          Read the steps below. You pay in your own app, save the receipt, upload it here, and your downloads open automatically.
        </p>
      </div>

      <ol className="max-w-3xl mx-auto space-y-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card p-5 md:p-6">
            <div className="flex gap-4">
              <span
                className="flex-shrink-0 w-10 h-10 rounded-full bg-accent-solid text-on-accent flex items-center justify-center text-lg font-bold"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-fg mb-2">
                  <span className="sr-only">Step {i + 1}: </span>{s.title}
                </h3>
                <div className="space-y-2 text-base text-fg2 leading-relaxed">
                  {s.body.map((line, k) => <p key={k}>{line}</p>)}
                </div>
                {s.tip && (
                  <p className="alert alert-info mt-3">
                    <strong>Tip: </strong>{s.tip}
                  </p>
                )}
                {s.img && (
                  <figure className="mt-4">
                    <img
                      src={s.img}
                      alt={s.imgAlt || ''}
                      width={720}
                      height={1608}
                      loading="lazy"
                      className="h-auto rounded-xl border border-line"
                      style={{ width: '100%', maxWidth: 190 }}
                    />
                    {s.imgCaption && <figcaption className="text-sm text-muted mt-2">{s.imgCaption}</figcaption>}
                  </figure>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}