import Link from 'next/link';
export default function NotFound() {
  return (
    <main id="main" className="error-page">
      <span className="eyebrow">404 · OUT OF FRAME</span>
      <h1>Nothing here to capture.</h1>
      <p>This page may have moved, or this gallery is not available to your account.</p>
      <Link className="button button-gold" href="/">
        Back to the website
      </Link>
    </main>
  );
}
