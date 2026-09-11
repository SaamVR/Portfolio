"use client";

import Link from "next/link";
import { ArrowRight, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StorefrontSectionSkeleton({
  title = "Loading",
  cards = 3,
}: {
  title?: string;
  cards?: number;
}) {
  return (
    <section className="py-12 md:py-20" aria-busy="true" aria-label={title}>
      <div className="container mx-auto px-4">
        <div className="mb-8 space-y-3">
          <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
          <div className="h-8 w-64 max-w-full animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
          {Array.from({ length: Math.max(1, cards) }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="aspect-[4/3] animate-pulse bg-muted/70" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                <div className="h-3 w-3/5 animate-pulse rounded bg-muted/80" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StorefrontSectionEmpty({
  eyebrow = "Nothing here yet",
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-border bg-card/70 px-6 py-10 text-center md:px-10">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Inbox className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <h2 className="mt-2 font-heading text-2xl font-bold text-foreground md:text-3xl">{title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">{description}</p>
          {(primaryLabel && primaryHref) || (secondaryLabel && secondaryHref) ? (
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              {primaryLabel && primaryHref ? (
                <Button asChild>
                  <Link href={primaryHref}>
                    {primaryLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
              {secondaryLabel && secondaryHref ? (
                <Button asChild variant="outline">
                  <Link href={secondaryHref}>{secondaryLabel}</Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function StorefrontSectionError({
  title = "This section could not load",
  description = "Please try again. The rest of the storefront is still available.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <section className="py-10 md:py-14" role="status">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card px-6 py-8 text-center">
          <h2 className="font-heading text-xl font-semibold text-foreground">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          {onRetry ? (
            <Button type="button" variant="outline" className="mt-5" onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
