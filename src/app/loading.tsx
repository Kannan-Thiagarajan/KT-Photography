export default function Loading() {
  return (
    <main id="main" className="container loading-page" aria-label="Loading">
      <div className="skeleton skeleton-heading" />
      <div className="skeleton-grid">
        {[1, 2, 3].map((i) => (
          <div className="skeleton skeleton-card" key={i} />
        ))}
      </div>
    </main>
  );
}
