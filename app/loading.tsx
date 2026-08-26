export default function Loading() {
  return (
    <>
      <header className="site-header">
        <span className="brand">Alias Manager</span>
        <div className="header-skeleton" aria-hidden="true" />
      </header>
      <main className="dashboard">
        <section className="create-panel" aria-labelledby="create-title">
          <div className="section-heading">
            <p className="kicker">New forwarder</p>
            <h2 id="create-title">Create an alias</h2>
          </div>
          <div className="form-skeleton" aria-hidden="true" />
        </section>
        <section className="list-panel" aria-labelledby="list-title">
          <div className="section-heading">
            <p className="kicker">Current routing</p>
            <h2 id="list-title">Forwarders</h2>
          </div>
          <div className="list-skeleton" aria-hidden="true" />
        </section>
      </main>
      <p className="sr-only" aria-live="polite">Loading aliases...</p>
    </>
  );
}
