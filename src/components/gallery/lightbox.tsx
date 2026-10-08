'use client';
/* Private images use authorized route handlers. Public assets use local URLs. */
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Download } from 'lucide-react';
import { ProtectedImage } from './protected-image';
export type GalleryImage = {
  id: string;
  src: string;
  alt: string;
  download?: string;
  fallback?: string;
};
export function Lightbox({
  images,
  index,
  onClose,
}: {
  images: GalleryImage[];
  index: number;
  onClose: () => void;
}) {
  const [active, setActive] = useState(index);
  const dialog = useRef<HTMLDivElement>(null);
  const image = images[active];
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    dialog.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setActive((i) => (i + 1) % images.length);
      if (e.key === 'ArrowLeft') setActive((i) => (i - 1 + images.length) % images.length);
      if (e.key === 'Tab') {
        const focusables = dialog.current?.querySelectorAll<HTMLElement>('a[href],button');
        if (!focusables?.length) return;
        const first = focusables[0],
          last = focusables[focusables.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === dialog.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, [images.length, onClose]);
  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      tabIndex={-1}
      ref={dialog}
    >
      <div className="lightbox-top">
        <span>
          {active + 1} / {images.length}
        </span>
        <div>
          {image.download && (
            <a href={image.download} className="button button-outline button-small">
              <Download size={16} />
              Download original
            </a>
          )}
          <button className="icon-button" aria-label="Close viewer" onClick={onClose}>
            <X />
          </button>
        </div>
      </div>
      <div className="lightbox-stage">
        <button
          className="icon-button"
          aria-label="Previous photograph"
          onClick={() => setActive((i) => (i - 1 + images.length) % images.length)}
        >
          <ChevronLeft size={28} />
        </button>
        <ProtectedImage
          src={image.src}
          fallback={image.fallback || image.src}
          alt={image.alt}
          key={image.id}
          loading="eager"
        />
        <button
          className="icon-button"
          aria-label="Next photograph"
          onClick={() => setActive((i) => (i + 1) % images.length)}
        >
          <ChevronRight size={28} />
        </button>
      </div>
      <p className="lightbox-caption">{image.alt}</p>
    </div>
  );
}
