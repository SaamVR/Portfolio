"use client";

import Link from "next/link";
import { ShieldCheck, Star, Truck, ShoppingCart } from "lucide-react";
import type { Product } from "@/data/products";
import { useWishlist } from "@/context/wishlist-context";
import { useCart } from "@/context/useCart";
import { useOptionalStore } from "@/components/storefront/store-context";
import { productUrl } from "@/lib/slug";
import { cn } from "@/lib/utils";
import {
  ProductCardShell,
  ProductCardMedia,
  ProductCardBadgeLayer,
  ProductCardContent,
  ProductCardTitle,
  ProductCardActions,
} from "@/components/storefront/product/ProductCardFoundation";

import { getDisplayableProductType } from "@/lib/cms/storefront-product-presentation";

type ReviewStats = {
  count: number;
  average: number;
};

function resolveBadge(product: Product) {
  if (product.badge) return product.badge;
  if (product.originalPrice && product.originalPrice > product.price) return "Sale";
  if (product.featured) return "Top Rated";
  return "New";
}

function getBadgeClass(badge: string) {
  const normalized = badge.toLowerCase();
  if (normalized.includes("sale")) return "bg-[#fff1ef] text-[#ef4444] dark:bg-red-950 dark:text-red-300";
  if (normalized.includes("top") || normalized.includes("best")) return "bg-[#fff6dd] text-[#f59e0b] dark:bg-amber-950 dark:text-amber-300";
  return "bg-[#ecfdf3] text-[#16a34a] dark:bg-emerald-950 dark:text-emerald-300";
}

export function buildTechnicalSpecs(product: Product) {
  const specs: string[] = [];

  if (product.description) {
    const extracted = product.description
      .split(/[.!?]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 3);

    specs.push(...extracted);
  }

  if (specs.length < 3 && product.colors.length > 0) {
    specs.push(`${product.colors.length} finish option${product.colors.length === 1 ? "" : "s"}`);
  }

  if (specs.length < 3 && typeof product.stock === "number") {
    specs.push(product.stock > 0 ? `${product.stock}+ units in stock` : "Restocking soon");
  }

  if (specs.length < 3) {
    const label = getDisplayableProductType(product.type) || getDisplayableProductType(product.category) || "Electronics";
    specs.push(`${label} ready for daily use`);
  }

  return specs.slice(0, 3);
}

export function ElectronicsProductCard({
  product,
  reviewStats,
}: {
  product: Product;
  reviewStats?: ReviewStats;
}) {
  const currentStore = useOptionalStore();
  const { isInWishlist, toggleItem } = useWishlist();
  const { addItem } = useCart();
  const badge = resolveBadge(product);
  const specs = buildTechnicalSpecs(product);
  const averageRating = reviewStats?.average ?? 4.7;
  const reviewCount = reviewStats?.count ?? 0;
  const url = productUrl(product.id, product.name, currentStore?.slug);

  return (
    <ProductCardShell>
      <ProductCardMedia src={product.image} alt={product.name} href={url} aspect="1/1" fit="contain">
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
          {getDisplayableProductType(product.type) || getDisplayableProductType(product.category) || "Electronics"}
        </p>

        <ProductCardTitle href={url}>
          {product.name}
        </ProductCardTitle>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[#16a34a]">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span className="text-xs font-semibold text-foreground">{averageRating.toFixed(1)}</span>
          </div>
          <span className="text-xs text-muted-foreground">{reviewCount > 0 ? `(${reviewCount})` : ""}</span>
        </div>

        <ul className="space-y-1 text-xs text-muted-foreground min-h-[3.25rem]">
          {specs.map((spec) => (
            <li key={spec} className="flex items-center gap-1.5 truncate">
              <span className="h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span className="truncate">{spec}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-baseline gap-2 pt-1 min-w-0">
          <span className="text-xl font-bold text-primary truncate min-w-0">৳{product.price.toLocaleString()}</span>
          {product.originalPrice && product.originalPrice > product.price ? (
            <span className="text-xs text-muted-foreground line-through truncate min-w-0">৳{product.originalPrice.toLocaleString()}</span>
          ) : null}
        </div>

        <ProductCardActions>
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 w-full">
            <button
              type="button"
              onClick={() => {
                addItem({
                  productId: product.id,
                  name: product.name,
                  price: product.price,
                  image: product.image,
                  size: product.sizes[0] || "Default",
                  storeId: currentStore?.id,
                });
              }}
              className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <ShoppingCart className="h-4 w-4 shrink-0" />
              <span className="truncate">Add to Cart</span>
            </button>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-primary" title="Warranty Verified">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-primary" title="Express Delivery Available">
              <Truck className="h-4 w-4" />
            </div>
          </div>
        </ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}
