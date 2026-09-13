"use client";

import Link from "next/link";
import { Eye, Heart, Plus } from "lucide-react";
import type { Product } from "@/data/products";
import { useCart } from "@/context/useCart";
import { useWishlist } from "@/context/wishlist-context";
import { useOptionalStore } from "@/components/storefront/store-context";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { useStoreProductPresentation } from "@/components/storefront/product/useStoreProductPresentation";
import {
  getPrimaryProductOptionValue,
  getRenderableColorOptions,
  getRenderableMetricOptionGroups,
  getRenderableSizeOptions,
} from "@/lib/cms/storefront-product-presentation";
import { productUrl } from "@/lib/slug";

export function ThreadsProductCard({
  product,
  framed = false,
  compact = false,
  onQuickView,
}: {
  product: Product;
  framed?: boolean;
  compact?: boolean;
  onQuickView?: (product: Product) => void;
}) {
  const store = useOptionalStore();
  const { addItem } = useCart();
  const { isInWishlist, toggleItem } = useWishlist();
  const { specs } = useStoreProductPresentation(product);
  const href = productUrl(product.id, product.name, store?.slug);
  const sizes = getRenderableSizeOptions(product, specs, "fashion");
  const colors = getRenderableColorOptions(product, specs, "fashion");
  const metricGroups = getRenderableMetricOptionGroups(product, specs, "fashion");
  const requiresChoice =
    sizes.length > 1 ||
    colors.length > 1 ||
    metricGroups.some((group) => group.options.length > 1);
  const deterministicSelection = [
    colors.length === 1 ? colors[0] : "",
    sizes.length === 1 ? sizes[0] : "",
    ...metricGroups
      .filter((group) => group.options.length === 1)
      .map((group) => group.options[0]),
  ]
    .filter(Boolean)
    .join(" • ");
  const quickAddSelection =
    deterministicSelection || getPrimaryProductOptionValue(product, specs, "fashion");
  const unavailable = product.isAvailable === false || (typeof product.stock === "number" && product.stock <= 0);
  const onSale = Boolean(
    product.originalPrice && product.originalPrice > product.price,
  );
  const discount = onSale
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;
  const alternateImage = product.images?.find((image) => image && image !== product.image);

  return (
    <article
      className={`group min-w-0 ${framed ? "rounded-md bg-[hsl(var(--muted))] p-2 shadow-[0_10px_24px_rgba(0,0,0,.18)]" : ""}`}
    >
      <div
        className={`relative overflow-hidden bg-secondary ${framed ? "aspect-[4/5] rounded-[3px]" : compact ? "aspect-[1.08/1] rounded-[4px] border border-border/60" : "aspect-[4/5] rounded-sm"}`}
      >
        <Link
          href={href}
          aria-label={product.name}
          className="absolute inset-0"
        >
          <SafeStorefrontImage
            src={product.image}
            alt={product.name}
            fill
            className={`object-cover transition duration-500 group-hover:scale-[1.025] ${alternateImage ? "group-hover:opacity-0" : ""}`}
          />
          {alternateImage ? (
            <SafeStorefrontImage
              src={alternateImage}
              alt={`${product.name} alternate view`}
              fill
              className="object-cover opacity-0 transition duration-500 group-hover:scale-[1.025] group-hover:opacity-100"
            />
          ) : null}
        </Link>
        {onSale ? (
          <span className="absolute left-2 top-2 rounded-sm bg-accent px-2 py-1 text-[8px] font-bold uppercase tracking-[.1em] text-accent-foreground">
            −{discount}%
          </span>
        ) : compact ? (
          <span className="absolute left-2 top-2 rounded-sm bg-primary px-2 py-1 text-[8px] font-bold uppercase tracking-[.1em] text-primary-foreground">
            New
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => toggleItem(product.id)}
          className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full bg-background/92 shadow-sm transition hover:text-primary md:h-9 md:w-9"
          aria-label={
            isInWishlist(product.id)
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
          }
        >
          <Heart
            className={`h-3.5 w-3.5 ${isInWishlist(product.id) ? "fill-current text-primary" : ""}`}
          />
        </button>
        {requiresChoice ? (
          <Link
            href={href}
            className="absolute inset-x-2 bottom-2 hidden h-9 items-center justify-center bg-foreground px-3 text-[9px] font-semibold uppercase tracking-[.1em] text-background opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 md:flex"
          >
            Choose options
          </Link>
        ) : (
          <button
            type="button"
            disabled={unavailable}
            onClick={() =>
              addItem({
                productId: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                size: quickAddSelection,
                storeId: store?.id,
              })
            }
            className="absolute inset-x-2 bottom-2 hidden h-9 items-center justify-center gap-1 bg-foreground px-3 text-[9px] font-semibold uppercase tracking-[.1em] text-background opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 disabled:cursor-not-allowed disabled:opacity-55 md:flex"
          >
            <Plus className="h-3 w-3" />
            {unavailable ? "Out of stock" : "Quick add"}
          </button>
        )}
      </div>
      <div
        className={`${framed ? "px-0.5 pb-1 pt-2 text-primary-foreground" : compact ? "px-1 pb-1 pt-1.5" : "px-0.5 pt-2"}`}
      >
        <Link
          href={href}
          className={`block truncate font-medium ${compact ? "text-[10px]" : "text-[11px]"}`}
        >
          {product.name}
        </Link>
        <div className="mt-0.5 flex items-start justify-between gap-2">
          <span
            className={`min-w-0 truncate ${compact ? "text-[8px]" : "text-[9px]"} ${framed ? "text-primary-foreground/65" : "text-muted-foreground"}`}
          >
            {product.category || product.type}
          </span>
          <span className="flex shrink-0 items-baseline gap-1.5">
            {onSale ? (
              <span className={`${compact ? "text-[8px]" : "text-[9px]"} ${framed ? "text-primary-foreground/55" : "text-muted-foreground"} line-through`}>
                ৳{product.originalPrice!.toLocaleString()}
              </span>
            ) : null}
            <span className={`font-semibold ${compact ? "text-[10px]" : "text-[11px]"}`}>
              ৳{product.price.toLocaleString()}
            </span>
          </span>
        </div>
        {unavailable ? (
          <p className={`mt-1 text-[8px] font-semibold uppercase tracking-[.08em] ${framed ? "text-primary-foreground/65" : "text-destructive"}`}>
            Out of stock
          </p>
        ) : null}
        {!framed && onQuickView ? (
          <button
            type="button"
            onClick={() => onQuickView(product)}
            className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 border border-border bg-background text-[9px] font-semibold uppercase tracking-[.1em] text-foreground transition hover:border-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Eye className="h-3.5 w-3.5" />
            Quick view
          </button>
        ) : null}
      </div>
    </article>
  );
}
