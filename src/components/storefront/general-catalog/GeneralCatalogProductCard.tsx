"use client";

import Link from "next/link";
import { ShoppingBag, Star } from "lucide-react";
import type { Product } from "@/data/products";
import { useWishlist } from "@/context/wishlist-context";
import { useCart } from "@/context/useCart";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useStoreProductPresentation } from "@/components/storefront/product/useStoreProductPresentation";
import { productUrl } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { getDisplayableProductType, getPrimaryProductOptionValue } from "@/lib/cms/storefront-product-presentation";
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

function resolveBadge(product: Product, reviewStats?: ReviewStats) {
  if (product.badge) return product.badge;
  if (product.originalPrice && product.originalPrice > product.price) return "Sale";
  if ((reviewStats?.average ?? 0) >= 4.8) return "Top Rated";
  if (product.featured) return "Bestseller";
  return "New";
}

function getBadgeClass(badge: string) {
  const normalized = badge.toLowerCase();
  if (normalized.includes("sale")) return "bg-[#ffe7e2] text-[#de4b2b] dark:bg-red-950 dark:text-red-300";
  if (normalized.includes("top")) return "bg-[#def5ea] text-[#1f9d63] dark:bg-emerald-950 dark:text-emerald-300";
  if (normalized.includes("best")) return "bg-[#e4f0ff] text-[#3174c7] dark:bg-blue-950 dark:text-blue-300";
  return "bg-[#eef8ef] text-[#2b9b55] dark:bg-emerald-950 dark:text-emerald-300";
}

export function GeneralCatalogProductCard({
  product,
  reviewStats,
}: {
  product: Product;
  reviewStats?: ReviewStats;
}) {
  const currentStore = useOptionalStore();
  const { isInWishlist, toggleItem } = useWishlist();
  const { addItem } = useCart();
  const averageRating = reviewStats?.average ?? 4.8;
  const reviewCount = reviewStats?.count ?? 0;
  const roundedRating = Math.max(1, Math.min(5, Math.round(averageRating)));
  const badge = resolveBadge(product, reviewStats);
  const url = productUrl(product.id, product.name, currentStore?.slug);
  const { specs } = useStoreProductPresentation(product);
  const primaryOption = getPrimaryProductOptionValue(product, specs, "generic");

  return (
    <ProductCardShell>
      <ProductCardMedia src={product.image} alt={product.name} href={url} aspect="1/1" fit="cover">
        <ProductCardBadgeLayer
          badge={badge}
          badgeClassName={getBadgeClass(badge)}
          isInWishlist={isInWishlist(product.id)}
          onToggleWishlist={() => toggleItem(product.id)}
          wishlistLabel={product.name}
        />
      </ProductCardMedia>

      <ProductCardContent>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground truncate min-w-0">
          {getDisplayableProductType(product.category) || getDisplayableProductType(product.type) || "Catalog"}
        </p>

        <ProductCardTitle href={url}>
          {product.name}
        </ProductCardTitle>

        <div className="flex items-center gap-1.5 min-h-[1.25rem]">
          <div className="flex items-center gap-0.5 text-amber-500">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className={cn("h-3.5 w-3.5", index < roundedRating ? "fill-current" : "fill-transparent text-muted-foreground/30")} />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {reviewCount > 0 ? `(${reviewCount})` : ""}
          </span>
        </div>

        <div className="flex items-baseline gap-2 pt-1 min-w-0">
          <span className="text-xl font-bold text-primary truncate min-w-0">BDT {product.price.toLocaleString()}</span>
          {product.originalPrice && product.originalPrice > product.price ? (
            <span className="text-xs text-muted-foreground line-through truncate min-w-0">BDT {product.originalPrice.toLocaleString()}</span>
          ) : null}
        </div>

        <ProductCardActions>
          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              type="button"
              onClick={() => addItem({
                productId: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                size: primaryOption,
                storeId: currentStore?.id,
              })}
              className="inline-flex h-10 min-w-0 items-center justify-center rounded-xl border border-border bg-background px-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors truncate"
            >
              Add to Cart
            </button>
            <Link
              href={url}
              className="inline-flex h-10 min-w-0 items-center justify-center gap-1 rounded-xl bg-primary px-2 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0 truncate"
            >
              <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
              View Item
            </Link>
          </div>
        </ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}
