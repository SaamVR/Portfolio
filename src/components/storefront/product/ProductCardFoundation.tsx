"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";

export type CardAspect = "4/5" | "1/1" | "4/3";
export type CardFit = "cover" | "contain";

interface ProductCardShellProps {
  children: ReactNode;
  className?: string;
}

export function ProductCardShell({ children, className }: ProductCardShellProps) {
  return (
    <article
      className={cn(
        "group relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[var(--sf-card-radius,var(--storefront-template-radius,1.5rem))] border border-border bg-card shadow-[var(--sf-card-shadow)] transition-[transform,box-shadow,border-color] duration-300 motion-safe:hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[var(--sf-card-shadow-hover)] focus-within:border-primary/45 focus-within:shadow-[var(--sf-card-shadow-hover)] motion-reduce:transition-none dark:border-white/15",
        className,
      )}
    >
      {children}
    </article>
  );
}

interface ProductCardMediaProps {
  src: string;
  fallbackSrc?: string | null;
  alt: string;
  href: string;
  aspect?: CardAspect;
  fit?: CardFit;
  children?: ReactNode;
  className?: string;
}

const aspectClasses: Record<CardAspect, string> = {
  "4/5": "aspect-[4/5]",
  "1/1": "aspect-square",
  "4/3": "aspect-[4/3]",
};

export function ProductCardMedia({
  src,
  fallbackSrc,
  alt,
  href,
  aspect = "1/1",
  fit = "cover",
  children,
  className,
}: ProductCardMediaProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn("relative w-full shrink-0 overflow-hidden bg-muted", aspectClasses[aspect], className)}>
      <Link href={href} className="relative block h-full w-full focus-visible:z-30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-ring" aria-label={`View ${alt}`}>
        {!loaded ? <div className="absolute inset-0 bg-muted/80 motion-safe:animate-pulse" aria-hidden="true" /> : null}
        <SafeStorefrontImage
          src={src}
          fallbackSrc={fallbackSrc}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
          alt={alt}
          onLoad={() => setLoaded(true)}
          className={cn(
            "h-full w-full transition-[transform,opacity] duration-500 motion-safe:group-hover:scale-[1.025] motion-reduce:transition-none",
            fit === "contain" ? "object-contain p-4" : "object-cover",
            loaded ? "opacity-100" : "opacity-0",
          )}
          style={{ objectPosition: "var(--storefront-product-image-position, 50% 50%)" }}
        />
      </Link>
      {children}
    </div>
  );
}

interface ProductCardBadgeLayerProps {
  badge?: string | null;
  badgeClassName?: string;
  isInWishlist?: boolean;
  onToggleWishlist?: () => void;
  wishlistLabel?: string;
}

export function ProductCardBadgeLayer({
  badge,
  badgeClassName,
  isInWishlist,
  onToggleWishlist,
  wishlistLabel = "wishlist",
}: ProductCardBadgeLayerProps) {
  return (
    <>
      {badge ? (
        <span
          className={cn(
            "absolute left-3 top-3 z-10 rounded-full border border-border bg-background/95 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground shadow-sm backdrop-blur",
            badgeClassName,
          )}
        >
          {badge}
        </span>
      ) : null}
      {onToggleWishlist ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleWishlist();
          }}
          className={cn(
            "absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-sm backdrop-blur transition-[background-color,border-color,color,transform] duration-200 motion-safe:hover:scale-105 hover:border-primary/40 hover:bg-background motion-reduce:transition-none dark:bg-card/95",
            isInWishlist && "border-primary/40 bg-primary/10 text-primary",
          )}
          aria-pressed={Boolean(isInWishlist)}
          aria-label={isInWishlist ? `Remove ${wishlistLabel} from wishlist` : `Add ${wishlistLabel} to wishlist`}
        >
          <Heart className={cn("h-4 w-4", isInWishlist && "fill-current")} aria-hidden="true" />
        </button>
      ) : null}
    </>
  );
}

interface ProductCardContentProps {
  children: ReactNode;
  className?: string;
}

export function ProductCardContent({ children, className }: ProductCardContentProps) {
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col space-y-2.5 p-4 sm:p-5", className)}>
      {children}
    </div>
  );
}

interface ProductCardTitleProps {
  children: ReactNode;
  href?: string;
  className?: string;
}

export function ProductCardTitle({ children, href, className }: ProductCardTitleProps) {
  const content = (
    <h3
      className={cn(
        "line-clamp-2 min-h-11 break-words text-[1.02rem] font-semibold leading-[1.35rem] text-foreground [overflow-wrap:anywhere]",
        className,
      )}
    >
      {children}
    </h3>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block min-h-11 rounded-md transition-colors duration-200 hover:text-primary motion-reduce:transition-none"
      >
        {content}
      </Link>
    );
  }

  return content;
}

interface ProductCardActionsProps {
  children: ReactNode;
  className?: string;
}

export function ProductCardActions({ children, className }: ProductCardActionsProps) {
  return (
    <div className={cn("mt-auto w-full shrink-0 border-t border-border pt-3", className)}>
      {children}
    </div>
  );
}
