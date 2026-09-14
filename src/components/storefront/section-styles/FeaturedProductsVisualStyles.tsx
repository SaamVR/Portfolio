"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import AnimatedSection from "@/components/AnimatedSection";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/data/products";
import { cn } from "@/lib/utils";
import type { FeaturedProductSectionStyle } from "./lane-c-style-keys";
import type { StorefrontVariantOptions } from "@/lib/cms/storefront-platform/variants/variant-option-contract";
import { resolveSectionOptionClasses } from "./section-option-primitives";

interface FeaturedProductsVisualStylesProps {
  variant: FeaturedProductSectionStyle;
  products: Product[];
  title: string;
  tagline: string;
  viewAllHref: string;
  containerClass: string;
  sectionStyle?: CSSProperties;
  variantOptions?: StorefrontVariantOptions;
}

function ProductTile({ product, index, className }: { product: Product; index: number; className?: string }) {
  return (
    <AnimatedSection className={cn("min-w-0", className)} delay={Math.min(index, 4) * 70} animation="blur">
      <ProductCard product={product} />
    </AnimatedSection>
  );
}
function ShopAllLink({ href, label = "Shop all" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary">
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function Heading({ tagline, title, href, compact = false, titleClassName }: { tagline: string; title: string; href: string; compact?: boolean; titleClassName?: string }) {
  return (
    <div className="flex items-end justify-between gap-5">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{tagline}</p>
        <h2 className={cn("mt-2 font-heading font-semibold tracking-tight text-foreground", compact ? "text-2xl md:text-3xl" : "text-3xl sm:text-4xl md:text-5xl", titleClassName)}>{title}</h2>
      </div>
      <ShopAllLink href={href} />
    </div>
  );
}

export function FeaturedProductsVisualStyles({
  variant, products, title, tagline, viewAllHref, containerClass, sectionStyle, variantOptions,
}: FeaturedProductsVisualStylesProps) {
  const options = resolveSectionOptionClasses(variantOptions);
  if (variant === "carousel") {
    return (
      <section className={cn("overflow-hidden bg-background py-12 md:py-18", options.spacingClassName)} style={sectionStyle} data-section-renderer="featured-products/carousel">
        <div className={cn("mx-auto px-4", containerClass, options.contentWidthClassName)}>
          <Heading tagline={tagline} title={title} href={viewAllHref} compact titleClassName={options.emphasis.titleClassName} />
        </div>
        <div className="mt-7 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4 md:px-6">
          {products.map((product, index) => (
            <ProductTile key={product.id} product={product} index={index}
              className={cn("w-[72vw] max-w-[300px] shrink-0 snap-start sm:w-[42vw] md:w-[31vw] lg:w-[23vw] lg:max-w-[320px]", options.mobile.isCompact && "w-[58vw] max-w-[250px] sm:w-[34vw]")} />
          ))}
        </div>
      </section>
    );
  }

  if (variant === "editorial-grid") {
    return (
      <section className={cn("border-y border-border/70 bg-background py-12 md:py-20", options.spacingClassName)} style={sectionStyle} data-section-renderer="featured-products/editorial-grid">
        <div className={cn("mx-auto px-4", containerClass, options.contentWidthClassName)}>
          <div className="grid gap-5 border-b border-border pb-7 md:grid-cols-[0.38fr_0.62fr] md:items-end md:gap-10 md:pb-10">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">{tagline}</p>
              <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">A curated edit with one lead product and a supporting collection.</p>
            </div>
            <div className="flex items-end justify-between gap-6">
              <h2 className={cn("max-w-[12ch] font-heading text-4xl font-semibold leading-[0.95] tracking-tight text-foreground sm:text-5xl md:text-6xl", options.emphasis.titleClassName)}>{title}</h2>
              <div className="hidden sm:block"><ShopAllLink href={viewAllHref} label="View collection" /></div>
            </div>
          </div>
          <div className={cn("mt-5 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-12 lg:gap-4 [&_article]:rounded-none", options.mobile.isStack && "grid-cols-1 sm:grid-cols-1 lg:grid-cols-12")}>
            {products.map((product, index) => (
              <ProductTile key={product.id} product={product} index={index}
                className={cn(index === 0 ? "col-span-2 lg:col-span-7 lg:row-span-2" : "col-span-1 lg:col-span-5", index > 2 && "lg:col-span-4", options.mobile.isStack && "col-span-1") } />
            ))}
          </div>
          <div className="mt-5 sm:hidden"><ShopAllLink href={viewAllHref} label="View collection" /></div>
        </div>
      </section>
    );
  }

  if (variant === "center-focus-rail") {
    return (
      <section className={cn("overflow-hidden bg-secondary/20 py-12 md:py-20", options.spacingClassName)} style={sectionStyle} data-section-renderer="featured-products/center-focus-rail">
        <div className={cn("mx-auto px-4 text-center", containerClass, options.contentWidthClassName)}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{tagline}</p>
          <h2 className={cn("mx-auto mt-2 max-w-[14ch] font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl", options.emphasis.titleClassName)}>{title}</h2>
        </div>
        <div className="mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[12vw] pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 md:mt-10 md:px-[8vw] lg:px-[14vw]">
          {products.map((product, index) => (
            <ProductTile key={product.id} product={product} index={index}
              className={cn("w-[76vw] max-w-[340px] shrink-0 snap-center sm:w-[44vw] lg:w-[30vw] lg:max-w-[390px] [&_article]:shadow-lg", options.mobile.isCompact && "w-[62vw] max-w-[290px] sm:w-[36vw]")} />
          ))}
        </div>
        <div className="mt-3 flex justify-center"><ShopAllLink href={viewAllHref} label="Browse the full edit" /></div>
      </section>
    );
  }

  if (variant === "compact-commerce-grid") {
    return (
      <section className="py-10 md:py-14" style={sectionStyle} data-section-renderer="featured-products/compact-commerce-grid">
        <div className={cn("mx-auto px-4", containerClass)}>
          <Heading tagline={tagline} title={title} href={viewAllHref} compact />
          <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 [&_article]:rounded-xl [&_article]:shadow-none">
            {products.map((product, index) => <ProductTile key={product.id} product={product} index={index} />)}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "product-spotlight") {
    return (
      <section className="bg-background py-12 md:py-20" style={sectionStyle} data-section-renderer="featured-products/product-spotlight">
        <div className={cn("mx-auto px-4", containerClass)}>
          <Heading tagline={tagline} title={title} href={viewAllHref} />
          <div className="mt-7 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:grid-rows-2 lg:gap-4 [&_article]:h-full">
            {products.map((product, index) => (
              <ProductTile key={product.id} product={product} index={index}
                className={cn(index === 0 && "col-span-2 row-span-2 lg:col-span-2")} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "magazine-rail") {
    return (
      <section className="overflow-hidden border-y border-border bg-card py-12 md:py-20" style={sectionStyle} data-section-renderer="featured-products/magazine-rail">
        <div className={cn("mx-auto px-4", containerClass)}>
          <div className="grid gap-6 md:grid-cols-[0.8fr_1.2fr] md:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">{tagline}</p>
              <h2 className="mt-2 font-heading text-4xl font-semibold tracking-tight text-foreground md:text-6xl">{title}</h2>
            </div>
            <div className="flex items-end justify-between gap-5 border-t border-border pt-4 md:justify-end md:border-t-0 md:pt-0">
              <p className="max-w-md text-sm leading-6 text-muted-foreground">A looser editorial rail for collections that should feel browsed, not scanned.</p>
              <ShopAllLink href={viewAllHref} />
            </div>
          </div>
        </div>
        <div className="mt-8 flex gap-3 overflow-x-auto px-4 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 md:mt-10 md:px-[6vw] [&_article]:rounded-none">
          {products.map((product, index) => (
            <ProductTile key={product.id} product={product} index={index}
              className={cn("w-[68vw] max-w-[330px] shrink-0 sm:w-[42vw] lg:w-[25vw]", index % 3 === 1 && "md:pt-10", index % 3 === 2 && "md:pt-4")} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="border-y border-border/70 bg-secondary/10 py-9 md:py-12" style={sectionStyle} data-section-renderer="featured-products/dense-catalog">
      <div className={cn("mx-auto px-4", containerClass)}>
        <Heading tagline={tagline} title={title} href={viewAllHref} compact />
        <div className="mt-5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-5 xl:grid-cols-6 [&_article]:rounded-md [&_article]:shadow-none">
          {products.map((product, index) => <ProductTile key={product.id} product={product} index={index} />)}
        </div>
      </div>
    </section>
  );
}
