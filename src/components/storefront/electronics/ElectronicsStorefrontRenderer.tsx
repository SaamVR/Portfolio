"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bolt,
  ChevronRight,
  Clock3,
  Headphones,
  PackageCheck,
  Search,
  ShieldCheck,
  SmartphoneCharging,
  Star,
  TabletSmartphone,
  Truck,
} from "lucide-react";
import { ElectronicsProductCard, buildTechnicalSpecs } from "@/components/storefront/electronics/ElectronicsProductCard";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/data/products";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
import { productUrl, storefrontPath } from "@/lib/slug";

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

type FeaturedBlockProps = {
  title?: string;
  tagline?: string;
  source?: "featured-or-all" | "featured" | "all" | "newest" | "category" | "type";
  category?: string;
  productType?: string;
  limit?: number;
};

type ComparisonBlockProps = {
  title?: string;
  tagline?: string;
  source?: "featured-or-all" | "featured" | "all" | "newest" | "category" | "type";
  category?: string;
  productType?: string;
  limit?: number;
  ctaText?: string;
};

type CategoryBlockProps = {
  tagline?: string;
  title?: string;
  source?: "auto" | "categories" | "types";
  limit?: number;
};

type CountdownBlockProps = {
  title?: string;
  subtitle?: string;
  endDate?: string;
  ctaText?: string;
  ctaLink?: string;
};

type DeliverySettings = {
  enabled?: boolean;
  free_threshold?: number;
  delivery_fee?: number;
};

type ContactSettings = {
  phone?: string;
  email?: string;
  whatsapp?: string;
};

type PublicReviewRow = {
  product_id: string | null;
  rating: number | null;
};

type ReviewStats = {
  count: number;
  average: number;
};

type CategoryLike = {
  name?: string | null;
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

function getHomepageSectionBlock(blocks: StorePageBlock[], type: StorePageBlock["type"]) {
  return blocks.find((block) => block.type === type);
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
  const fallback = { days: "02", hours: "12", minutes: "30", seconds: "00" };

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

function pickCategorySeed(product: Product | undefined) {
  const seed = (product?.category || product?.type || "Gadgets").trim();
  return seed;
}

function matchFeaturedProducts(
  products: Product[],
  block: FeaturedBlockProps | undefined,
) {
  const source = block?.source ?? "featured-or-all";
  let filtered = [...products];

  if (source === "featured") {
    filtered = filtered.filter((product) => product.featured);
  }

  if (source === "category" && block?.category) {
    filtered = filtered.filter((product) => product.category.toLowerCase() === block.category?.toLowerCase());
  }

  if (source === "type" && block?.productType) {
    filtered = filtered.filter((product) => product.type?.toLowerCase() === block.productType?.toLowerCase());
  }

  if (source === "newest") {
    filtered = [...filtered];
  }

  if ((source === "featured-or-all" || source === "featured") && filtered.length === 0) {
    filtered = [...products];
  }

  return filtered.slice(0, block?.limit ?? 4);
}

function filterAccessoryProducts(products: Product[]) {
  const keywords = ["accessor", "case", "charger", "cable", "stand", "cover", "watch", "speaker", "buds"];
  const matched = products.filter((product) => {
    const haystack = `${product.name} ${product.category} ${product.type}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword));
  });

  return (matched.length > 0 ? matched : products.slice(4)).slice(0, 4);
}

function pickCategoryProducts(products: Product[], label: string, limit = 1) {
  const lower = label.toLowerCase();
  const matched = products.filter((product) => {
    const haystack = `${product.name} ${product.category} ${product.type}`.toLowerCase();
    return haystack.includes(lower);
  });

  return matched.slice(0, limit);
}

function CategoryIcon({ index }: { index: number }) {
  const icons = [Headphones, SmartphoneCharging, TabletSmartphone, PackageCheck] as const;
  const Icon = icons[index % icons.length];
  return <Icon className="h-5 w-5" />;
}

function ElectronicsSectionHeading({
  eyebrow,
  title,
  actionLabel,
  actionHref,
}: {
  eyebrow: string;
  title: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="mb-5 md:mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-foreground sm:text-3xl md:text-[2.35rem] leading-tight">
          {title}
        </h2>
      </div>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="hidden items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-950 sm:inline-flex dark:text-muted-foreground dark:hover:text-foreground"
        >
          {actionLabel}
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

export function ElectronicsStorefrontRenderer({
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
  const [dealTimer, setDealTimer] = useState<DealTimer>(() => resolveDealTimer());
  const { data: allProducts = [] } = useProducts(activeStore.id);
  const { data: featuredProducts = [] } = useFeaturedProducts(activeStore.id);
  const { data: productCategories = [] } = useProductCategories(activeStore.id);
  const { data: productTypes = [] } = useProductTypes(activeStore.id);
  const { data: deliverySettings } = useSiteSettings<DeliverySettings>("delivery_settings", activeStore.id);
  const { data: contactSettings } = useSiteSettings<ContactSettings>("contact_page", activeStore.id);

  const { data: approvedReviews = [] } = useQuery({
    queryKey: ["electronics-homepage-reviews", activeStore.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_product_reviews" as any)
        .select("product_id, rating")
        .eq("store_id", activeStore.id);

      if (error) {
        throw error;
      }

      return ((data ?? []) as unknown) as PublicReviewRow[];
    },
    enabled: Boolean(activeStore.id),
    staleTime: 120_000,
  });

  const heroBlock = getHomepageBlock<HeroBlockProps>(blocks, "hero");
  const categoryBlock = getHomepageBlock<CategoryBlockProps>(blocks, "category-showcase");
  const featuredBlock = getHomepageBlock<FeaturedBlockProps>(blocks, "featured-products");
  const countdownBlock = getHomepageBlock<CountdownBlockProps>(blocks, "countdown");
  const comparisonSectionBlock = getHomepageSectionBlock(blocks, "comparison");
  const comparisonBlock = comparisonSectionBlock?.props as ComparisonBlockProps | undefined;

  useEffect(() => {
    setDealTimer(resolveDealTimer(countdownBlock?.endDate));
    const interval = window.setInterval(() => {
      setDealTimer(resolveDealTimer(countdownBlock?.endDate));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [countdownBlock?.endDate]);

  const availableProducts = useMemo(
    () => allProducts.filter((product) => product.isAvailable !== false),
    [allProducts],
  );
  const reviewStatsByProduct = useMemo(
    () => buildReviewStats(approvedReviews),
    [approvedReviews],
  );
  const primaryProducts = useMemo(() => {
    const base = featuredProducts.length > 0 ? featuredProducts : availableProducts;
    return matchFeaturedProducts(base.length > 0 ? base : availableProducts, featuredBlock);
  }, [availableProducts, featuredBlock, featuredProducts]);
  const heroProduct = primaryProducts[0] ?? availableProducts[0];
  const heroSupportProducts = useMemo(
    () => (primaryProducts.length > 1 ? primaryProducts.slice(1, 3) : availableProducts.slice(1, 3)),
    [availableProducts, primaryProducts],
  );
  const comparisonProducts = useMemo(
    () => {
      const source = comparisonBlock?.source ?? "featured-or-all";
      let filtered = [...(featuredProducts.length > 0 ? featuredProducts : availableProducts)];

      if (source === "featured") {
        filtered = filtered.filter((product) => product.featured);
      }

      if (source === "category" && comparisonBlock?.category) {
        filtered = filtered.filter((product) => product.category.toLowerCase() === comparisonBlock.category?.toLowerCase());
      }

      if (source === "type" && comparisonBlock?.productType) {
        filtered = filtered.filter((product) => product.type?.toLowerCase() === comparisonBlock.productType?.toLowerCase());
      }

      if ((source === "featured-or-all" || source === "featured") && filtered.length === 0) {
        filtered = [...availableProducts];
      }

      return (filtered.length >= 2 ? filtered : availableProducts).slice(0, Math.min(Math.max(comparisonBlock?.limit ?? 2, 2), 4));
    },
    [availableProducts, comparisonBlock?.category, comparisonBlock?.limit, comparisonBlock?.productType, comparisonBlock?.source, featuredProducts],
  );
  const accessoryProducts = useMemo(
    () => filterAccessoryProducts(availableProducts),
    [availableProducts],
  );
  const categoryNames = useMemo(() => {
    const source = categoryBlock?.source ?? "auto";
    const limit = categoryBlock?.limit ?? 4;

    const fromRows = (rows: CategoryLike[]) => Array.from(
      new Set(
        rows
          .map((row) => row.name?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ).slice(0, limit);

    if (source === "categories" && productCategories.length > 0) {
      return fromRows(productCategories as CategoryLike[]);
    }

    if (source === "types" && productTypes.length > 0) {
      return fromRows(productTypes as CategoryLike[]);
    }

    const autoCategories = fromRows(productCategories as CategoryLike[]);
    if (autoCategories.length > 0) {
      return autoCategories;
    }

    const autoTypes = fromRows(productTypes as CategoryLike[]);
    if (autoTypes.length > 0) {
      return autoTypes;
    }

    return Array.from(
      new Set(
        availableProducts
          .flatMap((product) => [product.category, product.type])
          .filter(Boolean),
      ),
    ).slice(0, limit);
  }, [availableProducts, categoryBlock?.limit, categoryBlock?.source, productCategories, productTypes]);

  const heroTitle = heroBlock?.title?.trim() || "Power your";
  const heroHighlight = heroBlock?.highlight?.trim() || "everyday tech";
  const heroSubtitle = heroBlock?.subtitle?.trim()
    || heroProduct?.description
    || activeStore.description
    || "Launch with the gadgets your shoppers compare, trust, and buy quickly.";
  const heroTagline = heroBlock?.tagline?.trim() || "Curated electronics";
  const heroPrimaryCta = heroBlock?.ctaText?.trim() || "Shop gadgets";
  const heroSecondaryCta = heroBlock?.secondaryCtaText?.trim() || "Talk to support";
  const heroSecondaryHref = contactSettings?.whatsapp
    ? `https://wa.me/${contactSettings.whatsapp.replace(/\D/g, "")}`
    : storefrontPath(heroBlock?.secondaryCtaLink || "/contact", activeStore.slug);

  return (
    <div className="bg-[#f5f7fa] text-slate-950 dark:bg-background dark:text-foreground">
      <section className="overflow-hidden bg-[linear-gradient(180deg,#edf4fb_0%,#f7fafc_55%,#f5f7fa_100%)] dark:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)]">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-4 pb-12 pt-8 md:px-6 md:pb-16 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-10 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="max-w-[520px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary shadow-sm dark:bg-card/70">
              <Bolt className="h-3.5 w-3.5" />
              {heroTagline}
            </div>
            <h1 className="mt-5 max-w-[11ch] text-4xl font-semibold leading-[1.05] tracking-[-0.05em] text-slate-950 dark:text-foreground sm:text-5xl md:text-[4.2rem]">
              {heroTitle}{" "}
              <span className="text-primary">{heroHighlight}</span>
            </h1>
            <p className="mt-5 max-w-[44ch] text-base leading-relaxed text-slate-600 dark:text-muted-foreground sm:text-lg">
              {heroSubtitle}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={storefrontPath(heroBlock?.ctaLink || "/shop", activeStore.slug)}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_18px_34px_-18px_rgba(34,197,94,0.62)] transition-transform hover:-translate-y-0.5 sm:w-auto"
              >
                {heroPrimaryCta}
              </Link>
              <Link
                href={heroSecondaryHref}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-[#dce5ec] bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:border-primary/35 sm:w-auto dark:border-white/10 dark:bg-card dark:text-foreground"
              >
                {heroSecondaryCta}
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-[#dde4eb] bg-white px-3 py-2 text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-card dark:text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">Store-backed warranty</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[#dde4eb] bg-white px-3 py-2 text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-card dark:text-muted-foreground">
                <Truck className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">
                  {deliverySettings?.free_threshold
                    ? `Free delivery over ৳${deliverySettings.free_threshold.toLocaleString()}`
                    : "Delivery options at checkout"}
                </span>
              </div>
            </div>
          </div>

          <div className="relative min-h-[300px] md:min-h-[400px] lg:min-h-[520px] w-full rounded-[20px] md:rounded-[30px] border border-white/70 bg-[linear-gradient(145deg,#ffffff_0%,#eef4f8_100%)] p-4 md:p-5 shadow-[0_30px_80px_-52px_rgba(15,23,42,0.4)] dark:border-white/10 dark:bg-card/60 dark:shadow-none">
            <div className="absolute right-4 top-4 md:right-5 md:top-5 flex items-center gap-2 rounded-full border border-[#dce5ec] bg-white/92 px-3 py-2 text-xs font-medium text-slate-500 shadow-sm dark:border-white/10 dark:bg-card/90 dark:text-muted-foreground z-10">
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Compare top gadgets</span>
              <span className="sm:hidden">Compare</span>
            </div>
            {heroProduct ? (
              <div className="absolute inset-0 p-4 md:p-6 flex flex-col md:inset-x-[9%] md:bottom-[9%] md:top-[16%] md:grid md:gap-4 lg:grid-cols-[1fr_170px] lg:p-0">
                <div className="flex flex-1 items-center justify-center rounded-[16px] md:rounded-[28px] bg-[radial-gradient(circle_at_top,#f8fcff_0%,#edf4f8_62%,#e9eef3_100%)] p-4 md:p-6 dark:bg-secondary/50">
                  <img
                    src={heroProduct.image}
                    alt={heroProduct.name}
                    className="h-full w-full max-h-[220px] md:max-h-[360px] object-contain drop-shadow-[0_30px_48px_rgba(15,23,42,0.22)]"
                  />
                </div>
                <div className="hidden lg:grid gap-4">
                  {heroSupportProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 rounded-[22px] border border-[#dce5ec] bg-white/92 p-3 shadow-sm dark:border-white/10 dark:bg-card/90"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f3f7fb] p-2 dark:bg-secondary/60 shrink-0">
                        <img src={product.image} alt={product.name} className="h-full max-h-full w-full object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-foreground">{product.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-muted-foreground truncate">{pickCategorySeed(product)}</p>
                        <p className="mt-1 text-sm font-semibold text-primary truncate">৳{product.price.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-8 md:px-6 md:py-16 lg:px-8 lg:py-20">
        <ElectronicsSectionHeading
          eyebrow={categoryBlock?.tagline?.trim() || "Popular departments"}
          title={categoryBlock?.title?.trim() || "Shop by device type"}
          actionLabel="View all"
          actionHref={storefrontPath("/shop", activeStore.slug)}
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          {categoryNames.map((category, index) => {
            const categoryProduct = pickCategoryProducts(availableProducts, category, 1)[0];
            return (
              <Link
                key={`${category}-${index}`}
                href={storefrontPath(`/shop?category=${encodeURIComponent(category)}`, activeStore.slug)}
                className="group overflow-hidden rounded-[20px] md:rounded-[24px] border border-[#dce5ec] bg-white shadow-[0_16px_36px_-28px_rgba(15,23,42,0.26)] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-card"
              >
                <div className="flex aspect-square md:aspect-[4/3] sm:aspect-[16/10] items-center justify-center bg-[linear-gradient(180deg,#f6fbff_0%,#eff5fa_100%)] p-4 sm:p-6 dark:bg-secondary/45">
                  {categoryProduct ? (
                    <img src={categoryProduct.image} alt={categoryProduct.name} className="h-full w-full max-h-[140px] md:max-h-full object-contain transition duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-xl md:rounded-2xl border border-primary/10 bg-primary/5 text-primary">
                      <CategoryIcon index={index} />
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 px-3 py-3 md:px-5 md:py-4">
                  <div className="min-w-0">
                    <p className="text-sm md:text-base font-semibold text-slate-900 dark:text-foreground truncate">{category}</p>
                    <p className="mt-0.5 md:mt-1 text-[11px] md:text-sm text-slate-500 dark:text-muted-foreground truncate">
                      {activeStore.name ? `${activeStore.name} selection` : "Browse curated picks"}
                    </p>
                  </div>
                  <div className="hidden sm:flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full border border-[#dce5ec] text-slate-500 transition-colors group-hover:border-primary/30 group-hover:text-primary dark:border-white/10 dark:text-muted-foreground">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-8 md:px-6 md:py-16 lg:px-8 lg:py-20">
        <ElectronicsSectionHeading
          eyebrow={featuredBlock?.tagline?.trim() || "Featured gadgets"}
          title={featuredBlock?.title?.trim() || "Best picks for everyday performance"}
          actionLabel="Shop all"
          actionHref={storefrontPath("/shop", activeStore.slug)}
        />
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible">
          {primaryProducts.map((product) => (
            <div key={product.id} className="min-w-[72vw] shrink-0 snap-start sm:min-w-[45vw] md:min-w-0 md:shrink">
              <ElectronicsProductCard
                product={product}
                reviewStats={reviewStatsByProduct[product.id]}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-8 md:px-6 md:py-12 lg:px-8 lg:py-16">
        <div className="overflow-hidden rounded-[24px] md:rounded-[30px] border border-[#dbe4ea] bg-[linear-gradient(135deg,#0f172a_0%,#101f3d_58%,#162f58_100%)] text-white shadow-[0_26px_60px_-42px_rgba(15,23,42,0.6)] dark:border-white/10">
          <div className="grid gap-6 md:gap-8 px-5 py-8 md:px-8 md:py-10 lg:grid-cols-[1.08fr_0.92fr] lg:px-10 lg:py-12 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                <Clock3 className="h-3.5 w-3.5" />
                Limited time deal
              </div>
              <h2 className="mt-4 max-w-[16ch] text-3xl font-semibold tracking-tight sm:text-[2.6rem] leading-tight">
                {countdownBlock?.title?.trim() || "Upgrade your setup before this deal expires"}
              </h2>
              <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-slate-300 sm:text-base">
                {countdownBlock?.subtitle?.trim() || `${activeStore.name || "This store"} is highlighting price drops on fast-moving gadgets and accessories.`}
              </p>
              <Link
                href={storefrontPath(countdownBlock?.ctaLink || "/shop", activeStore.slug)}
                className="mt-6 inline-flex h-12 md:h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 w-full sm:w-auto"
              >
                {countdownBlock?.ctaText?.trim() || "Grab the deal"}
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4 w-full">
              {[
                { label: "Days", value: dealTimer.days },
                { label: "Hours", value: dealTimer.hours },
                { label: "Minutes", value: dealTimer.minutes },
                { label: "Seconds", value: dealTimer.seconds },
              ].map((item) => (
                <div key={item.label} className="rounded-[16px] md:rounded-[22px] border border-white/10 bg-white/8 px-2 py-4 md:px-4 md:py-5 text-center backdrop-blur-sm flex flex-col justify-center">
                  <p className="text-xl md:text-[2rem] font-semibold tracking-tight text-white sm:text-[2.4rem]">{item.value}</p>
                  <p className="mt-1 md:mt-2 text-[9px] md:text-[11px] uppercase tracking-[0.22em] text-slate-300">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {(comparisonSectionBlock ? comparisonSectionBlock.isVisible !== false : true) && comparisonProducts.length >= 2 ? (
        <section className="mx-auto max-w-[1320px] px-4 py-8 md:px-6 md:py-16 lg:px-8 lg:py-20">
          <ElectronicsSectionHeading
            eyebrow={comparisonBlock?.tagline?.trim() || "Compare before you buy"}
            title={comparisonBlock?.title?.trim() || "Quick product comparison"}
          />
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 md:overflow-visible">
            {comparisonProducts.map((product) => {
              const stats = reviewStatsByProduct[product.id];
              const compareSpecs = buildTechnicalSpecs(product);
              return (
                <article
                  key={product.id}
                  className="min-w-[85vw] shrink-0 snap-start sm:min-w-[60vw] md:min-w-0 md:shrink overflow-hidden rounded-[20px] md:rounded-[28px] border border-[#dce5ec] bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-card flex flex-col"
                >
                  <div className="flex flex-col sm:grid gap-4 md:gap-5 p-4 md:p-5 sm:grid-cols-[180px_1fr] md:grid-cols-[220px_1fr] h-full">
                    <div className="flex aspect-square sm:aspect-auto sm:h-full items-center justify-center rounded-[16px] md:rounded-[24px] bg-[linear-gradient(180deg,#f7fbff_0%,#eef4f8_100%)] p-4 md:p-5 dark:bg-secondary/45">
                      <img src={product.image} alt={product.name} className="h-full max-h-[160px] sm:max-h-full w-full object-contain" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                          {pickCategorySeed(product)}
                        </span>
                        {product.originalPrice && product.originalPrice > product.price ? (
                          <span className="inline-flex rounded-full bg-[#fff1ef] px-2.5 py-1 text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ef4444]">
                            Save ৳{(product.originalPrice - product.price).toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-3 text-lg md:text-[1.45rem] font-semibold tracking-tight text-slate-950 dark:text-foreground line-clamp-2">
                        {product.name}
                      </h3>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center gap-1 text-primary">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="text-sm font-semibold text-slate-900 dark:text-foreground">
                            {(stats?.average ?? 4.8).toFixed(1)}
                          </span>
                        </div>
                        <span className="text-sm text-slate-500 dark:text-muted-foreground">
                          {stats?.count ? `${stats.count} reviews` : "New arrival"}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-2 sm:gap-3 sm:grid-cols-2">
                        {compareSpecs.slice(0, 4).map((spec) => (
                          <div key={spec} className="rounded-xl md:rounded-2xl border border-[#e7edf2] bg-[#f8fbfd] px-3 py-2.5 md:py-3 text-xs md:text-sm text-slate-600 dark:border-white/10 dark:bg-secondary/40 dark:text-muted-foreground line-clamp-2 sm:line-clamp-none">
                            {spec}
                          </div>
                        ))}
                        <div className="hidden sm:block rounded-xl md:rounded-2xl border border-[#e7edf2] bg-[#f8fbfd] px-3 py-2.5 md:py-3 text-xs md:text-sm text-slate-600 dark:border-white/10 dark:bg-secondary/40 dark:text-muted-foreground">
                          {deliverySettings?.enabled ? "Ready for merchant delivery setup" : "Delivery setup can be enabled from settings"}
                        </div>
                      </div>
                      <div className="mt-5 flex flex-wrap items-center gap-3 mt-auto pt-2">
                        <p className="text-xl md:text-[1.6rem] font-bold text-primary">৳{product.price.toLocaleString()}</p>
                        {product.originalPrice && product.originalPrice > product.price ? (
                          <p className="text-xs md:text-sm text-slate-400 line-through">৳{product.originalPrice.toLocaleString()}</p>
                        ) : null}
                        <Link
                          href={productUrl(product.id, product.name, activeStore.slug)}
                          className="ml-auto inline-flex h-10 md:h-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 px-4 text-xs md:text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground shrink-0"
                        >
                          {comparisonBlock?.ctaText?.trim() || "View details"}
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {accessoryProducts.length > 0 ? (
        <section className="mx-auto max-w-[1320px] px-4 py-8 md:px-6 md:py-16 lg:px-8 lg:py-20">
          <ElectronicsSectionHeading
            eyebrow="Accessories"
            title="Complete the setup"
            actionLabel="Browse accessories"
            actionHref={storefrontPath("/shop", activeStore.slug)}
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
            {accessoryProducts.map((product) => (
              <Link
                key={product.id}
                href={productUrl(product.id, product.name, activeStore.slug)}
                className="group flex flex-col rounded-[20px] md:rounded-[24px] border border-[#dce5ec] bg-white p-3 sm:p-4 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.26)] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-card h-full"
              >
                <div className="flex aspect-square md:aspect-[3/2] w-full items-center justify-center rounded-[16px] md:rounded-[20px] bg-[linear-gradient(180deg,#f7fbff_0%,#eef4f8_100%)] p-4 dark:bg-secondary/45">
                  <img src={product.image} alt={product.name} className="h-full max-h-[140px] md:max-h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]" />
                </div>
                <div className="mt-4 flex flex-col flex-1">
                  <p className="text-[10px] md:text-sm font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-muted-foreground line-clamp-1">
                    {product.type || product.category}
                  </p>
                  <h3 className="mt-1 md:mt-2 line-clamp-2 text-sm md:text-lg font-semibold text-slate-950 dark:text-foreground">{product.name}</h3>
                  <div className="mt-2 md:mt-3 flex flex-wrap gap-1.5 md:gap-2 text-[10px] md:text-xs text-slate-500 dark:text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f7fb] px-2 py-0.5 md:px-2.5 md:py-1 dark:bg-secondary/60">
                      <Truck className="h-3 md:h-3.5 w-3 md:w-3.5 text-primary shrink-0" />
                      <span className="truncate">Delivery ready</span>
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#f3f7fb] px-2 py-0.5 md:px-2.5 md:py-1 dark:bg-secondary/60">
                      <ShieldCheck className="h-3 md:h-3.5 w-3 md:w-3.5 text-primary shrink-0" />
                      <span className="truncate">Store support</span>
                    </span>
                  </div>
                  <div className="mt-auto pt-3 md:pt-4">
                    <p className="text-lg md:text-xl font-bold text-primary">৳{product.price.toLocaleString()}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
