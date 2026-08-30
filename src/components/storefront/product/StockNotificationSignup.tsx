"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Mail } from "lucide-react";

export function StockNotificationSignup({
  storeId,
  productId,
  productName,
}: {
  storeId: string;
  productId: string;
  productName: string;
}) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/stock-notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storeId, productId, email, website }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };

      if (!response.ok) {
        const message = response.status === 429
          ? "Too many requests were made recently. Please try again later."
          : response.status === 409
            ? "This product is available again, so a stock alert is no longer needed."
            : payload.error || "We could not save your stock alert. Please try again.";
        setStatus({ tone: "error", message });
        return;
      }

      setEmail("");
      setStatus({ tone: "success", message: "You're on the list. We'll use this email for the back-in-stock alert." });
    } catch {
      setStatus({ tone: "error", message: "We could not save your stock alert. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-8 rounded-3xl border border-border bg-card/60 p-5 md:p-6" aria-label={`Back in stock alert for ${productName}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary"><Mail className="h-4 w-4" /></span>
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">Notify me when it is back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Enter your email and we’ll save one alert for this product.</p>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <label htmlFor="stock-notification-email" className="sr-only">Email address</label>
          <input
            id="stock-notification-email"
            type="email"
            required
            maxLength={255}
            autoComplete="email"
            value={email}
            onChange={(event) => { setEmail(event.target.value); setStatus(null); }}
            placeholder="you@example.com"
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
          />
          <label className="sr-only" aria-hidden="true">
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              className="hidden"
              name="website"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving</> : "Notify me"}
        </button>
      </form>

      {status ? (
        <p role="status" className={`mt-3 text-sm ${status.tone === "success" ? "text-foreground" : "text-destructive"}`}>
          {status.message}
        </p>
      ) : null}
    </section>
  );
}
