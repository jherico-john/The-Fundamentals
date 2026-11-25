// v6 hardening: the PayMongo / QRPh routes are LEGACY. The live checkout verifies
// uploaded receipts instead and no page calls these endpoints any more. Left open
// they let anyone create PayMongo resources (cost abuse) and, with no webhook
// secret set, forge "payment" events. They are therefore OFF by default and only
// answer when LEGACY_PAYMONGO_ENABLED=true is set deliberately.
import { NextResponse } from 'next/server';

export function legacyPayMongoEnabled(): boolean {
  return process.env.LEGACY_PAYMONGO_ENABLED === 'true';
}

export function legacyDisabledResponse() {
  return NextResponse.json({ error: 'This endpoint is no longer available.' }, { status: 410 });
}
