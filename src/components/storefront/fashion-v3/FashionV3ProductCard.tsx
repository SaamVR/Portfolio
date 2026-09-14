"use client";

import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import type { Product } from "@/data/products";
import { useCart } from "@/context/useCart";
import { useWishlist } from "@/context/wishlist-context";
import { useOptionalStore } from "@/components/storefront/store-context";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { useStoreProductPresentation } from "@/components/storefront/product/useStoreProductPresentation";
import { getPrimaryProductOptionValue, getRenderableColorOptions, getRenderableSizeOptions } from "@/lib/cms/storefront-product-presentation";
import { productUrl } from "@/lib/slug";

export function FashionV3ProductCard({ product }: { product: Product }) {
  const store = useOptionalStore();
  const { addItem } = useCart();
  const { isInWishlist, toggleItem } = useWishlist();
  const { specs } = useStoreProductPresentation(product);
  const href = productUrl(product.id, product.name, store?.slug);
  const colors = getRenderableColorOptions(product, specs, "fashion").slice(0, 4);
  const sizeOptions = getRenderableSizeOptions(product, specs, "fashion");
  const requiresOptionChoice = sizeOptions.length > 1;
  const unavailable = product.isAvailable === false;
  const onSale = Boolean(product.originalPrice && product.originalPrice > product.price);

  return (
    <article className="group min-w-0">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <Link href={href} aria-label={product.name} className="absolute inset-0 block">
          <SafeStorefrontImage src={product.image} alt={product.name} fill className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]" />
        </Link>
        {onSale ? <span className="absolute left-3 top-3 z-10 bg-primary px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground">Sale</span> : null}
        <button
          type="button"
          onClick={() => toggleItem(product.id)}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center bg-background/92 text-foreground transition hover:bg-background"
          aria-label={isInWishlist(product.id) ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        >
          <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? "fill-current text-primary" : ""}`} />
        </button>
        {requiresOptionChoice ? (
          <Link href={href} className="absolute inset-x-3 bottom-3 z-10 hidden min-h-11 items-center justify-center bg-foreground px-4 text-xs font-semibold uppercase tracking-[0.14em] text-background transition hover:bg-primary md:flex md:translate-y-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">Choose options</Link>
        ) : (
          <button
            type="button"
            onClick={() => addItem({ productId: product.id, name: product.name, price: product.price, image: product.image, size: getPrimaryProductOptionValue(product, specs, "fashion"), storeId: store?.id })}
            disabled={unavailable}
            className="absolute inset-x-3 bottom-3 z-10 hidden min-h-11 items-center justify-center gap-2 bg-foreground px-4 text-xs font-semibold uppercase tracking-[0.14em] text-background transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50 md:flex md:translate-y-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
          >
            <Plus className="h-3.5 w-3.5" /> {unavailable ? "Out of stock" : "Quick add"}
          </button>
        )}
      </div>

      <div className="pt-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={href} className="block truncate text-[15px] font-medium leading-5 text-foreground hover:underline hover:underline-offset-4">{product.name}</Link>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">{product.category || product.type}</p>
          </div>
          <div className="shrink-0 text-right text-sm font-semibold text-foreground">
            BDT {product.price.toLocaleString()}
            {onSale ? <div className="mt-0.5 text-[11px] font-normal text-muted-foreground line-through">BDT {product.originalPrice!.toLocaleString()}</div> : null}
          </div>
        </div>
        {colors.length > 0 ? (
          <div className="mt-2 flex items-center gap-1.5">
            {colors.map((color) => <span key={color} title={color} className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: color.toLowerCase() === "white" ? "#f4f4f4" : color }} />)}
          </div>
        ) : null}
        {requiresOptionChoice ? (
          <Link href={href} className="mt-3 flex min-h-11 w-full items-center justify-center border border-primary bg-background px-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary md:hidden">Choose options</Link>
        ) : (
          <button
            type="button"
            onClick={() => addItem({ productId: product.id, name: product.name, price: product.price, image: product.image, size: getPrimaryProductOptionValue(product, specs, "fashion"), storeId: store?.id })}
            disabled={unavailable}
            className="mt-3 flex min-h-11 w-full items-center justify-center border border-foreground bg-background px-3 text-xs font-semibold uppercase tracking-[0.12em] text-foreground disabled:cursor-not-allowed disabled:opacity-50 md:hidden"
          >
            {unavailable ? "Out of stock" : "Quick add"}
          </button>
        )}
      </div>
    </article>
  );
}
