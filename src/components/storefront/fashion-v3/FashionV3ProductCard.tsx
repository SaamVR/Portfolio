"use client";

import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import type { Product } from "@/data/products";
import { useCart } from "@/context/useCart";
import { useWishlist } from "@/context/wishlist-context";
import { useOptionalStore } from "@/components/storefront/store-context";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { useStoreProductPresentation } from "@/components/storefront/product/useStoreProductPresentation";
import { getPrimaryProductOptionValue, getRenderableColorOptions } from "@/lib/cms/storefront-product-presentation";
import { productUrl } from "@/lib/slug";

export function FashionV3ProductCard({ product }: { product: Product }) {
  const store = useOptionalStore();
  const { addItem } = useCart();
  const { isInWishlist, toggleItem } = useWishlist();
  const { specs } = useStoreProductPresentation(product);
  const href = productUrl(product.id, product.name, store?.slug);
  const colors = getRenderableColorOptions(product, specs, "fashion").slice(0, 4);
  const onSale = Boolean(product.originalPrice && product.originalPrice > product.price);

  return (
    <article className="group min-w-0">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#f1f1ef]">
        <Link href={href} aria-label={product.name} className="absolute inset-0 block">
          <SafeStorefrontImage src={product.image} alt={product.name} fill className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]" />
        </Link>
        {onSale ? <span className="absolute left-3 top-3 z-10 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-black">Sale</span> : null}
        <button
          type="button"
          onClick={() => toggleItem(product.id)}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center bg-white/92 text-black transition hover:bg-white"
          aria-label={isInWishlist(product.id) ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        >
          <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? "fill-current" : ""}`} />
        </button>
        <button
          type="button"
          onClick={() => addItem({
            productId: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            size: getPrimaryProductOptionValue(product, specs, "fashion"),
            storeId: store?.id,
          })}
          className="absolute inset-x-3 bottom-3 z-10 hidden min-h-11 items-center justify-center gap-2 bg-black px-4 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#242424] md:flex md:translate-y-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
        >
          <Plus className="h-3.5 w-3.5" /> Quick add
        </button>
      </div>

      <div className="pt-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={href} className="block truncate text-[15px] font-medium leading-5 text-[#171717] hover:underline hover:underline-offset-4">{product.name}</Link>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#777]">{product.category || product.type}</p>
          </div>
          <div className="shrink-0 text-right text-sm font-semibold text-[#171717]">
            BDT {product.price.toLocaleString()}
            {onSale ? <div className="mt-0.5 text-[11px] font-normal text-[#888] line-through">BDT {product.originalPrice!.toLocaleString()}</div> : null}
          </div>
        </div>
        {colors.length > 0 ? (
          <div className="mt-2 flex items-center gap-1.5">
            {colors.map((color) => <span key={color} title={color} className="h-3 w-3 rounded-full border border-black/15" style={{ backgroundColor: color.toLowerCase() === "white" ? "#f4f4f4" : color }} />)}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => addItem({ productId: product.id, name: product.name, price: product.price, image: product.image, size: getPrimaryProductOptionValue(product, specs, "fashion"), storeId: store?.id })}
          className="mt-3 flex min-h-11 w-full items-center justify-center border border-[#171717] bg-white px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#171717] md:hidden"
        >
          Quick add
        </button>
      </div>
    </article>
  );
}
