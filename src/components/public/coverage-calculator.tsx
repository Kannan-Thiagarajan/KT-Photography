'use client';
import { useState, type FormEvent } from 'react';
import {
  Clock3,
  Camera,
  UserPlus,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  Check,
  Minus,
  Plus,
  Info,
} from 'lucide-react';
import { money } from '@/config/brand';
import {
  calculateEstimate,
  photographyServices,
  promotionalTerms,
  type SecondPhotographer,
  type Quotation,
} from '@/features/quotation/model';
import { QuotationDialog } from './quotation-dialog';
import type { Package } from '@/types/models';
export function CoverageCalculator({
  collection,
  hours,
  onHours,
  service,
  onService,
}: {
  collection: Package;
  hours: number;
  onHours: (hours: number) => void;
  service: string;
  onService: (service: string) => void;
}) {
  const [second, setSecond] = useState<SecondPhotographer>('none'),
    [secondHours, setSecondHours] = useState(2),
    [error, setError] = useState(''),
    [quote, setQuote] = useState<Quotation | null>(null);
  const estimate = calculateEstimate(collection, hours, second, secondHours),
    minimum = collection.slug === 'signature' ? collection.included_hours : 1,
    maximum = Math.max(10, collection.included_hours);
  function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim(),
      phone = String(form.get('phone') || '').trim();
    if (!name || !phone) {
      setError('Please enter your full name and phone number to generate an estimate.');
      return;
    }
    if (!/^[+\d\s().-]{7,25}$/.test(phone)) {
      setError('Please enter a valid phone number, including your country code.');
      return;
    }
    if (form.get('terms') !== 'on') {
      setError('Please acknowledge the promotional pricing terms before generating an estimate.');
      return;
    }
    setError('');
    setQuote({
      id: `KT-QUO-${Array.from(crypto.getRandomValues(new Uint8Array(4)), (n) =>
        n.toString(16).padStart(2, '0'),
      )
        .join('')
        .toUpperCase()}`,
      issuedAt: new Date().toISOString(),
      collection: { ...collection, features: [...collection.features] },
      estimate: { ...estimate },
      client: {
        name,
        phone,
        service,
        date: String(form.get('date') || ''),
        venue: String(form.get('venue') || '').trim(),
        notes: String(form.get('notes') || '').trim(),
      },
    });
  }
  return (
    <section
      className="estimate-workspace"
      id="coverage-calculator"
      aria-labelledby="calculator-title"
    >
      <div className="estimate-controls">
        <div className="calculator-heading">
          <p className="eyebrow">YOUR COLLECTION, YOUR WAY</p>
          <h3 id="calculator-title">Customize coverage & add-ons</h3>
          <span className="selected-collection">
            <Check size={13} />
            Selected: {collection.title}
          </span>
        </div>
        <div className="coverage-control">
          <div>
            <label htmlFor="coverage-hours">
              <Clock3 size={16} />
              Total coverage duration
            </label>
            <div className="hours-stepper">
              <button
                type="button"
                aria-label="Decrease coverage hours"
                disabled={hours <= minimum}
                onClick={() => onHours(hours - 1)}
              >
                <Minus size={14} />
              </button>
              <output htmlFor="coverage-hours">{estimate.hours} hours</output>
              <button
                type="button"
                aria-label="Increase coverage hours"
                disabled={hours >= maximum}
                onClick={() => onHours(hours + 1)}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          <input
            id="coverage-hours"
            aria-label="Total coverage duration"
            type="range"
            min={minimum}
            max={maximum}
            step={1}
            value={estimate.hours}
            onChange={(e) => onHours(Number(e.target.value))}
          />
          <div className="range-labels">
            <span>
              {minimum} hour{minimum > 1 ? 's' : ''}
              {collection.slug === 'signature' ? ' minimum' : ''}
            </span>
            <span>{Math.ceil(maximum / 2)} hours</span>
            <span>{maximum} hours</span>
          </div>
          <p>
            {estimate.extraHours > 0
              ? `${estimate.extraHours} additional hour${estimate.extraHours === 1 ? '' : 's'} × RM100 = ${money(estimate.extraCost)}`
              : `${collection.included_hours} hours are included in this collection. The base price remains the same for shorter coverage.`}
          </p>
        </div>
        <div className="second-photographer">
          <div className="control-label">
            <UserPlus size={17} />
            <h4>Second photographer</h4>
            <span>Optional</span>
          </div>
          <div
            className="photographer-options"
            role="group"
            aria-label="Second photographer option"
          >
            {[
              {
                id: 'none' as const,
                title: 'One photographer',
                price: 'Included',
                hint: 'Keep it simple',
                icon: Camera,
              },
              {
                id: 'flat4' as const,
                title: 'Up to 4 hours',
                price: 'RM499 flat rate',
                hint: 'Save RM297 vs 4 hourly hours',
                icon: UserPlus,
              },
              {
                id: 'hourly' as const,
                title: 'Hourly add-on',
                price: 'RM199 / hour',
                hint: 'Choose your coverage',
                icon: Clock3,
              },
            ].map(({ id, title, price, hint, icon: Icon }) => (
              <button
                type="button"
                key={id}
                aria-pressed={second === id}
                onClick={() => setSecond(id)}
                className={second === id ? 'active' : ''}
              >
                <Icon size={18} strokeWidth={1.4} />
                <strong>{title}</strong>
                <span>{price}</span>
                <small>{hint}</small>
                {second === id && <Check className="option-check" size={13} />}
              </button>
            ))}
          </div>
          {second === 'hourly' && (
            <div className="second-hours">
              <label htmlFor="second-hours">
                Second photographer duration
                <output htmlFor="second-hours">
                  {secondHours} hour{secondHours === 1 ? '' : 's'} · {money(estimate.secondCost)}
                </output>
              </label>
              <input
                id="second-hours"
                type="range"
                min={1}
                max={6}
                step={1}
                value={secondHours}
                onChange={(e) => setSecondHours(Number(e.target.value))}
              />
              <div className="range-labels">
                <span>1 hour</span>
                <span>6 hours</span>
              </div>
              {secondHours === 4 && (
                <p className="savings-note">
                  <Info size={14} />
                  Four hourly hours cost RM796. Choose the RM499 flat option to save RM297.
                  <button type="button" onClick={() => setSecond('flat4')}>
                    Apply flat rate
                    <ArrowUpRight size={13} />
                  </button>
                </p>
              )}
            </div>
          )}
          {second === 'flat4' && (
            <p className="photographer-note">
              The second photographer covers up to 4 hours. Your main photographer covers your
              selected {estimate.hours} hours.
            </p>
          )}
        </div>
        <div className="quotation-form-wrap" id="quotation-details">
          <div className="calculator-heading">
            <p className="eyebrow">LET’S MAKE IT PERSONAL</p>
            <h3>Client details & booking information</h3>
            <p>Add your event details to create a printable quotation estimate.</p>
          </div>
          <form className="quotation-form" onSubmit={generate}>
            <div className="form-grid">
              <label className="field">
                <span>Full name *</span>
                <input
                  name="name"
                  type="text"
                  required
                  maxLength={150}
                  autoComplete="name"
                  placeholder="Your full name"
                />
              </label>
              <label className="field">
                <span>Phone number *</span>
                <input
                  name="phone"
                  type="tel"
                  required
                  maxLength={25}
                  autoComplete="tel"
                  placeholder="e.g. +60123456789"
                />
              </label>
              <label className="field">
                <span>Photography service type</span>
                <select name="service" value={service} onChange={(e) => onService(e.target.value)}>
                  {[
                    ...photographyServices,
                    ...(!photographyServices.includes(service) ? [service] : []),
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Event date</span>
                <input name="date" type="date" />
              </label>
            </div>
            <label className="field">
              <span>Event location / venue</span>
              <input
                name="venue"
                type="text"
                maxLength={250}
                placeholder="e.g. Temple / Hotel Ballroom / Kuala Lumpur"
              />
            </label>
            <label className="field">
              <span>Special requests / notes</span>
              <textarea
                name="notes"
                maxLength={2000}
                rows={3}
                placeholder="Tell us about your celebration, timeline or the little details."
              />
            </label>
            <details className="estimate-terms">
              <summary>
                Promotional pricing & confirmation details
                <Plus size={15} />
              </summary>
              <ul>
                {promotionalTerms.map((t) => (
                  <li key={t.title}>
                    <strong>{t.title}</strong>
                    <p>{t.text}</p>
                  </li>
                ))}
              </ul>
            </details>
            <label className="checkbox-field quote-acknowledgement">
              <input name="terms" type="checkbox" />I acknowledge that pricing estimates are based
              on current promotional rates and require final confirmation.
            </label>
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <div className="quotation-submit-row">
              <button className="button button-gold" type="submit">
                <FileText size={17} />
                Generate official quotation
                <ArrowUpRight size={17} />
              </button>
              <p>
                <ShieldCheck size={14} />
                Your details stay in this page until you choose to share them.
              </p>
            </div>
          </form>
        </div>
      </div>
      <aside className="live-estimate" aria-label="Live quotation estimate">
        <p className="eyebrow">A CLEAR PICTURE OF YOUR INVESTMENT</p>
        <h3>Your estimate.</h3>
        <p className="estimate-collection-name">
          {collection.title}
          <span>{collection.description}</span>
        </p>
        <div className="estimate-line">
          <span>
            Base collection<small>{collection.included_hours} hours included</small>
          </span>
          <strong>{money(estimate.basePrice)}</strong>
        </div>
        <div className="estimate-line">
          <span>
            Additional coverage
            <small>
              {estimate.extraHours
                ? `${estimate.extraHours} hours × RM100`
                : 'Within included coverage'}
            </small>
          </span>
          <strong>{estimate.extraHours ? money(estimate.extraCost) : '—'}</strong>
        </div>
        <div className="estimate-line">
          <span>
            Second photographer
            <small>
              {second === 'none'
                ? 'Not added'
                : second === 'flat4'
                  ? 'Up to 4 hours · flat rate'
                  : `${secondHours} hours × RM199`}
            </small>
          </span>
          <strong>{estimate.secondCost ? money(estimate.secondCost) : '—'}</strong>
        </div>
        <div className="estimate-total" aria-live="polite" aria-atomic="true">
          <span>Estimated total</span>
          <strong data-testid="estimate-total">{money(estimate.total)}</strong>
          <small>For {estimate.hours} hours of photography</small>
        </div>
        <a href="#quotation-details" className="button button-outline">
          <FileText size={15} />
          Create my quotation
          <ArrowUpRight size={15} />
        </a>
        <div className="estimate-inclusions">
          <span>YOUR COLLECTION INCLUDES</span>
          <ul>
            {collection.features.map((f) => (
              <li key={f}>
                <Check size={13} />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="estimate-validity">
          Promotional estimate, subject to availability. Confirm your date and final quote directly
          with Kannan.
        </p>
      </aside>
      {quote && <QuotationDialog quote={quote} onClose={() => setQuote(null)} />}
    </section>
  );
}
