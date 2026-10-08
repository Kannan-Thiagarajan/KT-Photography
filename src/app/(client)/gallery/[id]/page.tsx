import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { requireGallery } from '@/lib/auth/session';
import { PhotoGrid } from '@/components/gallery/photo-grid';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination, pageNumber } from '@/components/ui/pagination';
export default async function ClientAlbum({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { db } = await requireGallery();
  const page = pageNumber((await searchParams).page),
    size = 24;
  const { data: album, error } = await db.from('albums').select('*').eq('id', id).maybeSingle();
  if (error || !album) notFound();
  const {
    data: photos,
    count,
    error: photoError,
  } = await db
    .from('photos')
    .select('*', { count: 'exact' })
    .eq('album_id', id)
    .order('created_at', { ascending: true })
    .range((page - 1) * size, page * size - 1);
  if (photoError) throw new Error('Unable to load photographs.');
  return (
    <>
      <Link href="/gallery" className="back-link">
        <ArrowLeft size={14} />
        My galleries
      </Link>
      <div className="page-heading gallery-heading">
        <div>
          <p className="eyebrow">YOUR PRIVATE COLLECTION</p>
          <h1>{album.title}</h1>
          <p>{album.description || 'A little piece of your story, beautifully preserved.'}</p>
          <p>
            {count || 0} photographs ·{' '}
            {new Date(album.created_at).toLocaleDateString('en-MY', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <span className="text-link gold">
          <Download size={15} />
          Tap a photo to view & download
        </span>
      </div>
      {photos?.length ? (
        <PhotoGrid photos={photos} />
      ) : (
        <section className="panel">
          <EmptyState
            title="The story is still unfolding."
            description="Kannan hasn’t added photographs to this album yet. Check back once your photos are ready."
          />
        </section>
      )}
      <Pagination page={page} count={count || 0} size={size} base={`/gallery/${id}`} />
    </>
  );
}
