import ProductPageTemplate from '@/components/ProductPageTemplate';
import { getProductBySlug } from '@/lib/products';

export default function Page() {
  const p = getProductBySlug('bundle')!;
  return (
    <ProductPageTemplate
      config={{
        slug: 'bundle',
        name: p.name,
        tagline: p.tagline,
        description:
          'Get the full Jherico Balasa Ministry library in one package — Fundamentals, Pre-Encounter, Lifegroup, Encounter, Post-Encounter and SOL 1, 2 & 3 — at a special limited-time price. One payment, every pack unlocked.',
        price: p.price,
        originalPrice: p.originalPrice,
      }}
    />
  );
}
