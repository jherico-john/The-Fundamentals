import ProductPageTemplate from '@/components/ProductPageTemplate';

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
        price: parseInt(process.env.NEXT_PUBLIC_PRODUCT_PRE_ENCOUNTER_PRICE || '297'),
        originalPrice: 1900,
        lessons: 7,
        features: [
          { label: '7 Ready-to-Teach PPT Sessions', sub: 'Perfectly sequenced for pre-encounter preparation' },
          { label: 'Doctrinal Foundation Content', sub: 'Builds understanding before the deeper Encounter' },
          { label: 'Heart-Preparation Materials', sub: 'Guides participants into spiritual readiness' },
          { label: 'Premium Visual Slides', sub: 'Professional design for any setting' },
          { label: 'Structured Teaching Flow', sub: 'Each lesson follows an organized sequence thats easy to facilitate, making preparation simple while keeping every session engaging and biblically grounded.' },
        ],
        testimonials: [
          {
            name: 'Pastor A.',
            role: 'Church Leader · Cebu',
            text: 'The Pre-Encounter sessions prepared our congregation in a way we never could before. Participants arrived at the Encounter weekend ready and expectant.',
          },
          {
            name: 'Sis. C.',
            role: 'Discipleship Head · Manila',
            text: 'These materials removed so much of the anxiety our first-timers had. The slides are clear, warm, and full of the Word.',
          },
          {
            name: 'Bro. D.',
            role: 'Small Group Leader',
            text: 'Worth every peso. Saved me weeks of preparation and our group has never been more spiritually unified going into an Encounter.',
          },
        ],
        downloadPageUrl:
          process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL_PRE_ENCOUNTER ||
          'https://jhericojohnbalasa.systeme.io/thankyou-page-preencounter',
        affiliateProductLink:
          process.env.NEXT_PUBLIC_AFFILIATE_LINK_PRE_ENCOUNTER ||
          'https://jhericojohnbalasa.systeme.io/pre-encounter-truth',
      }}
    />
  );
}
