"use client";

import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import type { Product } from "@/data/products";
import { useCart } from "@/context/useCart";
import { useWishlist } from "@/context/wishlist-context";
import { useOptionalStore } from "@/components/storefront/store-context";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { useStoreProductPresentation } from "@/components/storefront/product/useStoreProductPresentation";
import { getPrimaryProductOptionValue, getRenderableSizeOptions } from "@/lib/cms/storefront-product-presentation";
import { productUrl } from "@/lib/slug";

export function ThreadsProductCard({ product, framed = false }: { product: Product; framed?: boolean }) {
  const store = useOptionalStore();
  const { addItem } = useCart();
  const { isInWishlist, toggleItem } = useWishlist();
  const { specs } = useStoreProductPresentation(product);
  const href = productUrl(product.id, product.name, store?.slug);
  const sizes = getRenderableSizeOptions(product, specs, "fashion");
  const requiresChoice = sizes.length > 1;
  const unavailable = product.isAvailable === false;
  const onSale = Boolean(product.originalPrice && product.originalPrice > product.price);

  return (
    <article className={`group min-w-0 snap-start ${framed ? "rounded-[2rem] bg-background p-3 pb-4 text-foreground shadow-[0_20px_50px_-34px_rgba(0,0,0,.35)]" : ""}`}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-secondary/55 shadow-[0_18px_45px_-32px_rgba(24,33,29,.55)]">
        <Link href={href} aria-label={product.name} className="absolute inset-0">
          <SafeStorefrontImage src={product.image} alt={product.name} fill className="object-cover transition duration-700 ease-out group-hover:scale-[1.035]" />
        </Link>
        {onSale ? <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-[.16em] text-primary-foreground">Sale</span> : null}
        <button type="button" onClick={() => toggleItem(product.id)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/90 text-foreground backdrop-blur" aria-label={isInWishlist(product.id) ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}>
          <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? "fill-current text-primary" : ""}`} />
        </button>
        {requiresChoice ? (
          <Link href={href} className="absolute inset-x-3 bottom-3 hidden min-h-11 items-center justify-center rounded-full bg-foreground px-4 text-[11px] font-semibold uppercase tracking-[.14em] text-background transition md:flex md:translate-y-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">Choose options</Link>
        ) : (
          <button type="button" disabled={unavailable} onClick={() => addItem({ productId: product.id, name: product.name, price: product.price, image: product.image, size: getPrimaryProductOptionValue(product, specs, "fashion"), storeId: store?.id })} className="absolute inset-x-3 bottom-3 hidden min-h-11 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-[11px] font-semibold uppercase tracking-[.14em] text-background transition hover:bg-primary disabled:opacity-50 md:flex md:translate-y-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
            <Plus className="h-3.5 w-3.5" /> {unavailable ? "Out of stock" : "Quick add"}
          </button>
        )}
      </div>
      <div className="px-1 pt-4">
        <Link href={href} className="block truncate text-[15px] font-semibold tracking-[-.015em] text-foreground">{product.name}</Link>
        <div className="mt-1 flex items-center justify-between gap-3 text-sm">
          <span className="truncate text-xs text-muted-foreground">{product.category || product.type}</span>
          <span className="shrink-0 font-semibold text-foreground">৳{product.price.toLocaleString()}</span>
        </div>
      </div>
    </article>
  );
}
