'use client';
import Image from 'next/image';
import { useState, useCallback, useMemo, useEffect, useRef, useSyncExternalStore } from 'react';
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Sparkles,
} from 'lucide-react';
import { Lightbox } from '@/components/gallery/lightbox';
import type { HomepagePhoto } from '@/types/models';

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getServerReducedMotionSnapshot() {
  return false;
}

function ShowcaseImage({
  src,
  alt,
  priority,
}: {
  src: string;
  alt: string;
  priority: boolean;
}) {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      sizes="(max-width: 600px) 90vw, (max-width: 1024px) 50vw, 420px"
      className="showcase-img"
      onError={() => {
        if (imgSrc !== '/assets/images/wed.webp') {
          setImgSrc('/assets/images/wed.webp');
        }
      }}
    />
  );
}

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
    id: 'outdoor',
    src: '/assets/images/outdoor.webp',
    alt: 'Couple in outdoor setting during golden hour',
    label: 'NATURAL LIGHT & CANDIDS',
    title: 'Golden hours, pure emotion.',
    category: 'Bridal portraits',
  },
  {
    id: 'outdoor1',
    src: '/assets/images/outdoor1.webp',
    alt: 'Outdoor celebration moment',
    label: 'UNSCRIPTED JOY',
    title: 'Laughter that fills the room.',
    category: 'Celebrations',
  },
  {
    id: 'outdoor3',
    src: '/assets/images/outdoor3.webp',
    alt: 'Atmospheric ceremonial photography',
    label: 'ATMOSPHERE & ELEGANCE',
    title: 'Capturing what it felt like.',
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
  const cleanSupabaseUrl = useMemo(
    () => (supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, ''),
    [supabaseUrl],
  );

  const photos = useMemo(() => {
    const formattedManaged = (managedPhotos || []).map((p) => {
      let src = p.storage_path;
      if (!src.startsWith('http') && !src.startsWith('/')) {
        const cleanPath = p.storage_path.replace(/^\/+/, '');
        const bucketPrefix = cleanPath.startsWith('public-assets/') ? '' : 'public-assets/';
        src = `${cleanSupabaseUrl}/storage/v1/object/public/${bucketPrefix}${cleanPath}`;
      }
      return {
        id: p.id,
        src,
        alt: p.alt || p.title || 'KT Photography showcase portrait',
        label: p.label || 'PORTFOLIO SPOTLIGHT',
        title: p.title || 'A moment, timeless.',
        category: p.category || 'Bridal portraits',
      };
    });

    if (formattedManaged.length >= 3) {
      return formattedManaged;
    }

    if (formattedManaged.length > 0) {
      const defaultFiltered = defaultPhotos.filter(
        (def) => !formattedManaged.some((m) => m.id === def.id)
      );
      return [...formattedManaged, ...defaultFiltered];
    }

    return defaultPhotos;
  }, [managedPhotos, cleanSupabaseUrl]);

  const categories = useMemo(() => {
    const set = new Set(photos.map((p) => p.category));
    return ['All', ...Array.from(set)];
  }, [photos]);

  const [filter, setFilter] = useState('All');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const isReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );

  const trackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Only run carousel auto-advance when the showcase is actually visible in the viewport
  useEffect(() => {
    const target = sectionRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.15 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const filtered = useMemo(
    () => photos.filter((p) => filter === 'All' || p.category === filter),
    [photos, filter],
  );

  const scrollToSlide = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const slides = track.children;
      if (slides[index]) {
        const slide = slides[index] as HTMLElement;
        // Scroll strictly inside the horizontal track container.
        // NEVER call slide.scrollIntoView which hijacks the entire window/page scroll!
        const slideLeft = slide.offsetLeft;
        const slideWidth = slide.offsetWidth;
        const trackWidth = track.clientWidth;
        const targetScrollLeft = slideLeft - (trackWidth - slideWidth) / 2;
        track.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: isReducedMotion ? 'auto' : 'smooth',
        });
        setCurrentIndex(index);
      }
    },
    [isReducedMotion],
  );

  const handlePrev = useCallback(() => {
    if (filtered.length <= 1) return;
    const prevIdx = (currentIndex - 1 + filtered.length) % filtered.length;
    scrollToSlide(prevIdx);
  }, [currentIndex, filtered.length, scrollToSlide]);

  const handleNext = useCallback(() => {
    if (filtered.length <= 1) return;
    const nextIdx = (currentIndex + 1) % filtered.length;
    scrollToSlide(nextIdx);
  }, [currentIndex, filtered.length, scrollToSlide]);

  const handleDotClick = useCallback(
    (index: number) => {
      scrollToSlide(index);
    },
    [scrollToSlide],
  );

  const handleFilterSelect = (cat: string) => {
    setFilter(cat);
    setCurrentIndex(0);
    if (trackRef.current) {
      trackRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const handleScroll = useCallback(() => {
    if (!trackRef.current) return;
    const track = trackRef.current;
    const slides = Array.from(track.children) as HTMLElement[];
    if (slides.length === 0) return;

    const trackCenter = track.scrollLeft + track.clientWidth / 2;
    let closestIndex = 0;
    let minDistance = Infinity;

    slides.forEach((slide, idx) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const dist = Math.abs(trackCenter - slideCenter);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = idx;
      }
    });

    if (closestIndex !== currentIndex) {
      setCurrentIndex(closestIndex);
    }
  }, [currentIndex]);

  // Handle automatic carousel movement — only when visible, not hovered, not touched, not focused
  useEffect(() => {
    if (
      !isPlaying ||
      !isInView ||
      isHovered ||
      isFocused ||
      isTouching ||
      isReducedMotion ||
      filtered.length <= 1
    ) {
      return;
    }

    const timer = setInterval(() => {
      handleNext();
    }, 4500);

    return () => clearInterval(timer);
  }, [
    isPlaying,
    isInView,
    isHovered,
    isFocused,
    isTouching,
    isReducedMotion,
    filtered.length,
    handleNext,
  ]);

  // Keyboard controls
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    }
  };

  const closeLightbox = useCallback(() => setSelected(null), []);

  return (
    <section
      ref={sectionRef}
      className="showcase-section"
      aria-roledescription="carousel"
      aria-label="Through the Lens photography portfolio"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsTouching(true)}
      onTouchEnd={() => setIsTouching(false)}
      onTouchCancel={() => setIsTouching(false)}
    >
      {/* Category filter tabs */}
      <div className="filter-tabs portfolio-filters" role="tablist" aria-label="Filter portfolio categories">
        {categories.map((cat) => (
          <button
            key={cat}
            role="tab"
            aria-selected={filter === cat}
            className={filter === cat ? 'active' : ''}
            onClick={() => handleFilterSelect(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cinematic Showcase Stage */}
      <div className="showcase-carousel-wrap">
        <div
          ref={trackRef}
          className="showcase-carousel-track"
          onScroll={handleScroll}
        >
          {filtered.map((photo, i) => {
            const isCurrent = i === currentIndex;
            const steppedClass = `step-${i % 3}`;

            return (
              <article
                key={photo.id}
                className={`showcase-slide ${isCurrent ? 'active' : ''} ${steppedClass}`}
                aria-hidden={!isCurrent}
                aria-label={`${photo.title} (${photo.category})`}
              >
                <button
                  type="button"
                  className="showcase-photo-button"
                  onClick={() => setSelected(photos.indexOf(photo))}
                  aria-label={`View ${photo.title} in full-screen gallery`}
                >
                  <div className="showcase-image-container">
                    <ShowcaseImage
                      src={photo.src}
                      alt={photo.alt}
                      priority={i === 0 || i === 1}
                    />
                  </div>
                  <div className="showcase-caption">
                    <div>
                      <span>{photo.label}</span>
                      <h3>{photo.title}</h3>
                    </div>
                    <span className="round-arrow" aria-hidden="true">
                      <ArrowUpRight size={20} />
                    </span>
                  </div>
                </button>
              </article>
            );
          })}
        </div>
      </div>

      {/* Interactive Controls & Pagination Bar */}
      <div className="showcase-controls-bar">
        <div className="showcase-counter">
          <Sparkles size={14} className="gold" aria-hidden="true" />
          <span>
            {String(currentIndex + 1).padStart(2, '0')} / {String(filtered.length).padStart(2, '0')}
          </span>
          <span className="showcase-active-cat">{filtered[currentIndex]?.category}</span>
        </div>

        {/* Clickable Pagination Dots */}
        <div className="showcase-dots" role="tablist" aria-label="Slides">
          {filtered.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={idx === currentIndex}
              className={`showcase-dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => handleDotClick(idx)}
              aria-label={`Go to slide ${idx + 1}: ${p.title}`}
            />
          ))}
        </div>

        {/* Playback & Direction Controls */}
        <div className="showcase-nav-group">
          <button
            type="button"
            className="showcase-nav-btn"
            onClick={handlePrev}
            aria-label="Previous photograph"
            title="Previous (Left arrow)"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            className="showcase-nav-btn"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? 'Pause automated showcase' : 'Play automated showcase'}
            title={isPlaying ? 'Pause auto-sliding' : 'Resume auto-sliding'}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          </button>

          <button
            type="button"
            className="showcase-nav-btn"
            onClick={handleNext}
            aria-label="Next photograph"
            title="Next (Right arrow)"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {selected !== null && (
        <Lightbox images={photos} index={selected} onClose={closeLightbox} />
      )}
    </section>
  );
}
