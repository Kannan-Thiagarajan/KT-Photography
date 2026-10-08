import Link from 'next/link';
import { Images, ArrowUpRight, Camera } from 'lucide-react';
import { ProtectedImage } from './protected-image';
export function AlbumCard({
  album,
  href,
  client,
  coverUrl,
}: {
  album: {
    id: string;
    title: string;
    cover_image_path: string | null;
    created_at: string;
    photos: { count: number }[];
  };
  href: string;
  client?: string;
  coverUrl?: string;
}) {
  return (
    <Link href={href} className="album-card">
      <div className="album-cover">
        {album.cover_image_path ? (
          <ProtectedImage
            src={coverUrl}
            fallback={`/api/albums/${album.id}/cover`}
            alt={`${album.title} cover`}
          />
        ) : (
          <Camera />
        )}
      </div>
      <div className="album-card-body">
        <div>
          <h3>{album.title}</h3>
          <ArrowUpRight size={18} />
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
          <Images size={13} />
          {album.photos[0]?.count || 0} photographs
        </span>
      </div>
    </Link>
  );
}
