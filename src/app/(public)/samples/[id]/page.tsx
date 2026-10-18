import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Images } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { PublicNav } from '@/components/layout/public-nav';
import { PhotoGrid } from '@/components/gallery/photo-grid';
import { EmptyState } from '@/components/ui/empty-state';
import type { Database } from '@/types/database';
import type { Metadata } from 'next';

export const revalidate = 60;

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

  const { data: album } = await db
    .from('albums')
    .select('title, description')
    .eq('id', id)
    .eq('is_public', true)
    .is('client_id', null)
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

  const { data: album, error } = await db
    .from('albums')
    .select('id, title, description, cover_image_path, created_at, is_public, client_id')
    .eq('id', id)
    .eq('is_public', true)
    .is('client_id', null)
    .maybeSingle();

  if (error || !album) {
    notFound();
  }

  const { data: rawPhotos, error: photoError } = await db
    .from('photos')
    .select('id, album_id, filename, file_size, width, height, thumbnail_path, display_order, is_public, created_at')
    .eq('album_id', id)
    .eq('is_public', true)
    .order('display_order', { ascending: true });

  if (photoError) {
    throw new Error('Unable to load sample photographs.');
  }

  // Strict fail-closed: Only show photos where is_public is explicitly true
  const publicPhotos = (rawPhotos || []).filter((p) => p.is_public === true);

  const photos = publicPhotos.map((p) => ({
    ...p,
    preview_url: `/api/photos/${p.id}`,
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
          <PhotoGrid photos={photos} />
        ) : (
          <section className="panel">
            <EmptyState
              title="Photographs coming soon."
              description="Photographs for this sample collection are currently being uploaded."
            />
          </section>
        )}
      </main>
    </>
  );
}
