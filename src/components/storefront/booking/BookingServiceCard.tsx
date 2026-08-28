"use client";

import { ArrowRight, CalendarDays, Clock3, Heart, MapPin, Star, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/data/products";
import { useWishlist } from "@/context/wishlist-context";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useStoreProductPresentation } from "@/components/storefront/product/useStoreProductPresentation";
import { generateCloudinarySrcSet } from "@/lib/cms/cloudinary-responsive";
import { getExplicitFactNumber, getExplicitFactText } from "@/lib/storefront/storefront-fact-truth";
import { isPreviewCatalogStore } from "@/lib/storefront/storefront-product-truth";
import { productUrl } from "@/lib/slug";
import { cn } from "@/lib/utils";

type ReviewStats = {
  count: number;
  average: number;
};

export function BookingServiceCard({
  product,
  reviewStats,
  onBook,
}: {
  product: Product;
  reviewStats?: ReviewStats;
  onBook: (product: Product) => void;
}) {
  const currentStore = useOptionalStore();
  const { isInWishlist, toggleItem } = useWishlist();
  const { specs } = useStoreProductPresentation(product);
  const [imageLoaded, setImageLoaded] = useState(false);
  const previewSpecs = isPreviewCatalogStore(currentStore?.id) ? specs : undefined;
  const duration = getExplicitFactNumber(product, ["duration_minutes", "duration"], previewSpecs);
  const capacity = getExplicitFactText(product, ["capacity", "guest_capacity", "guests", "occupancy", "session_capacity"], previewSpecs);
  const rating = reviewStats?.average ?? null;
  const hasFacts = duration !== null || Boolean(capacity) || rating !== null;

  return (
    <article className="overflow-hidden rounded-[24px] border border-[#e8eee9] bg-white shadow-[0_16px_36px_-30px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card">
      <div className="relative">
        <Link href={productUrl(product.id, product.name, currentStore?.slug)} className="block" aria-label={`View ${product.name}`}>
          <div className="relative aspect-[16/12] overflow-hidden bg-[#f5faf6] dark:bg-secondary/50">
            {!imageLoaded ? <div className="absolute inset-0 animate-pulse bg-muted/50" /> : null}
            <img
              src={product.image}
              srcSet={generateCloudinarySrcSet(product.image)}
              sizes="(max-width: 768px) 92vw, (max-width: 1280px) 47vw, 23vw"
              alt={product.name}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              className={cn("h-full w-full object-cover transition duration-500 hover:scale-[1.02]", imageLoaded ? "opacity-100" : "opacity-0")}
            />
          </div>
        </Link>

        <button
          type="button"
          onClick={() => toggleItem(product.id)}
          className={cn(
            "absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/92 text-slate-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-card/92 dark:text-muted-foreground",
            isInWishlist(product.id) && "text-primary",
          )}
          aria-label={isInWishlist(product.id) ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        >
          <Heart className={cn("h-4 w-4", isInWishlist(product.id) && "fill-current")} />
        </button>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{product.type || product.category || "Bookable experience"}</p>
          <h3 className="mt-2 text-[1.2rem] font-semibold tracking-tight text-slate-950 dark:text-foreground">{product.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-muted-foreground">{product.description}</p>
        </div>

        {hasFacts ? (
          <div className="flex flex-wrap gap-3 text-sm text-slate-500 dark:text-muted-foreground">
            {duration !== null ? <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-primary" />{duration} min</span> : null}
            {capacity ? <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" />{capacity}</span> : null}
            {rating !== null ? <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 fill-current text-primary" />{rating.toFixed(1)}{reviewStats?.count ? ` (${reviewStats.count})` : ""}</span> : null}
          </div>
        ) : null}

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[1.45rem] font-semibold tracking-tight text-slate-950 dark:text-foreground">BDT {product.price.toLocaleString()}</p>
            <p className="text-xs text-slate-500 dark:text-muted-foreground">Price</p>
          </div>
          <div className="text-right text-xs text-slate-500 dark:text-muted-foreground"><div className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-primary" />Merchant managed</div></div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => onBook(product)} className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_16px_28px_-18px_rgba(34,197,94,0.58)]"><CalendarDays className="mr-2 h-4 w-4" />Book Now</button>
          <Link href={productUrl(product.id, product.name, currentStore?.slug)} className="inline-flex h-11 items-center justify-center rounded-xl border border-[#dce9df] px-4 text-sm font-semibold text-slate-800 transition-colors hover:border-primary/30 dark:border-white/10 dark:text-foreground">Details<ArrowRight className="ml-2 h-4 w-4" /></Link>
        </div>
      </div>
    </article>
  );
}
