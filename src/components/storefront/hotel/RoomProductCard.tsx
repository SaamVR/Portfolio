"use client";

import Link from "next/link";
import { Maximize, Star, Users } from "lucide-react";
import { useMemo } from "react";
import type { Product } from "@/data/products";
import { useWishlist } from "@/context/wishlist-context";
import { useOptionalStore } from "@/components/storefront/store-context";
import type { TemplateSeedCatalogMetadata } from "@/lib/cms/template-demo-seeds";
import { productUrl, storefrontPath } from "@/lib/slug";
import {
  ProductCardShell,
  ProductCardMedia,
  ProductCardBadgeLayer,
  ProductCardContent,
  ProductCardTitle,
  ProductCardActions,
} from "@/components/storefront/product/ProductCardFoundation";

type ReviewStats = {
  count: number;
  average: number;
};

function getNumber(specs: Record<string, unknown> | undefined, keys: string[], fallback: number) {
  for (const key of keys) {
    const value = specs?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function getString(specs: Record<string, unknown> | undefined, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = specs?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function deriveCapacity(product: Product, metadata?: TemplateSeedCatalogMetadata["products"][string]) {
  return getNumber(metadata?.specs, ["capacity", "guest_capacity", "guests", "occupancy"], Math.min(Math.max(product.sizes.length || 2, 2), 6));
}

function deriveBedType(product: Product, metadata?: TemplateSeedCatalogMetadata["products"][string]) {
  return getString(metadata?.specs, ["bed_type", "bed", "bedding"], product.name.toLowerCase().includes("suite") ? "King Bed" : "Queen Bed");
}

function deriveRoomSize(product: Product, metadata?: TemplateSeedCatalogMetadata["products"][string]) {
  const squareMeters = getNumber(metadata?.specs, ["room_size_sqm", "size_sqm"], Number.NaN);
  if (Number.isFinite(squareMeters)) {
    return `${squareMeters} m²`;
  }
  const squareFeet = getNumber(metadata?.specs, ["room_size_sqft", "area_sqft", "area"], product.stock ? product.stock + 20 : 32);
  return `${squareFeet} m²`;
}

function badgeLabel(product: Product, reviewStats?: ReviewStats) {
  if (product.badge?.trim()) return product.badge.trim();
  if ((reviewStats?.average ?? 0) >= 4.8) return "Top Rated";
  if (product.featured) return "Guest Favorite";
  return null;
}

export function RoomProductCard({
  product,
  metadata,
  reviewStats,
}: {
  product: Product;
  metadata?: TemplateSeedCatalogMetadata["products"][string];
  reviewStats?: ReviewStats;
}) {
  const store = useOptionalStore();
  const { isInWishlist, toggleItem } = useWishlist();
  const capacity = useMemo(() => deriveCapacity(product, metadata), [metadata, product]);
  const bedType = useMemo(() => deriveBedType(product, metadata), [metadata, product]);
  const roomSize = useMemo(() => deriveRoomSize(product, metadata), [metadata, product]);
  const badge = badgeLabel(product, reviewStats);
  const rating = reviewStats?.average ?? 4.8;
  const url = productUrl(product.id, product.name, store?.slug);

  return (
    <ProductCardShell>
      <ProductCardMedia
        src={product.image}
        fallbackSrc={metadata?.imageUrl ?? metadata?.imageUrls?.[0] ?? null}
        alt={product.name}
        href={url}
        aspect="4/3"
        fit="cover"
      >
        <ProductCardBadgeLayer
          badge={badge}
          isInWishlist={isInWishlist(product.id)}
          onToggleWishlist={() => toggleItem(product.id)}
          wishlistLabel={product.name}
        />
      </ProductCardMedia>

      <ProductCardContent>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground truncate min-w-0">
          {product.category || product.type || "Room"}
        </p>

        <ProductCardTitle href={url}>
          {product.name}
        </ProductCardTitle>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-current text-amber-500 shrink-0" />
          <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
          <span>{reviewStats?.count ? `(${reviewStats.count})` : ""}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl bg-secondary/60 p-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 truncate">
            <Users className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{capacity} Guests</span>
          </div>
          <div className="truncate text-center font-medium">{bedType}</div>
          <div className="flex items-center justify-end gap-1 truncate">
            <Maximize className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{roomSize}</span>
          </div>
        </div>

        <div className="flex items-baseline gap-1.5 pt-1 min-w-0">
          <span className="text-xl font-bold text-primary truncate min-w-0">${product.price.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">/ night</span>
        </div>

        <ProductCardActions>
          <div className="flex items-center gap-2 w-full">
            <Link
              href={url}
              className="inline-flex h-10 flex-1 min-w-0 items-center justify-center rounded-xl border border-border bg-background px-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              Details
            </Link>
            <Link
              href={storefrontPath("/contact", store?.slug)}
              className="inline-flex h-10 flex-1 min-w-0 items-center justify-center rounded-xl bg-primary px-2 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Book Now
            </Link>
          </div>
        </ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}
