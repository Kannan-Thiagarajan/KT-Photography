'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, MessageCircle, Copy, Check, ArrowUpRight } from 'lucide-react';
import { brand, money, whatsappLink } from '@/config/brand';
import {
  eventDate,
  quotationDate,
  quotationText,
  type Quotation,
} from '@/features/quotation/model';
export function QuotationDialog({ quote, onClose }: { quote: Quotation; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null),
    [copyStatus, setCopyStatus] = useState('');
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
    };
  }, []);
  const { collection, estimate: e, client } = quote;
  async function copy() {
    try {
      await navigator.clipboard.writeText(quotationText(quote));
      setCopyStatus('Estimate copied.');
    } catch {
      setCopyStatus('Copy is unavailable. Use Print / Save PDF instead.');
    }
  }
  async function print() {
    await document.fonts.ready;
    await ref.current
      ?.querySelector('img')
      ?.decode()
      .catch(() => {});
    if (ref.current?.open) window.print();
  }
  return createPortal(
    <dialog
      ref={ref}
      className="quote-dialog"
      aria-labelledby="quotation-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="quote-toolbar no-print">
        <div>
          <h2 id="quotation-title">OFFICIAL QUOTATION ESTIMATE</h2>
          <p>KT Photography Digital Booking System</p>
        </div>
        <button className="icon-button" autoFocus onClick={onClose} aria-label="Close quotation">
          <X size={20} />
        </button>
      </div>
      <article className="quotation-sheet">
        <header className="quotation-brand">
          <div>
            <Image
              src="/assets/logos/kt.png"
              alt="KT Photography"
              width={52}
              height={52}
              loading="eager"
            />
            <div>
              <h3>KT PHOTOGRAPHY</h3>
              <p>{brand.tagline}</p>
              <p>{brand.phone}</p>
            </div>
          </div>
          <div className="quote-reference">
            <strong>QUOTATION ESTIMATE</strong>
            <span>{quote.id}</span>
            <span>{quotationDate(quote.issuedAt)}</span>
          </div>
        </header>
        <div className="quote-client">
          <p className="quote-eyebrow">PREPARED FOR</p>
          <h3>{client.name}</h3>
          <div className="quote-detail-grid">
            <p>
              <span>Phone</span>
              {client.phone}
            </p>
            <p>
              <span>Service</span>
              {client.service}
            </p>
            <p>
              <span>Event date</span>
              {eventDate(client.date)}
            </p>
            <p>
              <span>Venue</span>
              {client.venue || 'To be confirmed'}
            </p>
          </div>
          {client.notes && (
            <p className="quote-notes">
              <span>Special requests</span>
              {client.notes}
            </p>
          )}
        </div>
        <div className="quote-collection">
          <p className="quote-eyebrow">YOUR COLLECTION</p>
          <h3>{collection.title}</h3>
          <p>
            {collection.description} · {e.hours} hours of coverage
          </p>
          <ul>
            {collection.features.map((f) => (
              <li key={f}>
                <Check size={13} />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <table className="quote-breakdown">
          <caption>Estimate breakdown</caption>
          <thead>
            <tr>
              <th>Item description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {collection.title}
                <small>{collection.included_hours} hours included · base collection rate</small>
              </td>
              <td>{money(e.basePrice)}</td>
            </tr>
            {e.extraHours > 0 && (
              <tr>
                <td>
                  Additional coverage
                  <small>
                    {e.extraHours} hour{e.extraHours === 1 ? '' : 's'} × RM100/hour
                  </small>
                </td>
                <td>{money(e.extraCost)}</td>
              </tr>
            )}
            {e.secondOption !== 'none' && (
              <tr>
                <td>
                  Second photographer
                  <small>
                    {e.secondOption === 'flat4'
                      ? 'Up to 4 hours · flat package rate'
                      : `${e.secondHours} hours × RM199/hour`}
                  </small>
                </td>
                <td>{money(e.secondCost)}</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="quote-grand-total">
          <div>
            <span>Grand total estimate</span>
            <small>Promotional pricing applied</small>
          </div>
          <strong>{money(e.total)}</strong>
        </div>
        <p className="quote-disclaimer">
          This is an estimate, subject to date availability and final confirmation by KT
          Photography. It does not reserve a slot or confirm a booking. Additional coverage is
          RM100/hour. The flat second-photographer option covers up to 4 hours.
        </p>
        <footer className="quote-sheet-footer">
          Capturing Moments <span>✦</span> Crafting Memories
        </footer>
      </article>
      <div className="quote-actions no-print">
        <button className="button button-outline" onClick={print}>
          <Printer size={16} />
          Print / Save PDF
        </button>
        <button className="button button-outline" onClick={copy}>
          <Copy size={16} />
          Copy estimate
        </button>
        <a
          className="button button-gold"
          href={whatsappLink(quotationText(quote))}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle size={16} />
          Confirm via WhatsApp
          <ArrowUpRight size={15} />
        </a>
      </div>
      {copyStatus && (
        <p className="quote-copy-status no-print" role="status">
          {copyStatus}
        </p>
      )}
    </dialog>,
    document.body,
  );
}
