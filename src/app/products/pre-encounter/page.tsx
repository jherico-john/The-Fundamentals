import ProductPageTemplate from '@/components/ProductPageTemplate';
import { getProductBySlug } from '@/lib/products';

export default function Page() {
  return (
    <ProductPageTemplate
      config={{
        slug: 'pre-encounter',
        coverImage: '/banner/banner_pre-encounter.png',
        name: 'Pre-Encounter Journey',
        tagline: 'Prepare hearts and minds before the transformative Encounter experience.',
        description:
          'The Pre-Encounter pack equips facilitators with 7 ready-to-teach sessions that build anticipation, lay doctrinal groundwork, and prepare participants spiritually and emotionally for a life-changing Encounter weekend.',
        price: getProductBySlug('pre-encounter')!.price,
        originalPrice: 1900,
      }}
    />
  );
}
