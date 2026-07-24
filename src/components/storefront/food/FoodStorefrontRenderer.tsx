"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  Clock3,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Soup,
  Star,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { FoodMenuCard } from "@/components/storefront/food/FoodMenuCard";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/data/products";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
import { storefrontPath } from "@/lib/slug";

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
  primary_zone_label?: string;
  secondary_zone_label?: string;
  free_threshold?: number;
  delivery_fee?: number;
  delivery_fee_outside?: number;
};

type ContactSettings = {
  phone?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
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
  hours: string;
  minutes: string;
  seconds: string;
};

type ComboOffer = {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  products: Product[];
  price: number;
  compareAt: number;
  tone: "warm" | "fresh";
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
  const target = targetDate ? new Date(targetDate).getTime() : Number.NaN;
  const fallback = { hours: "06", minutes: "24", seconds: "59" };

  if (!Number.isFinite(target)) {
    return fallback;
  }

  const diff = Math.max(0, target - Date.now());
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

function buildComboOffers(products: Product[]): ComboOffer[] {
  const source = products.filter((product) => product.isAvailable !== false).slice(0, 8);
  const groups = [source.slice(0, 2), source.slice(2, 4)].filter((group) => group.length > 0);

  return groups.map((group, index) => {
    const price = group.reduce((sum, product) => sum + product.price, 0);
    const originalPrice = group.reduce((sum, product) => sum + (product.originalPrice ?? product.price), 0);
    const compareAt = Math.max(originalPrice, Math.round(price * 1.12));
    const seed = group[0]?.category || group[0]?.type || "Kitchen";

    return {
      id: `combo-${index}`,
      title: index === 0 ? `${seed} combo deals` : "Selected item offers",
      subtitle: group.map((product) => product.name).slice(0, 2).join(" + "),
      ctaLabel: index === 0 ? "Order combos" : "View offers",
      products: group,
      price,
      compareAt,
      tone: index === 0 ? "warm" : "fresh",
    };
  });
}

function matchFeaturedProducts(products: Product[], block: FeaturedBlockProps | undefined) {
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

  if ((source === "featured-or-all" || source === "featured") && filtered.length === 0) {
    filtered = [...products];
  }

  return filtered.slice(0, block?.limit ?? 4);
}

function pickCategoryNames(
  products: Product[],
  categories: CategoryLike[],
  types: CategoryLike[],
  block: CategoryBlockProps | undefined,
) {
  const source = block?.source ?? "auto";
  const limit = block?.limit ?? 7;
  const fromRows = (rows: CategoryLike[]) => Array.from(
    new Set(
      rows
        .map((row) => row.name?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).slice(0, limit);

  if (source === "categories" && categories.length > 0) {
    return fromRows(categories);
  }

  if (source === "types" && types.length > 0) {
    return fromRows(types);
  }

  const autoCategories = fromRows(categories);
  if (autoCategories.length > 0) {
    return autoCategories;
  }

  const autoTypes = fromRows(types);
  if (autoTypes.length > 0) {
    return autoTypes;
  }

  return Array.from(
    new Set(products.flatMap((product) => [product.category, product.type]).filter(Boolean)),
  ).slice(0, limit);
}

function pickCategoryProduct(products: Product[], category: string) {
  const lower = category.toLowerCase();
  return products.find((product) => {
    const haystack = `${product.name} ${product.category} ${product.type}`.toLowerCase();
    return haystack.includes(lower);
  });
}

function buildInfoCards(
  storeName: string | undefined,
  deliverySettings: DeliverySettings | null | undefined,
  contactSettings: ContactSettings | null | undefined,
) {
  return [
    {
      title: "Fast delivery",
      description: deliverySettings?.primary_zone_label
        ? `${deliverySettings.primary_zone_label} with live delivery updates`
        : "Fast drop-off with merchant-managed delivery",
      icon: Truck,
    },
    {
      title: "Pickup available",
      description: contactSettings?.address
        ? `Collect from ${contactSettings.address}`
        : `Pickup details shared by ${storeName || "the merchant"}`,
      icon: PackageCheck,
    },
    {
      title: "Live tracking",
      description: contactSettings?.phone
        ? `Order support on ${contactSettings.phone}`
        : "Track order progress after checkout",
      icon: MapPin,
    },
    {
      title: "Safe and hygienic",
      description: "Packaging, prep, and handling instructions stay store-controlled",
      icon: ShieldCheck,
    },
  ];
}

function FoodSectionHeading({
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
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
        <h2 className="mt-2 text-[1.9rem] font-semibold tracking-tight text-slate-950 dark:text-foreground sm:text-[2.35rem]">
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

export function FoodStorefrontRenderer({
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
    queryKey: ["food-homepage-reviews", activeStore.id],
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
  const popularDishes = useMemo(() => {
    const base = featuredProducts.length > 0 ? featuredProducts : availableProducts;
    return matchFeaturedProducts(base.length > 0 ? base : availableProducts, { ...featuredBlock, limit: featuredBlock?.limit ?? 4 });
  }, [availableProducts, featuredBlock, featuredProducts]);
  const chefSpecials = useMemo(() => {
    const sorted = [...availableProducts].sort((left, right) => {
      const leftCount = reviewStatsByProduct[left.id]?.count ?? 0;
      const rightCount = reviewStatsByProduct[right.id]?.count ?? 0;
      if (leftCount !== rightCount) {
        return rightCount - leftCount;
      }
      return Number(right.featured) - Number(left.featured);
    });

    return (sorted.slice(2, 6).length > 0 ? sorted.slice(2, 6) : sorted.slice(0, 4));
  }, [availableProducts, reviewStatsByProduct]);
  const categoryNames = useMemo(
    () => pickCategoryNames(availableProducts, productCategories as CategoryLike[], productTypes as CategoryLike[], categoryBlock),
    [availableProducts, categoryBlock, productCategories, productTypes],
  );
  const comboOffers = useMemo(
    () => buildComboOffers(availableProducts),
    [availableProducts],
  );
  const infoCards = useMemo(
    () => buildInfoCards(activeStore.name, deliverySettings, contactSettings),
    [activeStore.name, contactSettings, deliverySettings],
  );

  const heroDish = popularDishes[0] ?? availableProducts[0];
  const heroDishAlt = popularDishes[1] ?? availableProducts[1];
  const heroTagline = heroBlock?.tagline?.trim() || "Good food, great mood";
  const heroTitle = heroBlock?.title?.trim() || "Delicious meals,";
  const heroHighlight = heroBlock?.highlight?.trim() || "delivered fast";
  const heroSubtitle = heroBlock?.subtitle?.trim()
    || activeStore.description
    || "Fresh ingredients, fast prep, and merchant-managed delivery from your live storefront.";
  const heroCta = heroBlock?.ctaText?.trim() || "Order now";
  const heroSecondaryCta = heroBlock?.secondaryCtaText?.trim() || "View menu";
  const heroSupportHref = storefrontPath(heroBlock?.secondaryCtaLink || "/shop", activeStore.slug);

  return (
    <div className="bg-[#f8faf8] text-slate-950 dark:bg-background dark:text-foreground">
      <section className="overflow-hidden bg-[linear-gradient(180deg,#fffdf9_0%,#f6faf6_68%,#f8faf8_100%)] dark:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)]">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-5 pb-12 pt-8 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10 lg:px-10 lg:pb-14 lg:pt-10">
          <div className="max-w-[520px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-primary">{heroTagline}</p>
            <h1 className="mt-5 max-w-[11ch] text-[3rem] font-semibold leading-[1.03] tracking-[-0.05em] text-slate-950 dark:text-foreground sm:text-[4.3rem]">
              {heroTitle}{" "}
              <span className="text-primary">{heroHighlight}</span>
            </h1>
            <p className="mt-5 max-w-[44ch] text-base leading-7 text-slate-600 dark:text-muted-foreground sm:text-lg">
              {heroSubtitle}
            </p>

            <div className="mt-8 rounded-[24px] border border-[#e4ece5] bg-white/88 p-4 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-card/90">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Clock3 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-foreground">Delivery in 25-35 min</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
                    {deliverySettings?.primary_zone_label || contactSettings?.address || "Live order tracking available"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={storefrontPath(heroBlock?.ctaLink || "/shop", activeStore.slug)}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_18px_34px_-18px_rgba(34,197,94,0.62)] transition-transform hover:-translate-y-0.5"
              >
                {heroCta}
              </Link>
              <Link
                href={heroSupportHref}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[#dde7df] bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:border-primary/35 dark:border-white/10 dark:bg-card dark:text-foreground"
              >
                {heroSecondaryCta}
              </Link>
            </div>
          </div>

          <div className="relative min-h-[350px] rounded-[34px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(246,250,246,0.9)_52%,rgba(236,245,237,0.92)_100%)] p-4 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.3)] dark:bg-secondary/40 sm:min-h-[460px] lg:min-h-[520px]">
            <div className="absolute right-5 top-5 rounded-full border border-[#d9e6db] bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm dark:border-white/10 dark:bg-card/90 dark:text-muted-foreground">
              {deliverySettings?.free_threshold
                ? `Free delivery over ৳${deliverySettings.free_threshold.toLocaleString()}`
                : "Freshly prepared for each order"}
            </div>
            {heroDish ? (
              <div className="absolute inset-x-[7%] bottom-[8%] top-[11%]">
                <div className="grid h-full gap-4 lg:grid-cols-[1fr_170px]">
                  <div className="flex items-center justify-center rounded-[28px] bg-white/75 p-5 dark:bg-card/75">
                    <img
                      src={heroDish.image}
                      alt={heroDish.name}
                      className="h-full max-h-[360px] w-full object-cover rounded-[24px] shadow-[0_28px_46px_-28px_rgba(15,23,42,0.28)]"
                    />
                  </div>
                  <div className="grid gap-4">
                    {[heroDishAlt, popularDishes[2] ?? availableProducts[2]].filter(Boolean).map((product) => (
                      <div key={product!.id} className="rounded-[22px] border border-[#dde8de] bg-white/92 p-3 shadow-sm dark:border-white/10 dark:bg-card/90">
                        <div className="flex items-center gap-3">
                          <img src={product!.image} alt={product!.name} className="h-16 w-16 rounded-2xl object-cover" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-foreground">{product!.name}</p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Star className="h-3.5 w-3.5 fill-current text-[#f4b400]" />
                                {(reviewStatsByProduct[product!.id]?.average ?? 4.7).toFixed(1)}
                              </span>
                              <span>•</span>
                              <span>25-35 min</span>
                            </div>
                            <p className="mt-1 text-sm font-semibold text-primary">৳{product!.price.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
            {categoryBlock?.tagline?.trim() || "Explore cuisines"}
          </p>
          <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-foreground sm:text-[2.5rem]">
            {categoryBlock?.title?.trim() || "What are you craving?"}
          </h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {categoryNames.map((category, index) => {
            const categoryProduct = pickCategoryProduct(availableProducts, category);
            return (
              <Link
                key={`${category}-${index}`}
                href={storefrontPath(`/shop?category=${encodeURIComponent(category)}`, activeStore.slug)}
                className="rounded-[22px] border border-[#e3ebe4] bg-white px-4 py-5 text-center shadow-[0_14px_30px_-24px_rgba(15,23,42,0.2)] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-card"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#f4f8f4] dark:bg-secondary/60">
                  {categoryProduct ? (
                    <img src={categoryProduct.image} alt={categoryProduct.name} className="h-full w-full object-cover" />
                  ) : (
                    <UtensilsCrossed className="h-5 w-5 text-primary" />
                  )}
                </div>
                <p className="mt-4 text-base font-semibold text-slate-900 dark:text-foreground">{category}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
                  {categoryProduct?.type || "Freshly made"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {comboOffers.length > 0 ? (
        <section className="mx-auto max-w-[1320px] px-5 py-2 md:px-8 lg:px-10">
          <div className="grid gap-5 lg:grid-cols-2">
            {comboOffers.map((offer, index) => (
              <article
                key={offer.id}
                className={`overflow-hidden rounded-[28px] border ${
                  offer.tone === "warm"
                    ? "border-[#efe7db] bg-[linear-gradient(135deg,#fffdf7_0%,#fff4df_100%)]"
                    : "border-[#dceee0] bg-[linear-gradient(135deg,#f7fffa_0%,#ebfaf1_100%)]"
                } p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.2)] dark:border-white/10 dark:bg-card`}
              >
                <div className="grid gap-4 sm:grid-cols-[1fr_200px] sm:items-center">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                      {index === 0 ? "Best value" : "Limited time"}
                    </p>
                    <h3 className="mt-3 max-w-[12ch] text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-foreground">
                      {offer.title}
                    </h3>
                    <p className="mt-3 max-w-[36ch] text-sm leading-7 text-slate-600 dark:text-muted-foreground">
                      {offer.subtitle}
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <span className="text-[1.6rem] font-bold text-primary">৳{offer.price.toLocaleString()}</span>
                      {offer.compareAt > offer.price ? (
                        <span className="text-sm text-slate-400 line-through">৳{offer.compareAt.toLocaleString()}</span>
                      ) : null}
                    </div>
                    <Link
                      href={storefrontPath(countdownBlock?.ctaLink || "/shop", activeStore.slug)}
                      className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
                    >
                      {index === 0 ? "Order combos" : (countdownBlock?.ctaText?.trim() || "View offers")}
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {offer.products.map((product) => (
                      <div key={product.id} className="overflow-hidden rounded-[22px] bg-white/85 p-2 dark:bg-secondary/60">
                        <img src={product.image} alt={product.name} className="aspect-[1/1] w-full rounded-[18px] object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <FoodSectionHeading
          eyebrow={featuredBlock?.tagline?.trim() || "Popular picks"}
          title={featuredBlock?.title?.trim() || "Most loved dishes"}
          actionLabel="View all menu"
          actionHref={storefrontPath("/shop", activeStore.slug)}
        />
        <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-4 lg:overflow-visible">
          {popularDishes.map((product) => (
            <FoodMenuCard key={product.id} product={product} reviewStats={reviewStatsByProduct[product.id]} mode="popular" />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-3 md:px-8 lg:px-10">
        <FoodSectionHeading
          eyebrow="Chef's specials"
          title="Handpicked for you"
          actionLabel="View all"
          actionHref={storefrontPath("/shop", activeStore.slug)}
        />
        <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-4 lg:overflow-visible">
          {chefSpecials.map((product) => (
            <FoodMenuCard key={product.id} product={product} reviewStats={reviewStatsByProduct[product.id]} mode="chef" />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <div className="overflow-hidden rounded-[30px] border border-[#e4ebe4] bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.2)] dark:border-white/10 dark:bg-card">
          <div className="grid gap-4 px-5 py-6 md:px-8 lg:grid-cols-4 lg:px-10 lg:py-8">
            {infoCards.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[22px] border border-[#edf2ed] bg-[#fbfcfb] px-4 py-5 text-center dark:border-white/10 dark:bg-secondary/30">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-base font-semibold text-slate-900 dark:text-foreground">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
          <div className="border-t border-[#edf2ed] bg-[#fbfcfb] px-5 py-5 text-center dark:border-white/10 dark:bg-secondary/20">
            <p className="text-sm text-slate-600 dark:text-muted-foreground">
              {countdownBlock?.subtitle?.trim() || `${activeStore.name || "This store"} keeps delivery, pickup, support, and hygiene guidance merchant-controlled from the existing site settings.`}
            </p>
            <div className="mt-3 inline-flex items-center gap-3 rounded-full border border-[#e1ebe2] bg-white px-4 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-card dark:text-foreground">
              <Soup className="h-4 w-4 text-primary" />
              Offer ends in {dealTimer.hours}:{dealTimer.minutes}:{dealTimer.seconds}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
