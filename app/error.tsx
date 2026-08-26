"use client";

import Link from "next/link";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">Alias Manager</Link>
      </header>
      <main className="dashboard error-page">
        <section className="error-panel">
          <h1>Something went wrong</h1>
          <p>{error.message || "The dashboard could not load. Please try again."}</p>
          <button className="primary-button" type="button" onClick={reset}>Try again</button>
          <Link className="secondary-button" href="/">Return to dashboard</Link>
        </section>
      </main>
    </>
  );
}
