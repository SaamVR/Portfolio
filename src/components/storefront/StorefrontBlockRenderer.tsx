import Link from "next/link";
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CountdownTimer } from "@/components/CountdownTimer";
import CategoryShowcase from "@/components/CategoryShowcase";
import FeaturedProducts from "@/components/FeaturedProducts";
import HeroSection from "@/components/HeroSection";
import PromoBanner from "@/components/PromoBanner";
import RecentlyViewed from "@/components/RecentlyViewed";
import ErrorBoundary from "@/components/ErrorBoundary";
import { BlogHomepageWidget } from "@/components/storefront/blog/BlogHomepageWidget";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { StorefrontCompositionRenderer } from "@/components/storefront/platform/StorefrontCompositionRenderer";
import { StorefrontSectionEmpty, StorefrontSectionError, StorefrontSectionSkeleton } from "@/components/storefront/StorefrontSectionState";
import { buildTechnicalSpecs } from "@/components/storefront/electronics/ElectronicsProductCard";
import type { RichTextDoc, RichTextNode, StorePageBlock } from "@/lib/cms/schema";
import type { StorefrontTemplateDefinition } from "@/lib/cms/storefront-templates";
import { parseLegacyStringToDoc } from "@/lib/cms/rich-text-adapter";
import { AlertTriangle, BadgeCheck, CreditCard, Headset, Instagram, Play, ShieldCheck, Star, Truck, Undo2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useFeaturedProducts, useProducts, useProduct } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/auth-context";
import { useParams } from "@/lib/react-router-dom-shim";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeStoreBlockCustomCss, sanitizeStoreBlockCustomHtml } from "@/lib/cms/validation";
import { getSharedBlockPresetProps } from "@/lib/cms/storefront-shared-block-presets";
import { resolveStorefrontImageObjectPosition } from "@/lib/cms/storefront-media";
import { extractIdFromSlug, productUrl, storefrontPath } from "@/lib/slug";

function renderRichTextNodes(nodes?: RichTextNode[]): React.ReactNode {
  if (!nodes || !Array.isArray(nodes)) return null;

  return nodes.map((node, i) => {
    switch (node.type) {
      case "paragraph":
        return <p key={i} className="text-base leading-8 text-muted-foreground md:text-lg">{renderRichTextNodes(node.content)}</p>;
      case "heading": {
        const level = (node.attrs?.level as number) || 2;
        if (level === 1) return <h2 key={i} className="mt-4 mb-2 font-heading text-2xl font-bold text-foreground">{renderRichTextNodes(node.content)}</h2>;
        if (level === 3) return <h4 key={i} className="mt-3 mb-1 font-heading text-lg font-bold text-foreground">{renderRichTextNodes(node.content)}</h4>;
        return <h3 key={i} className="mt-4 mb-2 font-heading text-xl font-bold text-foreground">{renderRichTextNodes(node.content)}</h3>;
      }
      case "bulletList":
        return (
          <div key={i} className="mt-6 grid gap-3 sm:grid-cols-2">
            {node.content?.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-2xl border border-border bg-card/70 px-4 py-4 text-left shadow-sm">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm font-medium leading-6 text-foreground">{renderRichTextNodes(item.content)}</span>
              </div>
            ))}
          </div>
        );
      case "orderedList":
        return <ol key={i} className="mt-4 list-decimal space-y-2 pl-6 text-foreground">{renderRichTextNodes(node.content)}</ol>;
      case "listItem":
        return <span key={i}>{renderRichTextNodes(node.content)}</span>;
      case "text": {
        let textElement: React.ReactNode = node.text || "";
        if (node.marks) {
          for (const mark of node.marks) {
            if (mark.type === "bold") textElement = <strong>{textElement}</strong>;
            else if (mark.type === "italic") textElement = <em>{textElement}</em>;
            else if (mark.type === "code") textElement = <code className="rounded bg-muted px-1 py-0.5 text-sm">{textElement}</code>;
          }
        }
        return <span key={i}>{textElement}</span>;
      }
      default:
        return renderRichTextNodes(node.content);
    }
  });
}

function RichTextBlock({
  eyebrow,
  title = "Our story",
  body = "",
  align = "center",
  layoutVariant,
  imageUrl,
  imageAlt,
  imagePosition,
  focalX,
  focalY,
  templateId,
}: {
  eyebrow?: string;
  title?: string;
  body?: RichTextDoc | string;
  align?: "left" | "center";
  layoutVariant?: string;
  imageUrl?: string;
  imageAlt?: string;
  imagePosition?: string;
  focalX?: number;
  focalY?: number;
  templateId?: string;
}) {
  const isFashion = templateId === "fashion";
  const textAlignClass = align === "left" ? "text-left" : "text-center";
  const contentAlignClass = align === "left" ? "mr-auto" : "mx-auto";
  const doc = typeof body === "string" ? parseLegacyStringToDoc(body) : (body || { type: "doc", content: [] });
  const isBrandStory = layoutVariant === "brand-story";
  const objectPosition = resolveStorefrontImageObjectPosition({ position: imagePosition, focalX, focalY });

  const storyCopy = (
    <div className={isFashion && isBrandStory ? "max-w-2xl text-left" : `max-w-3xl ${isBrandStory ? "" : contentAlignClass} ${isBrandStory ? "text-left" : textAlignClass}`}>
      {eyebrow ? <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</p> : null}
      <h2 className={isFashion && isBrandStory ? "font-heading text-4xl font-semibold leading-[1.02] tracking-tight text-foreground md:text-6xl" : "font-heading text-3xl font-bold tracking-tight text-foreground md:text-5xl"}>{title}</h2>
      <div className="mt-5 space-y-4">{renderRichTextNodes(doc.content)}</div>
    </div>
  );

  if (isBrandStory) {
    return (
      <section className={isFashion ? "border-y border-border py-12 md:py-20" : "py-14 md:py-24"}>
        <div className={isFashion ? "container mx-auto grid gap-8 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16" : "container mx-auto grid gap-8 px-4 lg:grid-cols-2 lg:items-center lg:gap-12"}>
          <div className={isFashion ? "relative aspect-[4/5] overflow-hidden bg-muted" : "relative aspect-[4/3] overflow-hidden rounded-3xl border border-border bg-muted"}>
            {imageUrl ? (
              <SafeStorefrontImage src={imageUrl} fill alt={imageAlt || title} className="object-cover" style={{ objectPosition }} />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/15 via-muted to-background text-sm text-muted-foreground">Add a brand image</div>
            )}
          </div>
          {storyCopy}
        </div>
      </section>
    );
  }

  return (
    <section className="py-14 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">{storyCopy}</div>
      </div>
    </section>
  );
}

function SocialFeedBlock({
  title,
  subtitle,
  images,
  layoutVariant,
  templateId,
}: {
  title?: string;
  subtitle?: string;
  images?: string[];
  layoutVariant?: string;
  templateId?: string;
}) {
  const isFashion = templateId === "fashion";
  const displayImages = (images ?? []).filter((image) => typeof image === "string" && image.trim());

  if (displayImages.length === 0) {
    return <StorefrontSectionEmpty eyebrow="Gallery" title={title || "Visual stories are coming soon"} description="This space is ready for real brand, press, transformation, or social imagery." />;
  }

  if (layoutVariant === "logo-strip") {
    return (
      <section className="border-y border-border bg-secondary/20 py-8 md:py-10">
        <div className="container mx-auto px-4">
          {title ? <h2 className="mb-6 text-center font-heading text-xl font-semibold text-foreground">{title}</h2> : null}
          <div className="flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:justify-center md:overflow-visible">
            {displayImages.map((src, index) => (
              <div key={`${src}-${index}`} className="flex h-20 min-w-[150px] snap-center items-center justify-center rounded-2xl border border-border bg-card px-5 md:min-w-[170px]">
                <img src={src} alt={`Brand or press logo ${index + 1}`} className="max-h-10 max-w-full object-contain opacity-75" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (layoutVariant === "before-after") {
    const before = displayImages[0];
    const after = displayImages[1] ?? displayImages[0];
    return (
      <section className="bg-background py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold text-foreground">{title || "Before & after"}</h2>
            {subtitle ? <p className="mt-3 text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2 sm:gap-4">
            {[{ label: "Before", src: before }, { label: "After", src: after }].map((item) => (
              <figure key={item.label} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="aspect-[4/5] overflow-hidden"><img src={item.src} alt={item.label} className="h-full w-full object-cover" loading="lazy" /></div>
                <figcaption className="px-4 py-3 text-center text-sm font-semibold text-foreground">{item.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={isFashion ? "bg-background py-12 md:py-20" : "bg-background py-14 md:py-20"}>
      <div className="container mx-auto px-4">
        <div className={isFashion ? "mb-7 flex items-end justify-between gap-6 border-b border-border pb-4 md:mb-9" : "mb-8 text-center md:mb-10"}>
          <div>
            {!isFashion ? <Instagram className="mx-auto mb-3 h-6 w-6 text-muted-foreground" /> : <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary md:text-xs">Lookbook</p>}
            <h2 className={isFashion ? "font-heading text-3xl font-semibold tracking-tight text-foreground md:text-5xl" : "font-heading text-2xl font-bold"}>{title || (isFashion ? "On the street" : "Follow Us")}</h2>
            {subtitle ? <p className={isFashion ? "mt-2 max-w-2xl text-sm leading-6 text-muted-foreground" : "mt-2 text-muted-foreground"}>{subtitle}</p> : null}
          </div>
        </div>
        <div className={isFashion ? "grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-4" : "mx-auto grid max-w-5xl grid-cols-2 gap-2 md:grid-cols-4 md:gap-4"}>
          {displayImages.map((src, i) => (
            <div key={`${src}-${i}`} className={isFashion ? "group relative aspect-[4/5] overflow-hidden bg-muted" : "group relative aspect-square overflow-hidden rounded-xl bg-muted md:rounded-2xl"}>
              <img src={src} alt={`Gallery item ${i + 1}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VideoReelBlock({ title, videoUrl, ctaText, ctaLink }: { title?: string; videoUrl?: string; ctaText?: string; ctaLink?: string }) {
  const currentStore = useOptionalStore();
  const isEmbed = Boolean(videoUrl && (videoUrl.includes("youtube.com/embed") || videoUrl.includes("player.vimeo.com")));

  return (
    <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden bg-foreground py-12 text-background md:min-h-[80vh] md:py-24">
      {isEmbed ? (
        <iframe src={videoUrl} title={title || "Video highlight"} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute inset-0 h-full w-full opacity-70" />
      ) : videoUrl ? (
        <video src={videoUrl} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-60" />
      ) : (
        <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-black"><Play className="h-16 w-16 text-white/20" /></div>
      )}
      <div className="container relative z-10 mx-auto max-w-2xl px-4 text-center">
        {title ? <h2 className="mb-6 font-heading text-4xl font-bold tracking-tight text-white drop-shadow-lg md:text-6xl">{title}</h2> : null}
        {ctaText ? <Button asChild size="lg" className="rounded-full bg-white text-black shadow-xl hover:bg-white/90"><Link href={storefrontPath(ctaLink || "#", currentStore?.slug)}>{ctaText}</Link></Button> : null}
      </div>
    </section>
  );
}

type TrustBadge = { label: string; description?: string; icon?: "truck" | "payment" | "returns" | "support" | "shield" };

function TrustBadgesBlock({ title, badges, layoutVariant, templateId }: { title?: string; badges?: TrustBadge[]; layoutVariant?: string; templateId?: string }) {
  const isFashion = templateId === "fashion";
  const displayBadges = (badges ?? []).filter((badge) => typeof badge?.label === "string" && badge.label.trim());
  if (displayBadges.length === 0) return null;

  const iconMap = { truck: Truck, payment: CreditCard, returns: Undo2, support: Headset, shield: ShieldCheck };

  if (layoutVariant === "stats") {
    return (
      <section className="border-y border-border bg-secondary/25 py-10 md:py-14">
        <div className="container mx-auto px-4">
          {title ? <h2 className="mb-7 text-center font-heading text-2xl font-bold text-foreground md:text-3xl">{title}</h2> : null}
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 md:grid-cols-4">
            {displayBadges.slice(0, 4).map((badge) => (
              <div key={`${badge.label}-${badge.description}`} className="rounded-2xl border border-border bg-card px-4 py-6 text-center shadow-sm">
                <p className="font-heading text-3xl font-black tracking-tight text-primary md:text-4xl">{badge.label}</p>
                {badge.description ? <p className="mt-2 text-xs leading-5 text-muted-foreground sm:text-sm">{badge.description}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={isFashion ? "border-y border-border bg-background py-8 md:py-10" : "border-y border-border bg-secondary/35 py-10 md:py-14"}>
      <div className="container mx-auto px-4">
        {title ? <h2 className={isFashion ? "mb-7 font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl" : "mb-7 text-center font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl"}>{title}</h2> : null}
        <div className={isFashion ? "mx-auto grid max-w-7xl grid-cols-2 gap-0 border-l border-t border-border lg:grid-cols-4" : "mx-auto grid max-w-6xl grid-cols-2 gap-3 lg:grid-cols-3"}>
          {displayBadges.map((badge) => {
            const Icon = iconMap[badge.icon ?? "shield"];
            return (
              <div key={badge.label} className={isFashion ? "flex min-h-[116px] flex-col gap-3 border-b border-r border-border bg-background px-4 py-5 sm:px-5" : "flex min-h-[116px] flex-col gap-3 rounded-lg border border-border bg-card px-4 py-5 shadow-sm sm:flex-row sm:px-5"}>
                <div className={isFashion ? "flex h-9 w-9 shrink-0 items-center justify-center text-primary" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"}><Icon className="h-5 w-5" /></div>
                <div><p className="font-heading text-sm font-bold text-foreground sm:text-base">{badge.label}</p>{badge.description ? <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">{badge.description}</p> : null}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type Testimonial = { name?: string; rating?: number; comment: string };

function TestimonialsBlock({
  title,
  subtitle,
  reviews,
  source = "manual",
  limit = 6,
  templateId,
}: {
  title?: string;
  subtitle?: string;
  reviews?: Testimonial[];
  source?: "manual" | "live" | string;
  limit?: number;
  templateId?: string;
}) {
  const isFashion = templateId === "fashion";
  const currentStore = useOptionalStore();
  const { data: products = [] } = useProducts(currentStore?.id);
  const productIds = useMemo(() => products.map((product) => product.id).filter(Boolean).slice(0, 100), [products]);
  const liveQuery = useQuery({
    queryKey: ["storefront-live-testimonials", currentStore?.id, productIds.join(","), limit],
    enabled: source === "live" && productIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("public_product_reviews")
        .select("id,author_name,rating,review_text,created_at,product_id")
        .in("product_id", productIds)
        .order("created_at", { ascending: false })
        .limit(Math.min(Math.max(limit, 1), 12));
      if (error) throw error;
      return (data ?? []).map((review: any) => {
        const name = typeof review.author_name === "string" && review.author_name.trim() ? review.author_name.trim() : undefined;
        const rawRating = Number(review.rating);
        const rating = Number.isFinite(rawRating) && rawRating >= 1 && rawRating <= 5 ? rawRating : undefined;
        return {
          name,
          rating,
          comment: typeof review.review_text === "string" ? review.review_text : "",
        } satisfies Testimonial;
      }).filter((review: Testimonial) => review.comment.trim());
    },
    staleTime: 120_000,
  });

  if (source === "live" && liveQuery.isLoading) return <StorefrontSectionSkeleton title={title || "Loading customer reviews"} cards={3} />;
  if (source === "live" && liveQuery.isError) {
    return (
      <StorefrontSectionError
        title={title || "Customer reviews could not load"}
        description="Approved customer reviews are temporarily unavailable. The rest of the storefront is still available."
        onRetry={() => void liveQuery.refetch()}
      />
    );
  }

  const displayReviews: Testimonial[] = source === "live" ? (liveQuery.data ?? []) : (reviews ?? []);
  if (displayReviews.length === 0) {
    return <StorefrontSectionEmpty eyebrow="Customer proof" title={title || "Customer stories are coming soon"} description={source === "live" ? "Approved customer reviews will appear here automatically." : "This section is ready for real testimonials when the merchant adds them."} />;
  }

  return (
    <section className="overflow-hidden bg-background py-12 md:py-24">
      <div className="container mx-auto px-4">
        <div className={isFashion ? "mb-8 max-w-3xl md:mb-10" : "mx-auto mb-8 max-w-2xl text-center md:mb-10"}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Social proof</p>
          <h2 className={isFashion ? "mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground md:text-5xl" : "mt-3 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl"}>{title || "Customers are talking"}</h2>
          {subtitle ? <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">{subtitle}</p> : null}
        </div>
        <div className="mx-auto flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6 md:grid md:max-w-6xl md:grid-cols-3 md:overflow-visible md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {displayReviews.slice(0, limit).map((review, index) => (
            <article key={`${review.name ?? "review"}-${index}`} className={isFashion ? "flex min-h-[220px] min-w-[82vw] snap-center flex-col justify-between border-y border-border bg-background p-6 sm:min-w-[340px] md:min-w-0" : "flex min-h-[220px] min-w-[82vw] snap-center flex-col justify-between rounded-lg border border-border bg-card p-6 shadow-sm sm:min-w-[340px] md:min-w-0"}>
              <div>
                {typeof review.rating === "number" && Number.isFinite(review.rating) && review.rating >= 1 && review.rating <= 5 ? (
                  <div className="mb-5 flex items-center gap-1 text-accent" aria-label={`${review.rating.toFixed(1)} out of 5`}>
                    {Array.from({ length: Math.round(review.rating) }).map((_, starIndex) => <Star key={starIndex} className="h-4 w-4 fill-current" aria-hidden="true" />)}
                  </div>
                ) : null}
                <p className="text-base leading-7 text-foreground">“{review.comment}”</p>
              </div>
              {review.name ? <p className="mt-6 text-sm font-semibold text-muted-foreground">{review.name}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqAccordionBlock({ title, subtitle, faqs, templateId }: { title?: string; subtitle?: string; faqs?: { q: string; a: string }[]; templateId?: string }) {
  const isFashion = templateId === "fashion";
  const displayFaqs = faqs?.length ? faqs : [];
  if (displayFaqs.length === 0) return <StorefrontSectionEmpty eyebrow="FAQ" title={title || "Questions and answers are coming soon"} description="Add the questions customers ask most often so they can decide without leaving the page." />;

  return (
    <section className="bg-background py-12 md:py-24">
      <div className="container mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[0.9fr_minmax(0,1.1fr)] lg:items-start lg:gap-10">
        <div className={isFashion ? "border-t border-border pt-6" : "rounded-3xl border border-border bg-card p-6 md:p-8"}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Customer confidence</p>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title || "Frequently Asked Questions"}</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">{subtitle || "Answer the practical questions customers ask right before they decide to act."}</p>
        </div>
        <Accordion type="single" collapsible className="w-full space-y-3">
          {displayFaqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="overflow-hidden rounded-2xl border border-border bg-card px-4 md:px-5">
              <AccordionTrigger className="py-4 text-left text-[15px] font-medium leading-relaxed transition-colors hover:text-primary md:text-base">{faq.q}</AccordionTrigger>
              <AccordionContent className="leading-relaxed text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function ComparisonBlock({
  title,
  tagline,
  source,
  category,
  productType,
  limit,
  ctaText,
}: {
  title?: string;
  tagline?: string;
  source?: "featured-or-all" | "featured" | "all" | "newest" | "category" | "type";
  category?: string;
  productType?: string;
  limit?: number;
  ctaText?: string;
}) {
  const currentStore = useOptionalStore();
  const storeId = currentStore?.id ?? "";
  const storeSlug = currentStore?.slug;
  const { data: allProducts = [], isLoading: allProductsLoading } = useProducts(storeId);
  const { data: featuredProducts = [], isLoading: featuredProductsLoading } = useFeaturedProducts(storeId);

  const productsToCompare = useMemo(() => {
    const availableProducts = allProducts.filter((product) => product.isAvailable !== false);
    let filtered = [...(featuredProducts.length > 0 ? featuredProducts : availableProducts)];
    if (source === "featured") filtered = filtered.filter((product) => product.featured);
    if (source === "category" && category) filtered = filtered.filter((product) => product.category.toLowerCase() === category.toLowerCase());
    if (source === "type" && productType) filtered = filtered.filter((product) => product.type?.toLowerCase() === productType.toLowerCase());
    if ((source === "featured-or-all" || source === "featured") && filtered.length === 0) filtered = [...availableProducts];
    return filtered.slice(0, Math.min(Math.max(limit ?? 2, 2), 4));
  }, [allProducts, category, featuredProducts, limit, productType, source]);

  if (allProductsLoading || featuredProductsLoading) {
    return <StorefrontSectionSkeleton title={title || "Loading comparison"} cards={2} />;
  }
  if (productsToCompare.length < 2) {
    return (
      <StorefrontSectionEmpty
        eyebrow="Comparison"
        title={title || "Add another item to compare"}
        description="This section needs at least two matching items before a useful side-by-side comparison can be shown."
        primaryLabel="Browse store"
        primaryHref={storefrontPath("/shop", storeSlug)}
      />
    );
  }

  return (
    <section className="bg-background py-14 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{tagline || "Compare before you buy"}</p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title || "Quick product comparison"}</h2>
        </div>
        <div className="mx-auto grid max-w-6xl gap-4 xl:grid-cols-2">
          {productsToCompare.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <div className="grid gap-5 p-5 sm:grid-cols-[220px_1fr]">
                <div className="flex aspect-[4/3] items-center justify-center rounded-[24px] bg-secondary/40 p-5"><img src={product.image} alt={product.name} className="h-full w-full object-contain" /></div>
                <div>
                  <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{product.category || product.type || "Product"}</span>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{product.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{product.description}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">{buildTechnicalSpecs(product).map((spec) => <div key={spec} className="rounded-2xl border border-border bg-secondary/30 px-3 py-3 text-xs text-muted-foreground sm:text-sm">{spec}</div>)}</div>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <p className="text-[1.2rem] font-bold text-primary sm:text-[1.35rem]">৳{product.price.toLocaleString()}</p>
                    <Button asChild variant="outline" className="ml-auto"><Link href={productUrl(product.id, product.name, storeSlug)}>{ctaText || "View details"}</Link></Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StorefrontBlockRenderer({ block, template }: { block: StorePageBlock; template?: StorefrontTemplateDefinition }) {
  const currentStore = useOptionalStore();
  const { slugId } = useParams();
  const productId = slugId ? extractIdFromSlug(slugId as string) : undefined;
  const { data: currentProduct } = useProduct(productId, currentStore?.id);
  const { user } = useAuth();

  if ((block.isVisible ?? block.visible ?? true) === false) return null;

  const BlockFallback = (
    <div className="m-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-destructive/20 bg-destructive/5 p-6 py-12 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-destructive/60" />
      <h3 className="text-sm font-semibold text-destructive/80">Failed to load block</h3>
      <p className="mt-1 text-xs text-muted-foreground">Block type: {block.type}</p>
    </div>
  );

  const dataContext = {
    store: { name: currentStore?.name || "Store", meta_description: currentStore?.description || currentStore?.siteSettings?.meta_description || "" },
    product: { price: currentProduct ? `BDT ${currentProduct.price.toLocaleString()}` : "", inventory_count: currentProduct ? String(currentProduct.stock) : "", name: currentProduct?.name || "", description: currentProduct?.description || "" },
    customer: { name: user?.user_metadata?.full_name || user?.email || "" },
  };

  const resolveTags = (obj: any): any => {
    if (typeof obj === "string") {
      return obj.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const keys = path.trim().split(".");
        let current: any = dataContext;
        for (const key of keys) {
          if (current === undefined || current === null) return match;
          current = current[key];
        }
        return current !== undefined ? String(current) : match;
      });
    }
    if (Array.isArray(obj)) return obj.map((item) => resolveTags(item));
    if (typeof obj === "object" && obj !== null) {
      const newObj: any = {};
      for (const key in obj) newObj[key] = resolveTags(obj[key]);
      return newObj;
    }
    return obj;
  };

  const resolvedProps = resolveTags(block.props);
  const blockLayoutVariant = block.layoutVariant ?? template?.presentation.blockLayoutVariants?.[block.type];
  const presetProps = template ? getSharedBlockPresetProps(template.id, block.type) : {};
  const mergedProps = { ...presetProps, ...resolvedProps, layoutVariant: blockLayoutVariant };

  const renderBlock = () => {
    switch (block.type) {
      case "composition": return <StorefrontCompositionRenderer block={block} />;
      case "countdown": return <CountdownTimer overrides={mergedProps} />;
      case "hero": return <HeroSection overrides={{ ...mergedProps, disableLegacyFallback: true }} />;
      case "promo-banner": return <PromoBanner overrides={{ ...mergedProps, disableLegacyFallback: true }} />;
      case "category-showcase": return <CategoryShowcase overrides={{ ...mergedProps, disableLegacyFallback: true }} />;
      case "featured-products":
        return <FeaturedProducts limit={mergedProps.limit} title={mergedProps.title} tagline={mergedProps.tagline} source={mergedProps.source} category={mergedProps.category} productType={mergedProps.productType} layoutVariant={blockLayoutVariant} imagePosition={mergedProps.imagePosition} focalX={mergedProps.focalX} focalY={mergedProps.focalY} disableLegacyFallback />;
      case "recommended-products":
        return <FeaturedProducts limit={mergedProps.limit} title={mergedProps.title ?? "Products you may like"} tagline={mergedProps.tagline ?? "More to explore"} source={mergedProps.source} category={mergedProps.category} productType={mergedProps.productType} layoutVariant={blockLayoutVariant} imagePosition={mergedProps.imagePosition} focalX={mergedProps.focalX} focalY={mergedProps.focalY} disableLegacyFallback />;
      case "comparison": return <ComparisonBlock {...mergedProps} />;
      case "recently-viewed": return <RecentlyViewed title={typeof mergedProps.title === "string" ? mergedProps.title : undefined} />;
      case "rich-text": return blockLayoutVariant === "blog-posts" ? <BlogHomepageWidget /> : <RichTextBlock {...mergedProps} templateId={template?.id} />;
      case "social-feed": return <SocialFeedBlock {...mergedProps} templateId={template?.id} />;
      case "video-reel": return <VideoReelBlock {...mergedProps} />;
      case "faq-accordion": return <FaqAccordionBlock {...mergedProps} templateId={template?.id} />;
      case "trust-badges": return <TrustBadgesBlock {...mergedProps} templateId={template?.id} />;
      case "testimonials": return <TestimonialsBlock {...mergedProps} templateId={template?.id} />;
      default: return null;
    }
  };

  const customCss = (block.props as any).customCss as Record<string, string> | undefined;
  const blockClass = `custom-block-${block.id}`;
  const safeCustomHtml = sanitizeStoreBlockCustomHtml(block.customHtml);
  const safeCustomCss = sanitizeStoreBlockCustomCss(block.customCss);

  const renderCustomCss = () => {
    let styleString = "";
    if (customCss) {
      let baseCss = "";
      let tabletCss = "";
      let mobileCss = "";
      for (const [key, value] of Object.entries(customCss)) {
        const cssKey = key.replace("tablet:", "").replace("mobile:", "").replace(/([A-Z])/g, "-$1").toLowerCase();
        if (key.startsWith("tablet:")) tabletCss += `${cssKey}: ${value};\n`;
        else if (key.startsWith("mobile:")) mobileCss += `${cssKey}: ${value};\n`;
        else baseCss += `${cssKey}: ${value};\n`;
      }
      if (baseCss || tabletCss || mobileCss) {
        styleString += `.${blockClass} { \n${baseCss} }`;
        if (tabletCss) styleString += `\n@media (max-width: 1024px) { .${blockClass} { \n${tabletCss} } }`;
        if (mobileCss) styleString += `\n@media (max-width: 768px) { .${blockClass} { \n${mobileCss} } }`;
      }
    }
    if (safeCustomCss) styleString += `\n${safeCustomCss}`;
    if (!styleString) return null;
    return <style dangerouslySetInnerHTML={{ __html: styleString }} />;
  };

  return (
    <ErrorBoundary fallback={BlockFallback}>
      {renderCustomCss()}
      <div className={`w-full transition-all duration-200 ${blockClass}`} data-ezcomo-block-id={block.id}>
        {renderBlock()}
        {safeCustomHtml ? <div dangerouslySetInnerHTML={{ __html: safeCustomHtml }} /> : null}
      </div>
    </ErrorBoundary>
  );
}
