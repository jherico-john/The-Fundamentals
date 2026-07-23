'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
export default function AffiliateTracker() {
  const sp = useSearchParams();
  useEffect(() => {
    const ref = sp.get('ref');
    if (ref) {
      const exp = new Date(); exp.setDate(exp.getDate() + 30);
      document.cookie = `affiliate_ref=${ref}; path=/; expires=${exp.toUTCString()}; SameSite=Lax`;
    }
  }, [sp]);
  return null;
}
