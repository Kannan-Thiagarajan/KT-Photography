import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, ExternalLink, Sparkles, MessageCircle, Info } from 'lucide-react';
import { requireGallery } from '@/lib/auth/session';
import { PhotoGrid } from '@/components/gallery/photo-grid';
import { ProtectedImage } from '@/components/gallery/protected-image';
import { signedPreviews } from '@/lib/supabase/previews';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination, pageNumber } from '@/components/ui/pagination';
import { whatsappLink } from '@/config/brand';

export default async function ClientAlbum({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { db, profile } = await requireGallery();
  const page = pageNumber((await searchParams).page),
    size = 24;
  const { data: album, error } = await db.from('albums').select('*').eq('id', id).maybeSingle();
  if (error || !album) notFound();

  // Dual-layer server authorization: strictly verify client owns this album
  if (profile.role !== 'admin' && album.client_id !== profile.id) {
    notFound();
  }

  const {
    data: photos,
    count,
    error: photoError,
  } = await db
    .from('photos')
    .select('*', { count: 'exact' })
    .eq('album_id', id)
    .order('display_order', { ascending: true })
    .range((page - 1) * size, page * size - 1);
  if (photoError) throw new Error('Unable to load photographs.');

  const pathsToSign = [
    ...(photos || []).map((p) => p.thumbnail_path),
    album.cover_image_path,
  ].filter(Boolean) as string[];

  const previews = await signedPreviews(db, pathsToSign);

  const hasDeliveryLinks = Boolean(album.pixieset_url || album.google_drive_url);

  return (
    <>
      <nav aria-label="Breadcrumbs" style={{ marginBottom: '1.25rem' }}>
        <Link href="/gallery" className="back-link">
          <ArrowLeft size={14} />
          Back to my galleries
        </Link>
      </nav>

      <div className="page-heading gallery-heading">
        <div>
          <p className="eyebrow">YOUR PRIVATE COLLECTION</p>
          <h1>{album.title}</h1>
          <p>{album.description || 'A little piece of your story, beautifully preserved.'}</p>
          <p style={{ marginTop: '0.4rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
            {count || 0} photographs ·{' '}
            {new Date(album.created_at).toLocaleDateString('en-MY', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <span className="text-link gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <Download size={15} />
          Tap a photo to view & download
        </span>
      </div>

      {/* External delivery archives or reassuring progress message */}
      {hasDeliveryLinks ? (
        <section
          className="panel"
          style={{
            marginBottom: '2rem',
            padding: '1.25rem 1.5rem',
            border: '1px solid #d9b87b35',
            background: 'linear-gradient(145deg, #251d2b 0%, #1c1622 100%)',
          }}
          aria-labelledby="delivery-heading"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Sparkles size={16} style={{ color: 'var(--gold)' }} />
            <h2 id="delivery-heading" style={{ fontSize: '1rem', fontWeight: 500, margin: 0, color: 'var(--text)' }}>
              Final Delivered Archives
            </h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
            In addition to your online private preview below, your final edited collections are accessible through the following external delivery links:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {album.pixieset_url && (
              <a
                href={album.pixieset_url}
                target="_blank"
                rel="noopener noreferrer"
                className="button button-gold"
                aria-label="View online client gallery on Pixieset (opens in a new tab)"
              >
                <ExternalLink size={15} />
                Open Pixieset Client Gallery
              </a>
            )}
            {album.google_drive_url && (
              <a
                href={album.google_drive_url}
                target="_blank"
                rel="noopener noreferrer"
                className="button button-outline"
                aria-label="Download high-resolution photos from Google Drive (opens in a new tab)"
              >
                <ExternalLink size={15} />
                Download Original Files (Google Drive)
              </a>
            )}
          </div>
        </section>
      ) : (
        <section
          style={{
            marginBottom: '2rem',
            padding: '1rem 1.25rem',
            borderRadius: '6px',
            border: '1px solid var(--line)',
            background: '#1d1722',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <Info size={17} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.8125rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '0.2rem' }}>
              Final Delivery Archives
            </strong>
            High-resolution master downloads (Google Drive) and interactive web galleries (Pixieset) will appear here as soon as post-production is complete. You can preview and download individual photographs directly below.
          </div>
        </section>
      )}

      {photos?.length ? (
        <PhotoGrid
          photos={photos.map((p) => ({ ...p, preview_url: previews[p.thumbnail_path] }))}
          albumTitle={album.title}
        />
      ) : (
        <section className="panel">
          <EmptyState
            title="The story is still unfolding."
            description="Kannan is preparing and curating photographs for this collection. Feel free to reach out if you have any questions."
          >
            <a
              className="button button-outline"
              href={whatsappLink(`Hi Kannan, I was checking my private album "${album.title}" on the KT Photography portal and wanted to enquire about its status.`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={15} />
              Message Kannan on WhatsApp
            </a>
          </EmptyState>
        </section>
      )}
      <Pagination page={page} count={count || 0} size={size} base={`/gallery/${id}`} />
    </>
  );
}
