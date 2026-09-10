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
    <section className="py-12 md:py-20" aria-busy="true" aria-live="polite" aria-label={title}>
      <div className="container mx-auto px-4">
        <div className="mb-8 space-y-3" aria-hidden="true">
          <div className="h-3 w-24 rounded-full bg-muted motion-safe:animate-pulse" />
          <div className="h-8 w-64 max-w-full rounded-lg bg-muted motion-safe:animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 md:grid-cols-3 md:gap-5" aria-hidden="true">
          {Array.from({ length: Math.max(1, cards) }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-[var(--sf-card-radius)] border border-border bg-card shadow-sm">
              <div className="aspect-[4/3] bg-muted/80 motion-safe:animate-pulse" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-4/5 rounded bg-muted motion-safe:animate-pulse" />
                <div className="h-3 w-3/5 rounded bg-muted/80 motion-safe:animate-pulse" />
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
        <div className="mx-auto max-w-3xl rounded-[var(--sf-card-radius)] border border-border bg-card px-6 py-10 text-center shadow-sm md:px-10 md:py-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Inbox className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">{description}</p>
          {(primaryLabel && primaryHref) || (secondaryLabel && secondaryHref) ? (
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              {primaryLabel && primaryHref ? (
                <Button asChild size="lg" className="min-h-11 rounded-xl">
                  <Link href={primaryHref}>
                    {primaryLabel}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              ) : null}
              {secondaryLabel && secondaryHref ? (
                <Button asChild variant="outline" size="lg" className="min-h-11 rounded-xl">
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
    <section className="py-10 md:py-14" role="alert">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl rounded-[var(--sf-card-radius)] border border-border bg-card px-6 py-8 text-center shadow-sm md:px-8">
          <h2 className="font-heading text-xl font-semibold text-foreground">{title}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
          {onRetry ? (
            <Button type="button" variant="outline" size="lg" className="mt-5 min-h-11 rounded-xl" onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
