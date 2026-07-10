"use client";

import { useEffect } from "react";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Storefront error</p>
        <h1 className="mt-3 font-heading text-3xl font-bold text-foreground">This store page could not load</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Please try again in a moment. If the issue keeps happening, return to the storefront home page.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Retry page
        </button>
      </div>
    </main>
  );
}
