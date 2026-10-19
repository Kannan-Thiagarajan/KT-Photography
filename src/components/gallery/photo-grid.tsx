'use client';
import { useState, useCallback } from 'react';
import { Download } from 'lucide-react';
import { Lightbox } from './lightbox';
import { ProtectedImage } from './protected-image';
import type { Photo } from '@/types/models';

export function PhotoGrid({ photos, albumTitle }: { photos: Photo[]; albumTitle?: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const close = useCallback(() => setSelected(null), []);
  const images = photos.map((photo, index) => {
    const cleanName = photo.filename
      ? photo.filename.replace(/\.[^/.]+$/, '').replaceAll('_', ' ').replaceAll('-', ' ')
      : `Frame ${index + 1}`;
    const altText = albumTitle ? `${albumTitle} — ${cleanName}` : cleanName;
    return {
      id: photo.id,
      src: photo.preview_url || `/api/photos/${photo.id}`,
      fallback: `/api/photos/${photo.id}`,
      alt: altText,
      download: `/api/photos/${photo.id}?download=1`,
    };
  });
  return (
    <>
      <div className="photo-grid">
        {photos.map((photo, index) => {
          const imageMeta = images[index];
          return (
            <article className="photo-tile" key={photo.id}>
              <button
                className="photo-image-button"
                aria-label={`Preview photograph ${index + 1} of ${photos.length}: ${imageMeta.alt}`}
                onClick={() => setSelected(index)}
              >
                <ProtectedImage
                  src={photo.preview_url}
                  fallback={`/api/photos/${photo.id}`}
                  alt={imageMeta.alt}
                />
              </button>
              <div className="photo-tile-footer">
                <span title={photo.filename}>{photo.filename}</span>
                <a
                  href={`/api/photos/${photo.id}?download=1`}
                  aria-label={`Download original file: ${photo.filename}`}
                  title="Download photograph"
                >
                  <Download size={15} />
                </a>
              </div>
            </article>
          );
        })}
      </div>
      {selected !== null && <Lightbox images={images} index={selected} onClose={close} />}
    </>
  );
}
