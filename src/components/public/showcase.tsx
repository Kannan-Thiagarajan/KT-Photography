'use client';
import Image from 'next/image';
import { useState, useCallback, useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Lightbox } from '@/components/gallery/lightbox';
import type { HomepagePhoto } from '@/types/models';

const defaultPhotos = [
  {
    id: 'wed',
    src: '/assets/images/wed.webp',
    alt: 'Traditional bridal portrait',
    label: 'THE BEAUTY OF TRADITION',
    title: 'A moment, timeless.',
    category: 'Bridal portraits',
  },
  {
    id: 'alagi',
    src: '/assets/images/alagi.webp',
    alt: 'Bridal portrait in a white gown',
    label: 'PERSONAL & EXPRESSIVE',
    title: 'Every detail. Every emotion.',
    category: 'Bridal portraits',
  },
  {
    id: 'ceremony',
    src: '/assets/images/ceremony.webp',
    alt: 'Wedding ceremonial detail from the supplied KT asset collection',
    label: 'CELEBRATING CONNECTION',
    title: 'Stories in the little things.',
    category: 'Celebrations',
  },
];

export function Showcase({
  managedPhotos,
  supabaseUrl,
}: {
  managedPhotos?: HomepagePhoto[];
  supabaseUrl?: string;
}) {
  const photos = useMemo(() => {
    if (managedPhotos && managedPhotos.length > 0) {
      return managedPhotos.map((p) => ({
        id: p.id,
        src: p.storage_path.startsWith('http') || p.storage_path.startsWith('/')
          ? p.storage_path
          : `${supabaseUrl || ''}/storage/v1/object/public/public-assets/${p.storage_path}`,
        alt: p.alt || p.title || 'KT Photography showcase portrait',
        label: p.label || 'PORTFOLIO SPOTLIGHT',
        title: p.title || 'A moment, timeless.',
        category: p.category || 'Bridal portraits',
      }));
    }
    return defaultPhotos;
  }, [managedPhotos, supabaseUrl]);

  const categories = useMemo(() => {
    const set = new Set(photos.map((p) => p.category));
    return ['All', ...Array.from(set)];
  }, [photos]);

  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState<number | null>(null);
  const close = useCallback(() => setSelected(null), []);

  const filtered = photos.filter((p) => filter === 'All' || p.category === filter);

  return (
    <>
      <div className="filter-tabs portfolio-filters">
        {categories.map((f) => (
          <button
            key={f}
            aria-pressed={filter === f}
            className={filter === f ? 'active' : ''}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="showcase-grid">
        {filtered.map((p, i) => (
          <button
            key={p.id}
            className={`showcase-photo photo-${i % 3}`}
            onClick={() => setSelected(photos.indexOf(p))}
          >
            <Image
              src={p.src}
              alt={p.alt}
              fill
              sizes="(max-width: 700px) 90vw, 40vw"
            />
            <div className="showcase-caption">
              <div>
                <span>{p.label}</span>
                <h3>{p.title}</h3>
              </div>
              <span className="round-arrow">
                <ArrowUpRight size={22} />
              </span>
            </div>
          </button>
        ))}
      </div>
      {selected !== null && <Lightbox images={photos} index={selected} onClose={close} />}
    </>
  );
}
