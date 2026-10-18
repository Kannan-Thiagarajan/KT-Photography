import type { Metadata } from 'next';
import Link from 'next/link';
import { Camera, ArrowLeft } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { PublicNav } from '@/components/layout/public-nav';
import { AlbumCard } from '@/components/gallery/album-card';
import { EmptyState } from '@/components/ui/empty-state';
import type { Database } from '@/types/database';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Sample Portfolios & Client Stories — KT Photography',
  description:
    'Browse our curated public sample albums showcasing full wedding ceremonies, bridal portraits, and celebrations.',
};

export default async function SamplesPage() {
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );

  let albums: any[] = [];
  try {
    const { data } = await db
      .from('albums')
      .select('id, title, description, cover_image_path, created_at, photos(count)')
      .eq('is_public', true)
      .is('client_id', null)
      .order('created_at', { ascending: false });

    if (data) {
      albums = data;
    }
  } catch {
    albums = [];
  }

  return (
    <>
      <PublicNav />
      <main id="main" className="container page-content">
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/#portfolio" className="back-link">
            <ArrowLeft size={14} /> Back to homepage
          </Link>
        </div>

        <div className="page-heading">
          <div>
            <p className="eyebrow">CURATED CLIENT STORIES</p>
            <h1>
              Sample <em>albums.</em>
            </h1>
            <p>
              Explore complete photo collections from recent ceremonies, bridal portraits, and celebrations.
            </p>
          </div>
        </div>

        {albums.length > 0 ? (
          <div className="album-grid">
            {albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                href={`/samples/${album.id}`}
                coverUrl={`/api/albums/${album.id}/cover`}
              />
            ))}
          </div>
        ) : (
          <section className="panel">
            <EmptyState
              title="Sample galleries in preparation."
              description="We are currently curating and uploading new public sample albums. In the meantime, explore our featured homepage portfolio."
            >
              <Link href="/#portfolio" className="button button-gold">
                View homepage portfolio
              </Link>
            </EmptyState>
          </section>
        )}
      </main>
    </>
  );
}
