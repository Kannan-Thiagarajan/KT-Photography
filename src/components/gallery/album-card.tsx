import Link from 'next/link';
import { Images, ArrowUpRight, Camera } from 'lucide-react';
import { ProtectedImage } from './protected-image';
export function AlbumCard({
  album,
  href,
  client,
  coverUrl,
  badge,
}: {
  album: {
    id: string;
    title: string;
    cover_image_path: string | null;
    created_at: string;
    photos: { count: number }[];
    pixieset_url?: string | null;
    google_drive_url?: string | null;
    is_public?: boolean;
  };
  href: string;
  client?: string;
  coverUrl?: string;
  badge?: string;
}) {
  const photoCount = Array.isArray(album.photos)
    ? album.photos[0]?.count ?? 0
    : (album.photos as any)?.count ?? 0;

  const hasDelivery = Boolean(album.pixieset_url || album.google_drive_url);

  return (
    <Link
      href={href}
      className="album-card"
      aria-label={`${album.title} — ${photoCount} photographs`}
    >
      <div className="album-cover">
        {album.cover_image_path ? (
          <ProtectedImage
            src={coverUrl}
            fallback={`/api/albums/${album.id}/cover`}
            alt={`${album.title} cover photograph`}
          />
        ) : (
          <Camera aria-hidden="true" />
        )}
        {badge ? (
          <span
            className="photo-cover-badge"
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              left: 'auto',
              background: '#0d0813cc',
              backdropFilter: 'blur(4px)',
              border: '1px solid #d9b87b55',
              color: 'var(--gold)',
              fontSize: '0.6875rem',
              letterSpacing: '0.04em',
              padding: '3px 8px',
              borderRadius: '4px',
              fontWeight: 500,
            }}
          >
            {badge}
          </span>
        ) : hasDelivery ? (
          <span
            className="photo-cover-badge"
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              left: 'auto',
              background: '#0d0813bb',
              border: '1px solid #ffffff25',
              color: '#e4dbe8',
              fontSize: '0.6875rem',
              padding: '3px 7px',
              borderRadius: '4px',
            }}
          >
            Delivered
          </span>
        ) : null}
      </div>
      <div className="album-card-body">
        <div>
          <h3>{album.title}</h3>
          <ArrowUpRight size={18} aria-hidden="true" />
        </div>
        <p>
          {client ||
            new Date(album.created_at).toLocaleDateString('en-MY', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
        </p>
        <span className="album-count">
          <Images size={13} aria-hidden="true" />
          {photoCount} photographs
        </span>
      </div>
    </Link>
  );
}
