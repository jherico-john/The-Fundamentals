'use client';
// /checkout — The Fundamentals product page (slug: 'fundamentals')
import { CheckCircle2, Zap, Users, Star, Lock, BookOpen, Play, Shield } from 'lucide-react';
import NavBar from '@/components/NavBar';
import ReceiptUploader from '@/components/ReceiptUploader';
import PaymentTutorial from '@/components/PaymentTutorial';
import AffiliateSidebar from '@/components/AffiliateSidebar';
import SupportSection from '@/components/SupportSection';
import AffiliateNotice from '@/components/AffiliateNotice';

const FEATURES = [
  { icon:<Play size={18}/>, label:'📄 Introduction Guide', sub:'A complete facilitator guide explaining how to use the curriculum effectively in your church, youth ministry, or small group.' },
  { icon:<Star size={18}/>, label:'🎯 16 Ready-to-Teach PowerPoint Lessons', sub:'Beautifully designed presentations that are ready to use immediately. No slide creation required.' },
  { icon:<BookOpen size={18}/>, label:'🎨 Premium Presentation Designs', sub:'Professionally designed slides that keep learners engaged while maintaining a clean, ministry-focused appearance.' },
  { icon:<Zap size={18}/>, label:'🎲 Heart-Check Exercises', sub:'Heart-check exercises designed to help participants reflect, evaluate their spiritual condition, and strengthen their convictions.' },
  { icon:<Users size={18}/>, label:'📖 Structured Teaching Flow', sub:'ach lesson follows an organized sequence thats easy to facilitate, making preparation simple while keeping every session engaging and biblically grounded.' },
];

const TESTIMONIALS = [
  { name:'Pastor Marco R.', role:'Church of God · Davao', text:'Even our long-time members said they finally understood the Trinity clearly.', stars:5 },
  { name:'Sis. Grace T.', role:'Youth Leader · Cagayan de Oro', text:"The slides made teaching the Deity of Christ so clear. My youth group loved it.", stars:5 },
  { name:'Bro. Joel M.', role:'Cell Group Facilitator', text:"Worth every peso. I've tried making slides myself — this is on another level.", stars:5 },
];

const PRICE = parseInt(process.env.NEXT_PUBLIC_PRODUCT_FUNDAMENTALS_PRICE || '597');
const CUR   = process.env.NEXT_PUBLIC_CURRENCY || 'PHP';
const DL_PAGE = process.env.NEXT_PUBLIC_DOWNLOAD_PAGE_URL_FUNDAMENTALS
  || 'https://jhericojohnbalasa.systeme.io/thankyou-page-fundamentals';

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-radial-glow">
      <NavBar product="The Fundamentals" />

      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* Hero */}
        <section className="text-center mb-14 fade-up">
          <div className="inline-flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-full px-4 py-1.5 text-xs text-[var(--green)] font-medium mb-6 tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse inline-block"/>
            Pay via GCash · Instant Digital Access
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4"
            style={{fontFamily:'Bebas Neue,Impact,sans-serif',color:'#fff',lineHeight:1.05}}>
            THE <span style={{color:'var(--green)'}}>FUNDAMENTALS</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-2">
            Perfect for those who have started their walk with God but are{' '}
            <span className="text-[var(--green)] font-medium">still asking the deeper questions.</span>
          </p>
          <p className="text-base text-gray-400 max-w-xl mx-auto">
            Not just for beginners — <span className="text-[var(--green-dark)] font-medium">even long-time believers</span> gain clarity, confidence, and renewed understanding.
          </p>
        </section>

        {/* Main grid */}
        <div className="grid md:grid-cols-5 gap-8 mb-16">
          <div className="md:col-span-3 space-y-4 fade-up-1">
            <h2 className="text-xl font-bold text-white mb-4">What's Inside Your Pack</h2>
            {FEATURES.map((f,i)=>(
              <div key={i} className="glass-card p-4 flex items-start gap-4 hover:border-[var(--green-dark)] transition-colors duration-300">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--green-deeper)] bg-opacity-40 flex items-center justify-center text-[var(--green)]">{f.icon}</div>
                <div><p className="font-semibold text-white text-sm">{f.label}</p><p className="text-gray-400 text-xs mt-0.5">{f.sub}</p></div>
                <CheckCircle2 size={16} className="text-[var(--green)] ml-auto flex-shrink-0 mt-0.5"/>
              </div>
            ))}
          </div>

          <div className="md:col-span-2 fade-up-2">
            <div className="glass-card p-6 sticky top-20 glow-pulse" style={{borderColor:'rgba(0,255,135,0.3)'}}>
              <div className="w-full h-32 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden"
                style={{background:'linear-gradient(135deg,#0D3B20,#051A0D)'}}>
                {/*<BookOpen size={36} className="text-[var(--green)] float-anim"/>*/}
                <img src="/banner/banner_fundamentals.png" alt="The Fundamentals" className="w-full h-full object-contain float-anim z-10"/>
                <div className="absolute -top-2 -right-2 w-16 h-24 rounded-lg bg-[var(--surface)] border border-[var(--border)] rotate-6 opacity-40"/>
                <div className="absolute -top-1 right-2 w-16 h-24 rounded-lg bg-[var(--surface)] border border-[var(--border)] rotate-3 opacity-60"/>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1" style={{fontFamily:'Bebas Neue,Impact,sans-serif'}}>
                The Fundamentals
              </h3>
              <p className="text-xs text-gray-400 mb-4">16 Ready-to-Teach PPT Sessions · Instant Digital Download</p>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-extrabold text-[var(--green)]">{CUR} {PRICE.toLocaleString()}</span>
                <span className="text-gray-500 line-through text-base">{CUR} 4100</span>
                <span className="bg-[var(--green-deeper)] text-[var(--green)] text-xs font-bold px-2 py-0.5 rounded-full">85.44% OFF</span>
              </div>
              <div className="space-y-1.5 mb-5">
                {[
                  {n:'1',t:'Send GCash payment to our number'},
                  {n:'2',t:'Download your GCash receipt'},
                  {n:'3',t:'Upload receipt below to verify'},
                  {n:'4',t:'File downloads automatically! 🎉'},
                ].map(s=>(
                  <div key={s.n} className="flex items-center gap-2 text-xs text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-[var(--green-deeper)] text-[var(--green)] flex items-center justify-center font-bold text-[10px] flex-shrink-0">{s.n}</span>{s.t}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-3 border-t border-[var(--border)]">
                <span className="flex items-center gap-1"><Lock size={10} className="text-[var(--green)]"/>No fees</span>
                <span className="flex items-center gap-1"><Zap size={10} className="text-[var(--green)]"/>Instant</span>
                <span className="flex items-center gap-1"><Shield size={10} className="text-[var(--green)]"/>Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment + upload */}
        <section className="mb-16 fade-up-2">
          <div className="text-center mb-6">
            <h2 className="text-white font-bold mb-1"
              style={{fontFamily:'Bebas Neue,Impact,sans-serif',fontSize:'1.8rem'}}>
              Pay & Get Instant Access
            </h2>
            <p className="text-gray-400 text-sm">
              Send {CUR} {PRICE.toLocaleString()} via GCash then upload your receipt below.
            </p>
          </div>
          <div className="max-w-xl mx-auto">
            <ReceiptUploader
              productSlug="fundamentals"
              productName="The Fundamentals"
              price={PRICE}
              downloadPage={DL_PAGE}
            />
          </div>
        </section>

        <PaymentTutorial />

        {/* Testimonials */}
        <section className="mb-16 fade-up-3">
          <h2 className="text-2xl font-bold text-white text-center mb-8">What Ministry Leaders Are Saying</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t,i)=>(
              <div key={i} className="glass-card p-5">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({length:t.stars}).map((_,s)=>(
                    <Star key={s} size={14} className="text-[var(--green)] fill-[var(--green)]"/>
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4 italic">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="font-semibold text-white text-sm">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Affiliate sidebar — shows ALL OTHER products except Fundamentals */}
        <AffiliateSidebar
          currentProductSlug="fundamentals"
          currentProductName="The Fundamentals"
        />

        <SupportSection />

        <footer className="text-center text-xs text-gray-600 pb-8 mt-8">
          <p>© {new Date().getFullYear()} The Jherico Balasa Ministry. All rights reserved.</p>
          <p className="mt-1">
            Need help?{' '}
            <a href="mailto:jhericojohnbalasa@gmail.com" className="text-[var(--green)] hover:underline">
              jhericojohnbalasa@gmail.com
            </a>
          </p>
        </footer>
        <AffiliateNotice />
      </div>
    </main>
  );
}
