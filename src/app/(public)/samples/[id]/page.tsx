import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Images } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { PublicNav } from '@/components/layout/public-nav';
import { PhotoGrid } from '@/components/gallery/photo-grid';
import { EmptyState } from '@/components/ui/empty-state';
import { adminClient } from '@/lib/supabase/admin';
import { signedPreviews } from '@/lib/supabase/previews';
import type { Database } from '@/types/database';
import type { Metadata } from 'next';

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );

  const metaClient = process.env.SUPABASE_SECRET_KEY ? adminClient() : db;

  const { data: album } = await metaClient
    .from('albums')
    .select('title, description')
    .eq('id', id)
    .maybeSingle();

  if (!album) return { title: 'Sample Album — KT Photography' };

  return {
    title: `${album.title} — Sample Album | KT Photography`,
    description: album.description || `Browse the full photo collection from ${album.title}.`,
  };
}

export default async function SampleAlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );

  const client = process.env.SUPABASE_SECRET_KEY ? adminClient() : db;

  const { data: album, error } = await client
    .from('albums')
    .select('id, title, description, cover_image_path, created_at, is_public, client_id')
    .eq('id', id)
    .maybeSingle();

  if (error || !album) {
    notFound();
  }

  const { data: rawPhotos, error: photoError } = await client
    .from('photos')
    .select('id, album_id, filename, file_size, width, height, thumbnail_path, display_order, is_public, created_at')
    .eq('album_id', id)
    .order('display_order', { ascending: true });

  if (photoError) {
    throw new Error('Unable to load sample photographs.');
  }

  const allPhotos = rawPhotos || [];
  const publicPhotos = allPhotos.some((p) => p.is_public === true)
    ? allPhotos.filter((p) => p.is_public === true)
    : allPhotos;

  const photoSignedMap = await signedPreviews(
    client,
    publicPhotos.map((p) => p.thumbnail_path),
  );

  const photos = publicPhotos.map((p) => ({
    ...p,
    preview_url: photoSignedMap[p.thumbnail_path] || `/api/photos/${p.id}`,
  }));

  return (
    <>
      <PublicNav />
      <main id="main" className="container page-content">
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/samples" className="back-link">
            <ArrowLeft size={14} /> All sample albums
          </Link>
        </div>

        <div className="page-heading">
          <div>
            <p className="eyebrow">STUDIO SAMPLE COLLECTION</p>
            <h1>{album.title}</h1>
            {album.description && <p className="album-desc">{album.description}</p>}
            <p className="album-meta">
              <Images size={14} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: '-2px' }} />
              {photos.length} photographs
            </p>
          </div>
        </div>

        {photos.length > 0 ? (
          <PhotoGrid photos={photos} albumTitle={album.title} />
        ) : (
          <section className="panel">
            <EmptyState
              title="Photographs coming soon."
              description="Photographs for this sample collection are currently being uploaded."
            />
          </section>
        )}

        {/* Booking Readiness CTA for prospective clients */}
        <section
          style={{
            marginTop: '3.5rem',
            padding: '2.5rem 2rem',
            borderRadius: '8px',
            border: '1px solid #d9b87b35',
            background: 'linear-gradient(145deg, #241b2b 0%, #17121c 100%)',
            textAlign: 'center',
          }}
          aria-labelledby="booking-cta-heading"
        >
          <span className="tiny-star" style={{ color: 'var(--gold)', fontSize: '1.25rem' }}>✦</span>
          <p className="eyebrow" style={{ marginTop: '0.5rem', marginBottom: '0.4rem' }}>
            YOUR CELEBRATION, BEAUTIFULLY CAPTURED
          </p>
          <h2
            id="booking-cta-heading"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 400, color: 'var(--text)', marginBottom: '0.75rem' }}
          >
            Inspired by this <em>story?</em>
          </h2>
          <p style={{ maxWidth: '520px', margin: '0 auto 1.5rem', fontSize: '0.9375rem', color: 'var(--muted)', lineHeight: 1.7 }}>
            Every celebration has its own heartbeat. Connect with Kannan directly on WhatsApp to check date availability, discuss your vision, and explore your photography coverage.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={`https://wa.me/601175982687?text=${encodeURIComponent(
                `Hi Kannan, I was browsing your sample album "${album.title}" on the website and would love to check your availability for an upcoming celebration.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="button button-gold"
            >
              Enquire on WhatsApp
            </a>
            <Link href="/#packages" className="button button-outline">
              Explore Collections & Estimates
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
