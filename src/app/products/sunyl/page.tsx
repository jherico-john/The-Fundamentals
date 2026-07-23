import ProductPageTemplate from '@/components/ProductPageTemplate';

export default function Page() {
  return (
    <ProductPageTemplate
      config={{
        slug: 'sunyl',
        coverImage: '/banner/banner_sunyl.png',
        name: 'SUNYL 12 Lessons',
        tagline: 'Twelve powerful lessons designed to ground new believers and young leaders in the Word.',
        description:
          'SUNYL (Start Up New Youth Leaders) equips young leaders with 12 ready-to-teach sessions covering the essential foundations of Christian living — from identity in Christ to the power of the Holy Spirit.',
        price: parseInt(process.env.NEXT_PUBLIC_PRODUCT_SUNYL_PRICE || '397'),
        originalPrice: 797,
        lessons: 12,
        features: [
          { label: '12 Ready-to-Teach PPT Sessions', sub: 'Structured for new and young leaders' },
          { label: 'Premium Visual Slides', sub: 'Engaging designs that hold attention' },
          { label: 'Leadership Formation Content', sub: 'Builds confidence in new leaders' },
          { label: 'Biblical Foundation Lessons', sub: 'Solid doctrine presented simply' },
          { label: 'Discussion Guides Included', sub: 'Built-in small group questions per session' },
        ],
        testimonials: [
          {
            name: 'Pastor R.',
            role: 'Youth Pastor · Mindanao',
            text: 'Our youth leaders grew in confidence after using these materials. The 12 sessions gave them a complete framework for discipleship.',
          },
          {
            name: 'Sis. M.',
            role: 'Youth Leader · Davao',
            text: 'The slides are so engaging. Our youth actually pay attention now and discussions are richer than ever.',
          },
          {
            name: 'Bro. K.',
            role: 'Cell Group Leader',
            text: 'Perfect for launching a new discipleship group from scratch. Everything I needed was already included.',
          },
        ],
        downloadPageUrl:
          process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL_SUNYL ||
          'https://jhericojohnbalasa.systeme.io/sunyl-truth',
        affiliateProductLink:
          process.env.NEXT_PUBLIC_AFFILIATE_LINK_SUNYL ||
          'https://jhericojohnbalasa.systeme.io/sunyl-truth',
      }}
    />
  );
}
