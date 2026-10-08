import { Aperture } from 'lucide-react';
import { requireGallery } from '@/lib/auth/session';
import { AlbumCard } from '@/components/gallery/album-card';
import { signedPreviews } from '@/lib/supabase/previews';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination, pageNumber } from '@/components/ui/pagination';
import { whatsappLink } from '@/config/brand';
export default async function Gallery({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { db, profile } = await requireGallery();
  const page = pageNumber((await searchParams).page),
    size = 12;
  let query = db
    .from('albums')
    .select('*,photos(count)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * size, page * size - 1);
  if (profile.role !== 'admin') query = query.eq('client_id', profile.id);
  const { data: albums, count, error } = await query;
  if (error) throw new Error('Unable to load your galleries.');
  const previews = await signedPreviews(
    db,
    (albums || []).map((a) => a.cover_image_path),
  );
  return (
    <>
      <section className="client-welcome">
        <p className="eyebrow">PRIVATE. PERSONAL. YOURS.</p>
        <h1>
          Hello, <em>{profile.full_name.split(' ')[0]}.</em>
          <br />
          Welcome to your memories.
        </h1>
        <p>
          A collection of your favourite moments. Revisit them, share a smile, and keep them close.
        </p>
        <Aperture />
      </section>
      <div className="panel-heading">
        <div>
          <h2>Your galleries</h2>
          <p>{count || 0} albums, just for you.</p>
        </div>
      </div>
      {albums?.length ? (
        <div className="album-grid">
          {albums.map((a) => (
            <AlbumCard
              key={a.id}
              album={a}
              href={`/gallery/${a.id}`}
              coverUrl={previews[a.cover_image_path || '']}
            />
          ))}
        </div>
      ) : (
        <section className="panel">
          <EmptyState
            title="Your memories are on their way."
            description="Your albums will appear here when Kannan adds your photographs. Feel free to reach out for an update."
          >
            <a
              className="button button-outline"
              href={whatsappLink('Hi Kannan, could I have an update on my photo gallery?')}
              target="_blank"
              rel="noreferrer"
            >
              Message Kannan
            </a>
          </EmptyState>
        </section>
      )}
      <Pagination page={page} count={count || 0} size={size} base="/gallery" />
    </>
  );
}
