"use client";

import { MapPin, ShoppingBag, Star } from "lucide-react";
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
import { getPrimaryProductOptionValue } from "@/lib/cms/storefront-product-presentation";
import { getExplicitFactText } from "@/lib/storefront/storefront-fact-truth";
import { isPreviewCatalogStore } from "@/lib/storefront/storefront-product-truth";

type ReviewStats = { count: number; average: number };

function resolveBadge(product: Product) {
  if (product.badge?.trim()) return product.badge.trim();
  if (product.originalPrice && product.originalPrice > product.price) return "Sale";
  return null;
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
  const { specs } = useStoreProductPresentation(product);
  const previewSpecs = isPreviewCatalogStore(currentStore?.id) ? specs : undefined;
  const badge = resolveBadge(product);
  const rating = reviewStats?.average ?? null;
  const reviewCount = reviewStats?.count ?? 0;
  const origin = getExplicitFactText(product, ["origin", "made_in", "location", "craft_origin"], previewSpecs);
  const originLabel = labelMode === "bengali" ? "উৎস" : "Origin";
  const url = productUrl(product.id, product.name, currentStore?.slug);
  const primaryOption = getPrimaryProductOptionValue(product, specs, "crafts");
  const cartSelection = resolveDefaultProductCartSelection(product, primaryOption);

  return (
    <ProductCardShell>
      <ProductCardMedia src={product.image} alt={product.name} href={url} aspect="1/1" fit="cover">
        <ProductCardBadgeLayer badge={badge} isInWishlist={isInWishlist(product.id)} onToggleWishlist={() => toggleItem(product.id)} wishlistLabel={product.name} />
      </ProductCardMedia>

      <ProductCardContent>
        {origin ? <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground truncate min-w-0">{originLabel} • {origin}</p> : null}
        <ProductCardTitle href={url}>{product.name}</ProductCardTitle>
        {product.description ? <p className="line-clamp-2 text-xs leading-5 text-muted-foreground min-h-[2.5rem]">{product.description}</p> : null}

        {(origin || rating !== null) ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {origin ? <span className="inline-flex items-center gap-1 font-medium text-foreground truncate"><MapPin className="h-3.5 w-3.5 shrink-0 text-primary" /><span className="truncate">{origin}</span></span> : null}
            {origin && rating !== null ? <span>•</span> : null}
            {rating !== null ? <span className="inline-flex items-center gap-1 shrink-0"><Star className="h-3.5 w-3.5 fill-current text-amber-500" />{rating.toFixed(1)}{reviewCount > 0 ? ` (${reviewCount})` : ""}</span> : null}
          </div>
        ) : null}

        <ProductCardActions>
          <div className="flex items-center justify-between gap-2 w-full pt-1">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-xl font-bold text-primary truncate">৳{product.price.toLocaleString()}</span>
              {product.originalPrice && product.originalPrice > product.price ? <span className="text-xs text-muted-foreground line-through truncate">৳{product.originalPrice.toLocaleString()}</span> : null}
            </div>
            <button type="button" onClick={() => addItem({ productId: product.id, name: product.name, price: cartSelection?.unitPrice ?? product.price, image: product.image, size: cartSelection?.label ?? primaryOption, optionIds: cartSelection?.optionIds ?? [], fulfillmentType: cartSelection?.fulfillmentType ?? product.fulfillmentType, storeId: currentStore?.id })} className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0">
              <ShoppingBag className="h-4 w-4" />{labelMode === "bengali" ? "কার্টে" : "Add"}
            </button>
          </div>
        </ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}
