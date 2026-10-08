'use client';
import Image from 'next/image';
import { useState, useCallback } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Lightbox } from '@/components/gallery/lightbox';
const photos = [
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
export function Showcase() {
  const [filter, setFilter] = useState('All'),
    [selected, setSelected] = useState<number | null>(null);
  const close = useCallback(() => setSelected(null), []);
  const filtered = photos.filter((p) => filter === 'All' || p.category === filter);
  return (
    <>
      <div className="filter-tabs portfolio-filters">
        {['All', 'Bridal portraits', 'Celebrations'].map((f) => (
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
            className={`showcase-photo photo-${i}`}
            onClick={() => setSelected(photos.indexOf(p))}
          >
            <Image src={p.src} alt={p.alt} fill sizes="(max-width: 700px) 90vw, 40vw" />
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
