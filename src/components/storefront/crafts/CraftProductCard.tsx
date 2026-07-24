"use client";

import Link from "next/link";
import { MapPin, ShoppingBag, Star } from "lucide-react";
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

type ReviewStats = {
  count: number;
  average: number;
};

function resolveBadge(product: Product) {
  if (product.badge) return product.badge;
  if (product.originalPrice && product.originalPrice > product.price) return "Sale";
  if (product.featured) return "Handmade";
  return "New";
}

function getBadgeClass(badge: string) {
  const normalized = badge.toLowerCase();
  if (normalized.includes("sale")) return "bg-[#fff1e8] text-[#c96a2d] dark:bg-orange-950 dark:text-orange-300";
  if (normalized.includes("new")) return "bg-[#edf7ef] text-[#2c9a5a] dark:bg-emerald-950 dark:text-emerald-300";
  return "bg-[#f6efe2] text-[#8e6332] dark:bg-amber-950 dark:text-amber-300";
}

function deriveOrigin(product: Product) {
  const source = [product.category, product.type].filter(Boolean).join(" • ");
  return source || "Artisan made";
}

function deriveCraftNote(product: Product) {
  const firstSentence = product.description
    .split(/[.!?]/)
    .map((part) => part.trim())
    .filter(Boolean)[0];

  return firstSentence || "Crafted with merchant-managed materials and finish details.";
}

export function CraftProductCard({
  product,
  reviewStats,
  labelMode = "english",
}: {
  product: Product;
  reviewStats?: ReviewStats;
  labelMode?: "english" | "bengali";
}) {
  const currentStore = useOptionalStore();
  const { isInWishlist, toggleItem } = useWishlist();
  const { addItem } = useCart();
  const badge = resolveBadge(product);
  const rating = reviewStats?.average ?? 4.8;
  const reviewCount = reviewStats?.count ?? 0;
  const originLabel = labelMode === "bengali" ? "উৎস" : "Origin";
  const origin = deriveOrigin(product);
  const note = deriveCraftNote(product);
  const url = productUrl(product.id, product.name, currentStore?.slug);

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
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground truncate min-w-0">
          {originLabel} • {origin}
        </p>

        <ProductCardTitle href={url}>
          {product.name}
        </ProductCardTitle>

        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground min-h-[2.5rem]">
          {note}
        </p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium text-foreground truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{origin}</span>
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1 shrink-0">
            <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
            {rating.toFixed(1)}
            {reviewCount > 0 ? ` (${reviewCount})` : ""}
          </span>
        </div>

        <ProductCardActions>
          <div className="flex items-center justify-between gap-2 w-full pt-1">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-xl font-bold text-primary truncate">৳{product.price.toLocaleString()}</span>
              {product.originalPrice && product.originalPrice > product.price ? (
                <span className="text-xs text-muted-foreground line-through truncate">৳{product.originalPrice.toLocaleString()}</span>
              ) : null}
            </div>
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
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <ShoppingBag className="h-4 w-4" />
              {labelMode === "bengali" ? "কার্টে" : "Add"}
            </button>
          </div>
        </ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}
