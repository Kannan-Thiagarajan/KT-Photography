'use client';
import { useState, useCallback } from 'react';
import { Download } from 'lucide-react';
import { Lightbox } from './lightbox';
import { DeleteButton } from '@/components/ui/delete-button';
import { deletePhoto } from '@/features/photos/actions';
import type { Photo } from '@/types/models';
export function PhotoGrid({ photos, admin = false }: { photos: Photo[]; admin?: boolean }) {
  const [selected, setSelected] = useState<number | null>(null);
  const close = useCallback(() => setSelected(null), []);
  const images = photos.map((p) => ({
    id: p.id,
    src: `/api/photos/${p.id}`,
    alt: p.filename,
    download: `/api/photos/${p.id}?download=1`,
  }));
  return (
    <>
      <div className="photo-grid">
        {photos.map((p, i) => (
          <article className="photo-tile" key={p.id}>
            <button
              className="photo-image-button"
              aria-label={`Preview ${p.filename}`}
              onClick={() => setSelected(i)}
            >
              {}
              <img src={`/api/photos/${p.id}`} alt={p.filename} loading="lazy" />
            </button>
            <div className="photo-tile-footer">
              <span title={p.filename}>{p.filename}</span>
              {admin ? (
                <DeleteButton action={deletePhoto} id={p.id} label="photograph" />
              ) : (
                <a href={`/api/photos/${p.id}?download=1`} aria-label={`Download ${p.filename}`}>
                  <Download size={15} />
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
      {selected !== null && <Lightbox images={images} index={selected} onClose={close} />}
    </>
  );
}
