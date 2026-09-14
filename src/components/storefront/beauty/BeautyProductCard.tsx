"use client";

import { ShoppingBag, Star } from "lucide-react";
import type { Product } from "@/data/products";
import { resolveDefaultProductCartSelection } from "@/lib/commerce/product-cart-selection";
import { useWishlist } from "@/context/wishlist-context";
import { useCart } from "@/context/useCart";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useStoreProductPresentation } from "@/components/storefront/product/useStoreProductPresentation";
import { productUrl } from "@/lib/slug";
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
  getRenderableColorOptions,
  getRenderableMetricOptionGroups,
  getRenderableSizeOptions,
  getProductOptionSummaryLines,
} from "@/lib/cms/storefront-product-presentation";

function resolveBadge(product: Product) {
  if (product.badge?.trim()) return product.badge.trim();
  if (product.originalPrice && product.originalPrice > product.price) return "Sale";
  return null;
}

export function BeautyProductCard({
  product,
  averageRating,
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
  const roundedRating = typeof averageRating === "number" ? Math.max(1, Math.min(5, Math.round(averageRating))) : null;
  const url = productUrl(product.id, product.name, currentStore?.slug);
  const { specs } = useStoreProductPresentation(product);
  const primaryOption = getPrimaryProductOptionValue(product, specs, "beauty");
  const cartSelection = resolveDefaultProductCartSelection(product, primaryOption);
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
        <ProductCardBadgeLayer badge={badge} isInWishlist={isInWishlist(product.id)} onToggleWishlist={() => toggleItem(product.id)} wishlistLabel={product.name} />
      </ProductCardMedia>
      <ProductCardContent className="space-y-2 p-3 sm:space-y-2.5 sm:p-4">
        <p className="line-clamp-1 min-w-0 truncate text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground sm:text-[11px] sm:tracking-[0.18em]">
          {getDisplayableProductType(product.category) || getDisplayableProductType(product.type) || "Beauty"}
        </p>
        <ProductCardTitle href={url} className="h-[2.875rem] min-h-[2.875rem] text-[0.9rem] leading-[1.15rem] sm:h-[2.75rem] sm:min-h-[2.75rem] sm:text-[1.02rem] sm:leading-5">{product.name}</ProductCardTitle>

        {(roundedRating !== null || optionSummary) ? (
          <div className="flex min-h-[1.25rem] items-center gap-1 sm:gap-1.5">
            {roundedRating !== null ? (
              <>
                <div className="flex items-center gap-0.5 text-[#f5b301]">
                  {Array.from({ length: 5 }).map((_, index) => <Star key={index} className={index < roundedRating ? "h-3 w-3 fill-current sm:h-3.5 sm:w-3.5" : "h-3 w-3 fill-transparent text-muted-foreground/30 sm:h-3.5 sm:w-3.5"} />)}
                </div>
                {reviewCount > 0 ? <span className="text-[11px] text-muted-foreground sm:text-xs">({reviewCount})</span> : null}
              </>
            ) : <span className="min-w-0 truncate text-[11px] text-muted-foreground sm:text-xs">{optionSummary}</span>}
          </div>
        ) : null}

        <div className="flex min-h-[1.5rem] flex-wrap items-center gap-1 sm:gap-1.5">
          {visibleShades.map((color, index) => <span key={`${color}-${index}`} title={color} className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: color.toLowerCase() === "white" ? "#f3f4f6" : color.toLowerCase() }} />)}
          {remainingShades > 0 ? <span className="text-[10px] font-semibold text-muted-foreground">+{remainingShades}</span> : null}
          {visibleSizes.map((size, index) => <span key={`${size}-${index}`} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{size}</span>)}
          {remainingSizes > 0 ? <span className="text-[10px] font-semibold text-muted-foreground">+{remainingSizes}</span> : null}
        </div>

        <div className="flex min-w-0 items-baseline gap-1.5 pt-1 sm:gap-2">
          <span className="min-w-0 truncate text-base font-bold text-primary sm:text-xl">৳{product.price.toLocaleString()}</span>
          {product.originalPrice && product.originalPrice > product.price ? <span className="min-w-0 truncate text-[11px] text-muted-foreground line-through sm:text-xs">৳{product.originalPrice.toLocaleString()}</span> : null}
        </div>
        <ProductCardActions>
          <button type="button" onClick={() => addItem({ productId: product.id, name: product.name, price: cartSelection?.unitPrice ?? product.price, image: product.image, size: cartSelection?.label ?? primaryOption, optionIds: cartSelection?.optionIds ?? [], fulfillmentType: cartSelection?.fulfillmentType ?? product.fulfillmentType, storeId: currentStore?.id })} className="inline-flex h-11 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-2 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0 sm:gap-2 sm:px-3">
            <ShoppingBag className="h-4 w-4 shrink-0" /><span className="sm:hidden">Add</span><span className="hidden sm:inline">Add to Cart</span>
          </button>
        </ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}
