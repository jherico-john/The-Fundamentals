import ProductPageTemplate from '@/components/ProductPageTemplate';

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
        price: parseInt(process.env.NEXT_PUBLIC_PRODUCT_LIFEGROUP_PRICE || '397'),
        originalPrice: 2400,
        lessons: 12,
        features: [
          { label: '12 Ready-to-Facilitate PPT Sessions', sub: 'Covers the full arc of a healthy Lifegroup' },
          { label: '🎨 Premium Presentation Designs', sub: 'Professionally designed slides that keep learners engaged while maintaining a clean, ministry-focused appearance.' },
          { label: '🔗 Editable Canva Template Links', sub: 'Customize colors, logos, and church branding whenever needed.' },
          { label: '💬 Reflection Questions', sub: 'Encourage meaningful discussions instead of one-way teaching.p' },
          { label: '📖 Structured Teaching Flow', sub: 'Each lesson follows an organized sequence thats easy to facilitate, making preparation simple while keeping every session engaging and biblically grounded.' },
        ],
        testimonials: [
          {
            name: 'REV. Nora Baletin',
            role: 'Senoir Pastor · Kalilangan, Bukidnon',
            text: 'Our Lifegroup leaders finally have a proper track to follow. These materials gave structure without removing the relational warmth.',
          },
          {
            name: 'Sis. Sham Agua',
            role: 'Cell Group Leader · Manolo, Bukidnon',
            text: 'I was overwhelmed trying to build my own content every week. This pack solved everything — our group has never been healthier.',
          },
          {
            name: 'Sis. Kralle Maravelles',
            role: 'Youth Minister',
            text: 'We trained 20 new Lifegroup leaders using this pack. It standardised our training without making it feel mechanical.',
          },
        ],
        downloadPageUrl:
          process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL_LIFEGROUP ||
          'https://jhericojohnbalasa.systeme.io/thankyou-page-lifegroup',
        affiliateProductLink:
          process.env.NEXT_PUBLIC_AFFILIATE_LINK_LIFEGROUP ||
          'https://jhericojohnbalasa.systeme.io/lifegroup-truth',
      }}
    />
  );
}
