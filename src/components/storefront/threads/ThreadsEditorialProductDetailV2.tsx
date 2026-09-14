"use client";

import { useMemo, useState } from "react";
import {
  Heart,
  Leaf,
  Minus,
  Plus,
  RotateCcw,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/data/products";
import { useCart } from "@/context/useCart";
import { useWishlist } from "@/context/wishlist-context";
import { useOptionalStore } from "@/components/storefront/store-context";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { useStoreProductPresentation } from "@/components/storefront/product/useStoreProductPresentation";
import {
  getRenderableColorOptions,
  getRenderableMetricOptionGroups,
  getRenderableSizeOptions,
} from "@/lib/cms/storefront-product-presentation";
import { useProducts } from "@/hooks/useProducts";
import { ThreadsProductCard } from "@/components/storefront/threads/ThreadsProductCard";
import { useNavigate } from "@/lib/react-router-dom-shim";
import { saveBuyNowPayload } from "@/lib/storefront-buy-now";
import {
  buildCustomerAuthPath,
  resolveAllowGuestCheckoutForStore,
} from "@/lib/storefront-customer-access";
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

function swatchColor(value: string) {
  const key = value.trim().toLowerCase();
  const known: Record<string, string> = {
    black: "#171816",
    white: "#f7f4eb",
    cream: "#eee5d2",
    beige: "#d6c7aa",
    charcoal: "#353936",
    navy: "#1d2d3d",
    olive: "#6b7040",
    "olive green": "#6b7040",
    "bottle green": "#123f32",
    green: "#315d45",
    emerald: "#1d684c",
    maroon: "#6a2930",
    red: "#a53d34",
    rust: "#a55437",
    terracotta: "#b65f45",
    mustard: "#bd8b2d",
    yellow: "#d8a833",
    blue: "#41657d",
    "sky blue": "#9bc1d2",
    pink: "#d5a0a8",
  };
  return known[key] ?? value;
}

const assuranceItems = [
  {
    icon: Truck,
    title: "Tracked delivery",
    text: "Delivery choices are confirmed at checkout.",
  },
  {
    icon: RotateCcw,
    title: "Easy returns",
    text: "Eligible orders follow the store return policy.",
  },
  {
    icon: ShieldCheck,
    title: "Secure checkout",
    text: "Protected payment and order processing.",
  },
];

export function ThreadsEditorialProductDetailV2({ product }: { product: Product }) {
  const store = useOptionalStore();
  const navigate = useNavigate();
  const { addItem, setIsCartOpen } = useCart();
  const { isInWishlist, toggleItem } = useWishlist();
  const { specs } = useStoreProductPresentation(product);
  const { data: allProducts = [] } = useProducts(store?.id);
  const sizes = getRenderableSizeOptions(product, specs, "fashion");
  const colors = getRenderableColorOptions(product, specs, "fashion");
  const metricGroups = getRenderableMetricOptionGroups(product, specs, "fashion");
  const images = useMemo(
    () => Array.from(new Set([product.image, ...(product.images ?? [])].filter(Boolean))),
    [product],
  );
  const [activeImage, setActiveImage] = useState(images[0] ?? product.image ?? "");
  const [selectedSize, setSelectedSize] = useState(sizes.length === 1 ? sizes[0] : "");
  const [selectedColor, setSelectedColor] = useState(colors.length === 1 ? colors[0] : "");
  const [selectedMetrics, setSelectedMetrics] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      metricGroups.map((group) => [
        group.key,
        group.options.length === 1 ? group.options[0] : "",
      ]),
    ),
  );
  const [quantity, setQuantity] = useState(1);

  const allowGuestCheckout = resolveAllowGuestCheckoutForStore(store);
  const onSale = Boolean(product.originalPrice && product.originalPrice > product.price);
  const discount = onSale
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;
  const sizeGuideHref = specString(specs, ["size_guide_url", "size_chart_url"]);
  const lowStock = typeof product.stock === "number" && product.stock > 0 && product.stock <= 5;
  const unavailable =
    product.isAvailable === false ||
    (typeof product.stock === "number" && product.stock <= 0);
  const maxQuantity =
    typeof product.stock === "number" && product.stock > 0
      ? Math.min(product.stock, 10)
      : 10;

  const related = allProducts
    .filter(
      (item) =>
        item.id !== product.id &&
        (item.category === product.category || item.type === product.type),
    )
    .slice(0, 4);

  const details = [
    ["Material", stringifyDetail(specs.fabric ?? specs.material)] as [string, string],
    ["Fit", stringifyDetail(specs.fit)] as [string, string],
    ["Print", stringifyDetail(specs.print ?? specs.print_method)] as [string, string],
    ["Care", stringifyDetail(specs.care ?? specs.care_instructions)] as [string, string],
  ].filter(([, value]) => Boolean(value));

  const validateSelection = () => {
    if (sizes.length > 0 && !selectedSize) {
      toast.error("Select a size to continue.");
      return false;
    }
    if (colors.length > 0 && !selectedColor) {
      toast.error("Select a color to continue.");
      return false;
    }
    for (const group of metricGroups) {
      if (group.options.length > 0 && !selectedMetrics[group.key]) {
        toast.error(`Select ${group.label.toLowerCase()} to continue.`);
        return false;
      }
    }
    return true;
  };

  const selection = [
    selectedColor,
    selectedSize,
    ...metricGroups.map((group) => {
      const value = selectedMetrics[group.key];
      return value ? `${group.label}: ${value}` : "";
    }),
  ]
    .filter(Boolean)
    .join(" • ");

  const buildSelectionItems = () =>
    Array.from({ length: quantity }, () => ({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image || activeImage || "",
      size: selection,
      quantity: 1,
      storeId: store?.id,
    }));

  const addToBag = () => {
    if (!validateSelection() || unavailable) return;
    buildSelectionItems().forEach((item) => addItem(item));
    toast.success("Added to bag");
    setIsCartOpen(true);
  };

  const buyNow = () => {
    if (!validateSelection() || unavailable) return;
    const items = buildSelectionItems();
    saveBuyNowPayload(items, store?.id);
    const checkoutPath = storefrontPath("/checkout?buy_now=1", store?.slug);
    navigate(
      allowGuestCheckout
        ? checkoutPath
        : buildCustomerAuthPath(checkoutPath, store?.slug),
    );
  };

  return (
    <>
      <section className="border-b border-border/60 bg-background">
        <div className="mx-auto max-w-[1320px] px-4 pb-12 pt-2 sm:px-6 md:px-8 md:pb-16 lg:pt-4">
          <div className="grid gap-9 lg:grid-cols-[minmax(0,1.12fr)_minmax(390px,.72fr)] lg:gap-14 xl:gap-20">
            <div className="min-w-0">
              <div className="grid gap-3 md:grid-cols-[76px_minmax(0,1fr)] md:gap-4">
                {images.length > 1 ? (
                  <div className="order-2 flex gap-2 overflow-x-auto pb-1 md:order-1 md:flex-col md:overflow-visible md:pb-0">
                    {images.slice(0, 6).map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setActiveImage(image)}
                        aria-pressed={activeImage === image}
                        className={`relative aspect-[4/5] w-[66px] shrink-0 overflow-hidden rounded-[2px] border bg-secondary transition md:w-full ${
                          activeImage === image
                            ? "border-primary ring-1 ring-primary"
                            : "border-border/65 hover:border-primary/55"
                        }`}
                      >
                        <SafeStorefrontImage
                          src={image}
                          alt={`${product.name} view ${index + 1}`}
                          fill
                          sizes="76px"
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="order-1 md:order-2">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[3px] bg-secondary">
                    {activeImage ? (
                      <SafeStorefrontImage
                        src={activeImage}
                        alt={product.name}
                        fill
                        priority
                        sizes="(min-width: 1024px) 55vw, 100vw"
                        className="object-cover"
                      />
                    ) : null}
                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      {onSale ? (
                        <span className="rounded-[2px] bg-accent px-2.5 py-1 text-[8px] font-bold uppercase tracking-[.14em] text-accent-foreground">
                          {discount}% off
                        </span>
                      ) : (
                        <span className="rounded-[2px] bg-primary px-2.5 py-1 text-[8px] font-bold uppercase tracking-[.14em] text-primary-foreground">
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="border-b border-border pb-6">
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0">
                    <p className="mb-3 text-[8px] font-bold uppercase tracking-[.24em] text-primary">
                      {product.category || product.type || "Threads collection"}
                    </p>
                    <h1 className="font-serif text-[43px] font-semibold leading-[.86] tracking-[-.05em] sm:text-[50px] md:text-[56px]">
                      {product.name}
                    </h1>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleItem(product.id)}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-background transition hover:border-primary hover:text-primary"
                    aria-label={
                      isInWishlist(product.id)
                        ? "Remove from wishlist"
                        : "Add to wishlist"
                    }
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        isInWishlist(product.id) ? "fill-current text-primary" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-5 flex items-baseline gap-3">
                  <span className="text-[24px] font-semibold text-primary">
                    ৳{product.price.toLocaleString()}
                  </span>
                  {onSale ? (
                    <span className="text-[12px] text-muted-foreground line-through">
                      ৳{product.originalPrice!.toLocaleString()}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.08em]">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      unavailable ? "bg-destructive" : "bg-primary"
                    }`}
                  />
                  <span className="text-foreground/70">
                    {unavailable
                      ? "Out of stock"
                      : lowStock
                        ? `Only ${product.stock} left`
                        : "Ready to order"}
                  </span>
                </div>

                {product.description ? (
                  <p className="mt-5 max-w-[540px] text-[12px] leading-6 text-foreground/70 md:text-[13px]">
                    {product.description}
                  </p>
                ) : null}
              </div>

              {colors.length > 0 ? (
                <div className="border-b border-border py-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[.15em]">Color</p>
                    <span className="text-[10px] text-muted-foreground">
                      {selectedColor || "Choose a color"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        title={color}
                        aria-label={`Choose ${color}`}
                        aria-pressed={selectedColor === color}
                        className={`grid h-11 min-w-11 place-items-center rounded-full border bg-background p-1 transition ${
                          selectedColor === color
                            ? "border-primary ring-1 ring-primary"
                            : "border-border hover:border-primary/60"
                        }`}
                      >
                        <span
                          className="block h-7 w-7 rounded-full border border-black/10"
                          style={{ backgroundColor: swatchColor(color) }}
                        />
                      </button>
                    ))}
                  </div>
                  {colors.length > 1 && !selectedColor ? (
                    <p className="mt-2.5 text-[10px] text-muted-foreground">
                      Choose a color before adding to bag.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {sizes.length > 0 ? (
                <div className="border-b border-border py-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[.15em]">Size</p>
                    {sizeGuideHref ? (
                      <a
                        href={sizeGuideHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center gap-1.5 py-3 text-[10px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
                      >
                        <Ruler className="h-3.5 w-3.5" /> Size guide
                      </a>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        aria-pressed={selectedSize === size}
                        className={`min-h-11 rounded-[2px] border px-2 text-[10px] font-bold transition ${
                          selectedSize === size
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:border-primary"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  {sizes.length > 1 && !selectedSize ? (
                    <p className="mt-2.5 text-[10px] text-muted-foreground">
                      Choose your size before adding to bag.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {metricGroups.map((group) => (
                <div key={group.key} className="border-b border-border py-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[.15em]">
                      {group.label}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {selectedMetrics[group.key] || `Choose ${group.label.toLowerCase()}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {group.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          setSelectedMetrics((current) => ({
                            ...current,
                            [group.key]: option,
                          }))
                        }
                        aria-pressed={selectedMetrics[group.key] === option}
                        className={`min-h-11 rounded-[2px] border px-3 text-[10px] font-bold transition ${
                          selectedMetrics[group.key] === option
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:border-primary"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {group.options.length > 1 && !selectedMetrics[group.key] ? (
                    <p className="mt-2.5 text-[10px] text-muted-foreground">
                      Choose {group.label.toLowerCase()} before adding to bag.
                    </p>
                  ) : null}
                </div>
              ))}

              <div className="py-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <p className="text-[10px] font-bold uppercase tracking-[.15em]">Quantity</p>
                  <div className="flex h-12 items-center overflow-hidden rounded-[2px] border border-border bg-background">
                    <button
                      type="button"
                      onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                      disabled={quantity <= 1 || unavailable}
                      className="grid h-full w-11 place-items-center hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-9 text-center text-[10px] font-bold">{quantity}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((value) => Math.min(maxQuantity, value + 1))
                      }
                      disabled={quantity >= maxQuantity || unavailable}
                      className="grid h-full w-11 place-items-center hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addToBag}
                  disabled={unavailable}
                  className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-[2px] bg-primary px-5 py-4 text-[10px] font-bold uppercase tracking-[.13em] text-primary-foreground transition hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {unavailable
                    ? "Out of stock"
                    : `Add to bag · ৳${(product.price * quantity).toLocaleString()}`}
                </button>
                <button
                  type="button"
                  onClick={buyNow}
                  disabled={unavailable}
                  className="mt-2.5 min-h-12 w-full rounded-[2px] border border-primary bg-background px-5 py-3 text-[10px] font-bold uppercase tracking-[.13em] text-primary transition hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Buy now
                </button>
                {!allowGuestCheckout ? (
                  <p className="mt-2.5 text-[10px] leading-5 text-muted-foreground">
                    This store asks customers to sign in before checkout.
                  </p>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-secondary/35">
        <div className="mx-auto grid max-w-[1320px] grid-cols-1 divide-y divide-border/60 px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0 md:px-8">
          {assuranceItems.map(({ icon: Icon, title, text: copy }) => (
            <div
              key={title}
              className="flex items-start gap-3 py-6 md:px-6 md:py-7 first:md:pl-0 last:md:pr-0"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-primary/25 text-primary">
                <Icon className="h-4 w-4 stroke-[1.5]" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.11em]">{title}</p>
                <p className="mt-1 text-[8px] leading-4 text-muted-foreground md:text-[9px]">
                  {copy}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-background py-12 md:py-16">
        <div className="mx-auto grid max-w-[1120px] gap-8 px-4 sm:px-6 md:grid-cols-[.78fr_1.22fr] md:px-8">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Leaf className="h-4 w-4" />
              <span className="text-[8px] font-bold uppercase tracking-[.18em]">
                Made to be lived in
              </span>
            </div>
            <h2 className="mt-3 font-serif text-[34px] font-semibold leading-[.9] tracking-[-.035em] md:text-[44px]">
              The details matter.
            </h2>
          </div>

          <div>
            {product.description ? (
              <p className="max-w-[680px] text-[12px] leading-6 text-foreground/72 md:text-[13px]">
                {product.description}
              </p>
            ) : (
              <p className="max-w-[680px] text-[12px] leading-6 text-foreground/72 md:text-[13px]">
                A considered everyday piece from this collection.
              </p>
            )}
            {details.length > 0 ? (
              <dl className="mt-7 grid gap-x-8 gap-y-0 border-t border-border sm:grid-cols-2">
                {details.map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[78px_1fr] gap-3 border-b border-border py-4 text-[10px] leading-5 md:text-[11px]"
                  >
                    <dt className="font-bold text-primary">{label}</dt>
                    <dd className="text-foreground/68">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="border-t border-border/60 bg-background py-12 md:py-16">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8">
            <div className="mb-7 flex items-end justify-between gap-4 md:mb-9">
              <div>
                <p className="mb-2 text-[8px] font-bold uppercase tracking-[.22em] text-primary">
                  Keep exploring
                </p>
                <h2 className="font-serif text-[34px] font-semibold leading-none tracking-[-.035em] md:text-[44px]">
                  You may also like
                </h2>
              </div>
              <a
                href={storefrontPath("/shop", store?.slug)}
                className="inline-flex min-h-11 items-center py-3 text-[10px] font-bold text-primary"
              >
                View all →
              </a>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 md:gap-x-5">
              {related.map((item) => (
                <ThreadsProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
