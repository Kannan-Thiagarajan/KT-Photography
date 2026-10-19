import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { AlbumCard } from '@/components/gallery/album-card';
import { signedPreviews } from '@/lib/supabase/previews';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination, pageNumber } from '@/components/ui/pagination';
export default async function Albums({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  const { db } = await requireAdmin();
  const params = await searchParams;
  const page = pageNumber(params.page),
    size = 12;
  const filter = params.filter || 'all';

  let query = db
    .from('albums')
    .select('*,profiles(full_name,email),photos(count)', { count: 'exact' });

  if (filter === 'clients') {
    query = query.not('client_id', 'is', null);
  } else if (filter === 'samples') {
    query = query.is('client_id', null);
  }

  const {
    data: albums,
    count,
    error,
  } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * size, page * size - 1);

  if (error) throw new Error('Unable to load albums.');

  const previews = await signedPreviews(
    db,
    (albums || []).map((a) => a.cover_image_path),
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE STORIES IN YOUR STUDIO</p>
          <h1>
            Your <em>albums.</em>
          </h1>
          <p>Personal galleries and studio samples, thoughtfully organised.</p>
        </div>
        <Link href="/admin/albums/new" className="button button-gold">
          <Plus size={16} />
          Create album
        </Link>
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--line)',
          paddingBottom: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/admin/albums"
          className={`button ${filter === 'all' ? 'button-gold' : 'button-outline'}`}
          style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', height: 'auto', minHeight: '32px' }}
        >
          All albums
        </Link>
        <Link
          href="/admin/albums?filter=clients"
          className={`button ${filter === 'clients' ? 'button-gold' : 'button-outline'}`}
          style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', height: 'auto', minHeight: '32px' }}
        >
          Client galleries
        </Link>
        <Link
          href="/admin/albums?filter=samples"
          className={`button ${filter === 'samples' ? 'button-gold' : 'button-outline'}`}
          style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', height: 'auto', minHeight: '32px' }}
        >
          Studio samples
        </Link>
      </div>

      {albums?.length ? (
        <div className="album-grid">
          {albums.map((a) => {
            const isStudioSample = a.client_id === null;
            let badge = '';
            if (a.is_public) {
              badge = '✦ Public on Website';
            } else if (a.pixieset_url || a.google_drive_url) {
              badge = 'Client · Delivered';
            } else {
              badge = 'Private Album';
            }

            return (
              <AlbumCard
                key={a.id}
                album={a}
                href={`/admin/albums/${a.id}`}
                badge={badge}
                client={
                  isStudioSample
                    ? '✦ Studio Portfolio'
                    : a.profiles?.full_name
                      ? `${a.profiles.full_name}`
                      : 'Assigned Client'
                }
                coverUrl={previews[a.cover_image_path || '']}
              />
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <EmptyState
            title={
              filter === 'samples'
                ? 'No studio sample albums yet.'
                : filter === 'clients'
                  ? 'No client albums yet.'
                  : 'Make room for a new story.'
            }
            description={
              filter === 'samples'
                ? 'Create a studio sample album to showcase your work on the public website.'
                : 'Create an album, assign it to a client, and add their photographs.'
            }
          >
            <Link href="/admin/albums/new" className="button button-gold">
              <Plus size={15} />
              Create an album
            </Link>
          </EmptyState>
        </section>
      )}
      <Pagination
        page={page}
        count={count || 0}
        size={size}
        base={filter !== 'all' ? `/admin/albums?filter=${filter}` : '/admin/albums'}
      />
    </>
  );
}
