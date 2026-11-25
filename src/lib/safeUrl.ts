// Only navigate the customer to a destination we trust: an absolute https URL
// (http is tolerated on localhost for development). Anything else — javascript:,
// data:, relative junk — is rejected, so a bad env value can never become an
// open redirect or script URL.
export function safeExternalUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    if (url.protocol === 'https:') return url.toString();
    if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return url.toString();
    return null;
  } catch { return null; }
}
