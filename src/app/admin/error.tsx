"use client";

import { useEffect } from "react";

export default function AdminError({
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
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Admin error</p>
        <h1 className="mt-3 font-heading text-3xl font-bold text-foreground">The dashboard needs a retry</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We could not finish loading this admin screen. Retry the request and we will reconnect the workspace.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Retry dashboard
        </button>
      </div>
    </main>
  );
}
