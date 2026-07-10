"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body className="bg-background text-foreground">
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Something went wrong</p>
            <h1 className="mt-3 font-heading text-3xl font-bold">We hit an unexpected error</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Please try again. If this keeps happening, refresh the page or head back to the previous screen.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={reset}
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.assign("/")}
                className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-foreground"
              >
                Go home
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
