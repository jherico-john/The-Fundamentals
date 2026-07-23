import ProductPageTemplate from '@/components/ProductPageTemplate';

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
        price: parseInt(process.env.NEXT_PUBLIC_PRODUCT_ENCOUNTER_PRICE || '997'),
        originalPrice: 5300,
        lessons: 19,
        features: [
          { label: '19 Session PPT Talks', sub: 'Structured for a full Encounter weekend' },
          { label: '📘 Complete Facilitator Manual', sub: 'Step-by-step teaching guidance to help every session run smoothly.' },
          { label: '🎯 Retreat Activities', sub: 'Interactive exercises that encourage reflection, participation, and personal response.' },
          { label: '🙏 Guided Prayer & Ministry Moments', sub: 'Intentional opportunities for participants to respond to Gods Word throughout the retreat.' },
          { label: '🎨 Premium Slide Designs', sub: 'Modern, engaging visuals that enhance the teaching experience without distracting from the message.' },
        ],
        testimonials: [
          {
            name: 'Pastor J.',
            role: 'Church of God · Batangas',
            text: 'We saw breakthrough after breakthrough using these materials. The Encounter pack gave us structure without losing the move of the Spirit.',
          },
          {
            name: 'Sis. L.',
            role: 'Encounter Facilitator · Laguna',
            text: 'The slides are beautifully done and the flow makes so much sense. Our participants experienced deep transformation.',
          },
          {
            name: 'Bro. T.',
            role: 'Youth Ministry Head',
            text: 'This saved us months of preparation. Everything from Friday night to Sunday wrap-up is covered.',
          },
        ],
        downloadPageUrl:
          process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL_ENCOUNTER ||
          'https://jhericojohnbalasa.systeme.io/thankyou-page-encounter',
        affiliateProductLink:
          process.env.NEXT_PUBLIC_AFFILIATE_LINK_ENCOUNTER ||
          'https://jhericojohnbalasa.systeme.io/encounter-truth',
      }}
    />
  );
}
