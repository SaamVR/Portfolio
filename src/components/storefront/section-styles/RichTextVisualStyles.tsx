import type { CSSProperties, ReactNode } from "react";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import type { StorySectionStyle } from "./lane-c-style-keys";
import { cn } from "@/lib/utils";
import type { StorefrontVariantOptions } from "@/lib/cms/storefront-platform/variants/variant-option-contract";
import { resolveSectionOptionClasses } from "./section-option-primitives";

interface RichTextVisualStylesProps {
  variant: StorySectionStyle;
  eyebrow?: string;
  title: string;
  body: ReactNode;
  imageUrl?: string;
  imageAlt?: string;
  objectPosition?: CSSProperties["objectPosition"];
  variantOptions?: StorefrontVariantOptions;
}

export function RichTextVisualStyles({
  variant,
  eyebrow,
  title,
  body,
  imageUrl,
  imageAlt,
  objectPosition,
  variantOptions,
}: RichTextVisualStylesProps) {
  const options = resolveSectionOptionClasses(variantOptions);
  if (variant === "split-brand-story") {
    return (
      <section className={cn("border-y border-border bg-background py-10 md:py-16", options.spacingClassName)} data-section-renderer="rich-text/split-brand-story">
        <div className={cn("container mx-auto grid gap-7 px-4 md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-12 lg:gap-16", options.contentWidthClassName, options.mobile.isCompact && "gap-5 md:gap-8")}>
          <div className={cn("relative aspect-[4/5] overflow-hidden bg-muted md:aspect-[5/6]", options.mobile.isCompact && "aspect-[16/10] md:aspect-[5/6]")}>
            {imageUrl ? (
              <SafeStorefrontImage src={imageUrl} fill sizes="(max-width: 768px) 100vw, 52vw" alt={imageAlt || title} className={cn("object-cover", options.mediaFitClassName)} style={{ objectPosition }} />
            ) : (
              <div className="flex h-full items-center justify-center bg-secondary text-sm text-muted-foreground">Brand image</div>
            )}
          </div>
          <div className={cn("max-w-2xl", options.alignment.textClassName, options.alignment.marginClassName)}>
            {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">{eyebrow}</p> : null}
            <h2 className={cn("mt-3 max-w-[12ch] font-heading text-4xl font-semibold leading-[0.98] tracking-tight text-foreground md:text-6xl", options.emphasis.titleClassName, options.alignment.marginClassName)}>{title}</h2>
            <div className="mt-6 space-y-4">{body}</div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "editorial-quote") {
    return (
      <section className={cn("bg-secondary/20 py-12 md:py-20", options.spacingClassName)} data-section-renderer="rich-text/editorial-quote">
        <div className={cn("container mx-auto px-4", options.contentWidthClassName)}>
          <div className="mx-auto max-w-5xl border-y border-border py-10 md:py-16">
            <div className="grid gap-6 md:grid-cols-[0.28fr_0.72fr] md:gap-10">
              <div>
                <span aria-hidden="true" className="font-heading text-7xl leading-none text-primary/35 md:text-8xl">“</span>
                {eyebrow ? <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">{eyebrow}</p> : null}
              </div>
              <div className={cn(options.alignment.textClassName)}>
                <h2 className={cn("max-w-[18ch] font-heading text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl", options.emphasis.titleClassName, options.alignment.marginClassName)}>{title}</h2>
                <div className="mt-6 max-w-3xl space-y-4">{body}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("bg-background py-12 md:py-20", options.spacingClassName)} data-section-renderer="rich-text/minimal-story">
      <div className={cn("container mx-auto px-4", options.contentWidthClassName)}>
        <div className={cn("mx-auto max-w-3xl border-l border-primary/40 pl-5 sm:pl-8", options.alignment.textClassName, options.alignment.marginClassName)}>
          {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">{eyebrow}</p> : null}
          <h2 className={cn("mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground md:text-5xl", options.emphasis.titleClassName)}>{title}</h2>
          <div className="mt-5 space-y-4">{body}</div>
        </div>
      </div>
    </section>
  );
}
