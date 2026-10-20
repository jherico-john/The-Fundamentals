import ProductPageTemplate from '@/components/ProductPageTemplate';
import { getProductBySlug, getDownloadPageUrl } from '@/lib/products';

export default function Page() {
  const p = getProductBySlug('sol')!;
  return (
    <ProductPageTemplate
      config={{
        slug: 'sol',
        name: p.name,
        tagline: p.tagline,
        description:
          'SOL is the complete leadership formation track in the Jherico Balasa Ministry library — structured, slide-ready sessions that take a leader from foundation to multiplication, with everything prepared so you can focus on people instead of preparation.',
        price: p.price,
        originalPrice: p.originalPrice,
        lessons: p.lessons,
        features: [
          { label: 'Complete SOL Session Library', sub: 'Every session ready to teach — no slide creation required' },
          { label: '🎨 Premium Presentation Designs', sub: 'Clean, ministry-focused slides that keep learners engaged' },
          { label: '📖 Structured Teaching Flow', sub: 'Each session follows an organized sequence that is easy to facilitate' },
          { label: '💬 Reflection & Discussion Questions', sub: 'Built-in prompts for meaningful group conversation' },
          { label: '🔗 Editable Templates', sub: 'Customize colors, logos and church branding whenever needed' },
        ],
        testimonials: [
          { name: 'Pastor R.', role: 'Senior Pastor · Mindanao', text: 'We finally have a leadership track our whole team can follow. The structure saved us months of preparation.' },
          { name: 'Sis. M.', role: 'Discipleship Coordinator', text: 'The sessions are clear, practical and beautifully presented. Our leaders grew in confidence quickly.' },
          { name: 'Bro. K.', role: 'Ministry Leader', text: 'Worth every peso — I stopped building slides from scratch and started investing in people.' },
        ],
        downloadPageUrl: getDownloadPageUrl('sol'),
        affiliateProductLink: p.affiliateLink,
      }}
    />
  );
}
