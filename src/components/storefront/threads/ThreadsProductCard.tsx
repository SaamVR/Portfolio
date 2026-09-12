"use client";

import Link from "next/link";
import { Eye, Heart, Plus } from "lucide-react";
import type { Product } from "@/data/products";
import { useCart } from "@/context/useCart";
import { useWishlist } from "@/context/wishlist-context";
import { useOptionalStore } from "@/components/storefront/store-context";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { useStoreProductPresentation } from "@/components/storefront/product/useStoreProductPresentation";
import { getPrimaryProductOptionValue, getRenderableSizeOptions } from "@/lib/cms/storefront-product-presentation";
import { productUrl } from "@/lib/slug";

export function ThreadsProductCard({ product, framed = false, onQuickView }: { product: Product; framed?: boolean; onQuickView?: (product: Product) => void }) {
  const store = useOptionalStore();
  const { addItem } = useCart();
  const { isInWishlist, toggleItem } = useWishlist();
  const { specs } = useStoreProductPresentation(product);
  const href = productUrl(product.id, product.name, store?.slug);
  const sizes = getRenderableSizeOptions(product, specs, "fashion");
  const requiresChoice = sizes.length > 1;
  const unavailable = product.isAvailable === false;
  const onSale = Boolean(product.originalPrice && product.originalPrice > product.price);

  return <article className={`group min-w-0 ${framed ? "rounded-md bg-[hsl(var(--muted))] p-2 shadow-[0_10px_24px_rgba(0,0,0,.18)]" : ""}`}>
    <div className={`relative overflow-hidden bg-secondary ${framed ? "aspect-[4/5] rounded-[3px]" : "aspect-[4/5] rounded-sm"}`}>
      <Link href={href} aria-label={product.name} className="absolute inset-0"><SafeStorefrontImage src={product.image} alt={product.name} fill className="object-cover transition duration-500 group-hover:scale-[1.025]" /></Link>
      {onSale ? <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.12em] text-primary-foreground">Sale</span> : null}
      <button type="button" onClick={() => toggleItem(product.id)} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-background/88" aria-label={isInWishlist(product.id) ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}><Heart className={`h-3.5 w-3.5 ${isInWishlist(product.id) ? "fill-current text-primary" : ""}`} /></button>
      {requiresChoice ? <Link href={href} className="absolute inset-x-2 bottom-2 hidden h-9 items-center justify-center bg-foreground px-3 text-[9px] font-semibold uppercase tracking-[.1em] text-background opacity-0 transition group-hover:opacity-100 md:flex">Choose options</Link> : <button type="button" disabled={unavailable} onClick={() => addItem({ productId: product.id, name: product.name, price: product.price, image: product.image, size: getPrimaryProductOptionValue(product, specs, "fashion"), storeId: store?.id })} className="absolute inset-x-2 bottom-2 hidden h-9 items-center justify-center gap-1 bg-foreground px-3 text-[9px] font-semibold uppercase tracking-[.1em] text-background opacity-0 transition group-hover:opacity-100 disabled:opacity-50 md:flex"><Plus className="h-3 w-3" />{unavailable ? "Out of stock" : "Quick add"}</button>}
    </div>
    <div className={`${framed ? "px-0.5 pb-1 pt-2 text-primary-foreground" : "px-0.5 pt-2"}`}>
      <Link href={href} className="block truncate text-[11px] font-medium">{product.name}</Link>
      <div className="mt-0.5 flex items-center justify-between gap-2"><span className={`truncate text-[9px] ${framed ? "text-primary-foreground/65" : "text-muted-foreground"}`}>{product.category || product.type}</span><span className="shrink-0 text-[11px] font-semibold">৳{product.price.toLocaleString()}</span></div>
      {!framed && onQuickView ? <button type="button" onClick={() => onQuickView(product)} className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 border border-border bg-background text-[9px] font-semibold uppercase tracking-[.1em] text-foreground transition hover:border-primary hover:bg-primary hover:text-primary-foreground"><Eye className="h-3.5 w-3.5" />Quick view</button> : null}
    </div>
  </article>;
}
