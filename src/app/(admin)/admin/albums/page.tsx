import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { AlbumCard } from '@/components/gallery/album-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination, pageNumber } from '@/components/ui/pagination';
export default async function Albums({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { db } = await requireAdmin();
  const page = pageNumber((await searchParams).page),
    size = 12;
  const {
    data: albums,
    count,
    error,
  } = await db
    .from('albums')
    .select('*,profiles(full_name),photos(count)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * size, page * size - 1);
  if (error) throw new Error('Unable to load albums.');
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE STORIES IN YOUR STUDIO</p>
          <h1>
            Your <em>albums.</em>
          </h1>
          <p>Personal galleries, thoughtfully organised.</p>
        </div>
        <Link href="/admin/albums/new" className="button button-gold">
          <Plus size={16} />
          Create album
        </Link>
      </div>
      {albums?.length ? (
        <div className="album-grid">
          {albums.map((a) => (
            <AlbumCard
              key={a.id}
              album={a}
              href={`/admin/albums/${a.id}`}
              client={a.profiles?.full_name}
            />
          ))}
        </div>
      ) : (
        <section className="panel">
          <EmptyState
            title="Make room for a new story."
            description="Create an album, assign it to a client, and add their photographs."
          >
            <Link href="/admin/albums/new" className="button button-gold">
              <Plus size={15} />
              Create your first album
            </Link>
          </EmptyState>
        </section>
      )}
      <Pagination page={page} count={count || 0} size={size} base="/admin/albums" />
    </>
  );
}
