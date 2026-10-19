'use client';
import { useEffect } from 'react';

/**
 * Scrolls to the element matching the URL hash fragment when the page loads.
 * Handles cross-page navigation (e.g. /samples → /#portfolio) where Next.js
 * App Router doesn't auto-scroll to hash targets after client-side nav.
 */
export function HashScroller() {
  useEffect(() => {
    const hash = window.location.hash?.replace('#', '');
    if (!hash) return;

    // Give time for the DOM to hydrate
    const timer = setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
