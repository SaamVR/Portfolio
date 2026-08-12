"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Mail, MapPin, Phone, ShieldCheck, Star } from "lucide-react";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import { AgentCard } from "@/components/storefront/real-estate/AgentCard";
import { NeighborhoodGrid } from "@/components/storefront/real-estate/NeighborhoodGrid";
import { PropertyListingCard } from "@/components/storefront/real-estate/PropertyListingCard";
import { PropertySearchBar, type PropertyFilterState } from "@/components/storefront/real-estate/PropertySearchBar";
import { RealEstateServicesSection } from "@/components/storefront/real-estate/RealEstateServicesSection";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/data/products";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
import type { TemplateSeedCatalogMetadata } from "@/lib/cms/template-demo-seeds";
import { getMetricNumericFallback } from "@/lib/cms/storefront-product-presentation";
import { storefrontPath } from "@/lib/slug";

type HeroBlockProps = {
  tagline?: string;
  title?: string;
  highlight?: string;
  subtitle?: string;
  ctaText?: string;
  secondaryCtaText?: string;
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
  reviews?: Array<{ name?: string; rating?: number; comment?: string; title?: string }>;
};

type FaqEntry = { q?: string; a?: string };

type AboutSettings = {
  title?: string;
  content?: string;
  values?: Array<{ title?: string; desc?: string }>;
};

type ContactSettings = {
  phone?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
  description?: string;
  response_time_text?: string;
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
    if (!row.product_id || typeof row.rating !== "number") return;
    const current = stats[row.product_id] ?? { count: 0, average: 0 };
    const nextCount = current.count + 1;
    stats[row.product_id] = {
      count: nextCount,
      average: ((current.average * current.count) + row.rating) / nextCount,
    };
  });
  return stats;
}

function getString(specs: Record<string, unknown> | undefined, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = specs?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function getNumber(specs: Record<string, unknown> | undefined, keys: string[], fallback: number) {
  for (const key of keys) {
    const value = specs?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function buildNeighborhoods(products: Product[], metadata: TemplateSeedCatalogMetadata | undefined) {
  const result = products.map((product) => {
    const specs = metadata?.products?.[product.id]?.specs;
    return {
      title: getString(specs, ["neighborhood", "city", "location"], product.category || "Prime Area"),
      subtitle: getString(specs, ["address", "property_type"], product.type || "Property listings"),
      image: metadata?.products?.[product.id]?.imageUrl ?? product.image,
    };
  });

  const unique: Array<{ title: string; subtitle: string; image: string | null | undefined }> = [];
  for (const item of result) {
    if (!unique.some((existing) => existing.title === item.title)) {
      unique.push(item);
    }
  }
  return unique.slice(0, 4);
}

function buildServices(contactSettings: ContactSettings | undefined) {
  return [
    {
      title: "Buy a Home",
      description: "Guide buyers through discovery, shortlist properties, and keep final viewing coordination under merchant control.",
    },
    {
      title: "Rent a Property",
      description: "Present rental-ready listings with scoped contact flow, neighborhood context, and clear next steps.",
    },
    {
      title: "Sell Your Property",
      description: "Use this block to explain valuation, marketing, and seller support before the first agent conversation.",
    },
    {
      title: "Property Management",
      description: contactSettings?.response_time_text?.trim() || "Keep maintenance, tenant, and operational support framed as a real merchant service.",
    },
  ];
}

function buildAgents(aboutSettings: AboutSettings | undefined, contactSettings: ContactSettings | undefined) {
  const fromValues = (aboutSettings?.values ?? [])
    .filter((item) => item?.title?.trim() && item?.desc?.trim())
    .slice(0, 4)
    .map((item) => ({
      name: item.title!.trim(),
      role: item.desc!.trim().split(".")[0] || "Property Advisor",
      details: item.desc!.trim(),
    }));

  if (fromValues.length > 0) {
    return fromValues;
  }

  return [
    {
      name: "Lead Agent",
      role: "Property Advisor",
      details: contactSettings?.response_time_text?.trim() || "Use About settings to publish real agent names, roles, and specialties.",
    },
  ];
}

function buildFaqs(entries: FaqEntry[]) {
  const siteFaqs = entries.filter((item) => item?.q?.trim() && item?.a?.trim());
  if (siteFaqs.length > 0) return siteFaqs as Array<{ q: string; a: string }>;
  return [
    { q: "How do I schedule a property visit?", a: "Use the contact CTA or listing detail flow so the merchant can confirm timing and availability." },
    { q: "Can I list my own property with this office?", a: "Yes. Use the service and contact sections to explain seller onboarding and required documents." },
    { q: "Do you support financing guidance?", a: "Use this FAQ block to explain bank partnerships, loan support, or required buyer documentation." },
    { q: "Are rental and sale listings both supported?", a: "Yes. This template supports buy, rent, and sold filtering without changing the shared catalog foundation." },
  ];
}

function matchesFilters(product: Product, metadata: TemplateSeedCatalogMetadata | undefined, filters: PropertyFilterState) {
  const specs = metadata?.products?.[product.id]?.specs;
  const location = `${getString(specs, ["location", "city", "address", "neighborhood"])} ${product.description}`.toLowerCase();
  const propertyType = getString(specs, ["property_type", "listing_type"], `${product.category} ${product.type}`).toLowerCase();
  const beds = getNumber(specs, ["beds", "bedrooms"], Math.max(1, Math.min(getMetricNumericFallback(product, ["beds", "bedrooms"], 3), 6)));
  const baths = getNumber(specs, ["baths", "bathrooms"], Math.max(1, Math.min(getMetricNumericFallback(product, ["baths", "bathrooms"], 2), 5)));
  const listingType = getString(specs, ["listing_type", "listing_mode", "status"], product.name).toLowerCase();

  if (filters.location.trim() && !location.includes(filters.location.trim().toLowerCase())) return false;
  if (filters.propertyType !== "all" && !propertyType.includes(filters.propertyType.toLowerCase())) return false;
  if (filters.minPrice && product.price < Number(filters.minPrice)) return false;
  if (filters.maxPrice && product.price > Number(filters.maxPrice)) return false;
  if (filters.beds !== "any" && beds < Number(filters.beds)) return false;
  if (filters.baths !== "any" && baths < Number(filters.baths)) return false;
  if (filters.listingMode === "rent" && !/rent/i.test(listingType)) return false;
  if (filters.listingMode === "sold" && !/sold/i.test(listingType)) return false;
  if (filters.listingMode === "buy" && /sold/i.test(listingType)) return false;
  return true;
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
    <div className="mb-7">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#1f9b46]">{eyebrow}</p>
      <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-foreground sm:text-[2.5rem]">{title}</h2>
      {subtitle ? <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 dark:text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

export function RealEstateStorefrontRenderer({
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
  const listingsRef = useRef<HTMLDivElement | null>(null);
  const { data: allProducts = [] } = useProducts(activeStore.id);
  const { data: featuredProducts = [] } = useFeaturedProducts(activeStore.id);
  const { data: productCategories = [] } = useProductCategories(activeStore.id);
  const { data: productTypes = [] } = useProductTypes(activeStore.id);
  const { data: contactSettings } = useSiteSettings<ContactSettings>("contact_page", activeStore.id);
  const { data: templateAssets } = useSiteSettings<Record<string, string>>("template_assets_seed", activeStore.id);
  const { data: catalogSeedMetadata } = useSiteSettings<TemplateSeedCatalogMetadata>("catalog_seed_metadata", activeStore.id);
  const { data: aboutSettings } = useSiteSettings<AboutSettings>("about_page", activeStore.id);
  const { data: faqEntries = [] } = useSiteSettings<FaqEntry[]>("faq_entries", activeStore.id);

  const { data: approvedReviews = [] } = useQuery({
    queryKey: ["real-estate-storefront-reviews", activeStore.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_product_reviews" as any)
        .select("id, product_id, author_name, rating, review_text")
        .eq("store_id", activeStore.id)
        .order("created_at", { ascending: false })
        .limit(12);
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

  const availableProducts = useMemo(() => allProducts.filter((product) => product.isAvailable !== false), [allProducts]);
  const categoryNames = useMemo(() => {
    const categoryRows = Array.from(new Set(productCategories.map((item) => item.name?.trim()).filter((value): value is string => Boolean(value))));
    if (categoryRows.length > 0) return categoryRows.slice(0, 6);
    const typeRows = Array.from(new Set(productTypes.map((item) => item.name?.trim()).filter((value): value is string => Boolean(value))));
    if (typeRows.length > 0) return typeRows.slice(0, 6);
    return Array.from(new Set(availableProducts.flatMap((product) => [product.category, product.type]).filter(Boolean))).slice(0, 6);
  }, [availableProducts, productCategories, productTypes]);
  const [filters, setFilters] = useState<PropertyFilterState>({
    listingMode: "buy",
    location: "",
    propertyType: "all",
    minPrice: "",
    maxPrice: "",
    beds: "any",
    baths: "any",
  });

  const featuredListings = useMemo(
    () => (featuredProducts.length > 0 ? featuredProducts : availableProducts).filter((product) => matchesFilters(product, catalogSeedMetadata ?? undefined, filters)).slice(0, featuredBlock?.limit ?? 4),
    [availableProducts, catalogSeedMetadata, featuredBlock?.limit, featuredProducts, filters],
  );
  const heroListing = featuredListings[0] ?? availableProducts[0] ?? null;
  const reviewStats = useMemo(() => buildReviewStats(approvedReviews), [approvedReviews]);
  const neighborhoods = useMemo(() => buildNeighborhoods(availableProducts, catalogSeedMetadata ?? undefined), [availableProducts, catalogSeedMetadata]);
  const services = useMemo(() => buildServices(contactSettings ?? undefined), [contactSettings]);
  const agents = useMemo(() => buildAgents(aboutSettings ?? undefined, contactSettings ?? undefined), [aboutSettings, contactSettings]);
  const faqs = useMemo(() => buildFaqs(faqEntries ?? []), [faqEntries]);

  const testimonials = approvedReviews.length > 0
    ? approvedReviews.filter((row) => row.review_text?.trim()).slice(0, 3).map((row, index) => ({
        id: row.id ?? `review-${index}`,
        name: row.author_name?.trim() || "Verified client",
        rating: Math.max(1, Math.min(5, row.rating ?? 5)),
        comment: row.review_text?.trim() || "",
      }))
    : (testimonialBlock?.reviews ?? []).filter((item) => item?.comment?.trim()).slice(0, 3).map((item, index) => ({
        id: `fallback-${index}`,
        name: item?.name?.trim() || "Client review",
        rating: Math.max(1, Math.min(5, item?.rating ?? 5)),
        comment: item?.comment?.trim() || "",
      }));

  const heroTitle = heroBlock?.title?.trim() || "Discover Spaces";
  const heroHighlight = heroBlock?.highlight?.trim() || "You'll Love to Live In";
  const heroSubtitle = heroBlock?.subtitle?.trim()
    || extractPlainText(richTextBlock?.body)
    || contactSettings?.description?.trim()
    || activeStore.description
    || "Showcase real property listings, searchable neighborhoods, and contact-driven conversion without leaving the shared commerce and routing system.";

  return (
    <div className="bg-[#fbfcfa] text-slate-950 dark:bg-background dark:text-foreground">
      <section className="overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbf7_100%)] dark:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)]">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-5 pb-2 pt-4 md:pb-6 md:pt-8 md:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:px-10 lg:pb-8 lg:pt-10">
          <div className="max-w-[560px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#1f9b46]">{heroBlock?.tagline?.trim() || "Find the perfect place to call home"}</p>
            <h1 className="mt-5 max-w-[9ch] text-[3rem] font-semibold leading-[1.03] tracking-[-0.05em] text-slate-950 dark:text-foreground sm:text-[4.4rem]">
              {heroTitle} <span className="text-[#1f9b46]">{heroHighlight}</span>
            </h1>
            <p className="mt-5 max-w-[44ch] text-base leading-8 text-slate-600 dark:text-muted-foreground">{heroSubtitle}</p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => listingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#1f9b46] px-6 text-sm font-semibold text-white shadow-[0_18px_34px_-18px_rgba(31,155,70,0.56)] sm:w-auto"
              >
                {heroBlock?.ctaText?.trim() || "View Listings"}
              </button>
              <Link
                href={storefrontPath("/contact", activeStore.slug)}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-[#dce8dd] bg-white px-6 text-sm font-semibold text-slate-800 sm:w-auto dark:border-white/10 dark:bg-card dark:text-foreground"
              >
                {heroBlock?.secondaryCtaText?.trim() || "Contact Agent"}
              </Link>
            </div>
          </div>

          <div className="relative aspect-[16/10.4] w-full overflow-hidden rounded-[34px] border border-[#e6efe6] bg-white shadow-[0_28px_70px_-44px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-card">
            {heroListing ? (
              <SafeStorefrontImage
                src={templateAssets?.hero_image_url ?? heroListing.image}
                fallbackSrc={templateAssets?.fallback_product_image_url ?? catalogSeedMetadata?.products?.[heroListing.id]?.imageUrl ?? null}
                fill
                sizes="(max-width: 1024px) 92vw, 52vw"
                alt={heroListing.name}
                className="object-cover"
              />
            ) : (
              <div className="aspect-[16/10.4] w-full bg-[#eef6ef]" />
            )}
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] px-5 pb-6 md:pb-10 md:px-8 lg:px-10">
          <PropertySearchBar
            filters={filters}
            propertyTypes={categoryNames}
            onChange={setFilters}
            onSubmit={() => listingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-4 md:px-8 lg:px-10">
        <div className="grid grid-cols-2 gap-3 rounded-[28px] border border-[#dce8dd] bg-white p-3 sm:p-5 shadow-[0_18px_38px_-32px_rgba(15,23,42,0.15)] sm:grid-cols-2 xl:grid-cols-4 dark:border-white/10 dark:bg-card">
          {[
            { label: "Trusted by buyers and renters", body: "Use store-managed reviews, listings, and contact flow to build confidence." },
            { label: "Verified listings", body: "Present real products as property listings with merchant-managed details and media." },
            { label: "Expert guidance", body: contactSettings?.response_time_text?.trim() || "Publish your response time and buying support in Site Settings." },
            { label: "Secure and transparent", body: "Keep contact and property information routed through the active merchant storefront." },
          ].map((item) => (
            <div key={item.label} className="rounded-[20px] border border-[#eef3ef] bg-[#fbfcfb] p-3 sm:p-4 dark:border-white/10 dark:bg-secondary/20">
              <p className="text-base font-semibold text-slate-950 dark:text-foreground">{item.label}</p>
              <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-6 md:py-12 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow={categoryBlock?.tagline?.trim() || "Browse by type"}
          title={categoryBlock?.title?.trim() || "Find a Property That Fits Your Lifestyle"}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {categoryNames.map((category, index) => (
            <Link
              key={`${category}-${index}`}
              href={storefrontPath(`/shop?category=${encodeURIComponent(category)}`, activeStore.slug)}
              className="rounded-[22px] border border-[#dce8dd] bg-white p-3 sm:p-5 text-center shadow-[0_16px_34px_-30px_rgba(15,23,42,0.15)] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-card"
            >
              <div className="mx-auto inline-flex rounded-full bg-[#ecf7ee] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1f9b46]">
                Type
              </div>
              <p className="mt-4 text-base font-semibold text-slate-950 dark:text-foreground">{category}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-muted-foreground">Merchant-managed property collection</p>
            </Link>
          ))}
        </div>
      </section>

      <section ref={listingsRef} className="mx-auto max-w-[1400px] px-5 py-4 md:px-8 lg:px-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <SectionHeading
            eyebrow={featuredBlock?.tagline?.trim() || "Featured listings"}
            title={featuredBlock?.title?.trim() || "Handpicked Properties for You"}
            subtitle="Property cards reuse the shared product and detail routes while presenting listing-specific fields and CTAs."
          />
          <Link href={storefrontPath("/shop", activeStore.slug)} className="hidden text-sm font-semibold text-[#1f9b46] lg:inline-flex">
            View All Listings
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featuredListings.map((product) => (
            <PropertyListingCard
              key={product.id}
              product={product}
              metadata={catalogSeedMetadata?.products?.[product.id]}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-6 md:py-12 md:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[0.58fr_0.42fr]">
          <div>
            <SectionHeading
              eyebrow="Great places to live"
              title="Explore Top Neighborhoods"
            />
            <NeighborhoodGrid
              items={neighborhoods}
              storeSlug={activeStore.slug}
              fallbackSrc={templateAssets?.fallback_category_image_url ?? templateAssets?.fallback_product_image_url ?? null}
            />
          </div>
          <div>
            <SectionHeading
              eyebrow="Our services"
              title="More Than Just Listings"
            />
            <RealEstateServicesSection items={services} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-2 md:px-8 lg:px-10">
        <div className="grid gap-5 overflow-hidden rounded-[30px] border border-[#dce8dd] bg-[linear-gradient(135deg,#f3faf2_0%,#edf7ee_100%)] p-6 shadow-[0_24px_48px_-34px_rgba(15,23,42,0.18)] lg:grid-cols-[0.88fr_1.12fr] lg:items-center dark:border-white/10 dark:bg-card">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#1f9b46]">Next matches every week</p>
            <h3 className="mt-3 text-[2.2rem] font-semibold tracking-tight text-slate-950 dark:text-foreground">
              {richTextBlock?.title?.trim() || "Your Next Home is Waiting"}
            </h3>
            <p className="mt-3 max-w-[48ch] text-sm leading-7 text-slate-500 dark:text-muted-foreground">
              {extractPlainText(richTextBlock?.body) || "Use this lead-capture section to invite buyers, renters, or sellers into the merchant's real contact flow without inventing a fake appointment backend."}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href={storefrontPath("/contact", activeStore.slug)} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1f9b46] px-5 text-sm font-semibold text-white">
                Get Pre-Approved
              </Link>
              <Link href={storefrontPath("/contact", activeStore.slug)} className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d6e3d8] bg-white px-5 text-sm font-semibold text-slate-800 dark:border-white/10 dark:bg-card dark:text-foreground">
                Talk to an Agent
              </Link>
            </div>
          </div>
          <div className="relative hidden aspect-[16/8.8] w-full overflow-hidden rounded-[24px] border border-white/70 bg-white/70 md:block dark:border-white/10 dark:bg-secondary/20">
            <SafeStorefrontImage
              src={templateAssets?.promo_image_url ?? heroListing?.image ?? templateAssets?.hero_image_url}
              fallbackSrc={templateAssets?.fallback_product_image_url ?? null}
              fill
              sizes="(max-width: 1024px) 92vw, 48vw"
              alt="Lead capture promotion"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-6 md:py-12 md:px-8 lg:px-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Meet our experts"
            title="Our Trusted Real Estate Agents"
          />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible">
          {agents.map((agent) => (
            <div key={agent.name} className="min-w-[75vw] shrink-0 snap-center md:min-w-0">
              <AgentCard
                name={agent.name}
                role={agent.role}
                details={agent.details}
                phone={contactSettings?.phone}
                email={contactSettings?.email}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-4 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow={testimonialBlock?.subtitle?.trim() || "What our clients say"}
          title={testimonialBlock?.title?.trim() || "Trusted by Homeowners Across the Market"}
        />
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="min-w-[280px] snap-center flex-shrink-0 rounded-[24px] border border-[#dce8dd] bg-white p-5 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.15)] dark:border-white/10 dark:bg-card md:min-w-0">
              <div className="flex items-center gap-1 text-[#1f9b46]">
                {Array.from({ length: testimonial.rating }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-muted-foreground">{testimonial.comment}</p>
              <p className="mt-5 font-semibold text-slate-950 dark:text-foreground">{testimonial.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-6 md:py-12 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Common questions"
          title="Frequently Asked Questions"
        />
        <div className="grid gap-2 md:gap-4 lg:grid-cols-2">
          {faqs.slice(0, 6).map((faq, index) => (
            <details key={`${faq.q}-${index}`} className="rounded-[20px] border border-[#dce8dd] bg-white px-4 py-3 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.14)] md:px-5 md:py-4 dark:border-white/10 dark:bg-card">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950 dark:text-foreground">{faq.q}</summary>
              <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-muted-foreground">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-4 md:px-8 lg:px-10">
        <div className="grid gap-5 lg:grid-cols-[0.68fr_0.32fr]">
          <div className="rounded-[28px] border border-[#dce8dd] bg-white p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card">
            <SectionHeading
              eyebrow="Visit our office"
              title="Office and Contact Info"
              subtitle="Keep the brokerage address, phone, and email visible so inquiry conversion stays anchored in trust."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex gap-3">
                <MapPin className="mt-1 h-5 w-5 text-[#1f9b46]" />
                <div>
                  <p className="font-semibold text-slate-950 dark:text-foreground">Office address</p>
                  <p className="text-sm leading-7 text-slate-500 dark:text-muted-foreground">{contactSettings?.address?.trim() || "Add your office location in Site Settings to complete this block."}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Phone className="mt-1 h-5 w-5 text-[#1f9b46]" />
                <div>
                  <p className="font-semibold text-slate-950 dark:text-foreground">Call us</p>
                  <p className="text-sm leading-7 text-slate-500 dark:text-muted-foreground">{contactSettings?.phone?.trim() || "Add your office phone number in Site Settings."}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Mail className="mt-1 h-5 w-5 text-[#1f9b46]" />
                <div>
                  <p className="font-semibold text-slate-950 dark:text-foreground">Email us</p>
                  <p className="text-sm leading-7 text-slate-500 dark:text-muted-foreground">{contactSettings?.email?.trim() || "Add your email address in Site Settings."}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 text-[#1f9b46]" />
                <div>
                  <p className="font-semibold text-slate-950 dark:text-foreground">Office hours</p>
                  <p className="text-sm leading-7 text-slate-500 dark:text-muted-foreground">{contactSettings?.response_time_text?.trim() || "Use contact settings to explain office hours and inquiry response expectations."}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#dce8dd] bg-[linear-gradient(180deg,#f4faf3_0%,#eef7ef_100%)] p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#1f9b46]">Stay updated</p>
            <h3 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-foreground">Newsletter</h3>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-muted-foreground">
              Reuse this block for listing alerts, weekly market updates, or buyer and renter tips driven by the merchant's own contact channels.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={contactSettings?.email ? `mailto:${contactSettings.email}` : storefrontPath("/contact", activeStore.slug)}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1f9b46] px-5 text-sm font-semibold text-white"
              >
                Subscribe
              </Link>
              <Link
                href={storefrontPath("/contact", activeStore.slug)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d6e3d8] bg-white px-5 text-sm font-semibold text-slate-800 dark:border-white/10 dark:bg-card dark:text-foreground"
              >
                Contact Office
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
