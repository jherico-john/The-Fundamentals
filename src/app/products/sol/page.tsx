import ProductPageTemplate from '@/components/ProductPageTemplate';
import { getProductBySlug } from '@/lib/products';

export default function Page() {
  const p = getProductBySlug('sol')!;
  return (
    <ProductPageTemplate
      config={{
        slug: 'sol',
        coverImage: '/banner/banner_sol.png',
        name: p.name,
        tagline: p.tagline,
        description:
          'SOL 1, 2 and 3 form the complete leadership formation track in the Jherico Balasa Ministry library — structured, slide-ready lessons that take a leader from foundation to multiplication, with everything prepared so you can focus on people instead of preparation.',
        price: p.price,
        originalPrice: p.originalPrice,
        summary: 'SOL 1, 2 & 3 · Lesson 1–11 · Lesson 2–11 · Lesson 3–11 · Instant digital download',
      }}
    />
  );
}
