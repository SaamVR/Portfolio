"use client";

import Link from "next/link";
import { Bath, BedDouble, MapPin, MoveRight, Ruler } from "lucide-react";
import type { Product } from "@/data/products";
import { useWishlist } from "@/context/wishlist-context";
import { useOptionalStore } from "@/components/storefront/store-context";
import type { TemplateSeedCatalogMetadata } from "@/lib/cms/template-demo-seeds";
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

export function PropertyListingCard({ product, metadata }: { product: Product; metadata?: TemplateSeedCatalogMetadata["products"][string] }) {
  const store = useOptionalStore();
  const { isInWishlist, toggleItem } = useWishlist();
  const isPreview = isPreviewCatalogStore(store?.id);
  const previewSpecs = isPreview ? metadata?.specs : undefined;
  const listingMode = getExplicitFactText(product, ["listing_type", "listing_mode", "status"], previewSpecs);
  const address = getExplicitFactText(product, ["address", "location", "city"], previewSpecs);
  const beds = getExplicitFactText(product, ["beds", "bedrooms"], previewSpecs);
  const baths = getExplicitFactText(product, ["baths", "bathrooms"], previewSpecs);
  const area = getExplicitFactText(product, ["area_sqft", "sqft", "property_area", "area"], previewSpecs);
  const billingPeriod = getExplicitFactText(product, ["billing_period", "price_period", "rate_period"], previewSpecs);
  const url = productUrl(product.id, product.name, store?.slug);
  const badge = product.badge?.trim() || listingMode || null;
  const hasPropertyFacts = Boolean(beds || baths || area);

  return (
    <ProductCardShell>
      <ProductCardMedia src={product.image} fallbackSrc={isPreview ? metadata?.imageUrl ?? metadata?.imageUrls?.[0] ?? null : null} alt={product.name} href={url} aspect="4/3" fit="cover">
        <ProductCardBadgeLayer badge={badge} isInWishlist={isInWishlist(product.id)} onToggleWishlist={() => toggleItem(product.id)} wishlistLabel={product.name} />
      </ProductCardMedia>
      <ProductCardContent>
        {address ? <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate min-w-0"><MapPin className="h-3.5 w-3.5 text-primary shrink-0" /><span className="truncate">{address}</span></div> : null}
        <ProductCardTitle href={url}>{product.name}</ProductCardTitle>
        {hasPropertyFacts ? <div className="flex flex-wrap gap-2 rounded-xl bg-secondary/60 p-2 text-xs text-muted-foreground">
          {beds ? <div className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5 text-primary shrink-0" /><span>{beds} Beds</span></div> : null}
          {baths ? <div className="inline-flex items-center gap-1"><Bath className="h-3.5 w-3.5 text-primary shrink-0" /><span>{baths} Baths</span></div> : null}
          {area ? <div className="inline-flex items-center gap-1"><Ruler className="h-3.5 w-3.5 text-primary shrink-0" /><span>{area}</span></div> : null}
        </div> : null}
        <div className="flex items-baseline gap-1.5 pt-1 min-w-0"><span className="text-xl font-bold text-primary truncate min-w-0">BDT {product.price.toLocaleString()}</span>{billingPeriod ? <span className="text-xs text-muted-foreground">{billingPeriod}</span> : null}</div>
        <ProductCardActions><div className="flex items-center gap-2 w-full"><Link href={url} className="inline-flex h-10 flex-1 min-w-0 items-center justify-center gap-1 rounded-xl border border-border bg-background px-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors">Details<MoveRight className="h-3.5 w-3.5 shrink-0" /></Link><Link href={storefrontPath("/contact", store?.slug)} className="inline-flex h-10 flex-1 min-w-0 items-center justify-center rounded-xl bg-primary px-2 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0">Contact Agent</Link></div></ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}
