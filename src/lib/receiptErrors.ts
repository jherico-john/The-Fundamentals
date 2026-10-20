// src/lib/receiptErrors.ts — v5
// ─────────────────────────────────────────────────────────────────────────────
// Channel-aware, plain-language verification errors.
//
// v4 problem: ONE vague message ("upload a receipt that is not cropped or
// edited") was returned for very different failures — even for a perfectly
// good downloaded receipt. v5 gives every failure its own code, headline,
// explanation and concrete fix-steps, and tailors them to the payment channel
// that was detected on the receipt.
// ─────────────────────────────────────────────────────────────────────────────
import { CHANNELS, type ChannelId } from './paymentChannels';

export type ReceiptErrorCode =
  | 'NO_FILE' | 'FILE_TOO_LARGE' | 'BAD_FILE_TYPE' | 'UNREADABLE_IMAGE'
  | 'OCR_FAILED' | 'NOT_A_RECEIPT' | 'CHANNEL_NOT_ACCEPTED'
  | 'MISSING_REFERENCE' | 'MISSING_AMOUNT'
  | 'AMOUNT_SHORT' | 'AMOUNT_OVER'
  | 'WRONG_RECIPIENT' | 'STANDALONE_NOT_ACCEPTED'
  | 'DUPLICATE_REFERENCE' | 'DUPLICATE_IMAGE'
  | 'RECEIPT_TOO_OLD' | 'RECEIPT_FUTURE_DATE'
  | 'EDITED_IMAGE' | 'UNSTABLE_TEXT' | 'WRONG_PRODUCT_PRICE'
  | 'UNKNOWN_PRODUCT' | 'SERVER_ERROR';

export interface ReceiptError {
  code: ReceiptErrorCode;
  title: string;
  message: string;
  /** Concrete steps the customer can take */
  fixes: string[];
  channel?: ChannelId | 'unknown';
  /** Whether "Try again" can help (false = contact support / already used) */
  retryable: boolean;
  /** Safe-to-show facts about what the scanner saw */
  detected?: { channel?: string; amount?: number; fee?: number; reference?: string; expected?: number };
}

const peso = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const chLabel = (c?: ChannelId | 'unknown') => (c && c !== 'unknown' ? CHANNELS[c].label : 'your payment app');
const tip = (c?: ChannelId | 'unknown') => (c && c !== 'unknown' ? [CHANNELS[c].receiptTip] : []);

export interface ErrCtx {
  channel?: ChannelId | 'unknown';
  expected?: number;
  amount?: number;
  fee?: number;
  reference?: string;
  productName?: string;
  maxAgeDays?: number;
  ageDays?: number;
  supportEmail?: string;
}

export function buildError(code: ReceiptErrorCode, c: ErrCtx = {}): ReceiptError {
  const ch = chLabel(c.channel);
  const base = { code, channel: c.channel, detected: { channel: c.channel, amount: c.amount, fee: c.fee, reference: c.reference, expected: c.expected } };
  const mail = c.supportEmail || 'jhericojohnbalasa@gmail.com';

  switch (code) {
    case 'NO_FILE':
      return { ...base, title: 'No receipt attached', retryable: true,
        message: 'We did not receive an image. Choose the receipt picture and try again.', fixes: ['Tap the upload box and pick your saved receipt image.'] };
    case 'FILE_TOO_LARGE':
      return { ...base, title: 'Image is too large', retryable: true,
        message: 'The receipt image is bigger than 10 MB.', fixes: ['Use the Save Image / Download option in your app instead of a screen recording or camera photo.'] };
    case 'BAD_FILE_TYPE':
      return { ...base, title: 'Unsupported file type', retryable: true,
        message: 'Please upload the receipt as a JPG, PNG or WEBP image (not a PDF or video).', fixes: ['Save the receipt as an image from your payment app.'] };
    case 'UNREADABLE_IMAGE':
      return { ...base, title: 'We could not open this image', retryable: true,
        message: 'The file looks damaged or is in a format we cannot decode.', fixes: ['Re-save the receipt from your app and upload the new file.', 'JPG or PNG works best.'] };
    case 'OCR_FAILED':
      return { ...base, title: 'Could not read the receipt text', retryable: true,
        message: 'The scanner was unable to read any text from this image.',
        fixes: ['Upload the full, sharp receipt (no zoomed-out photos of another screen).', 'Make sure the image is not blurry or very dark.', ...tip(c.channel)] };
    case 'NOT_A_RECEIPT':
      return { ...base, title: 'This does not look like a transfer receipt', retryable: true,
        message: 'We could not find any payment details (amount, reference number, GCash/InstaPay) in this image.',
        fixes: ['Upload the successful-payment receipt, not the payment screen before confirming.', 'Do not upload your QR code or a chat screenshot.'] };
    case 'CHANNEL_NOT_ACCEPTED':
      return { ...base, title: `${ch} is not accepted right now`, retryable: false,
        message: `Payments from ${ch} are currently turned off.`, fixes: ['Pay with GCash (primary) or another listed bank/e-wallet.'] };
    case 'MISSING_REFERENCE':
      return { ...base, title: `Reference number not visible on your ${ch} receipt`, retryable: true,
        message: `The receipt was read, but its reference number could not be found. This usually means the bottom part of the receipt is cut off or hidden behind a collapsed section.`,
        fixes: [...tip(c.channel), 'Scroll so the whole receipt is on one screen — down to the reference number — then save it again.', 'If you only used a screenshot, make sure nothing is covered by popups or the keyboard.'] };
    case 'MISSING_AMOUNT':
      return { ...base, title: `Amount not visible on your ${ch} receipt`, retryable: true,
        message: 'The receipt was read, but the amount could not be found.',
        fixes: [...tip(c.channel), 'Make sure the amount line is inside the image (not cropped at the top).'] };
    case 'AMOUNT_SHORT':
      return { ...base, title: 'Amount is lower than the price', retryable: false,
        message: `Your receipt shows ${peso(c.amount ?? 0)}${c.fee ? ` (fee ${peso(c.fee)})` : ''}, but ${c.productName ? c.productName + ' costs ' : 'the price is '}${peso(c.expected ?? 0)}. The money received by us must be at least the product price — transfer fees charged by ${ch} are added on top.`,
        fixes: [`Send the remaining difference to the same account and email the new receipt to ${mail}.`, 'Do not re-upload this same receipt — it will not pass.'] };
    case 'AMOUNT_OVER':
      return { ...base, title: 'Amount is higher than the product price', retryable: false,
        message: `Your receipt shows ${peso(c.amount ?? 0)} but ${c.productName ? c.productName + ' costs ' : 'the price is '}${peso(c.expected ?? 0)}. You may have paid for a different product or typed a wrong amount.`,
        fixes: [`Check you are on the right product page (prices differ per product).`, `Paid a different product's price? Open that product page and upload the receipt there.`, `If you intentionally paid extra, email ${mail} with your reference number.`] };
    case 'WRONG_RECIPIENT':
      return { ...base, title: 'Payment was not sent to our account', retryable: false,
        message: `This ${ch} receipt does not show our receiving account (G-Xchange/GCash). Receipts for payments sent to anyone else cannot unlock a download.`,
        fixes: ['Scan the QR code or use the account details shown on this page, then pay again.', 'Check the "To / Account name / Account number" part of your receipt is included in the image.', `Paid correctly but still rejected? Email ${mail} with your reference number.`] };
    case 'STANDALONE_NOT_ACCEPTED':
      return { ...base, title: `Direct ${ch} payments are not available`, retryable: false,
        message: `This receipt shows a payment inside ${ch}, not a transfer to our GCash account.`,
        fixes: [`Use ${ch} → "Send to bank / e-wallet" → G-Xchange (GCash) via InstaPay, or scan our GCash QR from ${ch}.`] };
    case 'DUPLICATE_REFERENCE':
      return { ...base, title: 'This receipt was already submitted', retryable: false,
        message: `Reference ${c.reference || ''} was already used to unlock a download. Each payment can only be used once.`.replace('  ', ' '),
        fixes: [`Already purchased? Open the product page on the same device to see your purchase, or sign in to your account.`, `Think this is a mistake? Email ${mail} with the reference number.`] };
    case 'DUPLICATE_IMAGE':
      return { ...base, title: 'This image was already submitted', retryable: false,
        message: 'This exact image has already been used. Each receipt can only be submitted once.',
        fixes: ['Do not re-upload an old receipt or an edited copy.', `Need help? Email ${mail}.`] };
    case 'RECEIPT_TOO_OLD':
      return { ...base, title: 'Receipt is too old', retryable: false,
        message: `This receipt is ${Math.floor(c.ageDays ?? 0)} day(s) old. We only accept receipts from the last ${c.maxAgeDays ?? 3} days.`,
        fixes: [`Paid longer ago? Email ${mail} with your reference number and we will verify it manually.`] };
    case 'RECEIPT_FUTURE_DATE':
      return { ...base, title: 'Receipt date looks wrong', retryable: false,
        message: 'The date on this receipt is in the future, which can happen when a receipt has been altered.',
        fixes: ['Upload the original, unedited receipt saved from your app.'] };
    case 'EDITED_IMAGE':
      return { ...base, title: 'This image appears to have been edited', retryable: false,
        message: 'The file carries the signature of an image-editing app. Edited receipts are rejected automatically.',
        fixes: ['Upload the original receipt exactly as your payment app saved it.', `If it was never edited, email ${mail} and we will review it.`] };
    case 'UNSTABLE_TEXT':
      return { ...base, title: 'Receipt details do not add up', retryable: true,
        message: `The numbers on this ${ch} receipt are inconsistent (for example the amount, fee and total do not match), or the text could not be read reliably.`,
        fixes: ['Upload the original, unedited receipt — no filters, markup or compression apps.', 'Make sure the image is sharp and shows the whole receipt.', ...tip(c.channel)] };
    case 'WRONG_PRODUCT_PRICE':
      return { ...base, title: 'Price mismatch', retryable: false,
        message: 'The amount does not match this product.', fixes: ['Check the price on this page and pay that amount.'] };
    case 'UNKNOWN_PRODUCT':
      return { ...base, title: 'Unknown product', retryable: false,
        message: 'This purchase page is not recognised.', fixes: ['Go back and open the product page again.'] };
    default:
      return { ...base, title: 'Verification error', retryable: true,
        message: 'Something went wrong on our side while checking your receipt. Your payment is safe.',
        fixes: ['Wait a few seconds and try again.', `Still failing? Email ${mail} with your reference number.`] };
  }
}

/** Flat string for legacy consumers / logs. */
export function errorToText(e: ReceiptError): string {
  return `${e.title}. ${e.message}`;
}
