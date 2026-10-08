import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { ActionForm, Field, TextArea } from '@/components/ui/action-form';
import { Uploader } from '@/components/admin/uploader';
import { saveAlbum, deleteAlbum } from '@/features/albums/actions';
import { DeleteButton } from '@/components/ui/delete-button';
import { PhotoGrid } from '@/components/gallery/photo-grid';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination, pageNumber } from '@/components/ui/pagination';
export default async function AlbumDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { db } = await requireAdmin();
  const page = pageNumber((await searchParams).page),
    size = 24;
  const { data: album, error } = await db
    .from('albums')
    .select('*,profiles(full_name,email)')
    .eq('id', id)
    .maybeSingle();
  if (error || !album) notFound();
  const {
    data: photos,
    count,
    error: photoError,
  } = await db
    .from('photos')
    .select('*', { count: 'exact' })
    .eq('album_id', id)
    .order('created_at', { ascending: false })
    .range((page - 1) * size, page * size - 1);
  if (photoError) throw new Error('Unable to load photographs.');
  const { data: covers } = await db
    .from('photos')
    .select('thumbnail_path,filename')
    .eq('album_id', id)
    .order('created_at', { ascending: false })
    .limit(100);
  return (
    <>
      <Link href="/admin/albums" className="back-link">
        <ArrowLeft size={14} />
        All albums
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{album.profiles?.full_name} / PRIVATE COLLECTION</p>
          <h1>{album.title}</h1>
          <p>
            {count || 0} photographs · {album.profiles?.email}
          </p>
        </div>
        <DeleteButton action={deleteAlbum} id={id} label="album" redirectTo="/admin/albums" />
      </div>
      <div className="album-editor-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Add photographs</h2>
              <p>Originals are preserved. Gallery previews are optimised automatically.</p>
            </div>
          </div>
          <Uploader albumId={id} />
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Album details</h2>
          </div>
          <ActionForm action={saveAlbum}>
            <input type="hidden" name="id" value={id} />
            <Field label="Title" name="title" defaultValue={album.title} />
            <TextArea label="Description" name="description" defaultValue={album.description} />
            <label className="field">
              <span>Cover photograph</span>
              <select
                key={album.cover_image_path}
                name="cover_image_path"
                defaultValue={album.cover_image_path || ''}
              >
                <option value="">No cover</option>
                {album.cover_image_path &&
                  !covers?.some((p) => p.thumbnail_path === album.cover_image_path) && (
                    <option value={album.cover_image_path}>Current cover</option>
                  )}
                {covers?.map((p) => (
                  <option value={p.thumbnail_path} key={p.thumbnail_path}>
                    {p.filename}
                  </option>
                ))}
              </select>
            </label>
          </ActionForm>
        </section>
      </div>
      {photos?.length ? (
        <PhotoGrid photos={photos} admin />
      ) : (
        <section className="panel">
          <EmptyState
            title="Ready for the first frame."
            description="Add your photographs above. They’ll appear here and in your client’s gallery."
          />
        </section>
      )}
      <Pagination page={page} count={count || 0} size={size} base={`/admin/albums/${id}`} />
    </>
  );
}
