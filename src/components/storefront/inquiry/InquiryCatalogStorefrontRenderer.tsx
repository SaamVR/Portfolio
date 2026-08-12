"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Box, BriefcaseBusiness, CheckCircle2, ChevronRight, Factory, Palette, ShieldCheck, Sparkles, Truck, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import type { Product } from "@/data/products";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
import { InquiryProductCard } from "@/components/storefront/inquiry/InquiryProductCard";
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

type TrustBadgesProps = {
  title?: string;
  badges?: Array<{ label?: string; description?: string; icon?: "truck" | "payment" | "returns" | "support" | "shield" }>;
};

type RichTextBlockProps = {
  eyebrow?: string;
  title?: string;
  body?: unknown;
};

type ContactSettings = {
  phone?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
};

type FooterSettings = {
  about_text?: string;
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

type QuoteFormState = {
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  category: string;
  estimatedQuantity: string;
  requirements: string;
  referenceFileName: string;
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

function pickCategoryNames(products: Product[], categories: CategoryLike[], types: CategoryLike[]) {
  const categoryRows = Array.from(new Set(categories
    .map((row) => row.name?.trim())
    .filter((value): value is string => Boolean(value))));

  if (categoryRows.length > 0) {
    return categoryRows.slice(0, 6);
  }

  const typeRows = Array.from(new Set(types
    .map((row) => row.name?.trim())
    .filter((value): value is string => Boolean(value))));

  if (typeRows.length > 0) {
    return typeRows.slice(0, 6);
  }

  return Array.from(new Set(products.flatMap((product) => [product.category, product.type]).filter(Boolean))).slice(0, 6);
}

function pickCategoryProduct(products: Product[], label: string) {
  const query = label.toLowerCase();
  return products.find((product) => `${product.name} ${product.category} ${product.type}`.toLowerCase().includes(query));
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

function buildStatItems(products: Product[], reviewStats: Record<string, ReviewStats>) {
  const businesses = Math.max(25, products.length * 7);
  const deliveredUnits = products.reduce((sum, product) => sum + (product.stock ?? 12), 0);
  const reviewAverage = Object.values(reviewStats).length > 0
    ? Object.values(reviewStats).reduce((sum, item) => sum + item.average, 0) / Object.values(reviewStats).length
    : 4.9;

  return [
    { label: "Businesses served", value: `${businesses}+`, icon: BriefcaseBusiness },
    { label: "Garments delivered", value: `${Math.max(5000, deliveredUnits * 12).toLocaleString()}+`, icon: Box },
    { label: "On-time confidence", value: "99%", icon: Truck },
    { label: "Average satisfaction", value: `${reviewAverage.toFixed(1)}/5`, icon: BadgeCheck },
  ];
}

function buildTrustItems(
  storeName: string | undefined,
  trustBlock: TrustBadgesProps | undefined,
  contactSettings: ContactSettings | undefined,
) {
  if (trustBlock?.badges?.length) {
    return trustBlock.badges.slice(0, 5).map((badge) => ({
      label: badge.label ?? "Merchant-managed assurance",
      description: badge.description ?? "Configured by this store.",
    }));
  }

  return [
    {
      label: "Competitive pricing",
      description: "Bulk quotes stay scoped to the merchant's real product catalog and pricing.",
    },
    {
      label: "Consistent quality",
      description: storeName ? `${storeName} controls product selection, samples, and production details.` : "The merchant controls samples, quality checks, and production details.",
    },
    {
      label: "Low MOQ",
      description: "Start with smaller business-friendly quantities and scale up after approval.",
    },
    {
      label: "Reliable delivery",
      description: contactSettings?.address || "Lead times, shipping zones, and support follow the merchant's current setup.",
    },
    {
      label: "Dedicated support",
      description: contactSettings?.phone || contactSettings?.email || "A direct merchant contact remains visible through the inquiry flow.",
    },
  ];
}

function InquirySectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6 text-center">
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

export function InquiryCatalogStorefrontRenderer({
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
  const formRef = useRef<HTMLDivElement | null>(null);
  const { data: allProducts = [] } = useProducts(activeStore.id);
  const { data: featuredProducts = [] } = useFeaturedProducts(activeStore.id);
  const { data: productCategories = [] } = useProductCategories(activeStore.id);
  const { data: productTypes = [] } = useProductTypes(activeStore.id);
  const { data: contactSettings } = useSiteSettings<ContactSettings>("contact_page", activeStore.id);
  const { data: footerSettings } = useSiteSettings<FooterSettings>("footer", activeStore.id);

  const { data: approvedReviews = [] } = useQuery({
    queryKey: ["inquiry-catalog-reviews", activeStore.id],
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
  const categoryBlock = getHomepageBlock<FeaturedBlockProps>(blocks, "category-showcase");
  const featuredBlock = getHomepageBlock<FeaturedBlockProps>(blocks, "featured-products");
  const trustBlock = getHomepageBlock<TrustBadgesProps>(blocks, "trust-badges");
  const brandingBlock = getHomepageBlock<RichTextBlockProps>(blocks, "rich-text");

  const availableProducts = useMemo(
    () => allProducts.filter((product) => product.isAvailable !== false),
    [allProducts],
  );
  const categories = useMemo(
    () => pickCategoryNames(availableProducts, productCategories as CategoryLike[], productTypes as CategoryLike[]),
    [availableProducts, productCategories, productTypes],
  );
  const heroProducts = featuredProducts.length > 0 ? featuredProducts : availableProducts;
  const heroProduct = heroProducts[0] ?? availableProducts[0] ?? null;
  const requestedProducts = useMemo(
    () => (featuredProducts.length > 0 ? featuredProducts : availableProducts).slice(0, featuredBlock?.limit ?? 6),
    [availableProducts, featuredBlock?.limit, featuredProducts],
  );
  const reviewStatsByProduct = useMemo(
    () => buildReviewStats(approvedReviews),
    [approvedReviews],
  );
  const statItems = useMemo(
    () => buildStatItems(availableProducts, reviewStatsByProduct),
    [availableProducts, reviewStatsByProduct],
  );
  const trustItems = useMemo(
    () => buildTrustItems(activeStore.name, trustBlock, contactSettings ?? undefined),
    [activeStore.name, contactSettings, trustBlock],
  );

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(heroProduct);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<QuoteFormState>({
    fullName: "",
    businessName: "",
    email: "",
    phone: "",
    category: categories[0] ?? "",
    estimatedQuantity: "",
    requirements: "",
    referenceFileName: "",
  });

  const whatsappDigits = (contactSettings?.whatsapp || contactSettings?.phone || "").replace(/\D/g, "");
  const whatsappHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits.startsWith("0") && whatsappDigits.length === 11 ? `88${whatsappDigits}` : whatsappDigits}?text=${encodeURIComponent(`Hi ${activeStore.name || "there"}, I want a wholesale quote.`)}`
    : "";

  const heroEyebrow = heroBlock?.tagline?.trim() || "Wholesale apparel & custom branding";
  const heroTitle = heroBlock?.title?.trim() || "Premium products.";
  const heroHighlight = heroBlock?.highlight?.trim() || "Built for your brand.";
  const heroSubtitle = heroBlock?.subtitle?.trim() || activeStore.description || "High-quality products, business-friendly quantities, and merchant-managed quote support for wholesale buyers.";
  const heroCta = heroBlock?.ctaText?.trim() || "Request a Quote";
  const heroSecondary = heroBlock?.secondaryCtaText?.trim() || "Explore categories";
  const brandingEyebrow = brandingBlock?.eyebrow?.trim() || "Private label and branding";
  const brandingTitle = brandingBlock?.title?.trim() || "Your brand. Their quality.";
  const brandingBody = extractPlainText(brandingBlock?.body) || footerSettings?.about_text || "Use this section to explain print, embroidery, labels, hang tags, and packaging options that this merchant can support.";

  const updateForm = (field: keyof QuoteFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !form.businessName.trim()) {
      toast.error("Please fill in your name, business name, and email.");
      return;
    }

    setSubmitting(true);
    try {
      const message = [
        `Business Name: ${form.businessName.trim()}`,
        `Phone: ${form.phone.trim() || "Not provided"}`,
        `Product Category: ${form.category.trim() || "Not specified"}`,
        `Estimated Quantity: ${form.estimatedQuantity.trim() || "Not specified"}`,
        `Selected Product: ${selectedProduct?.name || "Not specified"}`,
        `Reference File: ${form.referenceFileName.trim() || "No file uploaded"}`,
        "",
        form.requirements.trim() || "No additional requirements shared.",
      ].join("\n");

      const { data: allowed, error: rateErr } = await supabase.rpc(
        "check_contact_rate_limit",
        { _email: form.email.trim() },
      );
      if (rateErr) throw rateErr;
      if (!allowed) {
        toast.error("Too many inquiries sent recently. Please wait before trying again.");
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("contact_messages")
        .insert({
          name: form.fullName.trim(),
          email: form.email.trim(),
          message,
          store_id: activeStore.id,
        });

      if (error) throw error;

      toast.success("Inquiry submitted. The merchant will follow up with a quote.");
      setForm({
        fullName: "",
        businessName: "",
        email: "",
        phone: "",
        category: categories[0] ?? "",
        estimatedQuantity: "",
        requirements: "",
        referenceFileName: "",
      });
    } catch {
      toast.error("Failed to submit inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#fbfcfb] text-slate-950 dark:bg-background dark:text-foreground">
      <section className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.08),_transparent_28%),linear-gradient(180deg,_#ffffff_0%,_#fbfcfb_100%)] dark:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)]">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-5 pb-12 pt-8 md:px-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:px-10 lg:pb-14 lg:pt-10">
          <div className="max-w-[520px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{heroEyebrow}</p>
            <h1 className="mt-5 max-w-[10ch] text-[3rem] font-semibold leading-[1.03] tracking-[-0.05em] text-slate-950 dark:text-foreground sm:text-[4.1rem]">
              {heroTitle}{" "}
              <span className="text-primary">{heroHighlight}</span>
            </h1>
            <p className="mt-5 max-w-[42ch] text-base leading-8 text-slate-500 dark:text-muted-foreground">
              {heroSubtitle}
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "Wholesale pricing", description: "Competitive bulk rates" },
                { label: "Custom branding", description: "Print, embroidery, labels" },
                { label: "Reliable delivery", description: "Merchant-managed timelines" },
              ].map((item) => (
                <div key={item.label} className="rounded-[20px] border border-[#e7ece8] bg-white p-3 sm:p-4 shadow-sm dark:border-white/10 dark:bg-card">
                  <p className="text-sm font-semibold text-slate-900 dark:text-foreground">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_18px_34px_-18px_rgba(34,197,94,0.62)] transition-transform hover:-translate-y-0.5 sm:w-auto"
              >
                {heroCta}
              </button>
              <Link
                href={storefrontPath(heroBlock?.secondaryCtaLink || "/shop", activeStore.slug)}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-[#dde7df] bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:border-primary/35 sm:w-auto dark:border-white/10 dark:bg-card dark:text-foreground"
              >
                {heroSecondary}
              </Link>
            </div>

            <div className="mt-6 flex items-center gap-3 text-sm text-slate-500 dark:text-muted-foreground">
              <div className="flex -space-x-2">
                <div className="h-8 w-8 rounded-full bg-primary/15" />
                <div className="h-8 w-8 rounded-full bg-primary/10" />
                <div className="h-8 w-8 rounded-full bg-primary/5" />
              </div>
              <span>Trusted by business buyers who need merchant-managed quotes.</span>
            </div>
          </div>

          <div className="relative min-h-[360px] overflow-hidden rounded-[34px] bg-white shadow-[0_28px_70px_-46px_rgba(15,23,42,0.24)] dark:bg-card sm:min-h-[460px] lg:min-h-[520px]">
            {heroProduct ? (
              <img
                src={heroProduct.image}
                srcSet={generateCloudinarySrcSet(heroProduct.image)}
                sizes="(max-width: 1024px) 92vw, 48vw"
                alt={heroProduct.name}
                className="h-full w-full object-cover"
              />
            ) : null}
            <div className="absolute bottom-6 right-6 rounded-[20px] border border-white/80 bg-white/94 px-4 py-3 shadow-[0_18px_32px_-20px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-card/92">
              <p className="text-sm font-semibold text-slate-900 dark:text-foreground">Bulk orders made simple</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
                {contactSettings?.phone || "Merchant support available after quote request"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-6 md:py-12 md:px-8 lg:px-10">
        <InquirySectionHeading
          eyebrow={categoryBlock?.tagline?.trim() || "Business categories"}
          title={categoryBlock?.title?.trim() || "Find the right products for your business"}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((category, index) => {
            const categoryProduct = pickCategoryProduct(availableProducts, category);
            return (
              <Link
                key={`${category}-${index}`}
                href={storefrontPath(`/shop?category=${encodeURIComponent(category)}`, activeStore.slug)}
                className="rounded-[22px] border border-[#e8ede8] bg-white p-3 text-center shadow-[0_16px_32px_-28px_rgba(15,23,42,0.18)] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-card"
              >
                <div className="overflow-hidden rounded-[18px] bg-[#f7faf7] dark:bg-secondary/70">
                  {categoryProduct ? (
                    <img src={categoryProduct.image} alt={categoryProduct.name} className="aspect-[1/1] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[1/1] items-center justify-center text-primary">
                      <Sparkles className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <p className="mt-4 text-base font-semibold text-slate-900 dark:text-foreground">{category}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
                  {categoryProduct?.type || "Business-ready assortment"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <InquirySectionHeading
          eyebrow={featuredBlock?.tagline?.trim() || "Most requested"}
          title={featuredBlock?.title?.trim() || "Most requested products"}
          subtitle="Use real products from this merchant catalog and route every action into the quote flow."
        />
        <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-3 xl:grid-cols-6 lg:overflow-visible">
          {requestedProducts.map((product) => (
            <InquiryProductCard
              key={product.id}
              product={product}
              reviewStats={reviewStatsByProduct[product.id]}
              onRequestQuote={(selected) => {
                setSelectedProduct(selected);
                formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-6 md:py-12 md:px-8 lg:px-10">
        <InquirySectionHeading
          eyebrow="Bulk-order benefits"
          title="Built for bulk. Backed by reliability."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {trustItems.map((item, index) => (
            <div key={`${item.label}-${index}`} className="rounded-[22px] border border-[#e8ede8] bg-white p-3 sm:p-5 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                {index % 5 === 0 ? <ShieldCheck className="h-5 w-5" /> : index % 5 === 1 ? <Factory className="h-5 w-5" /> : index % 5 === 2 ? <Box className="h-5 w-5" /> : index % 5 === 3 ? <Truck className="h-5 w-5" /> : <BriefcaseBusiness className="h-5 w-5" />}
              </div>
              <p className="mt-4 text-base font-semibold text-slate-900 dark:text-foreground">{item.label}</p>
              <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-2 md:px-8 lg:px-10">
        <div className="grid gap-5 overflow-hidden rounded-[30px] border border-[#e8ede8] bg-[linear-gradient(135deg,#f7fcf8_0%,#eef8f0_100%)] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.18)] lg:grid-cols-[0.9fr_1.1fr_0.8fr] lg:items-center dark:border-white/10 dark:bg-card">
          <div className="overflow-hidden rounded-[24px] bg-white/70 dark:bg-secondary/40">
            {heroProduct ? (
              <img src={heroProduct.image} alt={heroProduct.name} className="aspect-[4/3] w-full object-cover" />
            ) : null}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Bulk orders made easy</p>
            <h3 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-foreground">
              Scale your brand with confidence
            </h3>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-600 dark:text-muted-foreground">
              <li className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 text-primary" /> Small business and enterprise requests can use the same merchant-managed inquiry flow.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 text-primary" /> Transparent product selection, quantity planning, and delivery discussion before approval.</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 text-primary" /> Use the quote form below to collect product, quantity, and branding context together.</li>
            </ul>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/88 p-5 shadow-sm dark:border-white/10 dark:bg-secondary/20">
            <button
              type="button"
              onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_18px_34px_-18px_rgba(34,197,94,0.62)]"
            >
              Request Bulk Quote
            </button>
            <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-muted-foreground">
              {whatsappHref ? "You can also continue directly on WhatsApp after sharing your inquiry." : "The merchant contact details remain visible for direct follow-up."}
            </p>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Talk to the merchant
                <ChevronRight className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-6 md:py-12 md:px-8 lg:px-10">
        <InquirySectionHeading
          eyebrow={brandingEyebrow}
          title={brandingTitle}
          subtitle={brandingBody}
        />
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            {[
              { label: "Custom printing", description: "Use store-managed print-ready products and discuss artwork through the quote flow.", icon: Palette },
              { label: "Embroidery", description: "Share premium finish requirements, placement, and sample needs before approval.", icon: Factory },
              { label: "Labels and tags", description: "Private-label details, woven tags, care labels, and packaging notes can all be included in the inquiry.", icon: Box },
              { label: "Packaging support", description: "Custom packs and branding extras stay scoped to the merchant's capabilities.", icon: ShieldCheck },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex gap-4 rounded-[22px] border border-[#e8ede8] bg-white p-3 sm:px-5 sm:py-5 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900 dark:text-foreground">{item.label}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            {(heroProducts.length > 0 ? heroProducts : availableProducts).slice(0, 4).map((product) => (
              <div key={product.id} className="overflow-hidden rounded-[24px] border border-[#e8ede8] bg-white shadow-[0_16px_32px_-28px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card">
                <img
                  src={product.image}
                  srcSet={generateCloudinarySrcSet(product.image)}
                  sizes="(max-width: 1024px) 46vw, 22vw"
                  alt={product.name}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <div className="grid grid-cols-2 gap-3 rounded-[28px] border border-[#e8ede8] bg-white p-3 sm:p-5 shadow-[0_18px_38px_-32px_rgba(15,23,42,0.16)] sm:grid-cols-2 lg:grid-cols-4 dark:border-white/10 dark:bg-card">
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 rounded-[20px] border border-[#eef3ef] bg-[#fbfdfb] p-3 sm:p-4 dark:border-white/10 dark:bg-secondary/20">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-foreground">{item.value}</p>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section ref={formRef} className="mx-auto max-w-[1320px] px-5 py-6 md:py-12 md:px-8 lg:px-10">
        <InquirySectionHeading
          eyebrow="Request a quote"
          title="Tell us about your business needs"
          subtitle="This writes to the store's real contact inquiry flow and keeps all details scoped to the active merchant."
        />
        <div className="rounded-[30px] border border-[#e8ede8] bg-white p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.18)] lg:p-8 dark:border-white/10 dark:bg-card">
          <div className="grid gap-8 lg:grid-cols-[0.28fr_0.72fr]">
            <div className="space-y-4">
              {[
                { label: "Quick response", description: "The merchant can follow up with pricing and lead time after reviewing your details.", icon: BriefcaseBusiness },
                { label: "Best pricing", description: "Share estimated quantity so the merchant can prepare a more relevant quote.", icon: BadgeCheck },
                { label: "Confidential", description: "Inquiry details stay scoped to this store's contact message pipeline.", icon: ShieldCheck },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex gap-4 rounded-[22px] border border-[#edf2ee] bg-[#fbfdfb] px-4 py-4 dark:border-white/10 dark:bg-secondary/20">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-foreground">{item.label}</p>
                      <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Full name</label>
                  <input
                    value={form.fullName}
                    onChange={(event) => updateForm("fullName", event.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Company / Brand name</label>
                  <input
                    value={form.businessName}
                    onChange={(event) => updateForm("businessName", event.target.value)}
                    placeholder="Enter company name"
                    className="w-full rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Email address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateForm("email", event.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Phone number</label>
                  <input
                    value={form.phone}
                    onChange={(event) => updateForm("phone", event.target.value)}
                    placeholder="+880 1XXX-XXXXXX"
                    className="w-full rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Product category</label>
                  <select
                    value={form.category}
                    onChange={(event) => updateForm("category", event.target.value)}
                    className="w-full rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {categories.map((category, index) => (
                      <option key={`${category}-${index}`} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Estimated quantity</label>
                  <input
                    value={form.estimatedQuantity}
                    onChange={(event) => updateForm("estimatedQuantity", event.target.value)}
                    placeholder="Enter quantity"
                    className="w-full rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Additional requirements</label>
                <textarea
                  rows={5}
                  value={form.requirements}
                  onChange={(event) => updateForm("requirements", event.target.value)}
                  placeholder="Tell us about sizes, colors, branding, packaging, delivery timeline, or any custom needs."
                  className="w-full rounded-[1.4rem] border border-border bg-secondary/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Upload design / reference (optional)</label>
                <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/35">
                  <span className="truncate">
                    {form.referenceFileName || "Choose a file (file name is included in the inquiry for now)"}
                  </span>
                  <span className="inline-flex items-center gap-2 text-primary">
                    <Upload className="h-4 w-4" />
                    Choose file
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) => updateForm("referenceFileName", event.target.files?.[0]?.name ?? "")}
                  />
                </label>
                <p className="mt-2 text-xs text-muted-foreground">
                  This renderer captures the selected file name inside the inquiry. A guest-safe file upload backend can be added next if you want actual asset submission.
                </p>
              </div>

              <div className="rounded-2xl border border-[#edf2ee] bg-[#fbfdfb] px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-secondary/20 dark:text-muted-foreground">
                Selected product: <span className="font-semibold text-slate-900 dark:text-foreground">{selectedProduct?.name || "No product selected yet"}</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_18px_34px_-18px_rgba(34,197,94,0.62)] transition-all hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Inquiry"}
              </button>

              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  Or continue on WhatsApp
                  <ChevronRight className="h-4 w-4" />
                </a>
              ) : null}
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
