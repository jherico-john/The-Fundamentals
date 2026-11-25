import ProductPageTemplate from '@/components/ProductPageTemplate';
import { getProductBySlug } from '@/lib/products';

export default function Page() {
  return (
    <ProductPageTemplate
      config={{
        slug: 'lifegroup',
        coverImage: '/banner/banner_lifegroup.png',
        name: 'Lifegroup Essentials',
        tagline: 'Everything a Life Group leader needs to build a thriving, Christ-centred community.',
        description:
          'The Lifegroup Fundamentals pack equips cell group and life group leaders with 12 structured sessions covering community, accountability, biblical study methods, and how to multiply groups — all presented with clear, professional slides.',
        price: getProductBySlug('lifegroup')!.price,
        originalPrice: 2400,
      }}
    />
  );
}
