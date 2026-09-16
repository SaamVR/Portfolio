"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import type { PromoSectionStyle } from "./lane-c-style-keys";
import { cn } from "@/lib/utils";
import type { StorefrontVariantOptions } from "@/lib/cms/storefront-platform/variants/variant-option-contract";
import { resolveSectionOptionClasses } from "./section-option-primitives";

interface PromoBannerVisualStylesProps {
  variant: PromoSectionStyle;
  badgeText?: string;
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  imageUrl?: string;
  imageAlt?: string;
  secondaryImageUrl?: string;
  secondaryImageAlt?: string;
  secondaryTitle?: string;
  secondarySubtitle?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  variantOptions?: StorefrontVariantOptions;
}

function Action({ href, label, inverse = false }: { href?: string; label?: string; inverse?: boolean }) {
  if (!href || !label) return null;
  return (
    <Link href={href} className={inverse ? "inline-flex min-h-11 items-center gap-2 border-b border-background text-sm font-semibold text-background" : "inline-flex min-h-11 items-center gap-2 border-b border-foreground text-sm font-semibold text-foreground"}>
      {label}<ArrowRight className="h-4 w-4" />
    </Link>
  );
}
function PromoTile({ imageUrl, imageAlt, eyebrow, title, subtitle, ctaText, ctaLink }: {
  imageUrl?: string; imageAlt?: string; eyebrow?: string; title: string; subtitle?: string; ctaText?: string; ctaLink?: string;
}) {
  return (
    <article className="relative min-h-[300px] overflow-hidden border border-border bg-foreground text-background md:min-h-[420px]">
      {imageUrl ? <SafeStorefrontImage src={imageUrl} fill sizes="(max-width: 768px) 100vw, 50vw" alt={imageAlt || title} className="object-cover opacity-80" /> : null}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-10 p-6 md:p-8">
        {eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-background/70">{eyebrow}</p> : null}
        <h3 className="mt-2 max-w-[13ch] font-heading text-3xl font-semibold leading-none md:text-4xl">{title}</h3>
        {subtitle ? <p className="mt-3 max-w-xl text-sm leading-6 text-background/70">{subtitle}</p> : null}
        <div className="mt-5"><Action href={ctaLink} label={ctaText} inverse /></div>
      </div>
    </article>
  );
}

export function PromoBannerVisualStyles(props: PromoBannerVisualStylesProps) {
  const { variant, badgeText, title, subtitle, ctaText, ctaLink, imageUrl, imageAlt } = props;
  const options = resolveSectionOptionClasses(props.variantOptions);
  if (variant === "image-campaign-banner" && imageUrl) {
    return (
      <section className={cn("relative min-h-[420px] overflow-hidden bg-foreground text-background md:min-h-[560px]", options.mobile.isCompact && "min-h-[340px] md:min-h-[460px]")} data-section-renderer="promo-banner/image-campaign-banner">
        <SafeStorefrontImage src={imageUrl} fill sizes="100vw" alt={imageAlt || title} className={cn("object-cover opacity-85", options.mediaFitClassName)} />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/45 to-transparent" />
        <div className={cn("container relative z-10 mx-auto flex min-h-[420px] items-end px-4 py-10 md:min-h-[560px] md:items-center md:py-16", options.contentWidthClassName, options.spacingClassName, options.mobile.isCompact && "min-h-[340px] md:min-h-[460px]")}>
          <div className={cn("max-w-2xl", options.alignment.textClassName, options.alignment.marginClassName)}>
            {badgeText ? <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-background/70">{badgeText}</p> : null}
            <h2 className={cn("mt-3 max-w-[11ch] font-heading text-4xl font-semibold leading-[0.94] tracking-tight md:text-6xl", options.emphasis.titleClassName, options.alignment.marginClassName)}>{title}</h2>
            {subtitle ? <p className="mt-4 max-w-xl text-sm leading-7 text-background/75 md:text-base">{subtitle}</p> : null}
            <div className="mt-6"><Action href={ctaLink} label={ctaText} inverse /></div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "dual-promo" && (props.secondaryTitle || props.secondaryImageUrl)) {
    return (
      <section className="bg-background py-8 md:py-12" data-section-renderer="promo-banner/dual-promo">
        <div className="container mx-auto grid gap-3 px-4 md:grid-cols-2 md:gap-4">
          <PromoTile imageUrl={imageUrl} imageAlt={imageAlt} eyebrow={badgeText} title={title} subtitle={subtitle} ctaText={ctaText} ctaLink={ctaLink} />
          <PromoTile
            imageUrl={props.secondaryImageUrl}
            imageAlt={props.secondaryImageAlt}
            eyebrow={badgeText}
            title={props.secondaryTitle || title}
            subtitle={props.secondarySubtitle}
            ctaText={props.secondaryCtaText}
            ctaLink={props.secondaryCtaLink}
          />
        </div>
      </section>
    );
  }
  return (
    <section className={cn("border-y border-border bg-foreground py-12 text-background md:py-16", options.spacingClassName)} data-section-renderer="promo-banner/campaign-cta">
      <div className={cn("container mx-auto grid gap-6 px-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-10", options.contentWidthClassName, options.alignment.textClassName)}>
        <div className={cn("max-w-4xl", options.alignment.marginClassName)}>
          {badgeText ? <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-background/60">{badgeText}</p> : null}
          <h2 className={cn("mt-3 max-w-[14ch] font-heading text-3xl font-semibold leading-[0.98] tracking-tight sm:text-4xl md:text-5xl", options.emphasis.titleClassName, options.alignment.marginClassName)}>{title}</h2>
          {subtitle ? <p className="mt-4 max-w-2xl text-sm leading-7 text-background/70 md:text-base">{subtitle}</p> : null}
        </div>
        <Action href={ctaLink} label={ctaText} inverse />
      </div>
    </section>
  );
}
