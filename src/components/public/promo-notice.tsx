'use client';
import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
export function PromoNotice() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="promo-notice">
      <div className="container">
        <p>
          <Sparkles size={12} />
          Special promotional package rates available <span>— limited slots</span>
        </p>
        <a href="#package-finder">Find your collection ↗</a>
        <button
          type="button"
          aria-label="Dismiss promotional notice"
          onClick={() => setVisible(false)}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
