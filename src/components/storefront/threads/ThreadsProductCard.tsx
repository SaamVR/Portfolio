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
  const metricGroups = getRenderableMetricOptionGroups(
    product,
    specs,
    "fashion",
  );
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
    deterministicSelection ||
    getPrimaryProductOptionValue(product, specs, "fashion");
  const unavailable =
    product.isAvailable === false ||
    (typeof product.stock === "number" && product.stock <= 0);
  const onSale = Boolean(
    product.originalPrice && product.originalPrice > product.price,
  );
  const discount = onSale
    ? Math.round(
        ((product.originalPrice! - product.price) / product.originalPrice!) *
          100,
      )
    : 0;
  const alternateImage = product.images?.find(
    (image) => image && image !== product.image,
  );
  const imageSizes = framed
    ? "(min-width: 1100px) 23vw, (min-width: 640px) 43vw, 76vw"
    : compact
      ? "(min-width: 768px) 25vw, 50vw"
      : "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

  return (
    <article
      className={`group min-w-0 ${
        framed
          ? "rounded-[5px] border border-primary-foreground/10 bg-primary-foreground/8 p-1.5 text-primary-foreground shadow-[0_8px_24px_rgba(0,0,0,.14)] transition-shadow duration-300 hover:shadow-[0_12px_36px_rgba(0,0,0,.18)]"
          : "transition-transform duration-300 hover:-translate-y-0.5"
      }`}
    >
      <div
        className={`relative overflow-hidden bg-secondary ${
          framed
            ? "aspect-square rounded-[3px]"
            : compact
              ? "aspect-[1.3/1] rounded-[4px] border border-border/50"
              : "aspect-[4/5] rounded-[3px]"
        }`}
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
            sizes={imageSizes}
            className={`object-cover transition duration-600 ease-out group-hover:scale-[1.03] ${
              alternateImage ? "group-hover:opacity-0" : ""
            }`}
          />
          {alternateImage ? (
            <SafeStorefrontImage
              src={alternateImage}
              alt={`${product.name} alternate view`}
              fill
              sizes={imageSizes}
              className="object-cover opacity-0 transition duration-600 ease-out group-hover:scale-[1.03] group-hover:opacity-100"
            />
          ) : null}
        </Link>

        {onSale ? (
          <span className="absolute left-2.5 top-2.5 rounded-[2px] bg-accent px-2 py-1 text-[8px] font-bold uppercase tracking-[.12em] text-accent-foreground">
            −{discount}%
          </span>
        ) : compact ? (
          <span className="absolute left-2.5 top-2.5 rounded-[2px] bg-primary px-2 py-1 text-[8px] font-bold uppercase tracking-[.12em] text-primary-foreground">
            New
          </span>
        ) : null}

        <button
          type="button"
          onClick={() => toggleItem(product.id)}
          className={framed || compact
            ? "absolute right-1.5 top-1.5 grid h-11 w-11 place-items-center text-foreground transition hover:text-primary"
            : "absolute right-2.5 top-2.5 grid h-11 w-11 place-items-center rounded-full border border-black/5 bg-background/94 text-foreground shadow-sm backdrop-blur-sm transition hover:border-primary/30 hover:text-primary"}
          aria-label={
            isInWishlist(product.id)
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
          }
        >
          {framed || compact ? (
            <span className="grid h-8 w-8 place-items-center rounded-full border border-black/5 bg-background/94 shadow-sm backdrop-blur-sm">
              <Heart
                className={`h-3.5 w-3.5 ${
                  isInWishlist(product.id) ? "fill-current text-primary" : ""
                }`}
              />
            </span>
          ) : (
            <Heart
              className={`h-3.5 w-3.5 ${
                isInWishlist(product.id) ? "fill-current text-primary" : ""
              }`}
            />
          )}
        </button>

        {requiresChoice ? (
          <Link
            href={href}
            className={`absolute inset-x-2.5 bottom-2.5 hidden items-center justify-center rounded-[2px] bg-foreground/94 px-3 text-[8px] font-bold uppercase tracking-[.14em] text-background opacity-0 backdrop-blur-sm transition group-hover:opacity-100 group-focus-within:opacity-100 md:flex ${framed || compact ? "h-11" : "h-10"}`}
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
            className={`absolute inset-x-2.5 bottom-2.5 hidden items-center justify-center gap-1.5 rounded-[2px] bg-foreground/94 px-3 text-[8px] font-bold uppercase tracking-[.14em] text-background opacity-0 backdrop-blur-sm transition group-hover:opacity-100 group-focus-within:opacity-100 disabled:cursor-not-allowed disabled:opacity-55 md:flex ${framed || compact ? "h-11" : "h-10"}`}
          >
            <Plus className="h-3 w-3" />
            {unavailable ? "Out of stock" : "Quick add"}
          </button>
        )}
      </div>

      <div
        className={`${framed ? "px-0.5 pb-1 pt-3" : compact ? "px-1 pb-1 pt-2" : "px-0.5 pt-2.5"}`}
      >
        <Link
          href={href}
          className={`block truncate font-medium tracking-[-.01em] ${framed ? "text-primary-foreground text-[11px] md:text-[12px]" : compact ? "text-[10px]" : "text-[12px] md:text-[13px]"}`}
        >
          {product.name}
        </Link>
        <div className="mt-1 flex items-start justify-between gap-2">
          <span
            className={`min-w-0 truncate ${framed ? "text-primary-foreground/65" : "text-muted-foreground"} ${compact || framed ? "text-[8px]" : "text-[10px]"}`}
          >
            {product.category || product.type}
          </span>
          <span className="flex shrink-0 items-baseline gap-1.5">
            {onSale ? (
              <span
                className={`${compact || framed ? "text-[8px]" : "text-[10px]"} text-muted-foreground line-through`}
              >
                ৳{product.originalPrice!.toLocaleString()}
              </span>
            ) : null}
            <span
              className={`font-semibold ${framed ? "text-primary-foreground" : "text-primary"} ${compact || framed ? "text-[10px]" : "text-[12px]"}`}
            >
              ৳{product.price.toLocaleString()}
            </span>
          </span>
        </div>

        {unavailable ? (
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[.08em] text-destructive">
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
