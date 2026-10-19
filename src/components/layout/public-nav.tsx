'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowUpRight, LockKeyhole, Phone } from 'lucide-react';
import { Brand } from './brand';
import { whatsappLink } from '@/config/brand';

export function PublicNav() {
  const [open, setOpen] = useState(false);

  const handleNavClick = (e: React.MouseEvent, targetId?: string) => {
    // If we're already on the homepage and have a hash target, smooth-scroll directly
    if (targetId && typeof window !== 'undefined' && window.location.pathname === '/') {
      const el = document.getElementById(targetId);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', `/#${targetId}`);
      }
    }
    // Close the mobile menu with a slight delay for touch event reliability
    setTimeout(() => setOpen(false), 120);
  };

  return (
    <header className="public-header">
      <div className="container nav-inner">
        <Brand />
        <nav
          id="mobile-links"
          aria-label="Main navigation"
          className={open ? 'main-nav open' : 'main-nav'}
        >
          <Link href="/#portfolio" onClick={(e) => handleNavClick(e, 'portfolio')}>
            Our work
          </Link>
          <Link href="/samples" onClick={(e) => handleNavClick(e)}>
            Sample albums
          </Link>
          <Link href="/#packages" onClick={(e) => handleNavClick(e, 'packages')}>
            Collections
          </Link>
          <Link href="/#coverage-calculator" onClick={(e) => handleNavClick(e, 'coverage-calculator')}>
            Price calculator
          </Link>
          <Link href="/#about" onClick={(e) => handleNavClick(e, 'about')}>
            About
          </Link>
          <Link href="/#contact" onClick={(e) => handleNavClick(e, 'contact')}>
            Contact
          </Link>
          <Link href="/login" className="nav-gallery" onClick={(e) => handleNavClick(e)}>
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
