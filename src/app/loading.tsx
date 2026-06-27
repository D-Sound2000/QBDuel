export default function Loading() {
  return (
    <main className="broadsheet">
      <div className="container route-skeleton" aria-label="Loading page">
        <div className="skeleton-line short" />
        <div className="skeleton-line title" />
        <div className="skeleton-grid">
          <div className="skeleton-panel" />
          <div className="skeleton-panel" />
          <div className="skeleton-panel" />
        </div>
      </div>
    </main>
  );
}
