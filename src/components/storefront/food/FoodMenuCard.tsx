"use client";

import { Clock3, Plus, Star } from "lucide-react";
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
import { getPrimaryProductOptionValue } from "@/lib/cms/storefront-product-presentation";
import { getExplicitFactText } from "@/lib/storefront/storefront-fact-truth";
import { isPreviewCatalogStore } from "@/lib/storefront/storefront-product-truth";

type ReviewStats = { count: number; average: number };

export function FoodMenuCard({
  product,
  reviewStats,
  mode: _mode = "popular",
}: {
  product: Product;
  reviewStats?: ReviewStats;
  mode?: "popular" | "chef";
}) {
  const currentStore = useOptionalStore();
  const { isInWishlist, toggleItem } = useWishlist();
  const { addItem } = useCart();
  const { specs } = useStoreProductPresentation(product);
  const previewSpecs = isPreviewCatalogStore(currentStore?.id) ? specs : undefined;
  const badge = product.badge?.trim() || null;
  const rating = reviewStats?.average ?? null;
  const reviewCount = reviewStats?.count ?? 0;
  const prepTime = getExplicitFactText(product, ["preparation_time", "prep_time", "fulfillment_time"], previewSpecs);
  const url = productUrl(product.id, product.name, currentStore?.slug);
  const primaryOption = getPrimaryProductOptionValue(product, specs, "food");

  return (
    <ProductCardShell>
      <ProductCardMedia src={product.image} alt={product.name} href={url} aspect="4/3" fit="cover">
        <ProductCardBadgeLayer badge={badge} isInWishlist={isInWishlist(product.id)} onToggleWishlist={() => toggleItem(product.id)} wishlistLabel={product.name} />
      </ProductCardMedia>

      <ProductCardContent>
        <ProductCardTitle href={url}>{product.name}</ProductCardTitle>
        {product.description ? <p className="line-clamp-2 text-xs leading-5 text-muted-foreground min-h-[2.5rem]">{product.description}</p> : null}

        {(rating !== null || prepTime) ? (
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {rating !== null ? <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-current text-amber-500" /><span className="font-semibold text-foreground">{rating.toFixed(1)}</span>{reviewCount > 0 ? <span>({reviewCount})</span> : null}</span> : null}
            {prepTime ? <span className="inline-flex items-center gap-1 text-primary"><Clock3 className="h-3.5 w-3.5" />{prepTime}</span> : null}
          </div>
        ) : null}

        <ProductCardActions>
          <div className="flex items-center justify-between gap-2 w-full pt-1">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-xl font-bold text-primary truncate">৳{product.price.toLocaleString()}</span>
              {product.originalPrice && product.originalPrice > product.price ? <span className="text-xs text-muted-foreground line-through truncate">৳{product.originalPrice.toLocaleString()}</span> : null}
            </div>
            <button type="button" onClick={() => addItem({ productId: product.id, name: product.name, price: product.price, image: product.image, size: primaryOption, storeId: currentStore?.id })} className="inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0">
              Add<Plus className="h-4 w-4" />
            </button>
          </div>
        </ProductCardActions>
      </ProductCardContent>
    </ProductCardShell>
  );
}
