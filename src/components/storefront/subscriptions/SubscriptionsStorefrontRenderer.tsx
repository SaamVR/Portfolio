"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CheckCircle2, ChevronRight, Clock3, Headphones, Search, ShieldCheck, Sparkles, Star, Zap } from "lucide-react";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import { SubscriptionProductCard } from "@/components/storefront/subscriptions/SubscriptionProductCard";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/data/products";
import type { TemplateSeedCatalogMetadata } from "@/lib/cms/template-demo-seeds";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
import { storefrontPath } from "@/lib/slug";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";

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
  limit?: number;
};

type RichTextBlockProps = {
  eyebrow?: string;
  title?: string;
  body?: unknown;
};

type TestimonialBlockProps = {
  title?: string;
  subtitle?: string;
  reviews?: Array<{ name?: string; rating?: number; comment?: string }>;
};

type TrustBadgesProps = {
  title?: string;
  badges?: Array<{ label?: string; description?: string; icon?: "truck" | "payment" | "returns" | "support" | "shield" }>;
};

type ContactSettings = {
  phone?: string;
  email?: string;
  whatsapp?: string;
  description?: string;
  response_time_text?: string;
};

type FooterSettings = {
  about_text?: string;
  company_links?: Array<{ label?: string; url?: string }>;
};

type SeedTestimonial = {
  name?: string;
  title?: string;
  rating?: number;
  comment?: string;
};

type PublicReviewRow = {
  id: string | null;
  product_id: string | null;
  author_name: string | null;
  rating: number | null;
  review_text: string | null;
};

type ReviewStats = {
  count: number;
  average: number;
};

type FilterKey = "all" | "streaming" | "productivity" | "design" | "tools";

function getHomepageBlock<TProps extends Record<string, unknown>>(blocks: StorePageBlock[], type: StorePageBlock["type"]) {
  return blocks.find((block) => block.type === type)?.props as TProps | undefined;
}

function extractPlainText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return "";
  const node = value as { text?: string; content?: unknown[] };
  const text = typeof node.text === "string" ? node.text : "";
  const nested = Array.isArray(node.content) ? node.content.map(extractPlainText).join(" ") : "";
  return `${text} ${nested}`.trim();
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

function buildCategoryNames(products: Product[], categories: Array<{ name?: string | null }>, types: Array<{ name?: string | null }>) {
  const categoryRows = Array.from(new Set(categories.map((item) => item.name?.trim()).filter((value): value is string => Boolean(value))));
  if (categoryRows.length > 0) return categoryRows.slice(0, 6);
  const typeRows = Array.from(new Set(types.map((item) => item.name?.trim()).filter((value): value is string => Boolean(value))));
  if (typeRows.length > 0) return typeRows.slice(0, 6);
  return Array.from(new Set(products.flatMap((product) => [product.category, product.type]).filter(Boolean))).slice(0, 6);
}

function matchesFilter(product: Product, filter: FilterKey) {
  const source = `${product.name} ${product.category} ${product.type} ${product.description}`.toLowerCase();
  switch (filter) {
    case "streaming":
      return /stream|video|netflix|disney|prime|youtube/.test(source);
    case "productivity":
      return /office|notion|saas|productivity|workspace|cloud/.test(source);
    case "design":
      return /design|creative|preset|template|graphics|canva/.test(source);
    case "tools":
      return /tool|ai|chatgpt|midjourney|vpn|security/.test(source);
    default:
      return true;
  }
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-7 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-foreground sm:text-[2.4rem]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500 dark:text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function SubscriptionsStorefrontRenderer({
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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const { data: allProducts = [] } = useProducts(activeStore.id);
  const { data: featuredProducts = [] } = useFeaturedProducts(activeStore.id);
  const { data: productCategories = [] } = useProductCategories(activeStore.id);
  const { data: productTypes = [] } = useProductTypes(activeStore.id);
  const { data: contactSettings } = useSiteSettings<ContactSettings>("contact_page", activeStore.id);
  const { data: footerSettings } = useSiteSettings<FooterSettings>("footer", activeStore.id);
  const { data: catalogSeedMetadata } = useSiteSettings<TemplateSeedCatalogMetadata>("catalog_seed_metadata", activeStore.id);
  const { data: templateAssets } = useSiteSettings<Record<string, string>>("template_assets_seed", activeStore.id);
  const { data: seedTestimonialsData } = useSiteSettings<SeedTestimonial[]>("seed_testimonials", activeStore.id);
  const seedTestimonials = seedTestimonialsData ?? [];

  const { data: approvedReviews = [] } = useQuery({
    queryKey: ["subscriptions-storefront-reviews", activeStore.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_product_reviews" as any)
        .select("id, product_id, author_name, rating, review_text")
        .eq("store_id", activeStore.id)
        .order("created_at", { ascending: false })
        .limit(18);

      if (error) throw error;
      return ((data ?? []) as unknown) as PublicReviewRow[];
    },
    enabled: Boolean(activeStore.id),
    staleTime: 120_000,
  });

  const heroBlock = getHomepageBlock<HeroBlockProps>(blocks, "hero");
  const categoryBlock = getHomepageBlock<FeaturedBlockProps>(blocks, "category-showcase");
  const featuredBlock = getHomepageBlock<FeaturedBlockProps>(blocks, "featured-products");
  const richTextBlock = getHomepageBlock<RichTextBlockProps>(blocks, "rich-text");
  const testimonialBlock = getHomepageBlock<TestimonialBlockProps>(blocks, "testimonials");
  const trustBlock = getHomepageBlock<TrustBadgesProps>(blocks, "trust-badges");

  const availableProducts = useMemo(
    () => allProducts.filter((product) => product.isAvailable !== false),
    [allProducts],
  );
  const highlightedProducts = useMemo(
    () => (featuredProducts.length > 0 ? featuredProducts : availableProducts).slice(0, featuredBlock?.limit ?? 6),
    [availableProducts, featuredBlock?.limit, featuredProducts],
  );
  const heroProduct = highlightedProducts[0] ?? availableProducts[0] ?? null;
  const categoryNames = useMemo(
    () => buildCategoryNames(availableProducts, productCategories, productTypes),
    [availableProducts, productCategories, productTypes],
  );
  const reviewStats = useMemo(
    () => buildReviewStats(approvedReviews),
    [approvedReviews],
  );
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return availableProducts.filter((product) => {
      const matchesQuery = !query || `${product.name} ${product.category} ${product.type} ${product.description}`.toLowerCase().includes(query);
      return matchesQuery && matchesFilter(product, activeFilter);
    });
  }, [activeFilter, availableProducts, searchQuery]);

  const testimonials = useMemo(() => {
    const fromReviews = approvedReviews
      .filter((row) => row.review_text?.trim())
      .slice(0, 3)
      .map((row, index) => ({
        id: row.id ?? `review-${index}`,
        name: row.author_name?.trim() || "Verified customer",
        role: `${activeStore.name || "This store"} customer`,
        rating: Math.max(1, Math.min(5, row.rating ?? 5)),
        comment: row.review_text?.trim() || "",
      }));

    if (fromReviews.length > 0) {
      return fromReviews;
    }

    return (testimonialBlock?.reviews ?? [])
      .filter((item) => item?.comment?.trim())
      .slice(0, 3)
      .map((item, index) => ({
        id: `fallback-${index}`,
        name: item?.name?.trim() || "Customer review",
        role: "Store customer",
        rating: Math.max(1, Math.min(5, item?.rating ?? 5)),
        comment: item?.comment?.trim() || "",
      }));
  }, [activeStore.name, approvedReviews, testimonialBlock?.reviews]);

  const resolvedTestimonials = testimonials.length > 0
    ? testimonials
    : seedTestimonials
      .filter((item) => item?.comment?.trim())
      .slice(0, 3)
      .map((item, index) => ({
        id: `seed-${index}`,
        name: item.name?.trim() || "Verified customer",
        role: item.title?.trim() || "Store customer",
        rating: Math.max(1, Math.min(5, item.rating ?? 5)),
        comment: item.comment?.trim() || "",
      }));

  const heroEyebrow = heroBlock?.tagline?.trim() || "Premium subscriptions. Instant access.";
  const heroTitle = heroBlock?.title?.trim() || "Your all-in-one";
  const heroHighlight = heroBlock?.highlight?.trim() || "subscription hub";
  const heroSubtitle = heroBlock?.subtitle?.trim()
    || extractPlainText(richTextBlock?.body)
    || contactSettings?.description?.trim()
    || activeStore.description
    || "Sell subscriptions, memberships, and access-based products from one storefront with clearer plan selection and faster conversion.";

  const trustItems = trustBlock?.badges?.length
    ? trustBlock.badges.slice(0, 4).map((item) => ({
        label: item.label?.trim() || "Store-managed benefit",
        body: item.description?.trim() || "Configured from this store's trust settings.",
      }))
    : [
        { label: "Instant delivery", body: "Access details can be delivered quickly after checkout or merchant review." },
        { label: "Secure payments", body: "Checkout stays inside the shared storefront and payment flow." },
        { label: "24/7 support", body: contactSettings?.response_time_text?.trim() || "Use the merchant contact flow for support." },
        { label: "Trusted plans", body: "Customers can compare plan type and duration before subscribing." },
      ];

  return (
    <div className="bg-[#fbfcfb] text-slate-950 dark:bg-background dark:text-foreground">
      <section className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.10),_transparent_30%),linear-gradient(180deg,_#ffffff_0%,_#fbfcfb_100%)] dark:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)]">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-5 pb-12 pt-8 md:px-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:px-10 lg:pb-14 lg:pt-10">
          <div className="max-w-[540px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{heroEyebrow}</p>
            <h1 className="mt-5 text-[3rem] font-semibold leading-[1.03] tracking-[-0.05em] text-slate-950 dark:text-foreground sm:text-[4.15rem]">
              {heroTitle} <span className="text-primary">{heroHighlight}</span>
            </h1>
            <p className="mt-5 max-w-[44ch] text-base leading-8 text-slate-500 dark:text-muted-foreground">
              {heroSubtitle}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={storefrontPath(heroBlock?.ctaLink || "/shop", activeStore.slug)}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_18px_34px_-18px_rgba(34,197,94,0.58)] transition-transform hover:-translate-y-0.5"
              >
                {heroBlock?.ctaText?.trim() || "Browse Subscriptions"}
              </Link>
              <Link
                href={storefrontPath(heroBlock?.secondaryCtaLink || "/about", activeStore.slug)}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[#dce9df] bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:border-primary/35 dark:border-white/10 dark:bg-card dark:text-foreground"
              >
                {heroBlock?.secondaryCtaText?.trim() || "How It Works"}
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Instant delivery", icon: Clock3 },
                { label: "Secure payments", icon: ShieldCheck },
                { label: "24/7 support", icon: Headphones },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-[20px] border border-[#e7eee9] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-card">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-foreground">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {(highlightedProducts.length > 0 ? highlightedProducts : availableProducts).slice(0, 9).map((product) => (
              <div key={product.id} className="relative aspect-square overflow-hidden rounded-[24px] border border-[#e7eee9] bg-white p-5 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card">
                <SafeStorefrontImage
                  src={product.image}
                  fallbackSrc={catalogSeedMetadata?.assets?.fallback_product_image_url ?? templateAssets?.fallback_product_image_url ?? null}
                  fill
                  sizes="(max-width: 1024px) 30vw, 15vw"
                  alt={product.name}
                  className="object-contain p-2"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <div className="grid gap-4 rounded-[28px] border border-[#e7eee9] bg-white px-4 py-5 shadow-[0_18px_38px_-32px_rgba(15,23,42,0.16)] sm:grid-cols-2 xl:grid-cols-4 lg:px-6 dark:border-white/10 dark:bg-card">
          {trustItems.map((item, index) => (
            <div key={item.label} className="flex items-center gap-3 rounded-[20px] border border-[#eef3ef] bg-[#fbfdfb] px-4 py-4 dark:border-white/10 dark:bg-secondary/20">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                {index % 4 === 0 ? <ShieldCheck className="h-4.5 w-4.5" /> : index % 4 === 1 ? <BadgeCheck className="h-4.5 w-4.5" /> : index % 4 === 2 ? <Clock3 className="h-4.5 w-4.5" /> : <Sparkles className="h-4.5 w-4.5" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-foreground">{item.label}</p>
                <p className="text-xs text-slate-500 dark:text-muted-foreground">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow={categoryBlock?.tagline?.trim() || "Browse by category"}
          title={categoryBlock?.title?.trim() || "Subscription categories"}
          subtitle="Explore subscriptions across different use cases without leaving the shared storefront architecture."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {categoryNames.map((category, index) => (
            <Link
              key={`${category}-${index}`}
              href={storefrontPath(`/shop?category=${encodeURIComponent(category)}`, activeStore.slug)}
              className="rounded-[22px] border border-[#e7eee9] bg-white p-5 text-center shadow-[0_16px_34px_-30px_rgba(15,23,42,0.16)] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-card"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                {index % 3 === 0 ? <Zap className="h-5 w-5" /> : index % 3 === 1 ? <Search className="h-5 w-5" /> : <BadgeCheck className="h-5 w-5" />}
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-foreground">{category}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">Subscription-ready offers</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow={featuredBlock?.tagline?.trim() || "Featured subscriptions"}
          title={featuredBlock?.title?.trim() || "Compare plans and billing durations"}
        />

        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all" as const, label: "All" },
              { key: "streaming" as const, label: "Streaming" },
              { key: "productivity" as const, label: "Productivity" },
              { key: "design" as const, label: "Design & Creative" },
              { key: "tools" as const, label: "Tools" },
            ].map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${activeFilter === filter.key ? "bg-primary text-primary-foreground" : "border border-[#dce9df] bg-white text-slate-700 hover:border-primary/30 dark:border-white/10 dark:bg-card dark:text-muted-foreground"}`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 rounded-full border border-[#dce9df] bg-white px-4 py-2 text-sm text-slate-500 dark:border-white/10 dark:bg-card dark:text-muted-foreground">
            <Search className="h-4 w-4" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search subscriptions"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-foreground dark:placeholder:text-muted-foreground lg:w-[220px]"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.slice(0, 6).map((product) => (
            <SubscriptionProductCard
              key={product.id}
              product={product}
              reviewStats={reviewStats[product.id]}
              metadata={catalogSeedMetadata?.products?.[product.id]}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <div className="grid gap-5 overflow-hidden rounded-[30px] border border-[#e7eee9] bg-[linear-gradient(135deg,#f2fcf4_0%,#f7fdf8_100%)] p-6 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.16)] lg:grid-cols-[0.9fr_1.1fr] lg:items-center dark:border-white/10 dark:bg-card">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Annual plan promotion</p>
            <h3 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-foreground">
              Go annual. Save more.
            </h3>
            <p className="mt-3 max-w-[48ch] text-sm leading-7 text-slate-500 dark:text-muted-foreground">
              {extractPlainText(richTextBlock?.body) || footerSettings?.about_text || "Highlight longer-term value here and let shoppers compare monthly versus yearly pricing directly on each subscription card."}
            </p>
            <Link
              href={storefrontPath("/shop", activeStore.slug)}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Explore Annual Plans
            </Link>
          </div>
          <div className="rounded-[26px] border border-white/70 bg-white/85 p-6 shadow-sm dark:border-white/10 dark:bg-secondary/20">
            <p className="text-[3.5rem] font-semibold tracking-tight text-primary">Up to 20%</p>
            <p className="text-lg font-semibold text-slate-950 dark:text-foreground">on selected annual plans</p>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-muted-foreground">
              Use yearly billing to present stronger value while keeping pricing inside the shared cart and checkout system.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow="How it works"
          title="Subscribe in three simple steps"
          subtitle="A reusable flow for subscription stores: choose a plan, check billing duration, then finish in the normal storefront cart and checkout."
        />
        <div className="grid gap-5 xl:grid-cols-3">
          {[
            { title: "Choose a subscription", body: "Browse the marketplace, compare products, and pick the one that matches your needs.", icon: Search },
            { title: "Pick plan and billing", body: "Use the card selectors to choose account type and monthly or yearly billing before adding to cart.", icon: BadgeCheck },
            { title: "Checkout and receive access", body: "Complete the normal store checkout and wait for merchant activation or delivery details.", icon: Clock3 },
          ].map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-[24px] border border-[#e7eee9] bg-white p-6 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-card">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-950 dark:text-foreground">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-muted-foreground">{step.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 pb-14 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow={testimonialBlock?.subtitle?.trim() || "Customer reviews"}
          title={testimonialBlock?.title?.trim() || "What subscribers say"}
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {resolvedTestimonials.map((testimonial) => (
            <div key={testimonial.id} className="rounded-[24px] border border-[#e7eee9] bg-white p-6 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-card">
              <div className="flex items-center gap-1 text-[#f2b21d]">
                {Array.from({ length: testimonial.rating }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-muted-foreground">{testimonial.comment}</p>
              <div className="mt-5">
                <p className="font-semibold text-slate-950 dark:text-foreground">{testimonial.name}</p>
                <p className="text-sm text-slate-500 dark:text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
