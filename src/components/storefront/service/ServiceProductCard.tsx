"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Star } from "lucide-react";
import type { Product } from "@/data/products";
import { useWishlist } from "@/context/wishlist-context";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useStoreProductPresentation } from "@/components/storefront/product/useStoreProductPresentation";
import { getDisplayableProductType } from "@/lib/cms/storefront-product-presentation";
import { getExplicitFactText, getExplicitFactValues } from "@/lib/storefront/storefront-fact-truth";
import { isPreviewCatalogStore } from "@/lib/storefront/storefront-product-truth";
import { productUrl } from "@/lib/slug";
import {
  ProductCardShell,
  ProductCardMedia,
  ProductCardBadgeLayer,
  ProductCardContent,
  ProductCardTitle,
  ProductCardActions,
} from "@/components/storefront/product/ProductCardFoundation";

type ReviewStats = { count: number; average: number };

export function ServiceProductCard({ product, reviewStats, onBook }: { product: Product; reviewStats?: ReviewStats; onBook: (product: Product) => void }) {
  const currentStore = useOptionalStore();
  const { isInWishlist, toggleItem } = useWishlist();
  const { specs } = useStoreProductPresentation(product);
  const previewSpecs = isPreviewCatalogStore(currentStore?.id) ? specs : undefined;
  const inclusions = getExplicitFactValues(product, ["included_items", "inclusions", "features", "benefits"], previewSpecs).slice(0, 3);
  const turnaround = getExplicitFactText(product, ["turnaround", "turnaround_time", "lead_time", "delivery_time"], previewSpecs);
  const rating = reviewStats?.average ?? null;
  const url = productUrl(product.id, product.name, currentStore?.slug);

  return (
    <ProductCardShell>
      <ProductCardMedia src={product.image} alt={product.name} href={url} aspect="4/3" fit="cover">
        <ProductCardBadgeLayer badge={product.badge?.trim() || null} isInWishlist={isInWishlist(product.id)} onToggleWishlist={() => toggleItem(product.id)} wishlistLabel={product.name} />
      </ProductCardMedia>
      <ProductCardContent>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary truncate min-w-0">{getDisplayableProductType(product.type) || getDisplayableProductType(product.category) || "Service"}</p>
        <ProductCardTitle href={url}>{product.name}</ProductCardTitle>
        {rating !== null || turnaround ? (
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground min-w-0">
            {rating !== null ? <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-current text-primary" /><span className="font-medium text-foreground">{rating.toFixed(1)}</span>{reviewStats?.count ? <span>({reviewStats.count})</span> : null}</span> : null}
            {turnaround ? <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-primary shrink-0" /><span className="truncate">{turnaround}</span></span> : null}
          </div>
        ) : null}
        {inclusions.length > 0 ? <div className="space-y-1 text-xs text-muted-foreground">{inclusions.map((item) => <div key={item} className="flex items-center gap-1.5 truncate"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" /><span className="truncate">{item}</span></div>)}</div> : null}
        <div className="min-w-0 pt-1"><p className="text-lg font-bold text-foreground truncate min-w-0">BDT {product.price.toLocaleString()}</p><p className="text-[11px] text-muted-foreground truncate">Price</p></div>
        <ProductCardActions><div className="flex items-center gap-2 w-full"><button type="button" onClick={() => onBook(product)} className="inline-flex h-10 flex-1 min-w-0 items-center justify-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0">Book Service</button><Link href={url} className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-border px-3 text-xs font-semibold text-foreground hover:bg-secondary transition-colors">Details<ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></div></ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}
