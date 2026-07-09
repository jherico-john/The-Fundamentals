// src/lib/paymongo.ts  — v2
// PayMongo API v1 — server-side only (uses secret key)
// v2: QRPh-first flow. Creates a QRPh source, polls status, redirects on payment.

const PAYMONGO_BASE = 'https://api.paymongo.com/v1';

function getAuthHeader(): string {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error('PAYMONGO_SECRET_KEY is not set');
  return 'Basic ' + Buffer.from(key + ':').toString('base64');
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QRPhSource {
  id: string;
  type: 'source';
  attributes: {
    amount: number;
    currency: string;
    description: string;
    livemode: boolean;
    redirect: { checkout_url: string; failed: string; success: string };
    status: 'pending' | 'chargeable' | 'cancelled' | 'expired';
    type: 'qrph';
    qr_code?: string; // base64 PNG of QR code
  };
}

export interface PayMongoPaymentLink {
  id: string;
  type: 'link';
  attributes: {
    amount: number;
    archived: boolean;
    currency: string;
    description: string;
    livemode: boolean;
    checkout_url: string;
    reference_number: string;
    status: 'unpaid' | 'paid';
    url: string;
  };
}

// ─── QRPh Source (v2 primary) ─────────────────────────────────────────────────

/**
 * Create a QRPh source — this gives back a QR code PNG that the customer scans.
 * Accepted by GCash, Maya, BPI, GoTyme, Home Credit, and all QRPh-compliant banks.
 */
export async function createQRPhSource(
  successUrl: string,
  failedUrl: string
): Promise<QRPhSource> {
  const amountCentavos =
    parseInt(process.env.NEXT_PUBLIC_PRODUCT_PRICE || '497', 10) * 100;

  const body = {
    data: {
      attributes: {
        amount: amountCentavos,
        currency: process.env.NEXT_PUBLIC_CURRENCY || 'PHP',
        type: 'qrph',
        description: 'The Fundamentals — 16 Core Christian Truths Digital Pack',
        redirect: {
          success: successUrl,
          failed: failedUrl,
        },
      },
    },
  };

  const res = await fetch(`${PAYMONGO_BASE}/sources`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`PayMongo createQRPhSource failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.data as QRPhSource;
}

/**
 * Retrieve a source by ID to check its status.
 * status === 'chargeable' means the customer has scanned and authorized payment.
 */
export async function getSource(sourceId: string): Promise<QRPhSource> {
  const res = await fetch(`${PAYMONGO_BASE}/sources/${sourceId}`, {
    headers: { Authorization: getAuthHeader() },
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`PayMongo getSource failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.data as QRPhSource;
}

/**
 * Once a source is 'chargeable', create a payment to capture the funds.
 */
export async function createPaymentFromSource(
  sourceId: string,
  amount: number
): Promise<{ id: string; status: string }> {
  const body = {
    data: {
      attributes: {
        amount,
        currency: process.env.NEXT_PUBLIC_CURRENCY || 'PHP',
        source: { id: sourceId, type: 'source' },
        description: 'The Fundamentals Ministry Pack',
        statement_descriptor: 'JHERICO MINISTRY',
      },
    },
  };

  const res = await fetch(`${PAYMONGO_BASE}/payments`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`PayMongo createPayment failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return { id: data.data.id, status: data.data.attributes.status };
}

// ─── Payment Link (fallback) ──────────────────────────────────────────────────

export async function createPaymentLink(successUrl: string, cancelUrl: string): Promise<PayMongoPaymentLink> {
  const amountCentavos =
    parseInt(process.env.NEXT_PUBLIC_PRODUCT_PRICE || '497', 10) * 100;

  const body = {
    data: {
      attributes: {
        amount: amountCentavos,
        currency: process.env.NEXT_PUBLIC_CURRENCY || 'PHP',
        description: 'The Fundamentals — 16 Core Christian Truths Digital Pack',
        remarks: 'Instant digital download included',
      },
    },
  };

  const res = await fetch(`${PAYMONGO_BASE}/links`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`PayMongo createLink failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.data as PayMongoPaymentLink;
}

export async function getPaymentLink(linkId: string): Promise<PayMongoPaymentLink> {
  const res = await fetch(`${PAYMONGO_BASE}/links/${linkId}`, {
    headers: { Authorization: getAuthHeader() },
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`PayMongo getLink failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.data as PayMongoPaymentLink;
}

// ─── Webhook verification ─────────────────────────────────────────────────────

export function verifyWebhookSignature(
  rawBody: string,
  sigHeader: string,
  secret: string
): boolean {
  try {
    const crypto = require('crypto');
    const parts = sigHeader.split(',');
    const tPart = parts.find((p: string) => p.startsWith('t='));
    const vPart = parts.find((p: string) => p.startsWith('te=') || p.startsWith('li='));
    if (!tPart || !vPart) return false;

    const timestamp = tPart.split('=')[1];
    const signature = vPart.split('=')[1];
    const toSign = `${timestamp}.${rawBody}`;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(toSign)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}
