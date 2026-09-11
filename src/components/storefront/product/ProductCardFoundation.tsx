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
        "group relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[24px] border border-border/80 bg-card shadow-[0_14px_34px_-26px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/10",
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
    <div className={cn("relative w-full shrink-0 overflow-hidden bg-muted/30 dark:bg-secondary/40", aspectClasses[aspect], className)}>
      <Link href={href} className="relative block h-full w-full" aria-label={`View ${alt}`}>
        {!loaded ? <div className="absolute inset-0 animate-pulse bg-muted/50" /> : null}
        <SafeStorefrontImage
          src={src}
          fallbackSrc={fallbackSrc}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
          alt={alt}
          onLoad={() => setLoaded(true)}
          className={cn(
            "h-full w-full transition-transform duration-500 group-hover:scale-[1.03]",
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
            "absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-sm backdrop-blur",
            badgeClassName || "bg-background/90 text-foreground dark:bg-card/90",
          )}
        >
          {badge}
        </span>
      ) : null}
      {onToggleWishlist ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleWishlist();
          }}
          className={cn(
            "absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground dark:bg-card/90 sm:h-8 sm:w-8",
            isInWishlist && "border-primary/30 text-primary",
          )}
          aria-label={isInWishlist ? `Remove ${wishlistLabel} from wishlist` : `Add ${wishlistLabel} to wishlist`}
        >
          <Heart className={cn("h-4 w-4", isInWishlist && "fill-current")} />
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
    <div className={cn("flex flex-1 flex-col min-w-0 p-4 space-y-2.5", className)}>
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
        "line-clamp-2 h-[2.75rem] min-h-[2.75rem] text-[1.02rem] font-semibold leading-5 text-foreground break-words [overflow-wrap:anywhere]",
        className,
      )}
    >
      {children}
    </h3>
  );

  if (href) {
    return (
      <Link href={href} className="block group-hover:text-primary transition-colors">
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
    <div className={cn("mt-auto w-full shrink-0 pt-2", className)}>
      {children}
    </div>
  );
}
