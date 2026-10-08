import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowDown,
  Aperture,
  Heart,
  LockKeyhole,
  Images,
  MessageCircle,
  Plus,
  Phone,
  Camera,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { PublicNav } from '@/components/layout/public-nav';
import { Brand } from '@/components/layout/brand';
import { Collections } from '@/components/public/collections';
import { Showcase } from '@/components/public/showcase';
import { AudioControl } from '@/components/public/audio-control';
import { PromoNotice } from '@/components/public/promo-notice';
import { collectionFaqs } from '@/features/quotation/model';
import { brand, whatsappLink } from '@/config/brand';
import type { Database } from '@/types/database';
export const revalidate = 120;
export default async function Home() {
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: packages, error } = await db
    .from('packages')
    .select('*')
    .eq('is_active', true)
    .order('display_order');
  if (error) throw new Error('Unable to load photography collections.');
  return (
    <>
      <PromoNotice />
      <PublicNav />
      <main id="main">
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">
                <span className="tiny-star">✦</span> CAPTURING MOMENTS. CRAFTING MEMORIES.
              </p>
              <h1>
                Your moments.
                <br />
                Beautifully
                <br />
                <em>remembered.</em>
              </h1>
              <p className="hero-description">
                The fleeting glances. The joyful celebrations. The little things that mean
                everything. Photography that lets you feel it all, again.
              </p>
              <div className="hero-actions">
                <a href="#packages" className="button button-gold">
                  Explore collections
                  <ArrowUpRight size={18} />
                </a>
                <a href="#portfolio" className="text-link">
                  Discover our work
                  <ArrowUpRight size={17} />
                </a>
              </div>
              <div className="hero-details">
                <span>
                  <Camera size={15} />
                  Weddings & celebrations
                </span>
                <i />
                <span>Portraits & convocation</span>
              </div>
            </div>
            <div className="hero-visual hero-with-brand">
              <div className="hero-image-main hero-brand-main">
                <Image
                  src="/assets/images/kt-brand.webp"
                  alt="Original KT Photography artwork — Capturing Moments, Crafting Memories"
                  fill
                  loading="eager"
                  fetchPriority="high"
                  sizes="(max-width: 700px) 90vw, 45vw"
                />
                <div className="hero-image-label">
                  <span>THE KT PHOTOGRAPHY COLLECTIONS</span>
                  <p>
                    Your story.
                    <br />
                    Our signature.
                  </p>
                </div>
              </div>
              <div className="hero-photo-small">
                <Image
                  src="/assets/images/alagi.webp"
                  alt="Bridal portrait in a white gown"
                  fill
                  sizes="(max-width: 700px) 140px, 180px"
                />
              </div>
              <div className="hero-roundel">
                <Aperture size={25} strokeWidth={1} />
                <span>
                  MADE TO
                  <br />
                  BE REMEMBERED
                </span>
              </div>
              <span className="hero-frame-tag">KT / THE ART OF MEMORIES</span>
              <span className="hero-decor-star">✦</span>
            </div>
          </div>
          <div className="container hero-bottom">
            <a href="#portfolio" className="scroll-cue">
              <ArrowDown size={14} />
              SCROLL TO DISCOVER
            </a>
            <AudioControl />
          </div>
        </section>
        <div className="service-strip">
          <div className="container">
            {['WEDDINGS', 'ROM & ENGAGEMENT', 'PORTRAITS', 'CONVOCATION', 'CELEBRATIONS'].map(
              (s) => (
                <span key={s}>
                  <span className="tiny-star">✦</span>
                  {s}
                </span>
              ),
            )}
          </div>
        </div>
        <section id="packages" className="section collections-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">01 / THE COLLECTIONS</p>
                <h2>
                  Your story.
                  <br />
                  Your <em>collection.</em>
                </h2>
              </div>
              <p>
                Select a collection. Customize your coverage.
                <br />
                Create your official quotation estimate.
              </p>
            </div>
            <Collections packages={packages || []} />
          </div>
        </section>
        <section id="portfolio" className="section container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">02 / THROUGH THE LENS</p>
              <h2>
                Some moments deserve
                <br />
                to last <em>forever.</em>
              </h2>
            </div>
            <p>
              From beautiful beginnings to life’s celebrations.
              <br />A glimpse into the world of KT Photography.
            </p>
          </div>
          <Showcase />
        </section>
        <section className="section container experience-section">
          <div className="experience-intro">
            <p className="eyebrow">THE KT EXPERIENCE</p>
            <h2>
              From the first hello
              <br />
              to the last <em>download.</em>
            </h2>
            <p>A simple, personal experience, so you can focus on making memories.</p>
          </div>
          <div className="experience-steps">
            {[
              {
                icon: MessageCircle,
                n: '01',
                title: 'Tell us your story',
                text: 'Connect with Kannan on WhatsApp. Share your event, your date, and what matters most.',
              },
              {
                icon: Heart,
                n: '02',
                title: 'Be in the moment',
                text: 'Choose your collection and confirm the details directly. Let your celebration unfold.',
              },
              {
                icon: Images,
                n: '03',
                title: 'Keep it close',
                text: 'Receive your private gallery details from Kannan. View, revisit and download your photographs.',
              },
            ].map(({ icon: Icon, n, title, text }) => (
              <article key={n}>
                <div className="step-top">
                  <Icon size={24} strokeWidth={1.2} />
                  <span>{n}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="about" className="section about-section">
          <div className="container about-grid">
            <div className="about-image">
              <Image
                src="/assets/images/kannan.webp"
                alt="Kannan Thiagarajan"
                fill
                sizes="(max-width: 700px) 90vw, 40vw"
              />
              <span className="about-signature">Kannan.</span>
            </div>
            <div className="about-copy">
              <p className="eyebrow">03 / THE PERSON BEHIND THE CAMERA</p>
              <h2>
                Meet Kannan.
                <br />
                Your moments,
                <br />
                <em>through his lens.</em>
              </h2>
              <p>
                KT Photography brings together professional event, ROM, convocation and portraiture
                photography with collections made for the milestones that matter to you.
              </p>
              <p>
                Speak with Kannan directly to find the right coverage for your celebration, from an
                intimate portrait session to a full wedding day.
              </p>
              <a href={whatsappLink()} className="text-link gold" target="_blank" rel="noreferrer">
                Let’s create something meaningful
                <ArrowUpRight size={18} />
              </a>
              <div className="about-motto">
                <Aperture size={30} strokeWidth={1} />
                <span>
                  Capturing Moments
                  <br />
                  <em>Crafting Memories</em>
                </span>
              </div>
            </div>
          </div>
        </section>
        <section className="section container faq-section">
          <div>
            <p className="eyebrow">A FEW HELPFUL DETAILS</p>
            <h2>
              Before your
              <br />
              <em>first frame.</em>
            </h2>
            <p>
              Still have a question?
              <br />
              <a href={whatsappLink()} className="text-link gold" target="_blank" rel="noreferrer">
                Just ask Kannan
                <ArrowUpRight size={15} />
              </a>
            </p>
          </div>
          <div className="faq-list">
            {collectionFaqs(packages || []).map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <Plus size={18} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section id="contact" className="contact-section">
          <div className="container contact-inner">
            <span className="contact-spark">✦</span>
            <p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
            <h2>
              Let’s make
              <br />
              <em>memories.</em>
            </h2>
            <p>
              A wedding. A milestone. A moment just for you.
              <br />
              We’d love to hear your story.
            </p>
            <a
              className="button button-gold"
              href={whatsappLink()}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={18} />
              Say hello on WhatsApp
              <ArrowUpRight size={18} />
            </a>
            <a className="contact-phone" href="tel:+601175982687">
              <Phone size={14} />
              {brand.phone}
            </a>
          </div>
        </section>
        <section className="container client-invitation">
          <div className="icon-tile">
            <LockKeyhole size={22} />
          </div>
          <div>
            <h3>Your memories are waiting.</h3>
            <p>Already a KT client? Step into your private gallery.</p>
          </div>
          <Link href="/login" className="text-link gold">
            Open my gallery
            <ArrowUpRight size={18} />
          </Link>
        </section>
      </main>
      <footer className="public-footer">
        <div className="container footer-top">
          <Brand />
          <p>Capturing Moments | Crafting Memories</p>
          <a href="#main" className="text-link">
            Back to top
            <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} KT Photography. All rights reserved.</span>
          <div>
            <a href={whatsappLink()} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <Link href="/login">Client gallery</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
