"use client";

import Link from "next/link";
import { Bath, BedDouble, MapPin, MoveRight, Ruler } from "lucide-react";
import { useMemo } from "react";
import type { Product } from "@/data/products";
import { useWishlist } from "@/context/wishlist-context";
import { useOptionalStore } from "@/components/storefront/store-context";
import type { TemplateSeedCatalogMetadata } from "@/lib/cms/template-demo-seeds";
import { getMetricNumericFallback } from "@/lib/cms/storefront-product-presentation";
import { productUrl, storefrontPath } from "@/lib/slug";
import {
  ProductCardShell,
  ProductCardMedia,
  ProductCardBadgeLayer,
  ProductCardContent,
  ProductCardTitle,
  ProductCardActions,
} from "@/components/storefront/product/ProductCardFoundation";

function getString(specs: Record<string, unknown> | undefined, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = specs?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

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

function deriveListingMode(product: Product, metadata?: TemplateSeedCatalogMetadata["products"][string]) {
  const explicit = getString(metadata?.specs, ["listing_type", "listing_mode", "status"], "");
  if (explicit) {
    if (/rent/i.test(explicit)) return "For Rent";
    if (/sold/i.test(explicit)) return "Sold";
    return "For Sale";
  }
  if (/rent/i.test(`${product.name} ${product.description}`)) return "For Rent";
  return "For Sale";
}

function deriveAddress(product: Product, metadata?: TemplateSeedCatalogMetadata["products"][string]) {
  return getString(metadata?.specs, ["address", "location", "city"], product.description.split(".")[0] || "Prime location");
}

function deriveBeds(product: Product, metadata?: TemplateSeedCatalogMetadata["products"][string]) {
  return getNumber(metadata?.specs, ["beds", "bedrooms"], Math.max(1, Math.min(getMetricNumericFallback(product, ["beds", "bedrooms"], 3), 6)));
}

function deriveBaths(product: Product, metadata?: TemplateSeedCatalogMetadata["products"][string]) {
  return getNumber(metadata?.specs, ["baths", "bathrooms"], Math.max(1, Math.min(getMetricNumericFallback(product, ["baths", "bathrooms"], 2), 5)));
}

function deriveArea(product: Product, metadata?: TemplateSeedCatalogMetadata["products"][string]) {
  return getNumber(metadata?.specs, ["area_sqft", "sqft", "area"], Math.max(product.stock || 1200, 750));
}

export function PropertyListingCard({
  product,
  metadata,
}: {
  product: Product;
  metadata?: TemplateSeedCatalogMetadata["products"][string];
}) {
  const store = useOptionalStore();
  const { isInWishlist, toggleItem } = useWishlist();
  const listingMode = useMemo(() => deriveListingMode(product, metadata), [metadata, product]);
  const address = useMemo(() => deriveAddress(product, metadata), [metadata, product]);
  const beds = useMemo(() => deriveBeds(product, metadata), [metadata, product]);
  const baths = useMemo(() => deriveBaths(product, metadata), [metadata, product]);
  const area = useMemo(() => deriveArea(product, metadata), [metadata, product]);
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
          badge={listingMode}
          isInWishlist={isInWishlist(product.id)}
          onToggleWishlist={() => toggleItem(product.id)}
          wishlistLabel={product.name}
        />
      </ProductCardMedia>

      <ProductCardContent>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate min-w-0">
          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">{address}</span>
        </div>

        <ProductCardTitle href={url}>
          {product.name}
        </ProductCardTitle>

        <div className="grid grid-cols-3 gap-2 rounded-xl bg-secondary/60 p-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 truncate">
            <BedDouble className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{beds} Beds</span>
          </div>
          <div className="flex items-center justify-center gap-1 truncate">
            <Bath className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{baths} Baths</span>
          </div>
          <div className="flex items-center justify-end gap-1 truncate">
            <Ruler className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{area.toLocaleString()} sqft</span>
          </div>
        </div>

        <div className="flex items-baseline gap-1.5 pt-1 min-w-0">
          <span className="text-xl font-bold text-primary truncate min-w-0">BDT {product.price.toLocaleString()}</span>
          {listingMode === "For Rent" ? <span className="text-xs text-muted-foreground">/mo</span> : null}
        </div>

        <ProductCardActions>
          <div className="flex items-center gap-2 w-full">
            <Link
              href={url}
              className="inline-flex h-10 flex-1 min-w-0 items-center justify-center gap-1 rounded-xl border border-border bg-background px-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              Details
              <MoveRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
            <Link
              href={storefrontPath("/contact", store?.slug)}
              className="inline-flex h-10 flex-1 min-w-0 items-center justify-center rounded-xl bg-primary px-2 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Contact Agent
            </Link>
          </div>
        </ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}