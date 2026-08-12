"use client";

import Link from "next/link";
import { Star, ShoppingBag } from "lucide-react";
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
import {
  getDisplayableProductType,
  getPrimaryProductOptionValue,
  getProductOptionSummaryLines,
  getRenderableColorOptions,
  getRenderableMetricOptionGroups,
  getRenderableSizeOptions,
} from "@/lib/cms/storefront-product-presentation";

function resolveBadge(product: Product) {
  if (product.badge) return product.badge;
  if (product.originalPrice && product.originalPrice > product.price) return "Sale";
  if (product.featured) return "Bestseller";
  return "New";
}

function getBadgeClass(badge: string) {
  const normalized = badge.toLowerCase();
  if (normalized.includes("sale")) return "bg-[#ffefe7] text-[#f97316] dark:bg-orange-950 dark:text-orange-300";
  if (normalized.includes("best")) return "bg-[#f8f0c7] text-[#927100] dark:bg-amber-950 dark:text-amber-300";
  return "bg-[#ecf9ef] text-[#22a15f] dark:bg-emerald-950 dark:text-emerald-300";
}

export function BeautyProductCard({
  product,
  averageRating = 4.8,
  reviewCount = 0,
}: {
  product: Product;
  averageRating?: number;
  reviewCount?: number;
}) {
  const currentStore = useOptionalStore();
  const { isInWishlist, toggleItem } = useWishlist();
  const { addItem } = useCart();
  const badge = resolveBadge(product);
  const roundedRating = Math.max(1, Math.min(5, Math.round(averageRating)));
  const url = productUrl(product.id, product.name, currentStore?.slug);
  const { specs } = useStoreProductPresentation(product);
  const primaryOption = getPrimaryProductOptionValue(product, specs, "beauty");
  const beautyColors = getRenderableColorOptions(product, specs, "beauty");
  const beautySizes = getRenderableSizeOptions(product, specs, "beauty");
  const visibleShades = beautyColors.slice(0, 4);
  const remainingShades = beautyColors.length - visibleShades.length;
  const visibleSizes = beautySizes.slice(0, 2);
  const remainingSizes = beautySizes.length - visibleSizes.length;
  const metricGroups = getRenderableMetricOptionGroups(product, specs, "beauty");
  const optionSummary = getProductOptionSummaryLines(product, specs, "beauty")[0] ?? metricGroups[0]?.options[0] ?? "";

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
          <p className="line-clamp-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground truncate min-w-0">
            {getDisplayableProductType(product.category) || getDisplayableProductType(product.type) || "Beauty"}
          </p>

        <ProductCardTitle href={url}>
          {product.name}
        </ProductCardTitle>

        <div className="flex items-center gap-1.5 min-h-[1.25rem]">
          <div className="flex items-center gap-0.5 text-[#f5b301]">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className={cn("h-3.5 w-3.5", index < roundedRating ? "fill-current" : "fill-transparent text-muted-foreground/30")} />
            ))}
          </div>
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            {reviewCount > 0 ? `(${reviewCount})` : optionSummary}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 min-h-[1.5rem]">
          {visibleShades.map((color, index) => (
            <span
              key={`${color}-${index}`}
              title={color}
              className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10 shadow-sm"
              style={{ backgroundColor: color.toLowerCase() === "white" ? "#f3f4f6" : color.toLowerCase() }}
            />
          ))}
          {remainingShades > 0 ? (
            <span className="text-[10px] font-semibold text-muted-foreground">+{remainingShades}</span>
          ) : null}

          {visibleSizes.map((size, index) => (
            <span
              key={`${size}-${index}`}
              className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {size}
            </span>
          ))}
          {remainingSizes > 0 ? (
            <span className="text-[10px] font-semibold text-muted-foreground">+{remainingSizes}</span>
          ) : null}
        </div>

        <div className="flex items-baseline gap-2 pt-1 min-w-0">
          <span className="text-xl font-bold text-primary truncate min-w-0">৳{product.price.toLocaleString()}</span>
          {product.originalPrice && product.originalPrice > product.price ? (
            <span className="text-xs text-muted-foreground line-through truncate min-w-0">৳{product.originalPrice.toLocaleString()}</span>
          ) : null}
        </div>

        <ProductCardActions>
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
            className="inline-flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <ShoppingBag className="h-4 w-4 shrink-0" />
            Add to Cart
          </button>
        </ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}
