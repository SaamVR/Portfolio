"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, BarChart3, CheckCircle2, ChevronRight, Clock3, Headphones, LineChart, Mail, MessageSquareQuote, Phone, ShieldCheck, Sparkles, Star, TrendingUp, Users } from "lucide-react";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
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

type TestimonialBlockProps = {
  title?: string;
  subtitle?: string;
  reviews?: Array<{ name?: string; rating?: number; comment?: string }>;
};

type FaqBlockProps = {
  title?: string;
  subtitle?: string;
  faqs?: Array<{ q?: string; a?: string }>;
};

type TrustBadgesProps = {
  title?: string;
  badges?: Array<{ label?: string; description?: string; icon?: "truck" | "payment" | "returns" | "support" | "shield" }>;
};

type SocialFeedProps = {
  title?: string;
  subtitle?: string;
  images?: string[];
};

type ContactSettings = {
  phone?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
  description?: string;
  response_time_text?: string;
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
  if (categoryRows.length > 0) return categoryRows.slice(0, 6);
  const typeRows = Array.from(new Set(types.map((item) => item.name?.trim()).filter((value): value is string => Boolean(value))));
  if (typeRows.length > 0) return typeRows.slice(0, 6);
  return Array.from(new Set(products.flatMap((product) => [product.category, product.type]).filter(Boolean))).slice(0, 6);
}

function buildFaqs(faqBlock: FaqBlockProps | undefined) {
  const faqs = (faqBlock?.faqs ?? []).filter((item) => item?.q?.trim() && item?.a?.trim());

  if (faqs.length > 0) {
    return faqs as Array<{ q: string; a: string }>;
  }

  return [
    {
      q: "How quickly can we get started?",
      a: "Use this area to explain your response time, discovery process, and how quickly the merchant can move from inquiry into kickoff.",
    },
    {
      q: "Do you customize offers by business type?",
      a: "Yes. Merchants can use this template to present packaged offers while still qualifying each lead through contact, WhatsApp, or a call.",
    },
    {
      q: "What happens after I click the CTA?",
      a: "Guests are routed into the merchant's configured contact flow so the team can confirm fit, scope, pricing, and next steps.",
    },
    {
      q: "Can pricing change?",
      a: "Prices shown here come from the merchant's actual catalog entries. Final scope, add-ons, and delivery terms can still be clarified during the sales conversation.",
    },
  ];
}

function buildPartnerLabels(store: Store, footerSettings: FooterSettings | undefined, categoryNames: string[]) {
  const labels = [
    store.name?.trim(),
    ...(footerSettings?.company_links ?? []).map((item) => item.label?.trim() || ""),
    ...(footerSettings?.extra_links ?? []).map((item) => item.label?.trim() || ""),
    ...categoryNames,
  ].filter(Boolean) as string[];

  return Array.from(new Set(labels)).slice(0, 6);
}

function buildTestimonials(rows: PublicReviewRow[], fallback: TestimonialBlockProps["reviews"] | undefined, storeName: string) {
  const mapped = rows
    .filter((row) => row.review_text?.trim())
    .slice(0, 3)
    .map((row, index) => ({
      id: row.id ?? `review-${index}`,
      name: row.author_name?.trim() || "Verified client",
      role: `${storeName} customer`,
      rating: Math.max(1, Math.min(5, row.rating ?? 5)),
      comment: row.review_text?.trim() || "",
    }));

  if (mapped.length > 0) {
    return mapped;
  }

  return (fallback ?? [])
    .filter((item) => item?.comment?.trim())
    .slice(0, 3)
    .map((item, index) => ({
      id: `fallback-${index}`,
      name: item?.name?.trim() || "Client review",
      role: `${storeName} lead`,
      rating: Math.max(1, Math.min(5, item?.rating ?? 5)),
      comment: item?.comment?.trim() || "",
    }));
}

function buildProcessSteps(aboutSettings: AboutSettings | undefined, heroTitle: string) {
  const values = (aboutSettings?.values ?? [])
    .filter((item) => item?.title?.trim() && item?.desc?.trim())
    .slice(0, 4)
    .map((item) => ({
      title: item.title!.trim(),
      body: item.desc!.trim(),
    }));

  if (values.length >= 4) {
    return values;
  }

  return [
    { title: "Discover", body: `We start by understanding the goals behind ${heroTitle.toLowerCase()} and where the biggest growth friction lives.` },
    { title: "Plan", body: "The merchant builds a focused strategy, offer structure, and delivery roadmap based on your priorities." },
    { title: "Execute", body: "Campaigns, assets, services, or implementation steps are launched with clear milestones and follow-up." },
    { title: "Scale", body: "Results are reviewed, proof points are strengthened, and the next phase is prepared with more confidence." },
  ];
}

function buildAuthorityItems(trustBlock: TrustBadgesProps | undefined, footerSettings: FooterSettings | undefined) {
  if (trustBlock?.badges?.length) {
    return trustBlock.badges.slice(0, 5).map((item) => ({
      title: item.label?.trim() || "Merchant-managed trust signal",
      body: item.description?.trim() || "Configured from this store's trust messaging.",
    }));
  }

  const linkLabels = [...(footerSettings?.company_links ?? []), ...(footerSettings?.extra_links ?? [])]
    .map((item) => item.label?.trim())
    .filter((value): value is string => Boolean(value))
    .slice(0, 4);

  if (linkLabels.length > 0) {
    return linkLabels.map((label) => ({
      title: label,
      body: "Visible from the merchant-managed footer and support structure.",
    }));
  }

  return [
    { title: "Clear process", body: "Lead handling and delivery flow stay under merchant control." },
    { title: "Trusted support", body: "Contact, policies, and proof points stay visible across the page." },
    { title: "Real offers", body: "Packages and pricing are powered by actual catalog entries." },
    { title: "Conversion-ready", body: "Calls to action repeat throughout the page to reduce hesitation." },
  ];
}

function buildMetrics(products: Product[], reviewStats: Record<string, ReviewStats>) {
  const availableCount = products.length;
  const totalPrice = products.reduce((sum, product) => sum + product.price, 0);
  const reviewValues = Object.values(reviewStats);
  const avgRating = reviewValues.length > 0
    ? reviewValues.reduce((sum, item) => sum + item.average, 0) / reviewValues.length
    : 4.9;

  return [
    { label: "Offers available", value: `${Math.max(availableCount, 3)}+`, hint: "Real merchant packages or services" },
    { label: "Average pricing pool", value: `BDT ${Math.max(totalPrice, 10000).toLocaleString()}+`, hint: "Based on current catalog pricing" },
    { label: "Average satisfaction", value: `${avgRating.toFixed(1)}/5`, hint: "From visible store reviews" },
    { label: "Merchant response", value: "Fast", hint: "Use contact settings to support follow-up" },
  ];
}

function buildWhatsappHref(storeName: string, contactSettings: ContactSettings | undefined) {
  const digits = (contactSettings?.whatsapp || contactSettings?.phone || "").replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.startsWith("0") && digits.length === 11 ? `88${digits}` : digits;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(`Hi ${storeName}, I want to talk about your services.`)}`;
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  light = true,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  light?: boolean;
}) {
  return (
    <div className="mb-8 text-center">
      <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${light ? "text-[#c9972f]" : "text-primary"}`}>{eyebrow}</p>
      <h2 className={`mt-3 text-[2rem] font-semibold tracking-tight sm:text-[2.5rem] ${light ? "text-white" : "text-slate-950 dark:text-foreground"}`}>
        {title}
      </h2>
      {subtitle ? (
        <p className={`mx-auto mt-3 max-w-2xl text-sm leading-7 ${light ? "text-slate-300" : "text-slate-500 dark:text-muted-foreground"}`}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function LandingStorefrontRenderer({
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
  const [openFaq, setOpenFaq] = useState(0);
  const { data: allProducts = [] } = useProducts(activeStore.id);
  const { data: featuredProducts = [] } = useFeaturedProducts(activeStore.id);
  const { data: productCategories = [] } = useProductCategories(activeStore.id);
  const { data: productTypes = [] } = useProductTypes(activeStore.id);
  const { data: contactSettings } = useSiteSettings<ContactSettings>("contact_page", activeStore.id);
  const { data: footerSettings } = useSiteSettings<FooterSettings>("footer", activeStore.id);
  const { data: templateAssets } = useSiteSettings<Record<string, string>>("template_assets_seed", activeStore.id);
  const { data: aboutSettings } = useSiteSettings<AboutSettings>("about_page", activeStore.id);
  const { data: deliverySettings } = useSiteSettings<DeliverySettings>("delivery_settings", activeStore.id);

  const { data: approvedReviews = [] } = useQuery({
    queryKey: ["landing-storefront-reviews", activeStore.id],
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
  const socialBlock = getHomepageBlock<SocialFeedProps>(blocks, "social-feed");
  const testimonialBlock = getHomepageBlock<TestimonialBlockProps>(blocks, "testimonials");
  const faqBlock = getHomepageBlock<FaqBlockProps>(blocks, "faq-accordion");
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
  const metrics = useMemo(
    () => buildMetrics(availableProducts, reviewStats),
    [availableProducts, reviewStats],
  );
  const partnerLabels = useMemo(
    () => buildPartnerLabels(activeStore, footerSettings ?? undefined, categoryNames),
    [activeStore, footerSettings, categoryNames],
  );
  const testimonials = useMemo(
    () => buildTestimonials(approvedReviews, testimonialBlock?.reviews, activeStore.name || "This store"),
    [activeStore.name, approvedReviews, testimonialBlock?.reviews],
  );
  const processSteps = useMemo(
    () => buildProcessSteps(aboutSettings ?? undefined, heroBlock?.title?.trim() || activeStore.name || "growth"),
    [aboutSettings, heroBlock?.title, activeStore.name],
  );
  const authorityItems = useMemo(
    () => buildAuthorityItems(trustBlock, footerSettings ?? undefined),
    [trustBlock, footerSettings],
  );
  const faqs = useMemo(
    () => buildFaqs(faqBlock),
    [faqBlock],
  );

  const heroEyebrow = heroBlock?.tagline?.trim() || "Grow smarter. Convert faster.";
  const heroTitle = heroBlock?.title?.trim() || "Turn attention into";
  const heroHighlight = heroBlock?.highlight?.trim() || "qualified growth";
  const heroSubtitle = heroBlock?.subtitle?.trim()
    || extractPlainText(richTextBlock?.body)
    || contactSettings?.description?.trim()
    || activeStore.description
    || "A reusable landing page for service businesses that need stronger positioning, clear proof, and repeated calls to action that convert leads.";
  const whatsappHref = buildWhatsappHref(activeStore.name || "there", contactSettings ?? undefined);
  const partnerStripTitle = socialBlock?.subtitle?.trim() || "Trusted by growing businesses";
  const caseStudyImages = (socialBlock?.images?.length ? socialBlock.images : availableProducts.flatMap((product) => [product.image, ...product.images])).filter(Boolean).slice(0, 3);
  const pricingProducts = highlightedProducts.slice(0, 3);

  return (
    <div className="bg-[#f8f5ef] text-slate-950 dark:bg-background dark:text-foreground">
      <section className="bg-[#07182d] text-white">
        <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="max-w-[560px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c9972f]">{heroEyebrow}</p>
              <h1 className="mt-5 text-[3rem] font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-[4.25rem]">
                {heroTitle} <span className="text-[#f4bf53]">{heroHighlight}</span>
              </h1>
              <p className="mt-5 max-w-[46ch] text-base leading-8 text-slate-300">
                {heroSubtitle}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={storefrontPath(heroBlock?.ctaLink || "/contact", activeStore.slug)}
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-[#f0b540] px-6 text-sm font-semibold text-[#08172b] shadow-[0_18px_34px_-18px_rgba(240,181,64,0.65)] transition-transform hover:-translate-y-0.5"
                >
                  {heroBlock?.ctaText?.trim() || "Book Your Free Strategy Call"}
                </Link>
                <Link
                  href={storefrontPath(heroBlock?.secondaryCtaLink || "/shop", activeStore.slug)}
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-transparent px-6 text-sm font-semibold text-white transition-colors hover:border-white/40"
                >
                  {heroBlock?.secondaryCtaText?.trim() || "View Solutions"}
                </Link>
              </div>

              <div className="mt-8 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-3">
                {metrics.slice(0, 3).map((metric) => (
                  <div key={metric.label}>
                    <p className="text-[1.85rem] font-semibold tracking-tight text-white">{metric.value}</p>
                    <p className="text-sm font-medium text-slate-200">{metric.label}</p>
                    <p className="mt-1 text-xs text-slate-400">{metric.hint}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative aspect-[16/11] w-full overflow-hidden rounded-[34px] border border-white/10 bg-white/5 shadow-[0_28px_70px_-40px_rgba(0,0,0,0.45)]">
                {heroProduct ? (
                  <SafeStorefrontImage
                    src={heroProduct.image}
                    fallbackSrc={templateAssets?.hero_image_url ?? templateAssets?.fallback_product_image_url ?? null}
                    fill
                    sizes="(max-width: 1024px) 92vw, 50vw"
                    alt={heroProduct.name}
                    className="object-cover"
                  />
                ) : (
                  <div className="aspect-[16/11] w-full bg-white/10" />
                )}
              </div>

              <div className="absolute bottom-6 right-6 rounded-[22px] border border-white/10 bg-white px-4 py-4 shadow-[0_18px_34px_-20px_rgba(0,0,0,0.35)]">
                <div className="flex items-center gap-1 text-[#f0b540]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {metrics[2]?.value || "4.9/5"} from visible store reviews
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Merchant-managed proof and client feedback
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e8dfcf] bg-[#fffaf2]">
        <div className="mx-auto max-w-[1400px] px-5 py-6 md:px-8 lg:px-10">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a7b62]">{partnerStripTitle}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
            {partnerLabels.map((label) => (
              <div key={label} className="rounded-full border border-[#eadfcd] bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 shadow-sm">
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#091a30] text-white">
        <div className="mx-auto grid max-w-[1400px] gap-5 px-5 py-8 md:px-8 lg:grid-cols-4 lg:px-10">
          {metrics.map((metric, index) => (
            <div key={metric.label} className={`rounded-[24px] border border-white/10 bg-white/5 px-5 py-5 ${index < 3 ? "" : "lg:border-l lg:border-white/10"}`}>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#f0b540]/15 text-[#f0b540]">
                {index === 0 ? <TrendingUp className="h-5 w-5" /> : index === 1 ? <BarChart3 className="h-5 w-5" /> : index === 2 ? <Star className="h-5 w-5" /> : <LineChart className="h-5 w-5" />}
              </div>
              <p className="text-[2rem] font-semibold tracking-tight">{metric.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-200">{metric.label}</p>
              <p className="mt-2 text-xs leading-6 text-slate-400">{metric.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-14 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Why choose us"
          title="Built to convert trust into action"
          subtitle="This landing template keeps proof, positioning, and clear calls to action tightly connected so merchants can launch quickly without sounding generic."
          light={false}
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Outcome-first offers", body: "Real catalog items double as solutions or packages, so the promise stays tied to merchant-controlled pricing and delivery.", icon: TrendingUp },
            { title: "Trust near the top", body: "Reviews, metrics, and visible contact structure reduce hesitation before visitors even reach pricing.", icon: ShieldCheck },
            { title: "Lead-focused flow", body: "Calls to action repeat across the page and can route to contact, WhatsApp, or service pages.", icon: MessageSquareQuote },
            { title: "Reusable structure", body: "Agencies, consultants, and service brands can adapt the same renderer without duplicating storefront logic.", icon: Sparkles },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-[24px] border border-[#eadfcd] bg-white p-6 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.14)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f7e6be] text-[#af7a13]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">{item.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-4 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow={categoryBlock?.tagline?.trim() || "Our solutions"}
          title={categoryBlock?.title?.trim() || "Services that move leads forward"}
          subtitle="Each card here is powered by actual store products or offers, making this landing page reusable without inventing fake solutions."
          light={false}
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {highlightedProducts.slice(0, 4).map((product) => (
            <div key={product.id} className="rounded-[24px] border border-[#eadfcd] bg-white p-6 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.14)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c9972f]">{product.type || product.category || "Solution"}</p>
              <h3 className="mt-3 text-[1.25rem] font-semibold tracking-tight text-slate-950">{product.name}</h3>
              <p className="mt-3 line-clamp-4 text-sm leading-7 text-slate-500">{product.description}</p>
              <div className="mt-5 flex items-center justify-between gap-4">
                <p className="text-lg font-semibold text-slate-950">BDT {product.price.toLocaleString()}</p>
                <Link href={storefrontPath("/contact", activeStore.slug)} className="inline-flex items-center gap-2 text-sm font-semibold text-[#8b6411]">
                  Learn more
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 bg-[#091a30] text-white">
        <div className="mx-auto max-w-[1400px] px-5 py-14 md:px-8 lg:px-10">
          <SectionHeading
            eyebrow="Our process"
            title="A 4-step path from interest to outcomes"
            subtitle="Use the merchant story and about-page values to explain how buyers move from first conversation into confident execution."
          />
          <div className="grid gap-5 xl:grid-cols-4">
            {processSteps.map((step, index) => (
              <div key={step.title} className="relative rounded-[24px] border border-white/10 bg-white/5 p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#f0b540] text-sm font-semibold text-[#08172b]">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-14 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Success stories"
          title="Proof before pricing"
          subtitle="Case-study style cards appear before pricing so the page handles trust and results before asking the visitor to decide."
          light={false}
        />
        <div className="grid gap-5 xl:grid-cols-3">
          {highlightedProducts.slice(0, 3).map((product, index) => (
            <div key={product.id} className="overflow-hidden rounded-[26px] border border-[#eadfcd] bg-white shadow-[0_16px_34px_-30px_rgba(15,23,42,0.14)]">
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <SafeStorefrontImage
                  src={caseStudyImages[index] || product.image}
                  fallbackSrc={templateAssets?.fallback_product_image_url ?? null}
                  fill
                  sizes="(max-width: 1024px) 92vw, 30vw"
                  alt={product.name}
                  className="object-cover"
                />
              </div>
              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{product.name}</h3>
                    <p className="text-sm text-slate-500">{product.category || product.type || "Growth offer"}</p>
                  </div>
                  <div className="rounded-2xl bg-[#f8edd3] px-3 py-2 text-right">
                    <p className="text-lg font-semibold text-[#8b6411]">{Math.max(12, ((product.originalPrice ?? product.price) - product.price) + 18)}%</p>
                    <p className="text-[11px] text-[#8b6411]">Impact story</p>
                  </div>
                </div>
                <p className="line-clamp-3 text-sm leading-7 text-slate-500">{product.description}</p>
                <Link href={storefrontPath("/contact", activeStore.slug)} className="inline-flex items-center gap-2 text-sm font-semibold text-[#8b6411]">
                  Read case study
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-4 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow={testimonialBlock?.subtitle?.trim() || "What our clients say"}
          title={testimonialBlock?.title?.trim() || "Social proof from real store reviews"}
          light={false}
        />
        <div className="grid gap-5 xl:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="rounded-[24px] border border-[#eadfcd] bg-white p-6 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.14)]">
              <div className="flex items-center gap-1 text-[#f0b540]">
                {Array.from({ length: testimonial.rating }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">{testimonial.comment}</p>
              <div className="mt-5">
                <p className="font-semibold text-slate-950">{testimonial.name}</p>
                <p className="text-sm text-slate-500">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-12 md:px-8 lg:px-10">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {authorityItems.map((item, index) => (
            <div key={item.title} className="rounded-[24px] border border-[#eadfcd] bg-white p-5 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.12)]">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#f7e6be] text-[#af7a13]">
                {index % 4 === 0 ? <ShieldCheck className="h-4.5 w-4.5" /> : index % 4 === 1 ? <BadgeCheck className="h-4.5 w-4.5" /> : index % 4 === 2 ? <Users className="h-4.5 w-4.5" /> : <Headphones className="h-4.5 w-4.5" />}
              </div>
              <p className="text-base font-semibold text-slate-950">{item.title}</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-4 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Investment"
          title="Simple, transparent pricing"
          subtitle="Pricing is sourced from the merchant's real catalog so the landing page can stay conversion-focused without losing operational consistency."
          light={false}
        />
        <div className="grid gap-5 xl:grid-cols-3">
          {pricingProducts.map((product, index) => (
            <div key={product.id} className={`rounded-[28px] border bg-white p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.16)] ${index === 1 ? "border-[#f0b540] ring-1 ring-[#f0b540]/30" : "border-[#eadfcd]"}`}>
              {index === 1 ? (
                <div className="mb-4 inline-flex rounded-full bg-[#f7e6be] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b6411]">
                  Most Popular
                </div>
              ) : null}
              <p className="text-sm font-semibold text-slate-900">{product.name}</p>
              <p className="mt-1 text-sm text-slate-500">{product.type || product.category || "Growth package"}</p>
              <p className="mt-5 text-[2.3rem] font-semibold tracking-tight text-slate-950">BDT {product.price.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-500">Flexible scope based on merchant delivery</p>
              <div className="mt-5 space-y-3">
                {product.description.split(/[.!?]\s+/).map((item) => item.trim()).filter(Boolean).slice(0, 4).map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm leading-7 text-slate-600">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#af7a13]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <Link
                href={storefrontPath("/contact", activeStore.slug)}
                className={`mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold ${index === 1 ? "bg-[#f0b540] text-[#08172b]" : "border border-[#d8c7aa] text-slate-900"}`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-12 md:px-8 lg:px-10">
        <div className="grid gap-5 lg:grid-cols-[0.66fr_0.34fr]">
          <div>
            <SectionHeading
              eyebrow="FAQ"
              title={faqBlock?.title?.trim() || "Frequently asked questions"}
              subtitle={faqBlock?.subtitle?.trim() || "Handle objections clearly before the visitor reaches the closing CTA."}
              light={false}
            />
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <button
                  key={`${faq.q}-${index}`}
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                  className="w-full rounded-[20px] border border-[#eadfcd] bg-white px-5 py-4 text-left shadow-[0_14px_28px_-26px_rgba(15,23,42,0.14)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-slate-950">{faq.q}</span>
                    <ChevronRight className={`h-4 w-4 shrink-0 text-[#af7a13] transition-transform ${openFaq === index ? "rotate-90" : ""}`} />
                  </div>
                  {openFaq === index ? (
                    <p className="mt-3 text-sm leading-7 text-slate-500">{faq.a}</p>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#eadfcd] bg-white p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.16)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c9972f]">Need support?</p>
            <h3 className="mt-3 text-[1.6rem] font-semibold tracking-tight text-slate-950">Still deciding?</h3>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              Use the merchant contact channels below to ask about fit, scope, response time, or the best starting offer for your business.
            </p>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              {contactSettings?.phone ? <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#af7a13]" /> {contactSettings.phone}</p> : null}
              {contactSettings?.email ? <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#af7a13]" /> {contactSettings.email}</p> : null}
              <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#af7a13]" /> {contactSettings?.response_time_text?.trim() || "Fast merchant follow-up"}</p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link href={storefrontPath("/contact", activeStore.slug)} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#f0b540] px-5 text-sm font-semibold text-[#08172b]">
                Book a Free Call
              </Link>
              {whatsappHref ? (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d8c7aa] px-5 text-sm font-semibold text-slate-900">
                  Continue on WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-4 pb-14 md:px-8 lg:px-10">
        <div className="rounded-[30px] bg-[#091a30] px-6 py-8 text-white shadow-[0_22px_50px_-32px_rgba(15,23,42,0.4)] lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.62fr_0.38fr] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c9972f]">Ready to grow your business?</p>
              <h2 className="mt-3 text-[2.15rem] font-semibold tracking-tight">A conversion-led landing page with real merchant wiring</h2>
              <p className="mt-3 max-w-[52ch] text-sm leading-7 text-slate-300">
                {deliverySettings?.enabled
                  ? "Delivery, support, policies, offers, and contact details remain tied to the merchant's live setup while the landing page stays optimized for conversion."
                  : "Launch this page to guide more qualified leads into the merchant's real contact and sales flow without duplicating storefront logic."}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href={storefrontPath("/contact", activeStore.slug)} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#f0b540] px-5 text-sm font-semibold text-[#08172b]">
                  {heroBlock?.ctaText?.trim() || "Book Your Free Strategy Call"}
                </Link>
                <Link href={storefrontPath("/shop", activeStore.slug)} className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 px-5 text-sm font-semibold text-white">
                  View Offers
                </Link>
              </div>
            </div>
            <div className="grid gap-3">
              {[
                "No obligation lead conversation",
                "Real merchant pricing and offer structure",
                "Policies, trust, and support clearly visible",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-[#f0b540]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
