"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Gem, HandHeart, MapPin, PackageCheck, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { CraftProductCard } from "@/components/storefront/crafts/CraftProductCard";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/data/products";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
import { storefrontPath } from "@/lib/slug";
import { generateCloudinarySrcSet } from "@/lib/cms/cloudinary-responsive";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
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
  limit?: number;
};

type RichTextBlockProps = {
  eyebrow?: string;
  title?: string;
  body?: unknown;
};

type FooterSettings = {
  newsletter_heading?: string;
  newsletter_description?: string;
  newsletter_subscribed?: string;
  about_text?: string;
};

type ContactSettings = {
  phone?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
};

type DeliverySettings = {
  enabled?: boolean;
  primary_zone_label?: string;
  secondary_zone_label?: string;
  free_threshold?: number;
  delivery_fee?: number;
  delivery_fee_outside?: number;
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

type CollectionSpotlight = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  image: string | null;
};

function getHomepageBlock<TProps extends Record<string, unknown>>(blocks: StorePageBlock[], type: StorePageBlock["type"]) {
  return blocks.find((block) => block.type === type)?.props as TProps | undefined;
}

function hasBanglaText(value: string | null | undefined) {
  return typeof value === "string" && /[\u0980-\u09FF]/.test(value);
}

function deriveLabelMode(store: Store, products: Product[], categories: string[]) {
  const values = [
    store.name,
    store.description,
    ...categories,
    ...products.slice(0, 8).map((product) => `${product.name} ${product.category} ${product.type}`),
  ];

  return values.some((value) => hasBanglaText(value)) ? "bengali" : "english";
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

function extractPlainText(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value !== "object") {
    return "";
  }

  const node = value as { text?: string; content?: unknown[] };
  const text = typeof node.text === "string" ? node.text : "";
  const nested = Array.isArray(node.content) ? node.content.map(extractPlainText).join(" ") : "";
  return `${text} ${nested}`.trim();
}

function matchFeaturedProducts(products: Product[], block: FeaturedBlockProps | undefined) {
  return products.slice(0, block?.limit ?? 8);
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
  return products.find((product) => {
    const haystack = `${product.name} ${product.category} ${product.type}`.toLowerCase();
    return haystack.includes(query);
  });
}

function buildCollectionSpotlights(products: Product[], storeSlug?: string | null): CollectionSpotlight[] {
  const groups = new Map<string, Product[]>();

  products.forEach((product) => {
    const key = product.category || product.type || "Collections";
    const existing = groups.get(key) ?? [];
    existing.push(product);
    groups.set(key, existing);
  });

  return Array.from(groups.entries())
    .slice(0, 5)
    .map(([title, items], index) => ({
      id: `${title}-${index}`,
      title,
      subtitle: `${items.length} piece${items.length === 1 ? "" : "s"} in this collection`,
      href: storefrontPath(`/shop?category=${encodeURIComponent(title)}`, storeSlug ?? undefined),
      image: items[0]?.image ?? null,
    }));
}

function buildTrustItems(
  storeName: string | undefined,
  trustBlock: TrustBadgesProps | undefined,
  deliverySettings: DeliverySettings | undefined,
  contactSettings: ContactSettings | undefined,
) {
  const iconMap = {
    truck: Truck,
    payment: PackageCheck,
    returns: HandHeart,
    support: ShieldCheck,
    shield: Gem,
  } as const;

  if (trustBlock?.badges?.length) {
    return trustBlock.badges.slice(0, 4).map((badge) => ({
      label: badge.label ?? "Crafted with care",
      description: badge.description ?? "Configured by this merchant.",
      icon: iconMap[badge.icon ?? "shield"],
    }));
  }

  return [
    {
      label: "Artisan-first selection",
      description: storeName ? `Curated by ${storeName}` : "Merchant-curated handmade pieces",
      icon: HandHeart,
    },
    {
      label: "Origin details visible",
      description: "Category, material, and collection context stay merchant-controlled",
      icon: MapPin,
    },
    {
      label: deliverySettings?.enabled ? "Careful delivery" : "Flexible fulfillment",
      description: deliverySettings?.primary_zone_label || contactSettings?.address || "Delivery and pickup follow store settings",
      icon: Truck,
    },
    {
      label: "Trusted packaging",
      description: contactSettings?.phone ? `Support available on ${contactSettings.phone}` : "Policies and support stay visible across the storefront",
      icon: ShieldCheck,
    },
  ];
}

function CraftsSectionHeading({
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
        <h2 className="mt-2 text-[1.9rem] font-semibold tracking-tight text-[#2e251a] dark:text-foreground sm:text-[2.45rem]">
          {title}
        </h2>
      </div>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="hidden items-center gap-1 text-sm font-medium text-[#7e6d59] transition-colors hover:text-[#2e251a] sm:inline-flex dark:text-muted-foreground dark:hover:text-foreground">
          {actionLabel}
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

export function CraftsStorefrontRenderer({
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
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const { data: allProducts = [] } = useProducts(activeStore.id);
  const { data: featuredProducts = [] } = useFeaturedProducts(activeStore.id);
  const { data: productCategories = [] } = useProductCategories(activeStore.id);
  const { data: productTypes = [] } = useProductTypes(activeStore.id);
  const { data: footerSettings } = useSiteSettings<FooterSettings>("footer", activeStore.id);
  const { data: contactSettings } = useSiteSettings<ContactSettings>("contact_page", activeStore.id);
  const { data: deliverySettings } = useSiteSettings<DeliverySettings>("delivery_settings", activeStore.id);
  const { data: templateAssets } = useSiteSettings<Record<string, string>>("template_assets_seed", activeStore.id);

  const { data: approvedReviews = [] } = useQuery({
    queryKey: ["crafts-homepage-reviews", activeStore.id],
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
  const trustBlock = getHomepageBlock<TrustBadgesProps>(blocks, "trust-badges");
  const categoryBlock = getHomepageBlock<FeaturedBlockProps>(blocks, "category-showcase");
  const featuredBlock = getHomepageBlock<FeaturedBlockProps>(blocks, "featured-products");
  const artisanStoryBlock = getHomepageBlock<RichTextBlockProps>(blocks, "rich-text");

  const availableProducts = useMemo(
    () => allProducts.filter((product) => product.isAvailable !== false),
    [allProducts],
  );
  const categoryNames = useMemo(
    () => pickCategoryNames(availableProducts, productCategories as CategoryLike[], productTypes as CategoryLike[]),
    [availableProducts, productCategories, productTypes],
  );
  const labelMode = useMemo(
    () => deriveLabelMode(activeStore, availableProducts, categoryNames),
    [activeStore, availableProducts, categoryNames],
  );
  const highlightedProducts = useMemo(
    () => matchFeaturedProducts(featuredProducts.length > 0 ? featuredProducts : availableProducts, featuredBlock),
    [availableProducts, featuredBlock, featuredProducts],
  );
  const collectionSpotlights = useMemo(
    () => buildCollectionSpotlights(availableProducts, activeStore.slug),
    [activeStore.slug, availableProducts],
  );
  const reviewStatsByProduct = useMemo(
    () => buildReviewStats(approvedReviews),
    [approvedReviews],
  );
  const trustItems = useMemo(
    () => buildTrustItems(activeStore.name, trustBlock, deliverySettings ?? undefined, contactSettings ?? undefined),
    [activeStore.name, contactSettings, deliverySettings, trustBlock],
  );

  const heroProducts = highlightedProducts.length > 0 ? highlightedProducts : availableProducts;
  const heroPrimaryImage = templateAssets?.hero_image_url ?? heroProducts[0]?.image ?? collectionSpotlights[0]?.image ?? null;
  const storyProduct = heroProducts[2] ?? heroProducts[0];

  const heroEyebrow = heroBlock?.tagline?.trim()
    || (labelMode === "bengali" ? "কারুশিল্প ও ঐতিহ্যের সংকলন" : "Handmade craft and heritage");
  const heroTitle = heroBlock?.title?.trim()
    || (labelMode === "bengali" ? "হাতে গড়া সৌন্দর্য," : "Handmade beauty,");
  const heroHighlight = heroBlock?.highlight?.trim()
    || (labelMode === "bengali" ? "বাংলার ঐতিহ্য" : "rooted in heritage");
  const heroSubtitle = heroBlock?.subtitle?.trim()
    || activeStore.description
    || "Launch an artisan-forward storefront with merchant-controlled storytelling, collections, delivery details, and live commerce data.";
  const heroCta = heroBlock?.ctaText?.trim() || (labelMode === "bengali" ? "এখনই দেখুন" : "Explore now");
  const heroSecondaryCta = heroBlock?.secondaryCtaText?.trim() || (labelMode === "bengali" ? "কলেকশন দেখুন" : "View collections");

  const storyEyebrow = artisanStoryBlock?.eyebrow?.trim()
    || (labelMode === "bengali" ? "আমাদের গল্প" : "Artisan story");
  const storyTitle = artisanStoryBlock?.title?.trim()
    || (labelMode === "bengali" ? "কারিগরের হাত, আপনার জন্য" : "Made by artisans, chosen for your home");
  const storyBody = extractPlainText(artisanStoryBlock?.body)
    || footerSettings?.about_text
    || activeStore.description
    || "Use this section to describe materials, making process, origin, and what makes the merchant's collection feel personal and trustworthy.";

  const newsletterHeading = footerSettings?.newsletter_heading?.trim()
    || (labelMode === "bengali" ? "নিউজলেটারে সাবস্ক্রাইব করুন" : "Stay close to new handmade arrivals");
  const newsletterDescription = footerSettings?.newsletter_description?.trim()
    || "Share launches, limited collections, fairs, and seasonal drops with visitors who want updates from this store.";
  const newsletterSuccess = footerSettings?.newsletter_subscribed?.trim()
    || (labelMode === "bengali" ? "আপনি সাবস্ক্রাইব করেছেন" : "You're subscribed.");

  return (
    <div className="bg-[#fcfaf6] text-[#2e251a] dark:bg-background dark:text-foreground">
      <section className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(43,154,90,0.12),_transparent_25%),radial-gradient(circle_at_top_right,_rgba(196,145,74,0.12),_transparent_30%),linear-gradient(180deg,_#fffdf9_0%,_#f9f4eb_100%)] dark:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)]">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-5 pb-14 pt-9 md:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-8 lg:px-10 lg:pb-16 lg:pt-12">
          <div className="max-w-[540px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{heroEyebrow}</p>
            <h1 className="mt-5 max-w-[12ch] text-[3rem] font-semibold leading-[1.03] tracking-[-0.05em] text-[#2e251a] dark:text-foreground sm:text-[4.45rem]">
              {heroTitle}{" "}
              <span className="text-primary">{heroHighlight}</span>
            </h1>
            <p className="mt-5 max-w-[43ch] text-base leading-8 text-[#6f5f4b] dark:text-muted-foreground sm:text-lg">
              {heroSubtitle}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={storefrontPath(heroBlock?.ctaLink || "/shop", activeStore.slug)}
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-[0_18px_36px_-18px_rgba(43,154,90,0.58)] transition-transform hover:-translate-y-0.5"
              >
                {heroCta}
              </Link>
              <Link
                href={storefrontPath(heroBlock?.secondaryCtaLink || "/shop", activeStore.slug)}
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#e7dac6] bg-white px-7 text-sm font-semibold text-[#4f4132] shadow-[0_16px_32px_-24px_rgba(71,54,35,0.22)] transition-colors hover:border-primary/35 dark:border-white/10 dark:bg-card dark:text-foreground"
              >
                {heroSecondaryCta}
              </Link>
            </div>
          </div>

          <div className="relative aspect-[16/10.5] w-full overflow-hidden rounded-[34px] border border-[#ebdfce] bg-white/70 p-3 shadow-[0_28px_70px_-46px_rgba(71,54,35,0.28)] backdrop-blur-sm dark:border-white/10 dark:bg-card/60">
            {heroPrimaryImage ? (
              <SafeStorefrontImage
                src={heroPrimaryImage}
                fallbackSrc={templateAssets?.fallback_product_image_url ?? null}
                fill
                sizes="(max-width: 1024px) 92vw, 46vw"
                alt={activeStore.name || "Craft collection"}
                className="object-cover rounded-[26px]"
              />
            ) : (
              <div className="aspect-[16/10.5] w-full rounded-[26px] bg-[#f9f4eb]" />
            )}
          </div>
        </div>
      </section>

      <section className="border-y border-[#efe6d9] bg-white/88 dark:border-white/10 dark:bg-card/30">
        <div className="mx-auto grid max-w-[1320px] gap-4 px-5 py-5 sm:grid-cols-2 md:px-8 lg:grid-cols-4 lg:px-10">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 rounded-[22px] border border-[#f0e7db] bg-[#fffdfa] px-4 py-4 dark:border-white/10 dark:bg-card">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#2e251a] dark:text-foreground">{item.label}</p>
                  <p className="mt-1 text-xs text-[#7b6a56] dark:text-muted-foreground">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
            {categoryBlock?.tagline?.trim() || (labelMode === "bengali" ? "বাছাই করা কারুশিল্প" : "Craft categories")}
          </p>
          <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-[#2e251a] dark:text-foreground sm:text-[2.5rem]">
            {categoryBlock?.title?.trim() || (labelMode === "bengali" ? "ক্যাটেগরি সমূহ" : "Browse by category")}
          </h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {categoryNames.map((category, index) => {
            const categoryProduct = pickCategoryProduct(availableProducts, category);
            return (
              <Link
                key={`${category}-${index}`}
                href={storefrontPath(`/shop?category=${encodeURIComponent(category)}`, activeStore.slug)}
                className="rounded-[22px] border border-[#eee2d2] bg-white p-3 shadow-[0_16px_32px_-28px_rgba(71,54,35,0.22)] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-card"
              >
                <div className="overflow-hidden rounded-[18px] bg-[#f5eee3] dark:bg-secondary/70">
                  {categoryProduct ? (
                    <img src={categoryProduct.image} alt={categoryProduct.name} className="aspect-[1/1] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[1/1] items-center justify-center text-primary">
                      <Sparkles className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <p className="mt-4 text-base font-semibold text-[#2e251a] dark:text-foreground">{category}</p>
                <p className="mt-1 text-xs text-[#7b6a56] dark:text-muted-foreground">
                  {categoryProduct?.type || "Merchant-managed collection"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {collectionSpotlights.length > 0 ? (
        <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
          <CraftsSectionHeading
            eyebrow={labelMode === "bengali" ? "জনপ্রিয় কালেকশন" : "Popular collections"}
            title={labelMode === "bengali" ? "জনপ্রিয় কালেকশন" : "Explore signature collections"}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {collectionSpotlights.map((collection) => (
              <Link
                key={collection.id}
                href={collection.href}
                className="group overflow-hidden rounded-[24px] border border-[#efe4d3] bg-white shadow-[0_18px_34px_-30px_rgba(71,54,35,0.2)] dark:border-white/10 dark:bg-card"
              >
                <div className="overflow-hidden bg-[#f4ecdf] dark:bg-secondary/70">
                  {collection.image ? (
                    <img src={collection.image} alt={collection.title} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center text-primary">
                      <Gem className="h-7 w-7" />
                    </div>
                  )}
                </div>
                <div className="px-5 pb-5 pt-4">
                  <p className="text-lg font-semibold text-[#2e251a] dark:text-foreground">{collection.title}</p>
                  <p className="mt-1 text-sm text-[#7b6a56] dark:text-muted-foreground">{collection.subtitle}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {labelMode === "bengali" ? "দেখুন" : "Explore"}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="overflow-hidden rounded-[30px] border border-[#ebdfce] bg-[#f6efe3] dark:border-white/10 dark:bg-secondary/70">
            {storyProduct?.image ? (
              <img
                src={storyProduct.image}
                srcSet={generateCloudinarySrcSet(storyProduct.image)}
                sizes="(max-width: 1024px) 92vw, 42vw"
                alt={storyProduct.name}
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-primary">
                <HandHeart className="h-8 w-8" />
              </div>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">{storyEyebrow}</p>
            <h2 className="mt-3 max-w-[14ch] text-[2.1rem] font-semibold tracking-tight text-[#2e251a] dark:text-foreground sm:text-[2.8rem]">
              {storyTitle}
            </h2>
            <p className="mt-5 text-base leading-8 text-[#6f5f4b] dark:text-muted-foreground">
              {storyBody}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {trustItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#2e251a] dark:text-foreground">{item.label}</p>
                      <p className="mt-1 text-xs leading-6 text-[#7b6a56] dark:text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-4 md:px-8 lg:px-10">
        <CraftsSectionHeading
          eyebrow={featuredBlock?.tagline?.trim() || (labelMode === "bengali" ? "নির্বাচিত পণ্য" : "Featured products")}
          title={featuredBlock?.title?.trim() || (labelMode === "bengali" ? "নির্বাচিত পণ্য" : "Featured handmade pieces")}
          actionLabel={labelMode === "bengali" ? "সব দেখুন" : "View all"}
          actionHref={storefrontPath("/shop", activeStore.slug)}
        />
        <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-4 lg:overflow-visible">
          {highlightedProducts.map((product) => (
            <CraftProductCard
              key={product.id}
              product={product}
              reviewStats={reviewStatsByProduct[product.id]}
              labelMode={labelMode}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 py-12 md:px-8 lg:px-10">
        <div className="overflow-hidden rounded-[30px] border border-[#e9ddcc] bg-[linear-gradient(180deg,#fffdfa_0%,#f8f3ea_100%)] shadow-[0_20px_46px_-34px_rgba(71,54,35,0.24)] dark:border-white/10 dark:bg-card">
          <div className="grid gap-6 px-5 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[#efe6d8] bg-white/88 px-4 py-5 dark:border-white/10 dark:bg-secondary/20">
                <Truck className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-semibold text-[#2e251a] dark:text-foreground">
                  {deliverySettings?.primary_zone_label || "Careful delivery"}
                </p>
                <p className="mt-1 text-xs leading-6 text-[#7b6a56] dark:text-muted-foreground">
                  {deliverySettings?.free_threshold
                    ? `Free delivery from ৳${deliverySettings.free_threshold.toLocaleString()}`
                    : "Delivery, pickup, and shipping messages stay merchant-controlled."}
                </p>
              </div>
              <div className="rounded-[22px] border border-[#efe6d8] bg-white/88 px-4 py-5 dark:border-white/10 dark:bg-secondary/20">
                <PackageCheck className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-semibold text-[#2e251a] dark:text-foreground">Handmade detail</p>
                <p className="mt-1 text-xs leading-6 text-[#7b6a56] dark:text-muted-foreground">
                  Materials, care, and collection framing can be updated by the merchant at any time.
                </p>
              </div>
              <div className="rounded-[22px] border border-[#efe6d8] bg-white/88 px-4 py-5 dark:border-white/10 dark:bg-secondary/20">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-semibold text-[#2e251a] dark:text-foreground">
                  {contactSettings?.phone ? "Merchant support" : "Trusted support"}
                </p>
                <p className="mt-1 text-xs leading-6 text-[#7b6a56] dark:text-muted-foreground">
                  {contactSettings?.phone || contactSettings?.email || "Support and policies remain store-specific."}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#efe4d2] bg-white/92 p-5 dark:border-white/10 dark:bg-secondary/20">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                {labelMode === "bengali" ? "নিউজলেটার" : "Newsletter"}
              </p>
              <h3 className="mt-3 text-[1.65rem] font-semibold tracking-tight text-[#2e251a] dark:text-foreground">
                {newsletterHeading}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#6f5f4b] dark:text-muted-foreground">
                {newsletterDescription}
              </p>
              <form
                className="mt-5 flex gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  setNewsletterSubmitted(true);
                }}
              >
                <input
                  type="email"
                  required
                  placeholder={labelMode === "bengali" ? "আপনার ইমেইল লিখুন" : "Enter your email"}
                  className="h-12 flex-1 rounded-full border border-[#e5d9c8] bg-[#fffdfa] px-4 text-sm text-[#2e251a] outline-none transition focus:border-primary dark:border-white/10 dark:bg-background dark:text-foreground"
                />
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_16px_32px_-18px_rgba(43,154,90,0.62)]"
                >
                  {labelMode === "bengali" ? "সাবস্ক্রাইব" : "Subscribe"}
                </button>
              </form>
              <p className={cn("mt-3 text-xs text-[#7b6a56] dark:text-muted-foreground", newsletterSubmitted ? "opacity-100" : "opacity-80")}>
                {newsletterSubmitted ? newsletterSuccess : "Use this to capture launch interest without changing the merchant's actual commerce data flow."}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
