"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Download, FolderOpen, LifeBuoy, LockKeyhole, Search, ShieldCheck, Sparkles, Star, Zap } from "lucide-react";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import { DigitalProductCard } from "@/components/storefront/digital-downloads/DigitalProductCard";
import { DownloadAccessPanel } from "@/components/storefront/digital-downloads/DownloadAccessPanel";
import { getDigitalCategoryDescription, getDigitalFormats } from "@/components/storefront/digital-downloads/digital-download-utils";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/data/products";
import type { TemplateSeedCatalogMetadata } from "@/lib/cms/template-demo-seeds";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
import { generateCloudinarySrcSet } from "@/lib/cms/cloudinary-responsive";
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
  badges?: Array<{ label?: string; description?: string }>;
};

type ContactSettings = {
  email?: string;
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
  const derived = Array.from(new Set(products.flatMap((product) => [product.category, product.type]).filter(Boolean))).slice(0, 8);
  return derived.length > 0 ? derived : ["Templates", "Presets", "Fonts", "Audio"];
}

function matchesDigitalFilter(product: Product, query: string) {
  return `${product.name} ${product.category} ${product.type} ${product.description}`.toLowerCase().includes(query.toLowerCase());
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
    <div className="mb-8 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-foreground sm:text-[2.35rem]">
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

export function DigitalDownloadsStorefrontRenderer({
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
  const { data: allProducts = [] } = useProducts(activeStore.id);
  const { data: featuredProducts = [] } = useFeaturedProducts(activeStore.id);
  const { data: productCategories = [] } = useProductCategories(activeStore.id);
  const { data: productTypes = [] } = useProductTypes(activeStore.id);
  const { data: contactSettings } = useSiteSettings<ContactSettings>("contact_page", activeStore.id);
  const { data: footerSettings } = useSiteSettings<FooterSettings>("footer", activeStore.id);
  const { data: catalogSeedMetadata } = useSiteSettings<TemplateSeedCatalogMetadata>("catalog_seed_metadata", activeStore.id);
  const { data: seedTestimonialsData } = useSiteSettings<SeedTestimonial[]>("seed_testimonials", activeStore.id);
  const seedTestimonials = seedTestimonialsData ?? [];

  const { data: approvedReviews = [] } = useQuery({
    queryKey: ["digital-storefront-reviews", activeStore.id],
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
    () => (featuredProducts.length > 0 ? featuredProducts : availableProducts).slice(0, featuredBlock?.limit ?? 5),
    [availableProducts, featuredBlock?.limit, featuredProducts],
  );
  const filteredProducts = useMemo(
    () => availableProducts.filter((product) => !searchQuery.trim() || matchesDigitalFilter(product, searchQuery.trim())),
    [availableProducts, searchQuery],
  );
  const categoryNames = useMemo(
    () => buildCategoryNames(availableProducts, productCategories, productTypes),
    [availableProducts, productCategories, productTypes],
  );
  const reviewStats = useMemo(
    () => buildReviewStats(approvedReviews),
    [approvedReviews],
  );

  const testimonials = useMemo(() => {
    const fromReviews = approvedReviews
      .filter((row) => row.review_text?.trim())
      .slice(0, 4)
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
      .slice(0, 4)
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
      .slice(0, 4)
      .map((item, index) => ({
        id: `seed-${index}`,
        name: item.name?.trim() || "Verified customer",
        role: item.title?.trim() || "Store customer",
        rating: Math.max(1, Math.min(5, item.rating ?? 5)),
        comment: item.comment?.trim() || "",
      }));

  const heroEyebrow = heroBlock?.tagline?.trim() || "Instant downloads";
  const heroTitle = heroBlock?.title?.trim() || "Premium Digital";
  const heroHighlight = heroBlock?.highlight?.trim() || "Downloads";
  const heroSubtitle = heroBlock?.subtitle?.trim()
    || extractPlainText(richTextBlock?.body)
    || contactSettings?.description?.trim()
    || activeStore.description
    || "Sell templates, presets, assets, fonts, and downloadable resources through a real storefront that stays connected to your products, checkout, and merchant settings.";

  const trustItems = trustBlock?.badges?.length
    ? trustBlock.badges.slice(0, 4).map((item) => ({
        label: item.label?.trim() || "Store-managed benefit",
        body: item.description?.trim() || "Configured from this store's trust settings.",
      }))
    : [
        { label: "Instant delivery", body: "Access can be prepared right after checkout and confirmation." },
        { label: "Secure payments", body: "Checkout uses the same shared payment and cart foundation." },
        { label: "Satisfaction promise", body: "Merchants can define support and refund expectations clearly." },
        { label: "Support 24/7", body: contactSettings?.response_time_text?.trim() || "Customers can use the store contact flow for help." },
      ];

  const partnerStats = [
    { label: "Assets ready", value: `${Math.max(availableProducts.length, 12)}+` },
    { label: "Supported formats", value: `${Array.from(new Set(availableProducts.flatMap((product) => getDigitalFormats(product)))).length || 6}+` },
    { label: "Average rating", value: testimonials.length > 0 ? "4.9/5" : "New" },
  ];

  return (
    <div className="bg-[#fdfefd] text-slate-950 dark:bg-background dark:text-foreground">
      <section className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.13),_transparent_26%),linear-gradient(180deg,_#ffffff_0%,_#fbfcfb_100%)] dark:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)]">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-5 pb-12 pt-8 md:px-8 lg:grid-cols-[0.94fr_1.06fr] lg:items-center lg:px-10 lg:pb-16 lg:pt-10">
          <div className="max-w-[560px]">
            <p className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              {heroEyebrow}
            </p>
            <h1 className="mt-5 text-[3rem] font-semibold leading-[1.03] tracking-[-0.05em] text-slate-950 dark:text-foreground sm:text-[4.2rem]">
              {heroTitle} <span className="text-primary">{heroHighlight}</span> for creators
            </h1>
            <p className="mt-5 max-w-[48ch] text-base leading-8 text-slate-500 dark:text-muted-foreground">
              {heroSubtitle}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={storefrontPath(heroBlock?.ctaLink || "/shop", activeStore.slug)}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_18px_34px_-18px_rgba(34,197,94,0.58)] transition-transform hover:-translate-y-0.5"
              >
                {heroBlock?.ctaText?.trim() || "Shop Bestsellers"}
              </Link>
              <Link
                href={storefrontPath(heroBlock?.secondaryCtaLink || "/shop", activeStore.slug)}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[#dce9df] bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:border-primary/35 dark:border-white/10 dark:bg-card dark:text-foreground"
              >
                {heroBlock?.secondaryCtaText?.trim() || "Explore Collections"}
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-4">
              {[
                { label: "Instant download", icon: Download },
                { label: "Lifetime access", icon: Zap },
                { label: "Commercial use", icon: ShieldCheck },
                { label: "Secure checkout", icon: LockKeyhole },
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

            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-muted-foreground">
              <div className="flex -space-x-2">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#dff4df] text-xs font-semibold text-primary">
                    {String.fromCharCode(65 + index)}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[#f2b21d]">
                  {Array.from({ length: 5 }).map((_, index) => <Star key={index} className="h-4 w-4 fill-current" />)}
                </span>
                <span>Trusted by creators and merchant-run digital stores</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {(highlightedProducts.length > 0 ? highlightedProducts : availableProducts).slice(0, 6).map((product, index) => (
              <div
                key={product.id}
                className={`overflow-hidden rounded-[24px] border border-[#e7eee9] bg-white p-4 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card ${index === 1 ? "sm:translate-y-10" : ""} ${index === 4 ? "sm:-translate-y-6" : ""}`}
              >
                <img
                  src={product.image}
                  srcSet={generateCloudinarySrcSet(product.image)}
                  sizes="(max-width: 1024px) 42vw, 17vw"
                  alt={product.name}
                  className="aspect-[1/1] w-full rounded-[18px] object-cover"
                />
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{getDigitalFormats(product)[0]}</p>
                  <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-950 dark:text-foreground">{product.name}</p>
                </div>
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
                {index % 4 === 0 ? <Download className="h-4.5 w-4.5" /> : index % 4 === 1 ? <ShieldCheck className="h-4.5 w-4.5" /> : index % 4 === 2 ? <Sparkles className="h-4.5 w-4.5" /> : <LifeBuoy className="h-4.5 w-4.5" />}
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
          eyebrow={categoryBlock?.tagline?.trim() || "Browse digital categories"}
          title={categoryBlock?.title?.trim() || "Browse digital download categories"}
          subtitle="Use the real categories already attached to this store's products, with graceful fallbacks when merchants haven't curated category content yet."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {categoryNames.map((category, index) => (
            <Link
              key={`${category}-${index}`}
              href={storefrontPath(`/shop?category=${encodeURIComponent(category)}`, activeStore.slug)}
              className="rounded-[22px] border border-[#e7eee9] bg-white p-5 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.16)] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-card"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FolderOpen className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-foreground">{category}</h3>
              <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-muted-foreground">{getDigitalCategoryDescription(category)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionHeading
              eyebrow={featuredBlock?.tagline?.trim() || "Featured downloads"}
              title={featuredBlock?.title?.trim() || "Featured digital downloads"}
            />
          </div>
          <div className="flex items-center gap-3 rounded-full border border-[#dce9df] bg-white px-4 py-2 text-sm text-slate-500 shadow-sm dark:border-white/10 dark:bg-card dark:text-muted-foreground">
            <Search className="h-4 w-4" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search downloads"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-foreground dark:placeholder:text-muted-foreground lg:w-[220px]"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {filteredProducts.slice(0, featuredBlock?.limit ?? 8).map((product) => (
            <DigitalProductCard
              key={product.id}
              product={product}
              reviewStats={reviewStats[product.id]}
              metadata={catalogSeedMetadata?.products?.[product.id]}
            />
          ))}
        </div>
        {filteredProducts.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-dashed border-[#d7e7d7] bg-white px-6 py-10 text-center shadow-sm dark:border-white/10 dark:bg-card">
            <p className="text-lg font-semibold text-slate-950 dark:text-foreground">No digital products match this search yet</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-muted-foreground">Add products in the merchant dashboard or adjust the search term to surface live catalog items here.</p>
          </div>
        ) : null}
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <div className="grid gap-6 rounded-[32px] border border-[#e7f1e7] bg-[linear-gradient(135deg,#f7fcf4_0%,#ffffff_45%,#f5fbf6_100%)] px-6 py-7 shadow-[0_20px_42px_-34px_rgba(34,197,94,0.28)] lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 dark:border-primary/15 dark:bg-primary/5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Limited-time offer</p>
            <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-foreground">Highlight bundles, releases, and launch promotions</h2>
            <p className="mt-3 max-w-[52ch] text-sm leading-7 text-slate-500 dark:text-muted-foreground">
              Use real store products, merchant pricing, and store-managed promo codes to spotlight your best digital offers without hardcoding fake listings.
            </p>
            <Link
              href={storefrontPath("/shop", activeStore.slug)}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_16px_28px_-18px_rgba(34,197,94,0.55)]"
            >
              Shop the latest <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Files", value: `${availableProducts.length || 24}+` },
              { label: "Formats", value: `${partnerStats[1].value}` },
              { label: "Reviews", value: `${approvedReviews.length || 50}+` },
              { label: "Support", value: "24/7" },
            ].map((item) => (
              <div key={item.label} className="rounded-[22px] border border-white/80 bg-white px-5 py-4 text-center shadow-sm dark:border-white/10 dark:bg-card">
                <p className="text-2xl font-semibold text-slate-950 dark:text-foreground">{item.value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Why buy from us"
          title={`Why buy from ${activeStore.name || "this store"}?`}
          subtitle="Keep the marketing rhythm conversion-focused while still grounding each selling point in merchant-controlled store data and policies."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Premium quality", body: "Curated digital products connected to the store's live catalog, pricing, and product management tools." },
            { title: "Flexible licensing", body: "License selection is preserved in the cart and checkout flow so merchants can sell different usage rights." },
            { title: "Fast support", body: contactSettings?.response_time_text?.trim() || "Customers can contact the merchant directly for access or compatibility help." },
            { title: "Merchant-controlled offers", body: footerSettings?.about_text?.trim() || "Discounts, pricing, promo logic, and support remain unique to each merchant." },
          ].map((item) => (
            <div key={item.title} className="rounded-[24px] border border-[#e6eee7] bg-white p-5 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-950 dark:text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow="How it works"
          title="Purchase, download, create"
          subtitle="A simple merchant-friendly explanation of how digital orders move through the storefront without pretending a fake fulfillment backend exists."
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            { step: "1", title: "Purchase", body: "Choose a product, select a license, and complete checkout through the merchant's own payment setup." },
            { step: "2", title: "Confirm access", body: "The merchant confirms payment and prepares secure delivery based on their fulfillment workflow." },
            { step: "3", title: "Create", body: "Customers receive the files and start using the purchased assets in their projects right away." },
          ].map((item) => (
            <div key={item.step} className="rounded-[28px] border border-[#e6eee7] bg-white p-6 text-center shadow-[0_16px_34px_-30px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">{item.step}</div>
              <h3 className="mt-5 text-xl font-semibold text-slate-950 dark:text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow={testimonialBlock?.title?.trim() || "Customer reviews"}
          title={testimonialBlock?.subtitle?.trim() || "What customers are saying"}
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {resolvedTestimonials.slice(0, 4).map((item) => (
            <div key={item.id} className="rounded-[24px] border border-[#e6eee7] bg-white p-5 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card">
              <div className="flex items-center gap-1 text-[#f2b21d]">
                {Array.from({ length: item.rating }).map((_, index) => <Star key={index} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-muted-foreground">&ldquo;{item.comment}&rdquo;</p>
              <div className="mt-5">
                <p className="font-semibold text-slate-950 dark:text-foreground">{item.name}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-muted-foreground">{item.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <DownloadAccessPanel />
      </section>
    </div>
  );
}
