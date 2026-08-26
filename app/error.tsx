"use client";

import Link from "next/link";

export default function Error({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- error is required by Next.js error boundary but intentionally not displayed to avoid leaking internals
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">MX Alias</Link>
      </header>
      <main className="dashboard error-page">
        <section className="error-panel">
          <h1>Something went wrong</h1>
          <p>The dashboard could not load. Please try again.</p>
          <button className="primary-button" type="button" onClick={reset}>Try again</button>
          <Link className="secondary-button" href="/">Return to dashboard</Link>
        </section>
      </main>
    </>
  );
}
