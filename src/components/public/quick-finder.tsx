'use client';
import { useState } from 'react';
import { Sparkles, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { finderEvents, recommendCollection, calculateEstimate } from '@/features/quotation/model';
import { money } from '@/config/brand';
import type { Package } from '@/types/models';
export function QuickFinder({
  packages,
  onSelect,
}: {
  packages: Package[];
  onSelect: (collection: Package, hours: number, event: string) => void;
}) {
  const [event, setEvent] = useState(finderEvents[0]),
    [hours, setHours] = useState(3),
    [album, setAlbum] = useState(true),
    [result, setResult] = useState<{
      collection: Package | null;
      event: string;
      hours: number;
    } | null>(null);
  function find() {
    setResult({ collection: recommendCollection(packages, hours, album), event, hours });
  }
  return (
    <section className="quick-finder" id="package-finder" aria-labelledby="finder-title">
      <div className="finder-heading">
        <span className="icon-tile">
          <Sparkles size={22} />
        </span>
        <div>
          <p className="eyebrow">A LITTLE GUIDANCE, A PERFECT FIT</p>
          <h3 id="finder-title">3-Step Quick Package Finder</h3>
          <p>Answer three quick questions. Find a collection that feels right.</p>
        </div>
        <span className="finder-step-count">01 — 02 — 03</span>
      </div>
      <div className="finder-inputs">
        <label className="field">
          <span>
            <b>01</b> Event / shoot type
          </span>
          <select
            value={event}
            onChange={(e) => {
              setEvent(e.target.value);
              setResult(null);
            }}
          >
            {finderEvents.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>
            <b>02</b> Desired duration
          </span>
          <select
            value={hours}
            onChange={(e) => {
              setHours(Number(e.target.value));
              setResult(null);
            }}
          >
            {[2, 3, 4, 5].map((n) => (
              <option value={n} key={n}>
                {n === 5 ? '5+ hours · extended coverage' : `${n} hours of coverage`}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>
            <b>03</b> Want a photo album & frame?
          </span>
          <select
            value={album ? 'yes' : 'no'}
            onChange={(e) => {
              setAlbum(e.target.value === 'yes');
              setResult(null);
            }}
          >
            <option value="yes">Yes · album, frame & suitcase</option>
            <option value="no">No · digital softcopies only</option>
          </select>
        </label>
      </div>
      <div className="finder-result-row">
        <button className="button button-gold" type="button" onClick={find}>
          <Sparkles size={16} />
          Find best package
        </button>
        {result && (
          <div className="finder-result" role="status">
            {result.collection ? (
              <>
                <CheckCircle2 size={18} />
                <div>
                  <span>Recommended for your story</span>
                  <strong>
                    {result.collection.title}
                    <small>
                      {money(calculateEstimate(result.collection, result.hours).total)} for{' '}
                      {result.hours} hours
                    </small>
                  </strong>
                </div>
                <button
                  type="button"
                  className="text-link gold"
                  onClick={() => onSelect(result.collection!, result.hours, result.event)}
                >
                  Use this collection
                  <ArrowUpRight size={16} />
                </button>
              </>
            ) : (
              <p>No matching active collection. Contact Kannan to tailor your session.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
