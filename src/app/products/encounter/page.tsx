import ProductPageTemplate from '@/components/ProductPageTemplate';
import { getProductBySlug } from '@/lib/products';

export default function Page() {
  return (
    <ProductPageTemplate
      config={{
        slug: 'encounter',
        coverImage: '/banner/banner_encounter.png',
        name: 'Encounter Journey',
        tagline: 'A transformative weekend experience that brings people face to face with God.',
        description:
          'The Encounter pack provides everything a facilitator needs to lead a powerful, life-changing Encounter weekend — complete PPT sessions, structured talks, worship guides, and ministry flow materials.',
        price: getProductBySlug('encounter')!.price,
        originalPrice: 5300,
      }}
    />
  );
}
