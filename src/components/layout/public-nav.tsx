'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowUpRight, LockKeyhole, Phone } from 'lucide-react';
import { Brand } from './brand';
import { whatsappLink } from '@/config/brand';
export function PublicNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="public-header">
      <div className="container nav-inner">
        <Brand />
        <nav
          id="mobile-links"
          aria-label="Main navigation"
          className={open ? 'main-nav open' : 'main-nav'}
        >
          <a href="#portfolio" onClick={() => setOpen(false)}>
            Our work
          </a>
          <a href="#packages" onClick={() => setOpen(false)}>
            Collections
          </a>
          <a href="#coverage-calculator" onClick={() => setOpen(false)}>
            Price calculator
          </a>
          <a href="#about" onClick={() => setOpen(false)}>
            About
          </a>
          <a href="#contact" onClick={() => setOpen(false)}>
            Contact
          </a>
          <Link href="/login" className="nav-gallery">
            <LockKeyhole size={14} />
            Client gallery
          </Link>
        </nav>
        <a
          className="icon-button nav-phone"
          href="tel:+601175982687"
          aria-label="Call KT Photography"
        >
          <Phone size={15} />
        </a>
        <a
          className="button button-outline nav-enquire"
          href={whatsappLink()}
          target="_blank"
          rel="noreferrer"
        >
          Let’s talk <ArrowUpRight size={16} />
        </a>
        <button
          className="icon-button mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-links"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
