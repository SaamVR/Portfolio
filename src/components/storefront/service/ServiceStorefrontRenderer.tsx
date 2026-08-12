"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, CalendarDays, Check, ChevronRight, Clock3, Headphones, MessageSquareQuote, PhoneCall, ShieldCheck, Sparkles, Star, Users } from "lucide-react";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import { ServiceProductCard } from "@/components/storefront/service/ServiceProductCard";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/data/products";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
import { generateCloudinarySrcSet } from "@/lib/cms/cloudinary-responsive";
import { storefrontPath } from "@/lib/slug";

type HeroBlockProps = {
  tagline?: string;
  title?: string;
  highlight?: string;
  subtitle?: string;
  ctaText?: string;
  secondaryCtaText?: string;
};

type PromoBannerProps = {
  enabled?: boolean;
  badge?: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
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
  align?: "left" | "center";
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

type SocialFeedProps = {
  title?: string;
  subtitle?: string;
  images?: string[];
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
  title?: string;
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

type TeamMember = {
  name: string;
  role: string;
  details: string;
  links: Array<{ label: string; href: string }>;
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

function buildCategoryNames(products: Product[], categories: Array<{ name?: string | null }>, types: Array<{ name?: string | null }>) {
  const categoryRows = Array.from(new Set(categories.map((item) => item.name?.trim()).filter((value): value is string => Boolean(value))));
  if (categoryRows.length > 0) {
    return categoryRows.slice(0, 6);
  }

  const typeRows = Array.from(new Set(types.map((item) => item.name?.trim()).filter((value): value is string => Boolean(value))));
  if (typeRows.length > 0) {
    return typeRows.slice(0, 6);
  }

  return Array.from(new Set(products.flatMap((product) => [product.category, product.type]).filter(Boolean))).slice(0, 6);
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

function buildPackageInclusions(product: Product) {
  const inclusions = product.description
    .split(/[.!?]\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (inclusions.length > 0) {
    return inclusions;
  }

  return [
    "Strategy and scoped delivery",
    "Milestone-based execution",
    "Review rounds before final handoff",
  ];
}

function buildTestimonials(
  rows: PublicReviewRow[],
  fallback: TestimonialBlockProps["reviews"] | undefined,
  storeName: string,
) {
  const mappedRows = rows
    .filter((row) => row.review_text?.trim())
    .slice(0, 3)
    .map((row, index) => ({
      id: row.id ?? `review-${index}`,
      name: row.author_name?.trim() || "Verified client",
      role: `${storeName} customer`,
      rating: Math.max(1, Math.min(5, row.rating ?? 5)),
      comment: row.review_text?.trim() || "",
    }));

  if (mappedRows.length > 0) {
    return mappedRows;
  }

  return (fallback ?? [])
    .filter((item) => item?.comment?.trim())
    .slice(0, 3)
    .map((item, index) => ({
      id: `fallback-review-${index}`,
      name: item?.name?.trim() || "Client review",
      role: `${storeName} client`,
      rating: Math.max(1, Math.min(5, item?.rating ?? 5)),
      comment: item?.comment?.trim() || "",
    }));
}

function buildFaqs(faqBlock: FaqBlockProps | undefined) {
  const faqs = (faqBlock?.faqs ?? []).filter((item) => item?.q?.trim() && item?.a?.trim());

  if (faqs.length > 0) {
    return faqs as Array<{ q: string; a: string }>;
  }

  return [
    {
      q: "How do we get started?",
      a: "Use the consultation CTA to contact the merchant, share your goals, and confirm the best package or scope for your project.",
    },
    {
      q: "Can services be customized?",
      a: "Yes. This template supports package-led selling, but final scope, revisions, and timeline can still be discussed with the merchant.",
    },
    {
      q: "How does communication work?",
      a: "Follow-up happens through the store's configured phone, email, WhatsApp, or contact flow depending on how the merchant set up support.",
    },
    {
      q: "What is the delivery timeline?",
      a: "Timelines vary by service and package size. The merchant should confirm milestones, turnaround, and delivery expectations during the consultation.",
    },
  ];
}

function buildPortfolioImages(products: Product[], socialImages: string[] | undefined) {
  if (socialImages && socialImages.length > 0) {
    return socialImages.slice(0, 4);
  }

  return products.flatMap((product) => [product.image, ...product.images]).filter(Boolean).slice(0, 4);
}

function buildTeamMembers(store: Store, contactSettings: ContactSettings | undefined, footerSettings: FooterSettings | undefined) {
  const socialLinks = [...(footerSettings?.company_links ?? []), ...(footerSettings?.extra_links ?? [])]
    .filter((item) => item?.url?.trim())
    .slice(0, 3)
    .map((item) => ({
      label: item.label?.trim() || "Profile",
      href: item.url!.trim(),
    }));

  const primaryName = store.name?.trim() || "Service Team";
  const detailOne = contactSettings?.email?.trim() || contactSettings?.phone?.trim() || "Talk to the merchant team";
  const detailTwo = contactSettings?.whatsapp?.trim() || contactSettings?.address?.trim() || "Project planning and delivery support";

  return [
    {
      name: primaryName,
      role: "Lead service team",
      details: detailOne,
      links: socialLinks,
    },
    {
      name: "Client success",
      role: "Consultation and project support",
      details: detailTwo,
      links: socialLinks,
    },
    {
      name: "Delivery desk",
      role: "Scope, timeline, and follow-up",
      details: contactSettings?.response_time_text?.trim() || "Fast response and milestone coordination",
      links: socialLinks,
    },
  ];
}

function buildWhatsappHref(storeName: string, contactSettings: ContactSettings | undefined) {
  const digits = (contactSettings?.whatsapp || contactSettings?.phone || "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  const normalized = digits.startsWith("0") && digits.length === 11 ? `88${digits}` : digits;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(`Hi ${storeName}, I want to book a consultation.`)}`;
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
      <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-foreground sm:text-[2.5rem]">
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

export function ServiceStorefrontRenderer({
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
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const { data: allProducts = [] } = useProducts(activeStore.id);
  const { data: featuredProducts = [] } = useFeaturedProducts(activeStore.id);
  const { data: productCategories = [] } = useProductCategories(activeStore.id);
  const { data: productTypes = [] } = useProductTypes(activeStore.id);
  const { data: contactSettings } = useSiteSettings<ContactSettings>("contact_page", activeStore.id);
  const { data: footerSettings } = useSiteSettings<FooterSettings>("footer", activeStore.id);
  const { data: aboutSettings } = useSiteSettings<AboutSettings>("about_page", activeStore.id);
  const { data: deliverySettings } = useSiteSettings<DeliverySettings>("delivery_settings", activeStore.id);

  const { data: approvedReviews = [] } = useQuery({
    queryKey: ["service-storefront-reviews", activeStore.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_product_reviews" as any)
        .select("id, product_id, author_name, rating, review_text")
        .eq("store_id", activeStore.id)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) {
        throw error;
      }

      return ((data ?? []) as unknown) as PublicReviewRow[];
    },
    enabled: Boolean(activeStore.id),
    staleTime: 120_000,
  });

  const heroBlock = getHomepageBlock<HeroBlockProps>(blocks, "hero");
  const promoBlock = getHomepageBlock<PromoBannerProps>(blocks, "promo-banner");
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
  const serviceProducts = useMemo(
    () => (featuredProducts.length > 0 ? featuredProducts : availableProducts).slice(0, featuredBlock?.limit ?? 6),
    [availableProducts, featuredBlock?.limit, featuredProducts],
  );
  const packageProducts = useMemo(
    () => (featuredProducts.length > 0 ? featuredProducts : availableProducts).slice(0, 3),
    [availableProducts, featuredProducts],
  );
  const heroProduct = serviceProducts[0] ?? availableProducts[0] ?? null;
  const categoryNames = useMemo(
    () => buildCategoryNames(availableProducts, productCategories, productTypes),
    [availableProducts, productCategories, productTypes],
  );
  const reviewStats = useMemo(
    () => buildReviewStats(approvedReviews),
    [approvedReviews],
  );
  const testimonials = useMemo(
    () => buildTestimonials(approvedReviews, testimonialBlock?.reviews, activeStore.name || "This store"),
    [activeStore.name, approvedReviews, testimonialBlock?.reviews],
  );
  const faqs = useMemo(
    () => buildFaqs(faqBlock),
    [faqBlock],
  );
  const portfolioImages = useMemo(
    () => buildPortfolioImages(availableProducts, socialBlock?.images),
    [availableProducts, socialBlock?.images],
  );
  const teamMembers = useMemo(
    () => buildTeamMembers(activeStore, contactSettings ?? undefined, footerSettings ?? undefined),
    [activeStore, contactSettings, footerSettings],
  );
  const whatsappHref = buildWhatsappHref(activeStore.name || "there", contactSettings ?? undefined);

  const heroEyebrow = heroBlock?.tagline?.trim() || "Creative services that move work forward";
  const heroTitle = heroBlock?.title?.trim() || "Strategic services for";
  const heroHighlight = heroBlock?.highlight?.trim() || "growing brands";
  const heroSubtitle = heroBlock?.subtitle?.trim()
    || aboutSettings?.content?.trim()
    || activeStore.description
    || "Launch a polished service storefront that highlights offers, packages, credibility, and a clear path into consultation.";
  const promoBadge = promoBlock?.badge?.trim() || "Limited time";
  const promoTitle = promoBlock?.title?.trim() || "Start with a lighter package and scale with confidence";
  const promoSubtitle = promoBlock?.subtitle?.trim()
    || (deliverySettings?.enabled
      ? "Use real merchant delivery and support information to remove friction before the first consultation."
      : "Use this promotional slot for launch offers, monthly retainers, or free consultation campaigns.");
  const trustBody = extractPlainText(richTextBlock?.body)
    || footerSettings?.about_text
    || "Explain how your process works, what clients receive, and why buyers can trust your team to deliver consistently.";

  return (
    <div className="bg-[#fbfdfb] text-slate-950 dark:bg-background dark:text-foreground">
      <section className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.10),_transparent_30%),linear-gradient(180deg,_#ffffff_0%,_#fbfdfb_100%)] dark:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)]">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-5 pb-6 pt-4 md:pb-14 md:pt-8 md:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-10 lg:pb-16 lg:pt-10">
          <div className="max-w-[540px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{heroEyebrow}</p>
            <h1 className="mt-5 text-[3rem] font-semibold leading-[1.02] tracking-[-0.05em] text-slate-950 dark:text-foreground sm:text-[4.35rem]">
              {heroTitle} <span className="text-primary">{heroHighlight}</span>
            </h1>
            <p className="mt-5 max-w-[44ch] text-base leading-8 text-slate-500 dark:text-muted-foreground">
              {heroSubtitle}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={storefrontPath("/contact", activeStore.slug)}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_18px_34px_-18px_rgba(34,197,94,0.55)] transition-transform hover:-translate-y-0.5 sm:w-auto"
              >
                {heroBlock?.ctaText?.trim() || "Book a Free Consultation"}
              </Link>
              <Link
                href={storefrontPath("/shop", activeStore.slug)}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-[#dce9df] bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:border-primary/35 sm:w-auto dark:border-white/10 dark:bg-card dark:text-foreground"
              >
                {heroBlock?.secondaryCtaText?.trim() || "Explore Services"}
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-2">
              {[
                { label: "Fast turnaround", description: contactSettings?.response_time_text?.trim() || "Clear milestones and follow-up" },
                { label: "Quality delivery", description: trustBlock?.badges?.[0]?.description?.trim() || "Merchant-managed output and review" },
                { label: "Trusted support", description: contactSettings?.phone?.trim() || contactSettings?.email?.trim() || "Direct access to the team" },
              ].map((item, index) => (
                <div key={item.label} className="rounded-[20px] border border-[#e7eee9] bg-white p-3 sm:p-4 shadow-sm dark:border-white/10 dark:bg-card">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {index === 0 ? <Clock3 className="h-4.5 w-4.5" /> : index === 1 ? <BadgeCheck className="h-4.5 w-4.5" /> : <Users className="h-4.5 w-4.5" />}
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-foreground">{item.label}</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[34px] border border-[#e8efe9] bg-white shadow-[0_28px_70px_-46px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-card">
            {heroProduct ? (
              <img
                src={heroProduct.image}
                srcSet={generateCloudinarySrcSet(heroProduct.image)}
                sizes="(max-width: 1024px) 92vw, 48vw"
                alt={heroProduct.name}
                className="aspect-[2/1] md:aspect-[16/11] w-full object-cover"
              />
            ) : (
              <div className="aspect-[2/1] md:aspect-[16/11] w-full bg-[#f4faf5]" />
            )}
            <div className="absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(90deg,rgba(255,255,255,0.92),rgba(255,255,255,0))] dark:bg-[linear-gradient(90deg,rgba(10,10,10,0.72),rgba(10,10,10,0))]" />
            <div className="absolute bottom-6 left-6 max-w-[260px] rounded-[22px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_34px_-20px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-card/92">
              <p className="text-sm font-semibold text-slate-900 dark:text-foreground">
                {activeStore.name || "This team"} helps clients launch with clarity
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-muted-foreground">
                {contactSettings?.description?.trim() || "Use this service template for consultation-led sales, retainers, and package-driven projects."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <div className="rounded-[28px] border border-[#e7eee9] bg-white px-5 py-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card lg:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{promoBadge}</p>
              <h2 className="mt-2 text-[1.85rem] font-semibold tracking-tight text-slate-950 dark:text-foreground">{promoTitle}</h2>
              <p className="mt-2 max-w-[60ch] text-sm leading-7 text-slate-500 dark:text-muted-foreground">{promoSubtitle}</p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link
                href={promoBlock?.ctaLink ? storefrontPath(promoBlock.ctaLink, activeStore.slug) : storefrontPath("/contact", activeStore.slug)}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                {promoBlock?.ctaText?.trim() || "Claim Offer Now"}
              </Link>
              <p className="text-xs text-slate-500 dark:text-muted-foreground">
                {deliverySettings?.free_threshold ? `Packages above BDT ${deliverySettings.free_threshold.toLocaleString()} may qualify for extra support.` : "Promotional details can be adjusted from the merchant's CMS settings."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-6 md:py-12 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow={categoryBlock?.tagline?.trim() || "What we do"}
          title={categoryBlock?.title?.trim() || "Core service categories"}
          subtitle="Use your real categories or product types to present service areas without duplicating business logic."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {categoryNames.map((category, index) => (
            <Link
              key={`${category}-${index}`}
              href={storefrontPath(`/shop?category=${encodeURIComponent(category)}`, activeStore.slug)}
              className="rounded-[22px] border border-[#e7eee9] bg-white p-3 sm:p-5 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.16)] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-card"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                {index % 3 === 0 ? <Sparkles className="h-5 w-5" /> : index % 3 === 1 ? <BriefcaseBusiness className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}
              </div>
              <h3 className="mt-3 sm:mt-5 text-base font-semibold text-slate-950 dark:text-foreground">{category}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-muted-foreground">
                Merchant-managed packages, pricing, and delivery details live under this service area.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
                Learn more
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow={featuredBlock?.tagline?.trim() || "Simple, transparent packages"}
          title={featuredBlock?.title?.trim() || "Choose the right package for your goals"}
          subtitle="Real products double as service packages here, so merchants keep one catalog and one source of truth for pricing."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {packageProducts.map((product, index) => (
            <div
              key={product.id}
              className={`rounded-[28px] border bg-white p-4 sm:p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.16)] dark:bg-card ${index === 1 ? "border-primary/40 ring-1 ring-primary/20 dark:border-primary/30" : "border-[#e7eee9] dark:border-white/10"}`}
            >
              {index === 1 ? (
                <div className="mb-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Most Popular
                </div>
              ) : null}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-foreground">{product.name}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">{product.type || product.category || "Service package"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-foreground">BDT {product.price.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">One-time starting price</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {buildPackageInclusions(product).map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm leading-7 text-slate-600 dark:text-muted-foreground">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSelectedPackageId(product.id)}
                className={`mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl border px-5 text-sm font-semibold ${selectedPackageId === product.id ? "border-primary bg-primary text-primary-foreground" : "border-[#dce9df] text-slate-800 hover:border-primary/35 dark:border-white/10 dark:text-foreground"}`}
              >
                {selectedPackageId === product.id ? "Selected for Booking" : `Choose ${product.name}`}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-6 md:py-12 md:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow={socialBlock?.subtitle?.trim() || "Our work"}
              title={socialBlock?.title?.trim() || "Portfolio and project highlights"}
              subtitle="Use the social/media block as a reusable portfolio strip for services, case studies, or before-and-after proof."
            />
            <p className="max-w-[56ch] text-sm leading-7 text-slate-500 dark:text-muted-foreground">
              {trustBody}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            {portfolioImages.map((image, index) => (
              <div key={`${image}-${index}`} className={`overflow-hidden rounded-[24px] border border-[#e7eee9] bg-white shadow-[0_16px_34px_-30px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card ${index === 0 ? "col-span-2 sm:col-span-2" : ""}`}>
                <img
                  src={image}
                  srcSet={generateCloudinarySrcSet(image)}
                  sizes={index === 0 ? "(max-width: 1024px) 92vw, 48vw" : "(max-width: 1024px) 46vw, 24vw"}
                  alt={`Portfolio preview ${index + 1}`}
                  className={`w-full object-cover ${index === 0 ? "aspect-[16/8.8]" : "aspect-[4/4.2]"}`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Featured services"
          title="Bookable offers powered by your real catalog"
          subtitle="Each card below comes from actual store products, so pricing and detail pages stay in sync with the rest of the storefront."
        />
        <div className="grid gap-5 xl:grid-cols-3">
          {serviceProducts.map((product) => (
            <ServiceProductCard
              key={product.id}
              product={product}
              reviewStats={reviewStats[product.id]}
              onBook={(selected) => setSelectedPackageId(selected.id)}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-6 md:py-12 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow={testimonialBlock?.subtitle?.trim() || "Clients love us"}
          title={testimonialBlock?.title?.trim() || "What clients say"}
        />
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-3 lg:overflow-visible">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="min-w-[280px] snap-center flex-shrink-0 rounded-[24px] border border-[#e7eee9] bg-white p-5 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-card lg:min-w-0">
              <div className="flex items-center gap-1 text-primary">
                {Array.from({ length: testimonial.rating }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-muted-foreground">
                {testimonial.comment}
              </p>
              <div className="mt-5">
                <p className="font-semibold text-slate-950 dark:text-foreground">{testimonial.name}</p>
                <p className="text-sm text-slate-500 dark:text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Meet the team"
          title="People behind the service"
          subtitle="This section stays lightweight and reuses merchant identity plus contact details when custom team data is not yet available."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teamMembers.map((member) => (
            <div key={`${member.name}-${member.role}`} className="overflow-hidden rounded-[24px] border border-[#e7eee9] bg-white shadow-[0_16px_34px_-30px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card">
              <div className="flex aspect-[3/2] sm:aspect-[4/3] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.16),_transparent_48%),linear-gradient(180deg,#f5faf6_0%,#eef7f0_100%)] text-[2.3rem] font-semibold tracking-tight text-primary dark:bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.22),_transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.02)_100%)]">
                {member.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
              </div>
              <div className="space-y-3 p-5">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-foreground">{member.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-muted-foreground">{member.role}</p>
                </div>
                <p className="text-sm leading-7 text-slate-600 dark:text-muted-foreground">{member.details}</p>
                {member.links.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {member.links.map((link) => (
                      <a
                        key={`${member.name}-${link.href}`}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-full border border-[#dce9df] px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-primary/35 dark:border-white/10 dark:text-muted-foreground"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-6 md:py-12 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow="FAQ"
          title={faqBlock?.title?.trim() || "Frequently asked questions"}
          subtitle={faqBlock?.subtitle?.trim() || "Answer common questions before the client reaches out, so the final CTA feels easier to act on."}
        />
        <div className="grid gap-2 md:gap-4 lg:grid-cols-2">
          {faqs.map((faq, index) => (
            <button
              key={`${faq.q}-${index}`}
              type="button"
              onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
              className="rounded-[20px] border border-[#e7eee9] bg-white px-4 py-3 md:px-5 md:py-4 text-left shadow-[0_14px_28px_-26px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-card"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-slate-950 dark:text-foreground">{faq.q}</span>
                <ChevronRight className={`h-4 w-4 shrink-0 text-primary transition-transform ${openFaq === index ? "rotate-90" : ""}`} />
              </div>
              {openFaq === index ? (
                <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-muted-foreground">{faq.a}</p>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 pb-14 md:px-8 lg:px-10">
        <div className="rounded-[30px] border border-[#e7eee9] bg-white px-5 py-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessageSquareQuote className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[1.9rem] font-semibold tracking-tight text-slate-950 dark:text-foreground">
                  Ready to start your project?
                </h2>
                <p className="mt-2 max-w-[56ch] text-sm leading-7 text-slate-500 dark:text-muted-foreground">
                  {selectedPackageId
                    ? "You have a package selected. Continue to the merchant contact flow to confirm scope, dates, and next steps."
                    : "Use the merchant's consultation flow to discuss goals, timeline, and the best package for your project."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={storefrontPath("/contact", activeStore.slug)}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground"
              >
                Book a Free Consultation
              </Link>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-[#dce9df] px-6 text-sm font-semibold text-slate-800 dark:border-white/10 dark:text-foreground"
                >
                  Chat on WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-5 text-sm text-slate-500 dark:text-muted-foreground">
            {contactSettings?.phone ? (
              <span className="inline-flex items-center gap-2"><PhoneCall className="h-4 w-4 text-primary" /> {contactSettings.phone}</span>
            ) : null}
            {contactSettings?.email ? (
              <span className="inline-flex items-center gap-2"><Headphones className="h-4 w-4 text-primary" /> {contactSettings.email}</span>
            ) : null}
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Merchant-managed consultation and follow-up</span>
          </div>
        </div>
      </section>
    </div>
  );
}
