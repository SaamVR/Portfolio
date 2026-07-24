"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ChevronLeft, ChevronRight, CreditCard, HeartHandshake, Leaf, ShieldCheck, Truck } from "lucide-react";
import { BeautyProductCard } from "@/components/storefront/beauty/BeautyProductCard";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useCart } from "@/context/useCart";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/data/products";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
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

type TrustBadge = {
  label?: string;
  description?: string;
  icon?: "truck" | "payment" | "returns" | "support" | "shield";
};

type TrustBadgesProps = {
  title?: string;
  badges?: TrustBadge[];
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
};

type PaymentSettings = {
  cod_enabled?: boolean;
  bkash_enabled?: boolean;
  nagad_enabled?: boolean;
};

type FooterSettings = {
  company_links?: Array<{ label?: string; url?: string }>;
};

type ContactSettings = {
  phone?: string;
  email?: string;
  whatsapp?: string;
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

type BundleDeal = {
  id: string;
  title: string;
  subtitle: string;
  products: Product[];
  price: number;
  originalPrice: number;
  savingsPercent: number;
};

function getHomepageBlock<TProps extends Record<string, unknown>>(blocks: StorePageBlock[], type: StorePageBlock["type"]) {
  return blocks.find((block) => block.type === type)?.props as TProps | undefined;
}

function buildBeautyBundles(products: Product[]): BundleDeal[] {
  const available = products.filter((product) => product.isAvailable !== false).slice(0, 9);
  const bundles: BundleDeal[] = [];

  for (let index = 0; index < available.length; index += 3) {
    const items = available.slice(index, index + 3);
    if (items.length < 2) {
      continue;
    }

    const currentPrice = items.reduce((sum, item) => sum + item.price, 0);
    const originalPrice = items.reduce((sum, item) => sum + (item.originalPrice ?? item.price), 0);
    const fallbackOriginalPrice = Math.round(currentPrice * 1.12);
    const compareAt = Math.max(originalPrice, fallbackOriginalPrice);
    const titleSeed = items[0]?.category || items[0]?.type || "Beauty";

    bundles.push({
      id: `bundle-${index}`,
      title: `${titleSeed} Routine`,
      subtitle: items.map((item) => item.type || item.category).filter(Boolean).slice(0, 3).join(" • "),
      products: items,
      price: currentPrice,
      originalPrice: compareAt,
      savingsPercent: Math.max(5, Math.round(((compareAt - currentPrice) / compareAt) * 100)),
    });
  }

  return bundles.slice(0, 3);
}

function formatTimeAgo(value: string | null) {
  if (!value) {
    return "Recently";
  }

  const now = new Date();
  const createdAt = new Date(value);
  const diffMs = now.getTime() - createdAt.getTime();
  const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) {
    return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
}

function BeautySectionHeading({
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
    <div className="mb-6 flex items-end justify-between gap-4 sm:mb-7">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
        <h2 className="mt-2 text-[1.8rem] font-semibold tracking-tight text-slate-900 dark:text-foreground sm:text-[2.2rem]">
          {title}
        </h2>
      </div>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="hidden text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 sm:inline-flex dark:text-muted-foreground dark:hover:text-foreground">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function BeautyRail({
  products,
  reviewStats,
}: {
  products: Product[];
  reviewStats: Record<string, ReviewStats>;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-5 lg:overflow-visible">
      {products.map((product) => (
        <BeautyProductCard
          key={product.id}
          product={product}
          reviewCount={reviewStats[product.id]?.count ?? 0}
          averageRating={reviewStats[product.id]?.average ?? 4.8}
        />
      ))}
    </div>
  );
}

export function BeautyStorefrontRenderer({
  store,
  page,
  blocks,
}: {
  store: Store;
  page: StorePage;
  blocks: StorePageBlock[];
}) {
  const currentStore = useOptionalStore();
  const activeStore = currentStore ?? store;
  const { addItem } = useCart();
  const { data: allProducts = [] } = useProducts(activeStore.id);
  const { data: featuredProducts = [] } = useFeaturedProducts(activeStore.id);
  const { data: productCategories = [] } = useProductCategories(activeStore.id);
  const { data: deliverySettings } = useSiteSettings<DeliverySettings>("delivery_settings", activeStore.id);
  const { data: paymentSettings } = useSiteSettings<PaymentSettings>("payment_settings", activeStore.id);
  const { data: footerSettings } = useSiteSettings<FooterSettings>("footer", activeStore.id);
  const { data: contactSettings } = useSiteSettings<ContactSettings>("contact_page", activeStore.id);

  const { data: approvedReviews = [] } = useQuery({
    queryKey: ["beauty-homepage-reviews", activeStore.id],
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
  const categoryBlock = getHomepageBlock<FeaturedBlockProps>(blocks, "category-showcase");
  const featuredBlock = getHomepageBlock<FeaturedBlockProps>(blocks, "featured-products");
  const testimonialBlock = getHomepageBlock<TestimonialBlockProps>(blocks, "testimonials");

  const availableProducts = useMemo(
    () => allProducts.filter((product) => product.isAvailable !== false),
    [allProducts],
  );
  const highlightedProducts = useMemo(
    () => (featuredProducts.length > 0 ? featuredProducts : availableProducts).slice(0, 5),
    [availableProducts, featuredProducts],
  );
  const heroProducts = useMemo(
    () => (highlightedProducts.length > 0 ? highlightedProducts : availableProducts).slice(0, 5),
    [availableProducts, highlightedProducts],
  );
  const beautyCategories = useMemo(() => {
    if (productCategories.length > 0) {
      return Array.from(
        new Set(
          productCategories
            .map((category: any) => (typeof category.name === "string" ? category.name.trim() : ""))
            .filter((value): value is string => Boolean(value)),
        ),
      ).slice(0, 6);
    }

    return Array.from(new Set(availableProducts.map((product) => product.category).filter(Boolean))).slice(0, 6);
  }, [availableProducts, productCategories]);
  const reviewStatsByProduct = useMemo(() => {
    const stats: Record<string, ReviewStats> = {};

    approvedReviews.forEach((review) => {
      if (!review.product_id || typeof review.rating !== "number") {
        return;
      }

      const current = stats[review.product_id] ?? { count: 0, average: 0 };
      const nextCount = current.count + 1;
      stats[review.product_id] = {
        count: nextCount,
        average: ((current.average * current.count) + review.rating) / nextCount,
      };
    });

    return stats;
  }, [approvedReviews]);
  const bestSellerProducts = useMemo(() => {
    const sorted = [...availableProducts].sort((left, right) => {
      const leftCount = reviewStatsByProduct[left.id]?.count ?? 0;
      const rightCount = reviewStatsByProduct[right.id]?.count ?? 0;
      if (leftCount !== rightCount) {
        return rightCount - leftCount;
      }
      return Number(right.featured) - Number(left.featured);
    });

    return sorted.slice(0, 5);
  }, [availableProducts, reviewStatsByProduct]);
  const bundleDeals = useMemo(
    () => buildBeautyBundles(availableProducts),
    [availableProducts],
  );
  const homepageReviews = useMemo(() => {
    if (approvedReviews.length > 0) {
      return approvedReviews.slice(0, 3);
    }

    return (testimonialBlock?.reviews ?? [])
      .filter((review) => review?.comment && review?.name)
      .slice(0, 3)
      .map((review, index) => ({
        id: `block-review-${index}`,
        product_id: null,
        author_name: review.name ?? null,
        rating: review.rating ?? 5,
        created_at: null,
        review_text: review.comment ?? null,
      })) satisfies PublicReviewRow[];
  }, [approvedReviews, testimonialBlock?.reviews]);

  const trustItems = useMemo(() => {
    const iconMap = {
      truck: Truck,
      payment: CreditCard,
      returns: HeartHandshake,
      support: ShieldCheck,
      shield: BadgeCheck,
    } as const;

    if (trustBlock?.badges?.length) {
      return trustBlock.badges.slice(0, 4).map((badge) => ({
        label: badge.label ?? "Trusted beauty care",
        description: badge.description ?? "Configured by this merchant.",
        icon: iconMap[badge.icon ?? "shield"],
      }));
    }

    const dynamicTrust = [
      {
        label: "100% Authentic Products",
        description: activeStore.name ? `Selected by ${activeStore.name}` : "Curated by the merchant",
        icon: BadgeCheck,
      },
      {
        label: deliverySettings?.enabled ? "Fast Delivery" : "Flexible Fulfillment",
        description: deliverySettings?.free_threshold
          ? `Free delivery from ৳${deliverySettings.free_threshold.toLocaleString()}`
          : "Delivery details shown before checkout",
        icon: Truck,
      },
      {
        label: paymentSettings?.bkash_enabled || paymentSettings?.nagad_enabled ? "Secure Payments" : "Easy Checkout",
        description: paymentSettings?.bkash_enabled || paymentSettings?.nagad_enabled
          ? "Manual and digital payment options available"
          : "Checkout flow follows current store settings",
        icon: CreditCard,
      },
      {
        label: "Easy Returns",
        description: footerSettings?.company_links?.some((link) => link.url?.includes("returns"))
          ? "Policy links are available in the footer"
          : "Review store policies before ordering",
        icon: HeartHandshake,
      },
    ];

    return dynamicTrust;
  }, [activeStore.name, deliverySettings?.enabled, deliverySettings?.free_threshold, footerSettings?.company_links, paymentSettings?.bkash_enabled, paymentSettings?.nagad_enabled, trustBlock?.badges]);

  const heroTitle = heroBlock?.title?.trim() || "Glow Naturally.";
  const heroHighlight = heroBlock?.highlight?.trim() || "Feel Beautiful.";
  const heroSubtitle = heroBlock?.subtitle?.trim() || activeStore.description || "Discover clean, effective beauty and self-care essentials made for you.";
  const heroTagline = heroBlock?.tagline?.trim() || "Beauty that empowers";
  const heroCtaLabel = heroBlock?.ctaText?.trim() || "Shop Now";
  const heroSecondaryCtaLabel = heroBlock?.secondaryCtaText?.trim() || "Explore Collections";
  const contactHref = contactSettings?.whatsapp
    ? `https://wa.me/${contactSettings.whatsapp.replace(/\D/g, "")}`
    : storefrontPath(heroBlock?.secondaryCtaLink || "/shop", activeStore.slug);

  return (
    <div className="bg-[#fcfdf8] text-slate-900 dark:bg-background dark:text-foreground">
      <section className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.08),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(250,230,205,0.72),_transparent_28%),linear-gradient(180deg,_#fffdf9_0%,_#fbfcf8_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.14),_transparent_34%),linear-gradient(180deg,_hsl(var(--background))_0%,_hsl(var(--background))_100%)]">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-5 pb-14 pt-10 md:px-8 md:pb-16 md:pt-16 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-6 lg:px-10 lg:pt-20">
          <div className="max-w-[560px]">
            <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-primary">{heroTagline}</p>
            <h1 className="mt-5 max-w-[11ch] text-[3rem] font-semibold leading-[1.04] tracking-[-0.04em] text-slate-900 dark:text-foreground sm:text-[4.15rem]">
              {heroTitle}{" "}
              <span className="text-primary">{heroHighlight}</span>
            </h1>
            <p className="mt-5 max-w-[40ch] text-lg leading-8 text-slate-600 dark:text-muted-foreground">
              {heroSubtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={storefrontPath(heroBlock?.ctaLink || "/shop", activeStore.slug)}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-[0_16px_32px_-18px_rgba(34,197,94,0.7)] transition-transform hover:-translate-y-0.5"
              >
                {heroCtaLabel}
              </Link>
              <Link
                href={contactHref}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#e7ebe4] bg-white px-7 text-sm font-semibold text-slate-700 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.24)] transition-colors hover:border-primary/30 hover:text-slate-900 dark:border-white/10 dark:bg-card dark:text-foreground"
              >
                {heroSecondaryCtaLabel}
              </Link>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {trustItems.slice(0, 3).map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-primary/10 bg-primary/5 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-foreground">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative min-h-[420px] lg:min-h-[620px]">
            <div className="absolute inset-0 rounded-[40px] bg-white/70 shadow-[0_35px_90px_-55px_rgba(15,23,42,0.28)] backdrop-blur-sm dark:bg-card/70" />
            <div className="absolute inset-x-[10%] bottom-10 top-10">
              {heroProducts[1] ? (
                <img src={heroProducts[1].image} alt={heroProducts[1].name} className="absolute left-[30%] top-[2%] h-[37%] w-[30%] rounded-[32px] object-contain drop-shadow-[0_22px_30px_rgba(15,23,42,0.14)]" />
              ) : null}
              {heroProducts[0] ? (
                <img src={heroProducts[0].image} alt={heroProducts[0].name} className="absolute left-[9%] top-[34%] h-[34%] w-[36%] rounded-[34px] object-contain drop-shadow-[0_24px_36px_rgba(15,23,42,0.16)]" />
              ) : null}
              {heroProducts[2] ? (
                <img src={heroProducts[2].image} alt={heroProducts[2].name} className="absolute left-[44%] top-[38%] h-[30%] w-[23%] rounded-[26px] object-contain drop-shadow-[0_18px_30px_rgba(15,23,42,0.14)]" />
              ) : null}
              {heroProducts[3] ? (
                <img src={heroProducts[3].image} alt={heroProducts[3].name} className="absolute right-[5%] top-[30%] h-[40%] w-[30%] rounded-[34px] object-contain drop-shadow-[0_22px_34px_rgba(15,23,42,0.16)]" />
              ) : null}
              {heroProducts[4] ? (
                <img src={heroProducts[4].image} alt={heroProducts[4].name} className="absolute right-[0%] bottom-[3%] h-[25%] w-[23%] rounded-[28px] object-contain drop-shadow-[0_20px_32px_rgba(15,23,42,0.14)]" />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#edf1ea] bg-white dark:border-white/10 dark:bg-card/30">
        <div className="mx-auto grid max-w-[1320px] gap-4 px-5 py-5 sm:grid-cols-2 md:px-8 lg:grid-cols-4 lg:px-10">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 rounded-[22px] border border-[#eef2ec] bg-[#fbfcfa] px-4 py-4 dark:border-white/10 dark:bg-card">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/10 bg-primary/5 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-foreground">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-14 md:px-8 lg:px-10">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
            {categoryBlock?.tagline?.trim() || "Shop by category"}
          </p>
          <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-900 dark:text-foreground sm:text-[2.6rem]">
            {categoryBlock?.title?.trim() || "Find what you love"}
          </h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {beautyCategories.map((category, index) => (
            <Link
              key={`${category}-${index}`}
              href={storefrontPath(`/shop?category=${encodeURIComponent(category)}`, activeStore.slug)}
              className="rounded-[30px] border border-[#eaf0e8] bg-white px-4 py-7 text-center shadow-[0_14px_28px_-24px_rgba(15,23,42,0.34)] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-card"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/10 bg-primary/5 text-primary">
                <Leaf className="h-5 w-5" />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-800 dark:text-foreground">{category}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
                {activeStore.name ? `Explore ${category.toLowerCase()} from ${activeStore.name}` : `Explore ${category.toLowerCase()}`}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <BeautySectionHeading
          eyebrow={featuredBlock?.tagline?.trim() || "Featured picks"}
          title={featuredBlock?.title?.trim() || "Our Favorites for You"}
          actionLabel="View all"
          actionHref={storefrontPath("/shop", activeStore.slug)}
        />
        <BeautyRail products={highlightedProducts} reviewStats={reviewStatsByProduct} />
      </section>

      {bundleDeals.length > 0 ? (
        <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
          <BeautySectionHeading
            eyebrow="Best value"
            title="Beauty Bundles & Combos"
            actionLabel="View all"
            actionHref={storefrontPath("/shop", activeStore.slug)}
          />
          <div className="grid gap-5 lg:grid-cols-3">
            {bundleDeals.map((bundle) => (
              <article key={bundle.id} className="overflow-hidden rounded-[32px] border border-[#e9ece7] bg-white p-4 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-card">
                <div className={cn(
                  "rounded-[28px] p-5",
                  bundle.id.endsWith("0") ? "bg-[#f6faf4]" : bundle.id.endsWith("3") ? "bg-[#f5f5ef]" : "bg-[#fff4f6]",
                )}>
                  <span className="inline-flex rounded-full bg-[#fff4cc] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#977400]">
                    Save {bundle.savingsPercent}%
                  </span>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {bundle.products.map((product) => (
                      <div key={product.id} className="flex h-40 items-center justify-center overflow-hidden rounded-[24px] bg-white/75 p-3 dark:bg-secondary/60">
                        <img src={product.image} alt={product.name} className="h-full w-full object-contain" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-2 pb-2 pt-5">
                  <h3 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-foreground">{bundle.title}</h3>
                  <p className="mt-2 line-clamp-1 text-sm text-slate-500 dark:text-muted-foreground">{bundle.subtitle}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-[1.7rem] font-bold text-primary">৳{bundle.price.toLocaleString()}</span>
                    <span className="text-base text-slate-400 line-through">৳{bundle.originalPrice.toLocaleString()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      bundle.products.forEach((product) => {
                        addItem({
                          productId: product.id,
                          name: product.name,
                          price: product.price,
                          image: product.image,
                          size: product.sizes[0] || "Default",
                          storeId: activeStore.id,
                        });
                      });
                    }}
                    className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_16px_32px_-18px_rgba(34,197,94,0.68)] transition-transform hover:-translate-y-0.5"
                  >
                    Add Bundle to Cart
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-[1320px] px-5 py-6 md:px-8 lg:px-10">
        <BeautySectionHeading
          eyebrow="Bestsellers"
          title="Loved by Thousands"
          actionLabel="View all"
          actionHref={storefrontPath("/shop", activeStore.slug)}
        />
        <BeautyRail products={bestSellerProducts.length > 0 ? bestSellerProducts : highlightedProducts} reviewStats={reviewStatsByProduct} />
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
            {testimonialBlock?.subtitle?.trim() || "Customer love"}
          </p>
          <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-900 dark:text-foreground sm:text-[2.6rem]">
            {testimonialBlock?.title?.trim() || "What Our Customers Say"}
          </h2>
        </div>
        <div className="relative mt-8">
          <div aria-hidden="true" className="absolute -left-1 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#e7ece5] bg-white text-slate-500 shadow-sm lg:flex dark:border-white/10 dark:bg-card dark:text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
          </div>
          <div aria-hidden="true" className="absolute -right-1 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#e7ece5] bg-white text-slate-500 shadow-sm lg:flex dark:border-white/10 dark:bg-card dark:text-muted-foreground">
            <ChevronRight className="h-4 w-4" />
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {homepageReviews.map((review, index) => (
              <article key={review.id ?? `review-${index}`} className="rounded-[30px] border border-[#e9ece7] bg-white p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-sm font-semibold text-primary">
                    {(review.author_name || "C").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-foreground">{review.author_name || "Verified Buyer"}</p>
                    <p className="text-sm text-slate-500 dark:text-muted-foreground">Verified Buyer</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-1 text-primary">
                  {Array.from({ length: Math.max(1, Math.min(5, review.rating ?? 5)) }).map((_, starIndex) => (
                    <ShieldCheck key={starIndex} className="h-4 w-4 fill-current stroke-none" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-muted-foreground">
                  {review.review_text || `${activeStore.name} made this beauty routine feel easy and trustworthy.`}
                </p>
                <p className="mt-4 text-xs text-slate-400 dark:text-muted-foreground">{formatTimeAgo(review.created_at)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
