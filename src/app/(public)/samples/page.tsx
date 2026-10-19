import type { Metadata } from 'next';
import Link from 'next/link';
import { Camera, ArrowLeft } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { PublicNav } from '@/components/layout/public-nav';
import { AlbumCard } from '@/components/gallery/album-card';
import { EmptyState } from '@/components/ui/empty-state';
import { adminClient } from '@/lib/supabase/admin';
import { signedPreviews } from '@/lib/supabase/previews';
import type { Database } from '@/types/database';

export const revalidate = 0;

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

  const client = process.env.SUPABASE_SECRET_KEY ? adminClient() : db;

  let albums: any[] = [];
  try {
    const { data } = await client
      .from('albums')
      .select('id, title, description, cover_image_path, created_at, is_public, photos(count)')
      .order('created_at', { ascending: false });

    if (data) {
      const explicitPublic = data.filter((a) => a.is_public === true);
      albums = explicitPublic.length > 0 ? explicitPublic : data;
    }
  } catch {
    albums = [];
  }

  const previews = await signedPreviews(
    client,
    albums.map((a) => a.cover_image_path),
  );

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
                badge="✦ Studio Sample"
                coverUrl={album.cover_image_path ? previews[album.cover_image_path] : undefined}
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
