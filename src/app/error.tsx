'use client';
import { AlertCircle } from 'lucide-react';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="error-page">
      <AlertCircle size={40} />
      <h1>Something went wrong.</h1>
      <p>Please try again. If the problem continues, contact Kannan.</p>
      <button className="button button-gold" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
