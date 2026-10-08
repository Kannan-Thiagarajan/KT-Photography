'use client';
import Image from 'next/image';
import { useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Clock3,
  Aperture,
  Sparkles,
  Gem,
  Star,
  Crown,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { whatsappLink } from '@/config/brand';
import { QuickFinder } from './quick-finder';
import { CoverageCalculator } from './coverage-calculator';
import { PackageGuide } from './package-guide';
import { serviceForEvent } from '@/features/quotation/model';
import type { Package } from '@/types/models';
const icons = [Aperture, Gem, Sparkles, Crown, Star];
export function Collections({ packages }: { packages: Package[] }) {
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState<'full' | 'mobile'>('full');
  const initial = packages.find((p) => p.slug === 'grand') || packages[0];
  const [selectedId, setSelectedId] = useState(initial?.id),
    [hours, setHours] = useState(initial?.included_hours || 4),
    [service, setService] = useState('ROM Photography');
  const selected = packages.find((p) => p.id === selectedId) || initial;
  function select(collection: Package, requestedHours?: number, event?: string) {
    if (collection.id !== selectedId) {
      setSelectedId(collection.id);
      setHours(collection.included_hours);
    }
    if (requestedHours) {
      setHours(
        Math.max(collection.slug === 'signature' ? collection.included_hours : 1, requestedHours),
      );
      setFilter('all');
    }
    if (event) setService(serviceForEvent(event));
  }
  const filtered = packages.filter(
    (p) =>
      filter === 'all' || (filter === 'digital' ? p.slug === 'signature' : p.slug !== 'signature'),
  );
  return (
    <>
      <div className="planner-heading-row">
        <span className="eyebrow">OFFICIAL DIGITAL QUOTATION & BOOKING</span>
        <div className="planner-view-switch" role="group" aria-label="Quotation planner preview">
          <span>Preview</span>
          <button type="button" aria-pressed={view === 'full'} onClick={() => setView('full')}>
            <Monitor size={13} />
            Full
          </button>
          <button type="button" aria-pressed={view === 'mobile'} onClick={() => setView('mobile')}>
            <Smartphone size={13} />
            Mobile
          </button>
        </div>
      </div>
      <div className={`quotation-experience ${view === 'mobile' ? 'planner-mobile-view' : ''}`}>
        <QuickFinder
          packages={packages}
          onSelect={(p, h, event) => {
            select(p, h, event);
            document.getElementById('coverage-calculator')?.scrollIntoView({
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'instant'
                : 'smooth',
              block: 'start',
            });
          }}
        />
        <div className="collection-toolbar">
          <div className="filter-tabs" aria-label="Filter collections">
            {[
              ['all', 'All collections'],
              ['digital', 'Digital only'],
              ['album', 'With an album'],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={filter === id}
                className={filter === id ? 'active' : ''}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="collection-note">A collection for every chapter.</span>
        </div>
        <div className="packages-grid">
          {filtered.map((p) => {
            const Icon = icons[Math.max(0, p.display_order) % 5];
            const featured = p.slug === 'grand';
            return (
              <article
                key={p.id}
                className={`package-card ${featured ? 'featured' : ''} ${selected?.id === p.id ? 'selected' : ''}`}
              >
                {p.badge && <span className="package-badge">{p.badge}</span>}
                <Icon className="package-icon" size={25} strokeWidth={1.3} />
                <span className="package-subtitle">{p.description}</span>
                <h3>{p.title}</h3>
                <p className="package-price">
                  <span>RM</span> {new Intl.NumberFormat('en-MY').format(p.price)}
                </p>
                <span className="package-duration">
                  <Clock3 size={13} />
                  {p.included_hours} hours of coverage
                </span>
                {p.image_path && (
                  <div className="package-photo">
                    <Image
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/public-assets/${p.image_path}`}
                      alt={p.title}
                      fill
                      sizes="(max-width: 700px) 90vw, 240px"
                    />
                  </div>
                )}
                <div className="package-rule" />
                <ul>
                  {p.features.map((f, i) => (
                    <li key={i}>
                      <Check size={14} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="package-best">
                  <span>PERFECT FOR</span>
                  <p>{p.best_for.join(' · ')}</p>
                </div>
                <button
                  type="button"
                  aria-pressed={selected?.id === p.id}
                  aria-label={`Select ${p.title}`}
                  className={`button package-select-button ${selected?.id === p.id ? 'button-gold' : 'button-outline'}`}
                  onClick={() => select(p)}
                >
                  {selected?.id === p.id ? 'Currently selected' : 'Select collection'}
                  {selected?.id === p.id ? <Check size={16} /> : <ArrowUpRight size={16} />}
                </button>
              </article>
            );
          })}
        </div>
        <p className="pricing-footnote">
          Additional coverage at RM100/hour. Second photographer: RM199/hour or RM499 for up to 4
          hours.
          <br />
          Promotional prices are subject to availability. Confirm your date and final quote directly
          with Kannan.
        </p>
        {selected ? (
          <CoverageCalculator
            collection={selected}
            hours={hours}
            onHours={setHours}
            service={service}
            onService={setService}
          />
        ) : (
          <p className="notice info">
            Contact Kannan for a tailored photography estimate.{' '}
            <a href={whatsappLink()} className="text-link">
              Enquire on WhatsApp ↗
            </a>
          </p>
        )}
      </div>
      <PackageGuide packages={packages} />
    </>
  );
}
