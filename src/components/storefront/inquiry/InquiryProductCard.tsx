"use client";

import Link from "next/link";
import { ShoppingBag, Star } from "lucide-react";
import type { Product } from "@/data/products";
import { useWishlist } from "@/context/wishlist-context";
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
  if (product.featured) return "Best Seller";
  return "MOQ Ready";
}

function getBadgeClass(badge: string) {
  const normalized = badge.toLowerCase();
  if (normalized.includes("sale")) return "bg-[#fff1e8] text-[#c96a2d] dark:bg-orange-950 dark:text-orange-300";
  if (normalized.includes("best")) return "bg-[#edf8ef] text-[#2c9a5a] dark:bg-emerald-950 dark:text-emerald-300";
  return "bg-[#eff6f0] text-[#6a8b6f] dark:bg-slate-800 dark:text-slate-300";
}

function deriveMoq(product: Product) {
  if (typeof product.stock === "number" && product.stock > 0) {
    return Math.max(12, Math.min(100, Math.ceil(product.stock / 2)));
  }

  return 24;
}

export function InquiryProductCard({
  product,
  reviewStats,
  onRequestQuote,
}: {
  product: Product;
  reviewStats?: ReviewStats;
  onRequestQuote: (product: Product) => void;
}) {
  const currentStore = useOptionalStore();
  const { isInWishlist, toggleItem } = useWishlist();
  const badge = resolveBadge(product);
  const rating = reviewStats?.average ?? 4.8;
  const reviewCount = reviewStats?.count ?? 0;
  const moq = deriveMoq(product);
  const url = productUrl(product.id, product.name, currentStore?.slug);

  return (
    <ProductCardShell>
      <ProductCardMedia src={product.image} alt={product.name} href={url} aspect="4/3" fit="cover">
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
          {product.type || product.category || "Wholesale"}
        </p>

        <ProductCardTitle href={url}>
          {product.name}
        </ProductCardTitle>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[#16a34a]">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span className="text-xs font-semibold text-foreground">{rating.toFixed(1)}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {reviewCount > 0 ? `(${reviewCount})` : ""}
          </span>
        </div>

        <div className="rounded-xl bg-secondary/80 px-3 py-1.5 text-xs text-muted-foreground">
          MOQ <span className="font-semibold text-foreground">{moq}+ units</span>
        </div>

        <div className="min-w-0 pt-1">
          <p className="text-lg font-bold text-primary truncate min-w-0">BDT {product.price.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground truncate">Indicative wholesale starting price</p>
        </div>

        <ProductCardActions>
          <button
            type="button"
            onClick={() => onRequestQuote(product)}
            className="inline-flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <ShoppingBag className="h-4 w-4 shrink-0" />
            Request Quote
          </button>
        </ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}
