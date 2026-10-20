import ProductPageTemplate from '@/components/ProductPageTemplate';
import { getProductBySlug, getDownloadPageUrl } from '@/lib/products';

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
        lessons: 8,
        features: [
          { label: '8 Follow-Up PPT Sessions', sub: 'Designed for the weeks after Encounter' },
          { label: 'Spiritual Habit Formation Content', sub: 'Prayer, Word, and community rhythms' },
          { label: 'Integration Materials', sub: 'Helps new believers plug into the local church' },
          { label: 'Premium Visual Slides', sub: 'Consistent design with the Encounter series' },
          { label: 'Small Group Discussion Guides', sub: 'Deepens personal reflection and accountability' },
        ],
        testimonials: [
          {
            name: 'Pastor M.',
            role: 'Life Church · Quezon City',
            text: 'Post-Encounter used to be our weakest point. Now we have a clear, powerful track that keeps people connected and growing.',
          },
          {
            name: 'Sis. G.',
            role: 'Discipleship Leader · Pampanga',
            text: 'The transformation from the Encounter weekend is now sticking. These follow-up sessions are the missing piece.',
          },
          {
            name: 'Bro. P.',
            role: 'Cell Group Coordinator',
            text: 'Our retention went up dramatically once we started using these Post-Encounter materials. Highly recommended.',
          },
        ],
        downloadPageUrl: getDownloadPageUrl('post-encounter'),
        affiliateProductLink:
          process.env.NEXT_PUBLIC_AFFILIATE_LINK_POST_ENCOUNTER ||
          'https://jhericojohnbalasa.systeme.io/post-encounter-truth',
      }}
    />
  );
}
