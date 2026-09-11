"use client";

import { useMemo, useState } from "react";
import { Heart, Minus, Plus, Ruler } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/data/products";
import { useCart } from "@/context/useCart";
import { useWishlist } from "@/context/wishlist-context";
import { useOptionalStore } from "@/components/storefront/store-context";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { useStoreProductPresentation } from "@/components/storefront/product/useStoreProductPresentation";
import { getRenderableColorOptions, getRenderableSizeOptions } from "@/lib/cms/storefront-product-presentation";
import { useProducts } from "@/hooks/useProducts";
import { FashionV3ProductCard } from "@/components/storefront/fashion-v3/FashionV3ProductCard";

function stringifyDetail(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join(", ");
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

export function FashionV3ProductDetail({ product }: { product: Product }) {
  const store = useOptionalStore();
  const { addItem, setIsCartOpen } = useCart();
  const { isInWishlist, toggleItem } = useWishlist();
  const { specs } = useStoreProductPresentation(product);
  const { data: allProducts = [] } = useProducts(store?.id);
  const sizes = getRenderableSizeOptions(product, specs, "fashion");
  const colors = getRenderableColorOptions(product, specs, "fashion");
  const [selectedSize, setSelectedSize] = useState(sizes[0] ?? "");
  const [selectedColor, setSelectedColor] = useState(colors[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const images = useMemo(() => Array.from(new Set([product.image, ...(product.images ?? [])].filter(Boolean))), [product]);
  const onSale = Boolean(product.originalPrice && product.originalPrice > product.price);
  const related = allProducts.filter((item) => item.id !== product.id && (item.category === product.category || item.type === product.type)).slice(0, 4);
  const details = [
    ["Fabric", stringifyDetail(specs.fabric ?? specs.material)] as [string, string],
    ["Fit", stringifyDetail(specs.fit)] as [string, string],
    ["Care", stringifyDetail(specs.care ?? specs.care_instructions)] as [string, string],
  ].filter(([, value]) => Boolean(value));

  const addToBag = () => {
    if (sizes.length > 0 && !selectedSize) {
      toast.error("Select a size first");
      return;
    }
    const option = [selectedSize, selectedColor].filter(Boolean).join(" • ") || undefined;
    for (let index = 0; index < quantity; index += 1) {
      addItem({ productId: product.id, name: product.name, price: product.price, image: product.image || images[0] || "", size: option || "", storeId: store?.id });
    }
    toast.success("Added to bag");
    setIsCartOpen(true);
  };

  return (
    <>
      <section className="mx-auto max-w-[1500px] px-4 py-5 md:px-8 md:py-10 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)] lg:gap-12">
          <div className="min-w-0">
            <div className="grid gap-1 md:grid-cols-2">
              {images.map((image, index) => <div key={`${image}-${index}`} className={`${index === 0 && images.length === 1 ? "md:col-span-2" : ""} relative aspect-[4/5] overflow-hidden bg-[#ededE9]`}><SafeStorefrontImage src={image} alt={`${product.name} ${index + 1}`} fill priority={index < 2} className="object-cover" /></div>)}
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border-b border-black/10 pb-6">
              <div className="flex items-start justify-between gap-4"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">{product.category || product.type}</p><h1 className="text-3xl font-semibold leading-[0.98] tracking-[-0.045em] md:text-4xl">{product.name}</h1></div><button onClick={() => toggleItem(product.id)} className="grid h-11 w-11 shrink-0 place-items-center border border-black/10" aria-label="Toggle wishlist"><Heart className={`h-5 w-5 ${isInWishlist(product.id) ? "fill-current" : ""}`} /></button></div>
              <div className="mt-5 flex items-baseline gap-3"><span className="text-xl font-semibold">BDT {product.price.toLocaleString()}</span>{onSale ? <span className="text-sm text-black/40 line-through">BDT {product.originalPrice!.toLocaleString()}</span> : null}</div>
            </div>

            {colors.length > 0 ? <div className="border-b border-black/10 py-6"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.12em]">Color</p><span className="text-xs text-black/50">{selectedColor}</span></div><div className="flex flex-wrap gap-2">{colors.map((color) => <button key={color} onClick={() => setSelectedColor(color)} title={color} className={`h-9 w-9 rounded-full border p-[3px] ${selectedColor === color ? "border-black" : "border-black/15"}`}><span className="block h-full w-full rounded-full border border-black/10" style={{ backgroundColor: color.toLowerCase() === "white" ? "#f4f4f4" : color }} /></button>)}</div></div> : null}

            {sizes.length > 0 ? <div className="border-b border-black/10 py-6"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.12em]">Size</p><button className="inline-flex items-center gap-1 text-xs text-black/50 underline underline-offset-4"><Ruler className="h-3.5 w-3.5" /> Size guide</button></div><div className="grid grid-cols-5 gap-2">{sizes.map((size) => <button key={size} onClick={() => setSelectedSize(size)} className={`min-h-11 border text-xs font-medium ${selectedSize === size ? "border-black bg-black text-white" : "border-black/15 bg-transparent"}`}>{size}</button>)}</div></div> : null}

            <div className="py-6">
              <div className="mb-4 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.12em]">Quantity</span><div className="flex h-10 items-center border border-black/15"><button onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid h-full w-10 place-items-center" aria-label="Decrease quantity"><Minus className="h-3.5 w-3.5" /></button><span className="w-8 text-center text-sm">{quantity}</span><button onClick={() => setQuantity((value) => value + 1)} className="grid h-full w-10 place-items-center" aria-label="Increase quantity"><Plus className="h-3.5 w-3.5" /></button></div></div>
              <button onClick={addToBag} disabled={product.isAvailable === false} className="min-h-13 w-full bg-black px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#2a2a2a] disabled:bg-black/30">{product.isAvailable === false ? "Out of stock" : `Add to bag · BDT ${(product.price * quantity).toLocaleString()}`}</button>
            </div>

            <div className="border-t border-black/10 py-6"><h2 className="text-xs font-semibold uppercase tracking-[0.12em]">Details</h2>{product.description ? <p className="mt-4 text-sm leading-6 text-black/60">{product.description}</p> : null}{details.length > 0 ? <dl className="mt-5 space-y-3">{details.map(([label, value]) => <div key={label} className="grid grid-cols-[80px_1fr] gap-4 border-t border-black/10 pt-3 text-sm"><dt className="text-black/45">{label}</dt><dd>{value}</dd></div>)}</dl> : null}</div>
            <div className="border-t border-black/10 py-5 text-xs leading-5 text-black/50"><p>Delivery options are shown at checkout.</p><p>Returns and support terms follow this store&apos;s published policies.</p></div>
          </aside>
        </div>
      </section>

      {related.length > 0 ? <section className="border-t border-black/10 py-14 md:py-20"><div className="mx-auto max-w-[1500px] px-5 md:px-8 lg:px-12"><div className="mb-8 flex items-end justify-between"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">You may also like</p><h2 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">More from the collection</h2></div></div><div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-5">{related.map((item) => <FashionV3ProductCard key={item.id} product={item} />)}</div></div></section> : null}
    </>
  );
}
