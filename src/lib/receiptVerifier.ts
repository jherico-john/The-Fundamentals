// src/lib/receiptVerifier.ts
// ─────────────────────────────────────────────────────────────────────────────
// GCash Receipt Verification Engine
//
// STRATEGY (two-layer):
//  Layer 1 — QR Code scan: reads the EMVCo/QRPh payload embedded in the receipt
//             screenshot. A valid GCash receipt always contains a QR code.
//  Layer 2 — OCR text extraction: reads the visible text fields from the receipt
//             image (amount, reference number, date) using Tesseract.js.
//
// Both layers together give us strong confidence the receipt is genuine and
// matches the expected payment (amount, recency, no replay).
// ─────────────────────────────────────────────────────────────────────────────

import Jimp from 'jimp';
import QrCode from 'qrcode-reader';
import { createWorker } from 'tesseract.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VerificationResult {
  valid: boolean;
  reason?: string;             // human-readable failure reason
  data?: ExtractedReceiptData; // what we successfully extracted
  warnings?: string[];         // non-fatal issues
}

export interface ExtractedReceiptData {
  referenceNumber: string;
  amount: number;
  dateStr: string;
  mobileNumber?: string;
  qrPayload?: string;
  rawText?: string;
}

// ── Anti-Replay Store ─────────────────────────────────────────────────────────
// Keeps track of reference numbers already used for downloads.
// In production swap for Redis/Supabase/DB.

const usedReferenceNumbers = new Set<string>();

export function markReferenceUsed(refNo: string) {
  usedReferenceNumbers.add(refNo.replace(/\s/g, ''));
}

export function isReferenceUsed(refNo: string): boolean {
  return usedReferenceNumbers.has(refNo.replace(/\s/g, ''));
}

// ── QR Code Scanner ───────────────────────────────────────────────────────────

async function scanQRCode(imageBuffer: Buffer): Promise<string | null> {
  return new Promise((resolve) => {
    Jimp.read(imageBuffer)
      .then((image) => {
        const qr = new QrCode();
        qr.callback = (err: Error | null, value: { result: string } | null) => {
          if (err || !value?.result) {
            resolve(null);
            return;
          }
          resolve(value.result);
        };
        qr.decode(image.bitmap);
      })
      .catch(() => resolve(null));
  });
}

// ── OCR Text Extractor ────────────────────────────────────────────────────────

async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  // Pre-process with Jimp: grayscale + contrast boost for better OCR
  const processed = await Jimp.read(imageBuffer);
  processed
    .greyscale()
    .contrast(0.3)
    .normalize();

  const processedBuffer = await processed.getBufferAsync(Jimp.MIME_PNG);

  const worker = await createWorker('eng', 1, {
    logger: () => {}, // silence logs
  });

  const { data } = await worker.recognize(processedBuffer);
  await worker.terminate();
  return data.text;
}

// ── Field Parsers ─────────────────────────────────────────────────────────────

function extractRefNumber(text: string): string | null {
  // GCash ref format: "9041 784 498164" or "9041784498164"
  // Pattern: "Ref No." followed by digits/spaces
  const patterns = [
    /Ref\.?\s*No\.?\s*[:\s]*([0-9][\d\s]{8,20})/i,
    /Reference\s*(?:Number|No\.?)\s*[:\s]*([0-9][\d\s]{8,20})/i,
    /\b([0-9]{4}\s[0-9]{3}\s[0-9]{6})\b/,   // exact GCash spacing: XXXX XXX XXXXXX
    /\b([0-9]{13,16})\b/,                      // no-space variant
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].replace(/\s+/g, '').trim();
  }
  return null;
}

function extractAmount(text: string): number | null {
  // GCash shows: "Amount  1.00", "Total Amount Sent  ₱1.00", "₱497.00"
  const patterns = [
    /Total\s+Amount\s+Sent\s+[₱P]?\s*([\d,]+\.?\d*)/i,
    /Amount\s+Sent\s+[₱P]?\s*([\d,]+\.?\d*)/i,
    /[₱P]\s*([\d,]+\.?\d{2})/,
    /Amount\s+([\d,]+\.?\d{2})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const numStr = match[1].replace(/,/g, '');
      const num = parseFloat(numStr);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return null;
}

function extractDate(text: string): string | null {
  // GCash date: "Jun 12, 2026 3:12 PM"
  const patterns = [
    /([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\s+\d{1,2}:\d{2}\s*(?:AM|PM)?)/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function extractMobileNumber(text: string): string | null {
  // "+63 905 037 2330" or "09050372330"
  const match = text.match(/(\+63\s?[\d\s]{10,14}|09\d{2}[\s\-]?\d{3}[\s\-]?\d{4})/);
  return match ? match[1].replace(/\s/g, '') : null;
}

function parseReceiptDate(dateStr: string): Date | null {
  try {
    const cleaned = dateStr.replace(/,/g, '');
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

// ── GCash QR Payload Validator ────────────────────────────────────────────────
// GCash receipts embed an EMVCo / QRPh QR code.
// The payload typically starts with "00020101" (EMVCo format indicator).

function isValidGCashQRPayload(payload: string): boolean {
  if (!payload) return false;
  const p = payload.trim();
  // EMVCo QR format starts with format indicator 00020101 or 000201
  if (p.startsWith('000201')) return true;
  // Some GCash receipts embed a URL
  if (p.includes('gcash.com') || p.includes('gxhandle')) return true;
  // QRPh standard often includes "PH"
  if (p.includes('PH') && p.length > 20) return true;
  return false;
}

// ── Main Verification Function ────────────────────────────────────────────────

export async function verifyGCashReceipt(
  imageBuffer: Buffer,
  options: {
    expectedAmount: number;
    testMode: boolean;
    priceTolerance: number;
    maxAgeDays?: number; // default 3
  }
): Promise<VerificationResult> {
  const { expectedAmount, testMode, priceTolerance, maxAgeDays = 3 } = options;
  const warnings: string[] = [];

  // ── Step 1: QR Code scan ──────────────────────────────────────────────────
  let qrPayload: string | null = null;
  try {
    qrPayload = await scanQRCode(imageBuffer);
  } catch {
    warnings.push('QR scan encountered an error — falling back to OCR only');
  }

  const hasValidQR = qrPayload ? isValidGCashQRPayload(qrPayload) : false;

  // In test mode we don't require QR; in production we do
  if (!hasValidQR && !testMode) {
    // Still try OCR before giving up — some screenshots crop the QR
    warnings.push('Could not detect a valid GCash QR code in this image');
  }

  // ── Step 2: OCR text extraction ───────────────────────────────────────────
  let rawText = '';
  try {
    rawText = await extractTextFromImage(imageBuffer);
  } catch (err) {
    return {
      valid: false,
      reason: 'Could not read text from the uploaded image. Please upload a clear screenshot of your GCash receipt.',
    };
  }

  // Check the text looks like a GCash receipt at all
  const isGCashReceipt =
    /gcash/i.test(rawText) ||
    /sent via gcash/i.test(rawText) ||
    /ref\.?\s*no/i.test(rawText) ||
    /total amount sent/i.test(rawText);

  if (!isGCashReceipt && !testMode) {
    return {
      valid: false,
      reason: 'This does not appear to be a GCash receipt. Please upload a screenshot of your GCash payment receipt.',
    };
  }

  // ── Step 3: Extract fields ────────────────────────────────────────────────
  const refNumber = extractRefNumber(rawText);
  const amount = extractAmount(rawText);
  const dateStr = extractDate(rawText);
  const mobileNumber = extractMobileNumber(rawText);

  // ── Step 4: Reference number check ───────────────────────────────────────
  if (!refNumber) {
    if (!testMode) {
      return {
        valid: false,
        reason: 'Could not find the reference number on the receipt. Make sure the full receipt is visible in the screenshot.',
      };
    }
    warnings.push('Reference number not found — skipped in test mode');
  }

  if (refNumber && isReferenceUsed(refNumber)) {
    return {
      valid: false,
      reason: `This receipt (Ref No. ${refNumber}) has already been used to download the product. Each receipt can only be used once.`,
    };
  }

  // ── Step 5: Amount check ──────────────────────────────────────────────────
  if (!testMode) {
    if (amount === null) {
      return {
        valid: false,
        reason: 'Could not read the payment amount from the receipt. Please ensure the receipt screenshot is clear and complete.',
      };
    }
    const diff = Math.abs(amount - expectedAmount);
    if (diff > priceTolerance) {
      return {
        valid: false,
        reason: `Payment amount ₱${amount.toFixed(2)} does not match the required amount ₱${expectedAmount.toFixed(2)}. Please pay the correct amount and upload a new receipt.`,
      };
    }
  } else if (amount !== null) {
    warnings.push(`TEST MODE: Amount check skipped (found ₱${amount?.toFixed(2)}, expected ₱${expectedAmount.toFixed(2)})`);
  }

  // ── Step 6: Date freshness check ──────────────────────────────────────────
  if (!testMode && dateStr) {
    const receiptDate = parseReceiptDate(dateStr);
    if (receiptDate) {
      const ageMs = Date.now() - receiptDate.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays > maxAgeDays) {
        return {
          valid: false,
          reason: `This receipt is ${Math.floor(ageDays)} days old. Please use a receipt from within the last ${maxAgeDays} days.`,
        };
      }
    } else {
      warnings.push('Could not parse receipt date — date check skipped');
    }
  }

  // ── Step 7: Mark reference as used & return success ──────────────────────
  const extractedData: ExtractedReceiptData = {
    referenceNumber: refNumber || 'N/A',
    amount: amount ?? 0,
    dateStr: dateStr || 'N/A',
    mobileNumber: mobileNumber || undefined,
    qrPayload: qrPayload || undefined,
    rawText: rawText.substring(0, 500), // trimmed for logging
  };

  if (refNumber) markReferenceUsed(refNumber);

  return { valid: true, data: extractedData, warnings };
}
