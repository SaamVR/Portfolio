"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ChevronRight, Headphones, Search, ShieldCheck, Sparkles, Star, Tags, Truck, Zap } from "lucide-react";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import { GeneralCatalogProductCard } from "@/components/storefront/general-catalog/GeneralCatalogProductCard";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/data/products";
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

type TrustBadgesProps = {
  title?: string;
  badges?: Array<{ label?: string; description?: string; icon?: "truck" | "payment" | "returns" | "support" | "shield" }>;
};

type ContactSettings = {
  phone?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
  description?: string;
};

type FooterSettings = {
  about_text?: string;
  company_links?: Array<{ label?: string; url?: string }>;
  extra_links?: Array<{ label?: string; url?: string }>;
};

type AboutSettings = {
  title?: string;
  content?: string;
  values?: Array<{ icon?: string; title?: string; desc?: string }>;
};

type DeliverySettings = {
  enabled?: boolean;
  free_threshold?: number;
  delivery_fee?: number;
};

type PublicReviewRow = {
  product_id: string | null;
  rating: number | null;
};

type ReviewStats = {
  count: number;
  average: number;
};

type FilterKey = "all" | "bestsellers" | "new" | "sale" | "top-rated";

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
  if (categoryRows.length > 0) return categoryRows.slice(0, 8);
  const typeRows = Array.from(new Set(types.map((item) => item.name?.trim()).filter((value): value is string => Boolean(value))));
  if (typeRows.length > 0) return typeRows.slice(0, 8);
  return Array.from(new Set(products.flatMap((product) => [product.category, product.type]).filter(Boolean))).slice(0, 8);
}

function matchesFilter(product: Product, stats: ReviewStats | undefined, activeFilter: FilterKey) {
  switch (activeFilter) {
    case "bestsellers":
      return product.featured || (stats?.count ?? 0) >= 2;
    case "new":
      return !product.badge || product.badge.toLowerCase().includes("new");
    case "sale":
      return Boolean(product.originalPrice && product.originalPrice > product.price) || product.badge?.toLowerCase().includes("sale");
    case "top-rated":
      return (stats?.average ?? 0) >= 4.7;
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

export function GeneralCatalogStorefrontRenderer({
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
  const { data: aboutSettings } = useSiteSettings<AboutSettings>("about_page", activeStore.id);
  const { data: deliverySettings } = useSiteSettings<DeliverySettings>("delivery_settings", activeStore.id);
  const { data: templateAssets } = useSiteSettings<Record<string, string>>("template_assets_seed", activeStore.id);

  const { data: approvedReviews = [] } = useQuery({
    queryKey: ["general-catalog-reviews", activeStore.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_product_reviews" as any)
        .select("product_id, rating")
        .eq("store_id", activeStore.id);

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
  const trustBlock = getHomepageBlock<TrustBadgesProps>(blocks, "trust-badges");

  const availableProducts = useMemo(
    () => allProducts.filter((product) => product.isAvailable !== false),
    [allProducts],
  );
  const highlightedProducts = useMemo(
    () => (featuredProducts.length > 0 ? featuredProducts : availableProducts).slice(0, featuredBlock?.limit ?? 8),
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
      const matchesActiveFilter = matchesFilter(product, reviewStats[product.id], activeFilter);
      return matchesQuery && matchesActiveFilter;
    });
  }, [activeFilter, availableProducts, reviewStats, searchQuery]);

  const heroEyebrow = heroBlock?.tagline?.trim() || "Mixed catalog. One clear storefront.";
  const heroTitle = heroBlock?.title?.trim() || "Browse products across";
  const heroHighlight = heroBlock?.highlight?.trim() || "every category";
  const heroSubtitle = heroBlock?.subtitle?.trim()
    || extractPlainText(richTextBlock?.body)
    || activeStore.description
    || "A clean, adaptable storefront for merchants selling across multiple categories without needing a specialized vertical template.";
  const brandValueBody = aboutSettings?.content?.trim()
    || footerSettings?.about_text?.trim()
    || "Use this section to explain what makes the store trustworthy across a wide catalog: product curation, support, pricing clarity, updates, or service quality.";

  const trustItems = trustBlock?.badges?.length
    ? trustBlock.badges.slice(0, 4).map((item) => ({
        title: item.label?.trim() || "Merchant-managed trust signal",
        body: item.description?.trim() || "Configured from this store's CMS trust settings.",
      }))
    : [
        {
          title: "Mixed-category ready",
          body: "One storefront can support varied product types without losing clarity or navigation structure.",
        },
        {
          title: "Transparent pricing",
          body: "Real product prices and discounts flow directly from the merchant catalog.",
        },
        {
          title: "Support visibility",
          body: contactSettings?.phone?.trim() || contactSettings?.email?.trim() || "Contact details stay visible throughout the buying journey.",
        },
        {
          title: "Flexible fulfilment",
          body: deliverySettings?.enabled ? "Delivery settings and thresholds stay tied to the store configuration." : "Policies and support can adapt to different product categories.",
        },
      ];

  return (
    <div className="bg-[#fbfcfb] text-slate-950 dark:bg-background dark:text-foreground">
      <section className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.09),_transparent_30%),linear-gradient(180deg,_#ffffff_0%,_#fbfcfb_100%)] dark:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)]">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-5 pb-12 pt-8 md:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:px-10 lg:pb-14 lg:pt-10">
          <div className="max-w-[540px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{heroEyebrow}</p>
            <h1 className="mt-5 text-[3rem] font-semibold leading-[1.03] tracking-[-0.05em] text-slate-950 dark:text-foreground sm:text-[4.1rem]">
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
                {heroBlock?.ctaText?.trim() || "Browse All Products"}
              </Link>
              <Link
                href={storefrontPath(heroBlock?.secondaryCtaLink || "/contact", activeStore.slug)}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[#dce9df] bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:border-primary/35 dark:border-white/10 dark:bg-card dark:text-foreground"
              >
                {heroBlock?.secondaryCtaText?.trim() || "Contact Store"}
              </Link>
            </div>

            <div className="mt-7 flex flex-col gap-3 rounded-[22px] border border-[#e7eee9] bg-white p-3 shadow-sm sm:flex-row sm:items-center dark:border-white/10 dark:bg-card">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Search className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <label htmlFor="catalog-hero-search" className="sr-only">Search products</label>
                <input
                  id="catalog-hero-search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search products, categories, or types"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-foreground dark:placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          <div className="relative aspect-[16/10.7] w-full overflow-hidden rounded-[34px] border border-[#e8efe9] bg-white shadow-[0_28px_70px_-46px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-card">
            {heroProduct ? (
              <SafeStorefrontImage
                src={heroProduct.image}
                fallbackSrc={templateAssets?.hero_image_url ?? templateAssets?.fallback_product_image_url ?? null}
                fill
                sizes="(max-width: 1024px) 92vw, 48vw"
                alt={heroProduct.name}
                className="object-cover"
              />
            ) : (
              <div className="aspect-[16/10.7] w-full bg-[#f5faf6]" />
            )}
            <div className="absolute bottom-6 left-6 rounded-[22px] border border-white/80 bg-white/92 px-4 py-3 shadow-[0_18px_34px_-20px_rgba(15,23,42,0.26)] dark:border-white/10 dark:bg-card/92">
              <p className="text-sm font-semibold text-slate-950 dark:text-foreground">
                {availableProducts.length}+ active products
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
                Across mixed categories in one merchant storefront
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow={categoryBlock?.tagline?.trim() || "Explore categories"}
          title={categoryBlock?.title?.trim() || "Broad categories for faster browsing"}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {categoryNames.map((category, index) => (
            <Link
              key={`${category}-${index}`}
              href={storefrontPath(`/shop?category=${encodeURIComponent(category)}`, activeStore.slug)}
              className="rounded-[24px] border border-[#e7eee9] bg-white p-5 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.16)] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-card"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                {index % 4 === 0 ? <Sparkles className="h-5 w-5" /> : index % 4 === 1 ? <Tags className="h-5 w-5" /> : index % 4 === 2 ? <Zap className="h-5 w-5" /> : <BadgeCheck className="h-5 w-5" />}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-950 dark:text-foreground">{category}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-muted-foreground">
                Mixed catalog browsing stays clean even when the store sells across different product families.
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <div className="grid gap-5 xl:grid-cols-3">
          {[
            {
              eyebrow: "Limited time",
              title: "Save more with curated offers",
              body: "Turn mixed products into clear promotional entry points without fragmenting the storefront structure.",
              icon: Tags,
              href: storefrontPath("/shop", activeStore.slug),
            },
            {
              eyebrow: "Instant access",
              title: "Fast discovery across categories",
              body: "Search, category browsing, and flexible filtering help visitors find the right product faster.",
              icon: Search,
              href: storefrontPath("/shop", activeStore.slug),
            },
            {
              eyebrow: "For growing merchants",
              title: "One catalog, many use cases",
              body: "Use this fallback template when the store is broad, mixed, or not locked to a single vertical renderer.",
              icon: ShieldCheck,
              href: storefrontPath("/contact", activeStore.slug),
            },
          ].map((card, index) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className={`rounded-[28px] border p-6 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.14)] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-card ${index === 0 ? "border-[#ddf0e1] bg-[linear-gradient(135deg,#effaf1_0%,#f7fcf8_100%)]" : index === 1 ? "border-[#dfeefd] bg-[linear-gradient(135deg,#f3f9ff_0%,#f9fcff_100%)]" : "border-[#f0e3f6] bg-[linear-gradient(135deg,#faf6ff_0%,#fcfbff_100%)]"}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-primary shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{card.eyebrow}</p>
                <h3 className="mt-3 text-[1.35rem] font-semibold tracking-tight text-slate-950 dark:text-foreground">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-muted-foreground">{card.body}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-foreground">
                  Explore
                  <ChevronRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow={featuredBlock?.tagline?.trim() || "Featured products"}
          title={featuredBlock?.title?.trim() || "Handpicked products with flexible filters"}
        />

        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all" as const, label: "All" },
              { key: "bestsellers" as const, label: "Bestsellers" },
              { key: "new" as const, label: "New Arrivals" },
              { key: "sale" as const, label: "On Sale" },
              { key: "top-rated" as const, label: "Top Rated" },
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
              placeholder="Search catalog"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-foreground dark:placeholder:text-muted-foreground lg:w-[220px]"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {filteredProducts.slice(0, 8).map((product) => (
            <GeneralCatalogProductCard key={product.id} product={product} reviewStats={reviewStats[product.id]} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href={storefrontPath("/shop", activeStore.slug)}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#dce9df] bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:border-primary/35 dark:border-white/10 dark:bg-card dark:text-foreground"
          >
            View All Products
            <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <div className="grid gap-4 rounded-[28px] border border-[#e7eee9] bg-white px-4 py-5 shadow-[0_18px_38px_-32px_rgba(15,23,42,0.16)] sm:grid-cols-2 xl:grid-cols-4 lg:px-6 dark:border-white/10 dark:bg-card">
          {[
            { label: "Happy customers", value: `${Math.max(availableProducts.length * 40, 50)}+`, icon: Sparkles },
            { label: "Average rating", value: `${Object.values(reviewStats).length > 0 ? (Object.values(reviewStats).reduce((sum, item) => sum + item.average, 0) / Object.values(reviewStats).length).toFixed(1) : "4.9"}/5`, icon: Star },
            { label: "Reliable support", value: contactSettings?.phone?.trim() || "Live contact", icon: Headphones },
            { label: "Policy confidence", value: deliverySettings?.enabled ? "Store delivery active" : "Policies visible", icon: Truck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 rounded-[20px] border border-[#eef3ef] bg-[#fbfdfb] px-4 py-4 dark:border-white/10 dark:bg-secondary/20">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xl font-semibold tracking-tight text-slate-950 dark:text-foreground">{item.value}</p>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 pb-14 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow={richTextBlock?.eyebrow?.trim() || "Why this catalog works"}
          title={richTextBlock?.title?.trim() || "A broad catalog still needs a strong point of view"}
          subtitle={brandValueBody}
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {trustItems.map((item, index) => (
            <div key={item.title} className="rounded-[24px] border border-[#e7eee9] bg-white p-6 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-card">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                {index % 4 === 0 ? <ShieldCheck className="h-5 w-5" /> : index % 4 === 1 ? <BadgeCheck className="h-5 w-5" /> : index % 4 === 2 ? <Truck className="h-5 w-5" /> : <Headphones className="h-5 w-5" />}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-950 dark:text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
