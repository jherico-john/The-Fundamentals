import ProductPageTemplate from '@/components/ProductPageTemplate';
import { getProductBySlug, getDownloadPageUrl } from '@/lib/products';

export default function Page() {
  const p = getProductBySlug('bundle')!;
  return (
    <ProductPageTemplate
      config={{
        slug: 'bundle',
        name: p.name,
        tagline: p.tagline,
        description:
          'Get the full Jherico Balasa Ministry library in one package — Fundamentals, Pre-Encounter, Lifegroup, Encounter, Post-Encounter and SOL — at a special limited-time price. One payment, every pack unlocked.',
        price: p.price,
        originalPrice: p.originalPrice,
        lessons: p.lessons,
        features: [
          { label: 'All 6 Ministry Packs Included', sub: 'Fundamentals · Pre-Encounter · Lifegroup · Encounter · Post-Encounter · SOL' },
          { label: 'One Payment — Everything Unlocked', sub: 'Every pack downloads right after your receipt is verified' },
          { label: 'Limited-Time Launch Price', sub: 'A much lower price than buying each pack separately' },
        ],
        testimonials: [
          { name: 'Pastor R.', role: 'Senior Pastor · Mindanao', text: 'Having the whole discipleship pathway in one download made rolling it out across our church simple.' },
          { name: 'Sis. G.', role: 'Youth Leader', text: 'We started with one pack, then wished we had the bundle from day one. Complete and consistent.' },
          { name: 'Bro. J.', role: 'Cell Group Facilitator', text: 'The bundle price is the best value — every stage of discipleship is covered.' },
        ],
        downloadPageUrl: getDownloadPageUrl('bundle'),
        affiliateProductLink: p.affiliateLink,
      }}
    />
  );
}
