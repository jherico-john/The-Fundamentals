import ProductPageTemplate from '@/components/ProductPageTemplate';
import { getProductBySlug } from '@/lib/products';

export default function Page() {
  return (
    <ProductPageTemplate
      config={{
        slug: 'post-encounter',
        coverImage: '/banner/banner_post-encounter.png',
        name: 'Post-Encounter',
        tagline: 'Sustain and deepen the transformation that began at the Encounter.',
        description:
          'The Post-Encounter pack helps facilitators walk newly transformed believers through the critical weeks after their Encounter — building habits of prayer, Word, community, and service that make their transformation last a lifetime.',
        price: getProductBySlug('post-encounter')!.price,
        originalPrice: 797,
      }}
    />
  );
}
