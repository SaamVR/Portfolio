"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useCart } from "@/context/useCart";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/data/products";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
import { generateCloudinarySrcSet } from "@/lib/cms/cloudinary-responsive";
import { storefrontPath } from "@/lib/slug";
import { cn } from "@/lib/utils";

type HeroBlockProps = {
  tagline?: string;
  title?: string;
  highlight?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
};

type TrustBadgesProps = {
  title?: string;
  badges?: Array<{ label?: string; description?: string; icon?: "truck" | "payment" | "returns" | "support" | "shield" }>;
};

type CountdownBlockProps = {
  title?: string;
  subtitle?: string;
  endDate?: string;
  ctaText?: string;
  ctaLink?: string;
};

type FeaturedBlockProps = {
  title?: string;
  tagline?: string;
};

type TestimonialBlockProps = {
  title?: string;
  subtitle?: string;
  reviews?: Array<{ name?: string; rating?: number; comment?: string }>;
};

type DeliverySettings = {
  enabled?: boolean;
  free_threshold?: number;
  delivery_fee?: number;
  primary_zone_label?: string;
  secondary_zone_label?: string;
};

type ContactSettings = {
  phone?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
};

type PublicReviewRow = {
  id: string | null;
  product_id: string | null;
  author_name: string | null;
  rating: number | null;
  created_at: string | null;
  review_text: string | null;
};

type ReviewStats = {
  count: number;
  average: number;
};

type DealTimer = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
};

function getHomepageBlock<TProps extends Record<string, unknown>>(blocks: StorePageBlock[], type: StorePageBlock["type"]) {
  return blocks.find((block) => block.type === type)?.props as TProps | undefined;
}

function buildReviewStats(rows: PublicReviewRow[]) {
  const stats: Record<string, ReviewStats> = {};

  rows.forEach((row) => {
    if (!row.product_id || typeof row.rating !== "number") {
      return;
    }

    const current = stats[row.product_id] ?? { count: 0, average: 0 };
    const nextCount = current.count + 1;
    stats[row.product_id] = {
      count: nextCount,
      average: ((current.average * current.count) + row.rating) / nextCount,
    };
  });

  return stats;
}

function resolveDealTimer(targetDate?: string): DealTimer {
  const deadline = targetDate ? new Date(targetDate).getTime() : Number.NaN;
  const fallback = { days: "03", hours: "12", minutes: "45", seconds: "00" };

  if (!Number.isFinite(deadline)) {
    return fallback;
  }

  const diff = Math.max(0, deadline - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

function buildBenefitPoints(product: Product, storeName?: string) {
  const descriptionPoints = product.description
    .split(/[.!?]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3);

  const points = [
    ...descriptionPoints,
    product.colors.length > 0 ? `${product.colors.length} finish option${product.colors.length === 1 ? "" : "s"} available` : "",
    product.sizes.length > 0 ? `${product.sizes.length} size option${product.sizes.length === 1 ? "" : "s"} ready to order` : "",
    storeName ? `Fulfilled directly by ${storeName}` : "Merchant-managed fulfillment and support",
  ].filter(Boolean);

  return points.slice(0, 6);
}

function pickFlagshipProduct(featuredProducts: Product[], availableProducts: Product[]) {
  return featuredProducts[0] ?? availableProducts[0] ?? null;
}

function resolveColorChip(color: string) {
  const value = color.trim().toLowerCase();
  if (value === "white" || value === "cream" || value === "ivory") return "#f5f2ea";
  if (value === "black") return "#1f2937";
  if (value === "navy") return "#1e3a8a";
  if (value === "green") return "#22a15f";
  return color;
}

function SingleProductSectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-foreground sm:text-[2.55rem]">
        {title}
      </h2>
    </div>
  );
}

function DetailGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {images.map((image, index) => (
        <div key={`${image}-${index}`} className="overflow-hidden rounded-[24px] border border-[#eceef0] bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-card">
          <img
            src={image}
            srcSet={generateCloudinarySrcSet(image)}
            sizes="(max-width: 1024px) 44vw, 18vw"
            alt={`${alt} detail ${index + 1}`}
            className="aspect-[1/1] w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

export function SingleProductStorefrontRenderer({
  store,
  page: _page,
  blocks,
}: {
  store: Store;
  page: StorePage;
  blocks: StorePageBlock[];
}) {
  const currentStore = useOptionalStore();
  const activeStore = currentStore ?? store;
  const { addItem } = useCart();
  const purchasePanelRef = useRef<HTMLDivElement | null>(null);
  const [timer, setTimer] = useState<DealTimer>(() => resolveDealTimer());
  const { data: allProducts = [] } = useProducts(activeStore.id);
  const { data: featuredProducts = [] } = useFeaturedProducts(activeStore.id);
  const { data: deliverySettings } = useSiteSettings<DeliverySettings>("delivery_settings", activeStore.id);
  const { data: contactSettings } = useSiteSettings<ContactSettings>("contact_page", activeStore.id);

  const { data: approvedReviews = [] } = useQuery({
    queryKey: ["single-product-homepage-reviews", activeStore.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_product_reviews" as any)
        .select("id, product_id, author_name, rating, created_at, review_text")
        .eq("store_id", activeStore.id)
        .order("created_at", { ascending: false })
        .limit(18);

      if (error) {
        throw error;
      }

      return ((data ?? []) as unknown) as PublicReviewRow[];
    },
    enabled: Boolean(activeStore.id),
    staleTime: 120_000,
  });

  const heroBlock = getHomepageBlock<HeroBlockProps>(blocks, "hero");
  const trustBlock = getHomepageBlock<TrustBadgesProps>(blocks, "trust-badges");
  const countdownBlock = getHomepageBlock<CountdownBlockProps>(blocks, "countdown");
  const featuredBlock = getHomepageBlock<FeaturedBlockProps>(blocks, "featured-products");
  const testimonialBlock = getHomepageBlock<TestimonialBlockProps>(blocks, "testimonials");

  useEffect(() => {
    setTimer(resolveDealTimer(countdownBlock?.endDate));
    const interval = window.setInterval(() => {
      setTimer(resolveDealTimer(countdownBlock?.endDate));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [countdownBlock?.endDate]);

  const availableProducts = useMemo(
    () => allProducts.filter((product) => product.isAvailable !== false),
    [allProducts],
  );
  const flagshipProduct = useMemo(
    () => pickFlagshipProduct(featuredProducts, availableProducts),
    [availableProducts, featuredProducts],
  );
  const galleryImages = useMemo(
    () => {
      if (!flagshipProduct) {
        return [];
      }

      const images = flagshipProduct.images?.length ? flagshipProduct.images : [flagshipProduct.image];
      return Array.from(new Set(images.filter(Boolean))).slice(0, 5);
    },
    [flagshipProduct],
  );
  const reviewStatsByProduct = useMemo(
    () => buildReviewStats(approvedReviews),
    [approvedReviews],
  );
  const flagshipReviewStats = flagshipProduct ? reviewStatsByProduct[flagshipProduct.id] : undefined;
  const benefitPoints = useMemo(
    () => flagshipProduct ? buildBenefitPoints(flagshipProduct, activeStore.name) : [],
    [activeStore.name, flagshipProduct],
  );
  const homepageReviews = useMemo(() => {
    if (approvedReviews.length > 0) {
      return approvedReviews
        .filter((review) => !flagshipProduct || review.product_id === flagshipProduct.id)
        .slice(0, 3);
    }

    return (testimonialBlock?.reviews ?? [])
      .filter((review) => review?.name && review?.comment)
      .slice(0, 3)
      .map((review, index) => ({
        id: `testimonial-${index}`,
        product_id: flagshipProduct?.id ?? null,
        author_name: review.name ?? null,
        rating: review.rating ?? 5,
        created_at: null,
        review_text: review.comment ?? null,
      })) satisfies PublicReviewRow[];
  }, [approvedReviews, flagshipProduct, testimonialBlock?.reviews]);

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setSelectedImage(0);
    setSelectedColor(flagshipProduct?.colors[0] ?? null);
    setSelectedSize(flagshipProduct?.sizes[0] ?? null);
    setQuantity(1);
  }, [flagshipProduct]);

  if (!flagshipProduct) {
    return null;
  }

  const activeImage = galleryImages[selectedImage] ?? flagshipProduct.image;
  const heroEyebrow = heroBlock?.tagline?.trim() || "New launch";
  const heroTitle = heroBlock?.title?.trim() || activeStore.name || "Flagship release";
  const heroHighlight = heroBlock?.highlight?.trim() || flagshipProduct.name;
  const heroSubtitle = heroBlock?.subtitle?.trim() || flagshipProduct.description || activeStore.description || "One focused product page with real pricing, reviews, and live store checkout settings.";
  const heroCta = heroBlock?.ctaText?.trim() || countdownBlock?.ctaText?.trim() || "Preorder now";
  const heroSecondaryCta = heroBlock?.secondaryCtaText?.trim() || "View details";
  const reviewAverage = flagshipReviewStats?.average ?? 4.8;
  const reviewCount = flagshipReviewStats?.count ?? homepageReviews.length;
  const trustItems = trustBlock?.badges?.length
    ? trustBlock.badges.slice(0, 5).map((badge) => ({
        label: badge.label ?? "Store-managed benefit",
        description: badge.description ?? "Configured by this merchant",
        icon: badge.icon === "truck" ? Truck : badge.icon === "payment" ? PackageCheck : ShieldCheck,
      }))
    : [
        { label: "Free shipping", description: deliverySettings?.free_threshold ? `On orders over ৳${deliverySettings.free_threshold.toLocaleString()}` : "Merchant-managed delivery terms", icon: Truck },
        { label: "Flexible return support", description: "Policies remain store-controlled", icon: CheckCircle2 },
        { label: "Secure checkout", description: "Uses the store's real payment setup", icon: ShieldCheck },
        { label: "Merchant support", description: contactSettings?.phone || contactSettings?.email || "Contact details shown at checkout", icon: PackageCheck },
      ];

  const handleAddToCart = () => {
    for (let index = 0; index < quantity; index += 1) {
      addItem({
        productId: flagshipProduct.id,
        name: flagshipProduct.name,
        price: flagshipProduct.price,
        image: activeImage,
        size: selectedSize || flagshipProduct.sizes[0] || "Default",
        storeId: activeStore.id,
      });
    }
  };

  return (
    <div className="bg-[#fbfcfb] text-slate-950 dark:bg-background dark:text-foreground">
      <section className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.08),_transparent_28%),linear-gradient(180deg,_#ffffff_0%,_#fbfcfb_100%)] dark:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)]">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-5 pb-12 pt-8 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10 lg:pb-14 lg:pt-10">
          <div className="max-w-[520px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{heroEyebrow}</p>
            <h1 className="mt-5 max-w-[9ch] text-[3rem] font-semibold leading-[1.03] tracking-[-0.05em] text-slate-950 dark:text-foreground sm:text-[4.25rem]">
              {heroTitle}{" "}
              <span className="text-slate-950 dark:text-foreground">{heroHighlight}</span>
            </h1>
            <p className="mt-4 text-[1.15rem] font-medium text-slate-600 dark:text-muted-foreground">
              {featuredBlock?.title?.trim() || flagshipProduct.category || "Premium flagship product"}
            </p>
            <p className="mt-5 max-w-[42ch] text-base leading-8 text-slate-500 dark:text-muted-foreground">
              {heroSubtitle}
            </p>

            <ul className="mt-7 space-y-3">
              {benefitPoints.slice(0, 3).map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-slate-700 dark:text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 text-primary" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleAddToCart}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_18px_34px_-18px_rgba(34,197,94,0.62)] transition-transform hover:-translate-y-0.5"
              >
                {heroCta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => purchasePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[#dde7df] bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:border-primary/35 dark:border-white/10 dark:bg-card dark:text-foreground"
              >
                {heroSecondaryCta}
              </button>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 text-sm text-slate-500 dark:text-muted-foreground">
              <Clock3 className="h-4 w-4 text-primary" />
              {countdownBlock?.subtitle?.trim() || "Preorders ship once this merchant launches fulfillment for the drop."}
            </div>
          </div>

          <div className="relative min-h-[360px] rounded-[34px] bg-white shadow-[0_28px_70px_-46px_rgba(15,23,42,0.24)] dark:bg-card sm:min-h-[460px] lg:min-h-[540px]">
            <div className="absolute inset-0 rounded-[34px] bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.03),_transparent_58%)]" />
            <div className="absolute inset-[8%] flex items-center justify-center">
              <img
                src={activeImage}
                srcSet={generateCloudinarySrcSet(activeImage)}
                sizes="(max-width: 1024px) 90vw, 45vw"
                alt={flagshipProduct.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-3 md:px-8 lg:px-10">
        <div className="grid gap-4 rounded-[30px] border border-[#ecf0ee] bg-white px-4 py-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.18)] sm:grid-cols-2 lg:grid-cols-5 lg:px-6 dark:border-white/10 dark:bg-card">
          {trustItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 rounded-[22px] px-2 py-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-foreground">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <SingleProductSectionHeading
          eyebrow={featuredBlock?.tagline?.trim() || "Crafted to perfection"}
          title="Every detail matters"
        />
        <DetailGallery images={galleryImages} alt={flagshipProduct.name} />
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <SingleProductSectionHeading
          eyebrow="Why you'll love it"
          title="Engineered for an unrivaled experience"
        />
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {benefitPoints.map((point, index) => (
            <div key={`${point}-${index}`} className="flex gap-4 rounded-[24px] bg-white p-5 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.18)] dark:bg-card">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                {index % 3 === 0 ? <PackageCheck className="h-5 w-5" /> : index % 3 === 1 ? <ShieldCheck className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-foreground">{point}</p>
                <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-muted-foreground">
                  {index === 0
                    ? "Pulled directly from the flagship product description so merchants keep control over product storytelling."
                    : index === 1
                      ? "Color, size, and launch details reflect the actual product data for this store."
                      : "Checkout, delivery, and support continue to follow the merchant's live settings."}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <SingleProductSectionHeading
          eyebrow={testimonialBlock?.subtitle?.trim() || "Loved by customers"}
          title={testimonialBlock?.title?.trim() || "What customers say"}
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {homepageReviews.map((review, index) => (
            <article key={review.id ?? `review-${index}`} className="rounded-[28px] border border-[#edf0ee] bg-white p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-card">
              <div className="flex items-center gap-1 text-primary">
                {Array.from({ length: Math.max(1, Math.min(5, review.rating ?? 5)) }).map((_, starIndex) => (
                  <Star key={starIndex} className="h-4 w-4 fill-current stroke-none" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-8 text-slate-600 dark:text-muted-foreground">
                {review.review_text || `${flagshipProduct.name} gives this merchant a strong flagship product story and clearer conversion path.`}
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {(review.author_name || "C").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-foreground">{review.author_name || "Verified buyer"}</p>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">Verified buyer</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section ref={purchasePanelRef} className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <div className="overflow-hidden rounded-[30px] border border-[#ecf0ee] bg-white shadow-[0_22px_52px_-34px_rgba(15,23,42,0.2)] dark:border-white/10 dark:bg-card">
          <div className="grid gap-8 p-5 lg:grid-cols-[0.12fr_0.48fr_0.4fr] lg:p-8">
            <div className="flex gap-3 overflow-x-auto lg:flex-col lg:overflow-visible">
              {galleryImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "overflow-hidden rounded-[18px] border bg-white transition-all dark:bg-secondary",
                    index === selectedImage ? "border-primary ring-2 ring-primary/20" : "border-[#e9edef] dark:border-white/10",
                  )}
                >
                  <img
                    src={image}
                    srcSet={generateCloudinarySrcSet(image)}
                    sizes="96px"
                    alt={`${flagshipProduct.name} thumbnail ${index + 1}`}
                    className="h-20 w-20 object-cover lg:h-24 lg:w-24"
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center rounded-[28px] bg-[#fbfcfb] p-5 dark:bg-secondary/40">
              <img
                src={activeImage}
                srcSet={generateCloudinarySrcSet(activeImage)}
                sizes="(max-width: 1024px) 90vw, 34vw"
                alt={flagshipProduct.name}
                className="max-h-[440px] max-w-full object-contain"
              />
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{heroEyebrow}</p>
              <h3 className="mt-3 text-[2.2rem] font-semibold tracking-tight text-slate-950 dark:text-foreground">
                {flagshipProduct.name}
              </h3>
              <p className="mt-2 text-base text-slate-500 dark:text-muted-foreground">
                {flagshipProduct.category || flagshipProduct.type}
              </p>

              <div className="mt-5 flex items-end gap-3">
                <span className="text-[2rem] font-bold text-primary">৳{flagshipProduct.price.toLocaleString()}</span>
                {flagshipProduct.originalPrice && flagshipProduct.originalPrice > flagshipProduct.price ? (
                  <span className="text-base text-slate-400 line-through">৳{flagshipProduct.originalPrice.toLocaleString()}</span>
                ) : null}
                {flagshipProduct.originalPrice && flagshipProduct.originalPrice > flagshipProduct.price ? (
                  <span className="rounded-full bg-[#edf8ef] px-2.5 py-1 text-xs font-semibold text-primary">
                    Save {Math.round(((flagshipProduct.originalPrice - flagshipProduct.price) / flagshipProduct.originalPrice) * 100)}%
                  </span>
                ) : null}
              </div>

              <div className="mt-5">
                <p className="text-sm font-semibold text-slate-900 dark:text-foreground">Color</p>
                <div className="mt-3 flex gap-3">
                  {(flagshipProduct.colors.length > 0 ? flagshipProduct.colors : ["Default"]).map((color) => (
                    <button
                      key={color}
                      type="button"
                      title={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "h-10 w-10 rounded-full border-2 shadow-sm transition-transform hover:scale-105",
                        selectedColor === color ? "border-primary ring-2 ring-primary/20" : "border-[#e6eaed] dark:border-white/10",
                      )}
                      style={{ backgroundColor: resolveColorChip(color) }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-sm font-semibold text-slate-900 dark:text-foreground">Size</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {(flagshipProduct.sizes.length > 0 ? flagshipProduct.sizes : ["Default"]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        "inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors",
                        selectedSize === size
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-[#e6eaed] bg-white text-slate-700 dark:border-white/10 dark:bg-secondary dark:text-foreground",
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-4">
                <div className="flex items-center rounded-full border border-[#e6eaed] dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    className="flex h-10 w-10 items-center justify-center text-slate-500 dark:text-muted-foreground"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold text-slate-900 dark:text-foreground">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.min(10, current + 1))}
                    className="flex h-10 w-10 items-center justify-center text-slate-500 dark:text-muted-foreground"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_18px_34px_-18px_rgba(34,197,94,0.62)]"
                >
                  {countdownBlock?.ctaText?.trim() || "Preorder now"}
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Secure preorder
                <span className="text-primary">
                  {countdownBlock?.endDate ? "• Ships from the announced launch window" : "• Ships from merchant schedule"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <div className="grid gap-4 rounded-[30px] bg-white px-4 py-5 shadow-[0_20px_42px_-34px_rgba(15,23,42,0.18)] sm:grid-cols-2 lg:grid-cols-4 lg:px-6 dark:bg-card">
          {[
            {
              title: "Free shipping",
              description: deliverySettings?.free_threshold ? `On orders over ৳${deliverySettings.free_threshold.toLocaleString()}` : "Merchant-managed shipping rules",
              icon: Truck,
            },
            {
              title: "Return support",
              description: "Policies stay connected to this store",
              icon: CheckCircle2,
            },
            {
              title: "Warranty or care",
              description: flagshipProduct.type || "Product support shown by the merchant",
              icon: ShieldCheck,
            },
            {
              title: "Secure checkout",
              description: contactSettings?.phone || contactSettings?.email || "Support remains merchant-specific",
              icon: PackageCheck,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-center gap-3 rounded-[22px] border border-[#edf1ef] bg-[#fcfdfc] px-4 py-4 dark:border-white/10 dark:bg-secondary/30">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e8ece9] bg-white/96 px-4 py-3 shadow-2xl backdrop-blur md:hidden dark:border-white/10 dark:bg-card/96">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-foreground">{flagshipProduct.name}</p>
            <p className="text-sm font-bold text-primary">৳{flagshipProduct.price.toLocaleString()}</p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            {countdownBlock?.ctaText?.trim() || "Preorder"}
          </button>
        </div>
      </div>
    </div>
  );
}
