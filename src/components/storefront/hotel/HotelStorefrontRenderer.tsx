"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, CalendarDays, Mail, MapPin, Phone, ShieldCheck, Sparkles, Star } from "lucide-react";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProductTypes } from "@/hooks/useProductTypes";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { AmenitiesGrid } from "@/components/storefront/hotel/AmenitiesGrid";
import { ExperienceGallery } from "@/components/storefront/hotel/ExperienceGallery";
import { HotelBookingBar } from "@/components/storefront/hotel/HotelBookingBar";
import { RoomProductCard } from "@/components/storefront/hotel/RoomProductCard";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/data/products";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
import type { TemplateSeedCatalogMetadata } from "@/lib/cms/template-demo-seeds";
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

type ContactSettings = {
  phone?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
  description?: string;
  response_time_text?: string;
  map_enabled?: boolean;
  map_embed_url?: string;
};

type FooterSettings = {
  about_text?: string;
  company_links?: Array<{ label?: string; url?: string }>;
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

function buildFaqs(entries: FaqEntry[], block: TestimonialBlockProps | undefined) {
  const siteFaqs = entries.filter((item) => item?.q?.trim() && item?.a?.trim());
  if (siteFaqs.length > 0) return siteFaqs as Array<{ q: string; a: string }>;
  const blockFaqs = (block?.reviews ?? [])
    .filter((item) => item?.name?.trim() && item?.comment?.trim())
    .slice(0, 4)
    .map((item) => ({ q: item.name!.trim(), a: item.comment!.trim() }));
  if (blockFaqs.length > 0) return blockFaqs;
  return [
    { q: "What time is check-in and check-out?", a: "Use the store FAQ settings to define timing, early check-in policy, and late check-out details for this property." },
    { q: "Do you support direct reservation requests?", a: "Yes. Guests can browse rooms, review details, and continue into the store's real contact flow to confirm availability." },
    { q: "Are amenities included with every room?", a: "Amenity availability can vary by room category and should be clarified inside each merchant-managed listing." },
    { q: "How do guests confirm special requests?", a: "Use the contact flow, WhatsApp, or the product detail page to share the guest's request before final confirmation." },
  ];
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function buildAmenityItems(products: Product[], metadata: TemplateSeedCatalogMetadata | undefined, contactSettings: ContactSettings | undefined) {
  const values = products.flatMap((product) => {
    const specs = metadata?.products?.[product.id]?.specs;
    return [
      ...getStringArray(specs?.amenities),
      ...getStringArray(specs?.features),
      ...getStringArray(specs?.services),
    ];
  });

  const unique = Array.from(new Set(values)).slice(0, 6);
  if (unique.length > 0) {
    return unique.map((title) => ({
      title,
      description: "Configured from the room or hotel seed details for this store.",
    }));
  }

  return [
    { title: "Free Wi-Fi", description: "High-speed access highlighted in the storefront and guest contact flow." },
    { title: "Flexible cancellation", description: "Publish real cancellation policy details through your FAQ and contact settings." },
    { title: "Secure booking", description: "Reservation inquiries stay scoped to the merchant and their live contact channels." },
    { title: "Dining options", description: contactSettings?.response_time_text?.trim() || "Show restaurant, breakfast, or room-service availability here." },
    { title: "Airport transfer", description: "Use this slot for transport, concierge, or pickup support if offered." },
    { title: "Guest support", description: contactSettings?.phone?.trim() || "Keep a direct phone number visible for pre-arrival questions." },
  ];
}

function buildCategoryNames(products: Product[], categories: Array<{ name?: string | null }>, types: Array<{ name?: string | null }>) {
  const categoryRows = Array.from(new Set(categories.map((item) => item.name?.trim()).filter((value): value is string => Boolean(value))));
  if (categoryRows.length > 0) return categoryRows.slice(0, 5);
  const typeRows = Array.from(new Set(types.map((item) => item.name?.trim()).filter((value): value is string => Boolean(value))));
  if (typeRows.length > 0) return typeRows.slice(0, 5);
  return Array.from(new Set(products.flatMap((product) => [product.category, product.type]).filter(Boolean))).slice(0, 5);
}

function buildGalleryImages(products: Product[], metadata: TemplateSeedCatalogMetadata | undefined, heroImage: string | null | undefined, promoImage: string | null | undefined) {
  const gallery = [
    heroImage,
    promoImage,
    ...products.flatMap((product) => [product.image, ...product.images, metadata?.products?.[product.id]?.imageUrls?.[1]]),
  ].filter(Boolean) as string[];

  return Array.from(new Set(gallery)).slice(0, 4).map((src, index) => ({
    src,
    alt: index === 0 ? "Hotel lobby or hero view" : `Hotel gallery ${index + 1}`,
  }));
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
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#285c46]">{eyebrow}</p>
      <h2 className="mt-3 font-serif text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-foreground sm:text-[2.6rem]">
        {title}
      </h2>
      {subtitle ? <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500 dark:text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

export function HotelStorefrontRenderer({
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
  const roomsRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => new Date(), []);
  const tomorrow = useMemo(() => new Date(today.getTime() + (24 * 60 * 60 * 1000)), [today]);
  const [checkIn, setCheckIn] = useState(today.toISOString().slice(0, 10));
  const [checkOut, setCheckOut] = useState(tomorrow.toISOString().slice(0, 10));
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);

  const { data: allProducts = [] } = useProducts(activeStore.id);
  const { data: featuredProducts = [] } = useFeaturedProducts(activeStore.id);
  const { data: productCategories = [] } = useProductCategories(activeStore.id);
  const { data: productTypes = [] } = useProductTypes(activeStore.id);
  const { data: contactSettings } = useSiteSettings<ContactSettings>("contact_page", activeStore.id);
  const { data: footerSettings } = useSiteSettings<FooterSettings>("footer", activeStore.id);
  const { data: templateAssets } = useSiteSettings<Record<string, string>>("template_assets_seed", activeStore.id);
  const { data: catalogSeedMetadata } = useSiteSettings<TemplateSeedCatalogMetadata>("catalog_seed_metadata", activeStore.id);
  const { data: faqEntries = [] } = useSiteSettings<FaqEntry[]>("faq_entries", activeStore.id);

  const { data: approvedReviews = [] } = useQuery({
    queryKey: ["hotel-storefront-reviews", activeStore.id],
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
  const roomProducts = useMemo(
    () => (featuredProducts.length > 0 ? featuredProducts : availableProducts).slice(0, featuredBlock?.limit ?? 4),
    [availableProducts, featuredBlock?.limit, featuredProducts],
  );
  const categoryNames = useMemo(() => buildCategoryNames(availableProducts, productCategories, productTypes), [availableProducts, productCategories, productTypes]);
  const reviewStats = useMemo(() => buildReviewStats(approvedReviews), [approvedReviews]);
  const amenityItems = useMemo(() => buildAmenityItems(availableProducts, catalogSeedMetadata ?? undefined, contactSettings ?? undefined), [availableProducts, catalogSeedMetadata, contactSettings]);
  const galleryImages = useMemo(
    () => buildGalleryImages(availableProducts, catalogSeedMetadata ?? undefined, templateAssets?.hero_image_url, templateAssets?.promo_image_url),
    [availableProducts, catalogSeedMetadata, templateAssets],
  );
  const faqs = useMemo(() => buildFaqs(faqEntries ?? [], testimonialBlock), [faqEntries, testimonialBlock]);

  const testimonials = approvedReviews.length > 0
    ? approvedReviews.filter((row) => row.review_text?.trim()).slice(0, 3).map((row, index) => ({
        id: row.id ?? `review-${index}`,
        name: row.author_name?.trim() || "Verified guest",
        rating: Math.max(1, Math.min(5, row.rating ?? 5)),
        comment: row.review_text?.trim() || "",
      }))
    : (testimonialBlock?.reviews ?? []).filter((item) => item?.comment?.trim()).slice(0, 3).map((item, index) => ({
        id: `fallback-${index}`,
        name: item?.name?.trim() || "Guest review",
        rating: Math.max(1, Math.min(5, item?.rating ?? 5)),
        comment: item?.comment?.trim() || "",
      }));

  const heroProduct = roomProducts[0] ?? availableProducts[0] ?? null;
  const heroTitle = heroBlock?.title?.trim() || "Stay. Relax.";
  const heroHighlight = heroBlock?.highlight?.trim() || "Unwind in Luxury";
  const heroSubtitle = heroBlock?.subtitle?.trim()
    || extractPlainText(richTextBlock?.body)
    || contactSettings?.description?.trim()
    || activeStore.description
    || "Present rooms, amenities, and guest confidence in a hospitality-first layout that still runs on your shared store data and routing.";
  const promoTitle = richTextBlock?.title?.trim() || "Summer Getaway Deal";
  const promoBody = footerSettings?.about_text?.trim() || "Use this section for seasonal packages, free breakfast, spa credit, or flexible booking offers configured by the merchant.";

  return (
    <div className="bg-[#fbfaf6] text-slate-950 dark:bg-background dark:text-foreground">
      <section className="overflow-hidden bg-[linear-gradient(180deg,#fffefb_0%,#f8f5ee_100%)] dark:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background))_100%)]">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-5 pb-8 pt-8 md:px-8 lg:grid-cols-[0.84fr_1.16fr] lg:items-center lg:px-10 lg:pb-10 lg:pt-10">
          <div className="max-w-[560px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#285c46]">{heroBlock?.tagline?.trim() || "Welcome to your next stay"}</p>
            <h1 className="mt-5 max-w-[10ch] font-serif text-[3rem] font-semibold leading-[1.02] tracking-[-0.04em] text-[#17392a] dark:text-foreground sm:text-[4.6rem]">
              {heroTitle} <span className="italic text-[#2f7b57]">{heroHighlight}</span>
            </h1>
            <p className="mt-5 max-w-[46ch] text-base leading-8 text-slate-600 dark:text-muted-foreground">{heroSubtitle}</p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => roomsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#285c46] px-6 text-sm font-semibold text-white shadow-[0_18px_34px_-18px_rgba(40,92,70,0.56)]"
              >
                {heroBlock?.ctaText?.trim() || "Book Now"}
              </button>
              <Link
                href={storefrontPath("/shop", activeStore.slug)}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[#d9e4dc] bg-white px-6 text-sm font-semibold text-slate-800 dark:border-white/10 dark:bg-card dark:text-foreground"
              >
                {heroBlock?.secondaryCtaText?.trim() || "View Rooms"}
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-5 text-sm text-slate-600 dark:text-muted-foreground">
              {[
                "5-Star Comfort",
                "Prime Location",
                "Award-Winning Service",
              ].map((item) => (
                <div key={item} className="inline-flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-[#285c46]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative aspect-[16/11] w-full overflow-hidden rounded-[34px] border border-[#e6ece7] bg-white shadow-[0_28px_70px_-44px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-card">
            {heroProduct ? (
              <SafeStorefrontImage
                src={templateAssets?.hero_image_url ?? heroProduct.image}
                fallbackSrc={templateAssets?.fallback_product_image_url ?? catalogSeedMetadata?.products?.[heroProduct.id]?.imageUrl ?? null}
                fill
                sizes="(max-width: 1024px) 92vw, 52vw"
                alt={heroProduct.name}
                className="object-cover"
              />
            ) : (
              <div className="aspect-[16/11] w-full bg-[#edf4ef]" />
            )}
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] px-5 pb-12 md:px-8 lg:px-10">
          <HotelBookingBar
            checkIn={checkIn}
            checkOut={checkOut}
            guests={guests}
            rooms={rooms}
            onCheckInChange={setCheckIn}
            onCheckOutChange={setCheckOut}
            onGuestsChange={setGuests}
            onRoomsChange={setRooms}
            onSubmit={() => roomsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-4 md:px-8 lg:px-10">
        <div className="grid gap-4 rounded-[28px] border border-[#dfe8e1] bg-white px-4 py-5 shadow-[0_18px_38px_-32px_rgba(15,23,42,0.15)] sm:grid-cols-2 xl:grid-cols-4 lg:px-6 dark:border-white/10 dark:bg-card">
          {[
            { label: "Best Rate Guarantee", body: "Present merchant-managed pricing with direct contact for final confirmation." },
            { label: "Free Cancellation", body: "Use FAQ and policy pages to explain timing, cutoffs, and exceptions." },
            { label: "Secure Booking", body: "Reservation requests stay scoped to this hotel storefront and merchant inbox." },
            { label: "24/7 Guest Support", body: contactSettings?.phone?.trim() || contactSettings?.email?.trim() || "Keep phone and email visible for guests." },
          ].map((item) => (
            <div key={item.label} className="rounded-[20px] border border-[#eef2ee] bg-[#fbfcfb] px-4 py-4 dark:border-white/10 dark:bg-secondary/20">
              <p className="text-base font-semibold text-slate-950 dark:text-foreground">{item.label}</p>
              <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-12 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow={categoryBlock?.tagline?.trim() || "Choose your stay"}
          title={categoryBlock?.title?.trim() || "Explore Our Room Categories"}
          subtitle="Use real categories or product types to keep room discovery flexible across different hotel setups."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {categoryNames.map((category, index) => (
            <Link
              key={`${category}-${index}`}
              href={storefrontPath(`/shop?category=${encodeURIComponent(category)}`, activeStore.slug)}
              className="rounded-[24px] border border-[#dfe8e1] bg-white p-5 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.15)] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-card"
            >
              <div className="mb-4 inline-flex rounded-full bg-[#edf4ef] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#285c46]">
                Category
              </div>
              <h3 className="font-serif text-[1.4rem] font-semibold text-slate-950 dark:text-foreground">{category}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-muted-foreground">Real categories from this store, ready to route into room discovery.</p>
            </Link>
          ))}
        </div>
      </section>

      <section ref={roomsRef} className="mx-auto max-w-[1400px] px-5 py-4 md:px-8 lg:px-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <SectionHeading
            eyebrow={featuredBlock?.tagline?.trim() || "Featured rooms"}
            title={featuredBlock?.title?.trim() || "Handpicked Rooms for You"}
            subtitle="Featured products become room listings here without splitting away from your shared product detail flow."
          />
          <Link href={storefrontPath("/shop", activeStore.slug)} className="hidden text-sm font-semibold text-[#285c46] lg:inline-flex lg:items-center lg:gap-2">
            View All Rooms
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {roomProducts.map((product) => (
            <RoomProductCard
              key={product.id}
              product={product}
              metadata={catalogSeedMetadata?.products?.[product.id]}
              reviewStats={reviewStats[product.id]}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-12 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Premium amenities"
          title="Everything You Need for a Perfect Stay"
        />
        <AmenitiesGrid items={amenityItems} />
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-2 md:px-8 lg:px-10">
        <div className="grid gap-5 overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#1f513e_0%,#285c46_52%,#346b53_100%)] p-6 text-white shadow-[0_24px_54px_-34px_rgba(15,23,42,0.34)] lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#dce9d8]">Limited time offer</p>
            <h3 className="mt-3 font-serif text-[2.35rem] font-semibold tracking-tight">{promoTitle}</h3>
            <p className="mt-3 max-w-[46ch] text-sm leading-7 text-[#dce8df]">{promoBody}</p>
            <Link href={storefrontPath("/contact", activeStore.slug)} className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-[#285c46]">
              Book Now & Save
            </Link>
          </div>
          <div className="relative aspect-[16/8.4] w-full overflow-hidden rounded-[24px] border border-white/10 bg-white/10">
            <SafeStorefrontImage
              src={templateAssets?.promo_image_url ?? galleryImages[1]?.src}
              fallbackSrc={templateAssets?.fallback_product_image_url ?? null}
              fill
              sizes="(max-width: 1024px) 92vw, 48vw"
              alt="Hotel promotion"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-12 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Experience the stay"
          title="Moments to Remember"
        />
        <ExperienceGallery
          images={galleryImages}
          fallbackSrc={templateAssets?.fallback_product_image_url ?? null}
        />
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-4 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow={testimonialBlock?.subtitle?.trim() || "Guest reviews"}
          title={testimonialBlock?.title?.trim() || "What Our Guests Say"}
        />
        <div className="grid gap-5 xl:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="rounded-[24px] border border-[#dfe8e1] bg-white p-6 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.15)] dark:border-white/10 dark:bg-card">
              <div className="flex items-center gap-1 text-[#f4bf53]">
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

      <section className="mx-auto max-w-[1400px] px-5 py-12 md:px-8 lg:px-10">
        <SectionHeading
          eyebrow="FAQs"
          title="Frequently Asked Questions"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {faqs.slice(0, 6).map((faq, index) => (
            <details key={`${faq.q}-${index}`} className="rounded-[20px] border border-[#dfe8e1] bg-white px-5 py-4 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-card">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950 dark:text-foreground">{faq.q}</summary>
              <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-muted-foreground">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-4 md:px-8 lg:px-10">
        <div className="grid gap-5 lg:grid-cols-[0.62fr_0.38fr]">
          <div className="rounded-[28px] border border-[#dfe8e1] bg-white p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card">
            <SectionHeading
              eyebrow="Visit us"
              title="Location and Contact"
              subtitle="Keep direct contact details, location context, and guest support visible before the booking request."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex gap-3">
                <MapPin className="mt-1 h-5 w-5 text-[#285c46]" />
                <div>
                  <p className="font-semibold text-slate-950 dark:text-foreground">Location</p>
                  <p className="text-sm leading-7 text-slate-500 dark:text-muted-foreground">{contactSettings?.address?.trim() || "Add your hotel address in Site Settings to complete this section."}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Phone className="mt-1 h-5 w-5 text-[#285c46]" />
                <div>
                  <p className="font-semibold text-slate-950 dark:text-foreground">Phone</p>
                  <p className="text-sm leading-7 text-slate-500 dark:text-muted-foreground">{contactSettings?.phone?.trim() || "Add a direct reservation phone number."}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Mail className="mt-1 h-5 w-5 text-[#285c46]" />
                <div>
                  <p className="font-semibold text-slate-950 dark:text-foreground">Email</p>
                  <p className="text-sm leading-7 text-slate-500 dark:text-muted-foreground">{contactSettings?.email?.trim() || "Add your reservations email in Site Settings."}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 text-[#285c46]" />
                <div>
                  <p className="font-semibold text-slate-950 dark:text-foreground">Front desk support</p>
                  <p className="text-sm leading-7 text-slate-500 dark:text-muted-foreground">{contactSettings?.response_time_text?.trim() || "Use contact settings to describe reservation response time and desk hours."}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#dfe8e1] bg-[linear-gradient(180deg,#f5f8f4_0%,#eef4ef_100%)] p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#285c46]">Stay in the loop</p>
            <h3 className="mt-3 font-serif text-[2rem] font-semibold tracking-tight text-slate-950 dark:text-foreground">Newsletter</h3>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-muted-foreground">
              Use the store email, contact page, or a future newsletter integration to keep guests updated on offers and stay packages.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={contactSettings?.email ? `mailto:${contactSettings.email}` : storefrontPath("/contact", activeStore.slug)}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#285c46] px-5 text-sm font-semibold text-white"
              >
                Subscribe
              </Link>
              <Link
                href={storefrontPath("/contact", activeStore.slug)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d6e2d9] bg-white px-5 text-sm font-semibold text-slate-800 dark:border-white/10 dark:bg-card dark:text-foreground"
              >
                Contact Hotel
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
