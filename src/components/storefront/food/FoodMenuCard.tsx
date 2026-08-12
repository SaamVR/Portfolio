"use client";

import Link from "next/link";
import { Clock3, Plus, Star } from "lucide-react";
import type { Product } from "@/data/products";
import { useWishlist } from "@/context/wishlist-context";
import { useCart } from "@/context/useCart";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useStoreProductPresentation } from "@/components/storefront/product/useStoreProductPresentation";
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
import { getPrimaryProductOptionValue } from "@/lib/cms/storefront-product-presentation";

type ReviewStats = {
  count: number;
  average: number;
};

function getPreparationTime(product: Product) {
  const description = product.description.toLowerCase();
  const quickKeywords = ["drink", "dessert", "fries", "salad", "snack"];
  const slowKeywords = ["biryani", "bbq", "platter", "grill", "roast", "curry"];

  if (quickKeywords.some((keyword) => description.includes(keyword) || product.name.toLowerCase().includes(keyword))) {
    return "15-20 min";
  }

  if (slowKeywords.some((keyword) => description.includes(keyword) || product.name.toLowerCase().includes(keyword))) {
    return "30-40 min";
  }

  return "25-35 min";
}

function resolveBadge(product: Product, mode: "popular" | "chef") {
  const normalized = product.badge?.toLowerCase() ?? "";
  if (normalized.includes("spicy")) return "Spicy";
  if (mode === "chef") return "Chef Pick";
  if (normalized.includes("best") || product.featured) return "Bestseller";
  if (normalized.includes("new")) return "New";
  if (product.originalPrice && product.originalPrice > product.price) return "Popular";
  return "New";
}

function getBadgeClass(badge: string) {
  const normalized = badge.toLowerCase();
  if (normalized.includes("spicy")) return "bg-[#fff2ee] text-[#ef4444] dark:bg-red-950 dark:text-red-300";
  if (normalized.includes("chef")) return "bg-[#edf8ef] text-[#16a34a] dark:bg-emerald-950 dark:text-emerald-300";
  if (normalized.includes("best")) return "bg-[#fff5de] text-[#d97706] dark:bg-amber-950 dark:text-amber-300";
  return "bg-[#eef7ff] text-[#2563eb] dark:bg-blue-950 dark:text-blue-300";
}

export function FoodMenuCard({
  product,
  reviewStats,
  mode = "popular",
}: {
  product: Product;
  reviewStats?: ReviewStats;
  mode?: "popular" | "chef";
}) {
  const currentStore = useOptionalStore();
  const { isInWishlist, toggleItem } = useWishlist();
  const { addItem } = useCart();
  const badge = resolveBadge(product, mode);
  const rating = reviewStats?.average ?? 4.7;
  const reviewCount = reviewStats?.count ?? 0;
  const prepTime = getPreparationTime(product);
  const url = productUrl(product.id, product.name, currentStore?.slug);
  const { specs } = useStoreProductPresentation(product);
  const primaryOption = getPrimaryProductOptionValue(product, specs, "food");

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
        <ProductCardTitle href={url}>
          {product.name}
        </ProductCardTitle>

        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground min-h-[2.5rem]">
          {product.description || `${product.category} prepared fresh.`}
        </p>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
            <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
            {reviewCount > 0 ? <span>({reviewCount})</span> : null}
          </span>
          <span className="inline-flex items-center gap-1 text-primary">
            <Clock3 className="h-3.5 w-3.5" />
            {prepTime}
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
                  size: primaryOption,
                  storeId: currentStore?.id,
                });
              }}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Add
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}
