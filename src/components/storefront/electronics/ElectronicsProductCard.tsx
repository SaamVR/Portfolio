"use client";

import { ShoppingCart, Star } from "lucide-react";
import type { Product } from "@/data/products";
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
  type ProductPresentationSpecs,
} from "@/lib/cms/storefront-product-presentation";
import { getExplicitFactText, getExplicitFactValues } from "@/lib/storefront/storefront-fact-truth";
import { isPreviewCatalogStore } from "@/lib/storefront/storefront-product-truth";

type ReviewStats = { count: number; average: number };

function resolveBadge(product: Product) {
  if (product.badge?.trim()) return product.badge.trim();
  if (product.originalPrice && product.originalPrice > product.price) return "Sale";
  return null;
}

/**
 * Public compatibility helper used by shared storefront blocks.
 * Intentionally ignores presentation fallbacks: shared production rendering may expose
 * only merchant-owned technical facts from product.metricValues.
 */
export function buildTechnicalSpecs(product: Product, _presentationSpecs?: ProductPresentationSpecs) {
  return getExplicitFactValues(product, ["technical_specs", "specifications", "features"]).slice(0, 3);
}

export function ElectronicsProductCard({ product, reviewStats }: { product: Product; reviewStats?: ReviewStats }) {
  const currentStore = useOptionalStore();
  const { isInWishlist, toggleItem } = useWishlist();
  const { addItem } = useCart();
  const { specs } = useStoreProductPresentation(product);
  const previewSpecs = isPreviewCatalogStore(currentStore?.id) ? specs : undefined;
  const technicalSpecs = getExplicitFactValues(product, ["technical_specs", "specifications", "features"], previewSpecs).slice(0, 3);
  const warranty = getExplicitFactText(product, ["warranty", "warranty_status"], previewSpecs);
  const delivery = getExplicitFactText(product, ["delivery_time", "delivery", "fulfillment_time"], previewSpecs);
  const badge = resolveBadge(product);
  const rating = reviewStats?.average ?? null;
  const reviewCount = reviewStats?.count ?? 0;
  const url = productUrl(product.id, product.name, currentStore?.slug);
  const primaryOption = getPrimaryProductOptionValue(product, specs, "electronics");

  return (
    <ProductCardShell>
      <ProductCardMedia src={product.image} alt={product.name} href={url} aspect="1/1" fit="contain">
        <ProductCardBadgeLayer
          badge={badge}
          isInWishlist={isInWishlist(product.id)}
          onToggleWishlist={() => toggleItem(product.id)}
          wishlistLabel={product.name}
        />
      </ProductCardMedia>

      <ProductCardContent>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground truncate min-w-0">
          {getDisplayableProductType(product.type) || getDisplayableProductType(product.category) || "Electronics"}
        </p>
        <ProductCardTitle href={url}>{product.name}</ProductCardTitle>

        {rating !== null ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-foreground"><Star className="h-3.5 w-3.5 fill-current text-amber-500" />{rating.toFixed(1)}</span>
            {reviewCount > 0 ? <span>({reviewCount})</span> : null}
          </div>
        ) : null}

        {technicalSpecs.length > 0 ? (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {technicalSpecs.map((spec) => <li key={spec} className="truncate">• {spec}</li>)}
          </ul>
        ) : null}

        {(warranty || delivery) ? (
          <div className="space-y-1 text-xs text-muted-foreground">
            {warranty ? <p>Warranty: {warranty}</p> : null}
            {delivery ? <p>Delivery: {delivery}</p> : null}
          </div>
        ) : null}

        <div className="flex items-baseline gap-2 pt-1 min-w-0">
          <span className="text-xl font-bold text-primary truncate min-w-0">৳{product.price.toLocaleString()}</span>
          {product.originalPrice && product.originalPrice > product.price ? <span className="text-xs text-muted-foreground line-through">৳{product.originalPrice.toLocaleString()}</span> : null}
        </div>

        <ProductCardActions>
          <button type="button" onClick={() => addItem({ productId: product.id, name: product.name, price: product.price, image: product.image, size: primaryOption, storeId: currentStore?.id })} className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground">
            <ShoppingCart className="h-4 w-4" />Add to Cart
          </button>
        </ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}
