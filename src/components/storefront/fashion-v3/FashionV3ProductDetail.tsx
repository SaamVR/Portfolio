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
import { useNavigate } from "@/lib/react-router-dom-shim";
import { saveBuyNowPayload } from "@/lib/storefront-buy-now";
import { buildCustomerAuthPath, resolveAllowGuestCheckoutForStore } from "@/lib/storefront-customer-access";
import { storefrontPath } from "@/lib/slug";

function stringifyDetail(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).join(", ");
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

function specString(specs: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = specs[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function FashionV3ProductDetail({ product }: { product: Product }) {
  const store = useOptionalStore();
  const navigate = useNavigate();
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
  const allowGuestCheckout = resolveAllowGuestCheckoutForStore(store);
  const related = allProducts.filter((item) => item.id !== product.id && (item.category === product.category || item.type === product.type)).slice(0, 4);
  const sizeGuideHref = specString(specs, ["size_guide_url", "size_chart_url"]);
  const details = [
    ["Fabric", stringifyDetail(specs.fabric ?? specs.material)] as [string, string],
    ["Fit", stringifyDetail(specs.fit)] as [string, string],
    ["Care", stringifyDetail(specs.care ?? specs.care_instructions)] as [string, string],
  ].filter(([, value]) => Boolean(value));

  const validateSelection = () => {
    if (sizes.length > 0 && !selectedSize) {
      toast.error("Select a size to continue.");
      return false;
    }
    return true;
  };

  const selection = [selectedSize, selectedColor].filter(Boolean).join(" • ");
  const buildSelectionItems = () => Array.from({ length: quantity }, () => ({
    productId: product.id,
    name: product.name,
    price: product.price,
    image: product.image || images[0] || "",
    size: selection,
    quantity: 1,
    storeId: store?.id,
  }));

  const addToBag = () => {
    if (!validateSelection()) return;
    buildSelectionItems().forEach((item) => addItem(item));
    toast.success("Added to bag");
    setIsCartOpen(true);
  };

  const buyNow = () => {
    if (!validateSelection()) return;
    const items = buildSelectionItems();
    saveBuyNowPayload(items, store?.id);
    const checkoutPath = storefrontPath("/checkout?buy_now=1", store?.slug);
    navigate(allowGuestCheckout ? checkoutPath : buildCustomerAuthPath(checkoutPath, store?.slug));
  };

  return (
    <>
      <section className="mx-auto max-w-[1500px] px-4 py-5 md:px-8 md:py-10 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)] lg:gap-12">
          <div className="min-w-0">
            <div className="grid gap-1 md:grid-cols-2">
              {images.map((image, index) => <div key={`${image}-${index}`} className={`${index === 0 && images.length === 1 ? "md:col-span-2" : ""} relative aspect-[4/5] overflow-hidden bg-muted`}><SafeStorefrontImage src={image} alt={`${product.name} ${index + 1}`} fill priority={index < 2} className="object-cover" /></div>)}
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border-b border-border pb-6">
              <div className="flex items-start justify-between gap-4"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{product.category || product.type}</p><h1 className="text-3xl font-semibold leading-[0.98] tracking-[-0.045em] md:text-4xl">{product.name}</h1></div><button onClick={() => toggleItem(product.id)} className="grid h-11 w-11 shrink-0 place-items-center border border-border" aria-label="Toggle wishlist"><Heart className={`h-5 w-5 ${isInWishlist(product.id) ? "fill-current text-primary" : ""}`} /></button></div>
              <div className="mt-5 flex items-baseline gap-3"><span className="text-xl font-semibold">BDT {product.price.toLocaleString()}</span>{onSale ? <span className="text-sm text-muted-foreground line-through">BDT {product.originalPrice!.toLocaleString()}</span> : null}</div>
            </div>

            {colors.length > 0 ? <div className="border-b border-border py-6"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.12em]">Color</p><span className="text-xs text-muted-foreground">{selectedColor}</span></div><div className="flex flex-wrap gap-2">{colors.map((color) => <button key={color} onClick={() => setSelectedColor(color)} title={color} className={`h-9 w-9 rounded-full border p-[3px] ${selectedColor === color ? "border-primary ring-1 ring-primary" : "border-border"}`}><span className="block h-full w-full rounded-full border border-border" style={{ backgroundColor: color.toLowerCase() === "white" ? "#f4f4f4" : color }} /></button>)}</div></div> : null}

            {sizes.length > 0 ? <div className="border-b border-border py-6"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.12em]">Size</p>{sizeGuideHref ? <a href={sizeGuideHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"><Ruler className="h-3.5 w-3.5" /> Size guide</a> : null}</div><div className="grid grid-cols-5 gap-2">{sizes.map((size) => <button key={size} type="button" onClick={() => setSelectedSize(size)} className={`min-h-11 border text-xs font-medium ${selectedSize === size ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent"}`}>{size}</button>)}</div></div> : null}

            <div className="py-6">
              <div className="mb-4 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.12em]">Quantity</span><div className="flex h-10 items-center border border-border"><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid h-full w-10 place-items-center" aria-label="Decrease quantity"><Minus className="h-3.5 w-3.5" /></button><span className="w-8 text-center text-sm">{quantity}</span><button type="button" onClick={() => setQuantity((value) => Math.min(10, value + 1))} className="grid h-full w-10 place-items-center" aria-label="Increase quantity"><Plus className="h-3.5 w-3.5" /></button></div></div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={addToBag} disabled={product.isAvailable === false} className="min-h-12 bg-primary px-5 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40">{product.isAvailable === false ? "Out of stock" : `Add to bag · BDT ${(product.price * quantity).toLocaleString()}`}</button>
                <button type="button" onClick={buyNow} disabled={product.isAvailable === false} className="min-h-12 border border-foreground/25 bg-background px-5 text-xs font-semibold uppercase tracking-[0.12em] text-foreground transition hover:border-foreground hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40">Buy now</button>
              </div>
              {!allowGuestCheckout ? <p className="mt-3 text-xs leading-5 text-muted-foreground">This store asks customers to sign in before checkout.</p> : null}
            </div>

            <div className="border-t border-border py-6"><h2 className="text-xs font-semibold uppercase tracking-[0.12em]">Details</h2>{product.description ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{product.description}</p> : null}{details.length > 0 ? <dl className="mt-5 space-y-3">{details.map(([label, value]) => <div key={label} className="grid grid-cols-[80px_1fr] gap-4 border-t border-border pt-3 text-sm"><dt className="text-primary">{label}</dt><dd>{value}</dd></div>)}</dl> : null}</div>
            <div className="border-t border-border py-5 text-xs leading-5 text-muted-foreground"><p>Delivery options are shown at checkout.</p><p>Returns and support terms follow this store&apos;s published policies.</p></div>
          </aside>
        </div>
      </section>

      {related.length > 0 ? <section className="border-t border-border py-14 md:py-20"><div className="mx-auto max-w-[1500px] px-5 md:px-8 lg:px-12"><div className="mb-8 flex items-end justify-between"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">You may also like</p><h2 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">More from the collection</h2></div></div><div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-5">{related.map((item) => <FashionV3ProductCard key={item.id} product={item} />)}</div></div></section> : null}
    </>
  );
}
