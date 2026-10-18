'use client';
import { useEffect, useRef } from 'react';

function retry(image: HTMLImageElement, src: string | undefined, fallback: string) {
  if (src && image.dataset.retried !== 'true') {
    image.dataset.retried = 'true';
    image.src = fallback;
  }
}
export function ProtectedImage({
  src,
  fallback,
  alt,
  loading = 'lazy',
  className,
}: {
  src?: string;
  fallback: string;
  alt: string;
  loading?: 'lazy' | 'eager';
  className?: string;
}) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // An SSR image can fail before React attaches its error handler.
    const image = ref.current;
    if (image?.complete && !image.naturalWidth) retry(image, src, fallback);
  }, [src, fallback]);
  return (
    <img
      ref={ref}
      key={src || fallback}
      src={src || fallback}
      alt={alt}
      loading={loading}
      decoding="async"
      draggable={false}
      className={className}
      referrerPolicy="no-referrer"
      onError={(event) => {
        const image = event.currentTarget;
        // Lazy-loaded links can expire while an album is open. Recheck access at the endpoint.
        retry(image, src, fallback);
      }}
    />
  );
}
