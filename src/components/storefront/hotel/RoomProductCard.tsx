"use client";

import Link from "next/link";
import { Maximize, Star, Users } from "lucide-react";
import type { Product } from "@/data/products";
import { useWishlist } from "@/context/wishlist-context";
import { useOptionalStore } from "@/components/storefront/store-context";
import type { TemplateSeedCatalogMetadata } from "@/lib/cms/template-demo-seeds";
import { getDisplayableProductType } from "@/lib/cms/storefront-product-presentation";
import { getExplicitFactText } from "@/lib/storefront/storefront-fact-truth";
import { isPreviewCatalogStore } from "@/lib/storefront/storefront-product-truth";
import { productUrl, storefrontPath } from "@/lib/slug";
import {
  ProductCardShell,
  ProductCardMedia,
  ProductCardBadgeLayer,
  ProductCardContent,
  ProductCardTitle,
  ProductCardActions,
} from "@/components/storefront/product/ProductCardFoundation";

type ReviewStats = { count: number; average: number };

export function RoomProductCard({ product, metadata, reviewStats }: { product: Product; metadata?: TemplateSeedCatalogMetadata["products"][string]; reviewStats?: ReviewStats }) {
  const store = useOptionalStore();
  const { isInWishlist, toggleItem } = useWishlist();
  const isPreview = isPreviewCatalogStore(store?.id);
  const previewSpecs = isPreview ? metadata?.specs : undefined;
  const capacity = getExplicitFactText(product, ["capacity", "guest_capacity", "guests", "occupancy"], previewSpecs);
  const bedType = getExplicitFactText(product, ["bed_type", "bed", "bedding"], previewSpecs);
  const roomSize = getExplicitFactText(product, ["room_size", "room_size_sqm", "room_size_sqft", "size_sqm", "area_sqft"], previewSpecs);
  const billingPeriod = getExplicitFactText(product, ["billing_period", "price_period", "rate_period"], previewSpecs);
  const rating = reviewStats?.average ?? null;
  const badge = product.badge?.trim() || null;
  const url = productUrl(product.id, product.name, store?.slug);
  const hasRoomFacts = Boolean(capacity || bedType || roomSize);

  return (
    <ProductCardShell>
      <ProductCardMedia src={product.image} fallbackSrc={isPreview ? metadata?.imageUrl ?? metadata?.imageUrls?.[0] ?? null : null} alt={product.name} href={url} aspect="4/3" fit="cover">
        <ProductCardBadgeLayer badge={badge} isInWishlist={isInWishlist(product.id)} onToggleWishlist={() => toggleItem(product.id)} wishlistLabel={product.name} />
      </ProductCardMedia>
      <ProductCardContent>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground truncate min-w-0">{getDisplayableProductType(product.category) || getDisplayableProductType(product.type) || "Room"}</p>
        <ProductCardTitle href={url}>{product.name}</ProductCardTitle>
        {rating !== null ? <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Star className="h-3.5 w-3.5 fill-current text-amber-500 shrink-0" /><span className="font-semibold text-foreground">{rating.toFixed(1)}</span>{reviewStats?.count ? <span>({reviewStats.count})</span> : null}</div> : null}
        {hasRoomFacts ? <div className="flex flex-wrap gap-2 rounded-xl bg-secondary/60 p-2 text-xs text-muted-foreground">
          {capacity ? <div className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-primary shrink-0" /><span>Capacity: {capacity}</span></div> : null}
          {bedType ? <span className="font-medium">{bedType}</span> : null}
          {roomSize ? <div className="inline-flex items-center gap-1"><Maximize className="h-3.5 w-3.5 text-primary shrink-0" /><span>{roomSize}</span></div> : null}
        </div> : null}
        <div className="flex items-baseline gap-1.5 pt-1 min-w-0"><span className="text-xl font-bold text-primary truncate min-w-0">BDT {product.price.toLocaleString()}</span>{billingPeriod ? <span className="text-xs text-muted-foreground">{billingPeriod}</span> : null}</div>
        <ProductCardActions><div className="flex items-center gap-2 w-full"><Link href={url} className="inline-flex h-10 flex-1 min-w-0 items-center justify-center rounded-xl border border-border bg-background px-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors">Details</Link><Link href={storefrontPath("/contact", store?.slug)} className="inline-flex h-10 flex-1 min-w-0 items-center justify-center rounded-xl bg-primary px-2 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0">Book Now</Link></div></ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}
