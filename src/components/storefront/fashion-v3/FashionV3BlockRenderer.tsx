"use client";

import Link from "next/link";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { StorePageBlock } from "@/lib/cms/schema";
import type { StorefrontTemplateDefinition } from "@/lib/cms/storefront-templates";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useProducts } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { FashionV3ProductCard } from "@/components/storefront/fashion-v3/FashionV3ProductCard";
import { productUrl, storefrontPath } from "@/lib/slug";
import { getScopedStorefrontStorageKey } from "@/lib/storefront-storage";
import { StorefrontBlockRenderer } from "@/components/storefront/StorefrontBlockRenderer";
import { shouldUseSpecializedBlockRenderer } from "@/lib/cms/storefront-platform/variants/specialized-routing";

const asString = (value: unknown) => typeof value === "string" ? value.trim() : "";

function FashionHero({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const props = block.props as Record<string, unknown>;
  const image = asString(props.imageUrl) || asString(props.mediaUrl);
  const mobileImage = asString(props.mobileImageUrl);
  const title = asString(props.title);
  const highlight = asString(props.highlight);
  const subtitle = asString(props.subtitle);
  const cta = asString(props.ctaText);
  const ctaLink = storefrontPath(asString(props.ctaLink) || "/shop", store?.slug);
  const secondary = asString(props.secondaryCtaText);
  const secondaryLink = storefrontPath(asString(props.secondaryCtaLink) || "/shop", store?.slug);

  return (
    <section className="relative min-h-[72svh] overflow-hidden bg-muted md:min-h-[82vh]">
      {image ? <><div className="absolute inset-0 hidden sm:block"><SafeStorefrontImage src={image} alt={asString(props.imageAlt) || title || "Campaign"} fill priority className="object-cover" /></div><div className="absolute inset-0 sm:hidden"><SafeStorefrontImage src={mobileImage || image} alt={asString(props.imageAlt) || title || "Campaign"} fill priority className="object-cover" /></div></> : null}
      <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent sm:bg-gradient-to-t sm:from-black/50 sm:via-black/10 sm:to-transparent" />
      <div className="relative mx-auto flex min-h-[72svh] max-w-[1500px] items-end px-5 pb-10 pt-24 text-white md:min-h-[82vh] md:px-8 md:pb-14 lg:px-12">
        <div className="max-w-3xl">
          {asString(props.tagline) ? <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/80 md:text-xs">{asString(props.tagline)}</p> : null}
          <h1 className="max-w-[11ch] text-[clamp(3rem,7vw,7.5rem)] font-semibold leading-[0.87] tracking-[-0.055em]">{title}{highlight ? <><br /><span>{highlight}</span></> : null}</h1>
          {subtitle ? <p className="mt-5 max-w-xl text-sm leading-6 text-white/85 md:text-base md:leading-7">{subtitle}</p> : null}
          <div className="mt-7 flex flex-wrap gap-3">
            {cta ? <Link href={ctaLink} className="inline-flex min-h-12 items-center justify-center bg-primary px-6 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground transition hover:bg-primary/90">{cta}</Link> : null}
            {secondary ? <Link href={secondaryLink} className="inline-flex min-h-12 items-center justify-center border border-white/70 px-6 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white hover:text-black">{secondary}</Link> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function FashionCategories({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const { data: categories = [] } = useProductCategories(store?.id);
  const props = block.props as Record<string, unknown>;
  const explicit = Array.isArray(props.items) ? props.items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
  const items = explicit.length > 0 ? explicit.map((item) => ({ name: asString(item.label) || asString(item.name), image: asString(item.imageUrl) || asString(item.image_url), description: asString(item.tagline) || asString(item.description), value: asString(item.value) || asString(item.slug) || asString(item.label) })) : categories.map((category) => ({ name: category.name, image: (category as any).image_url || "", description: (category as any).description || "", value: category.name }));
  if (items.length === 0) return null;
  const shop = storefrontPath("/shop", store?.slug);

  return (
    <section className="mx-auto max-w-[1500px] px-5 py-14 md:px-8 md:py-24 lg:px-12">
      <div className="mb-8 flex items-end justify-between gap-6 md:mb-12">
        <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{asString(props.tagline) || "Collections"}</p><h2 className="text-3xl font-semibold tracking-[-0.045em] md:text-5xl">{asString(props.title) || "Shop by collection"}</h2></div>
        <Link href={shop} className="hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] md:flex">Shop all <ArrowRight className="h-4 w-4" /></Link>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
        {items.slice(0, 5).map((item, index) => (
          <Link key={`${item.name}-${index}`} href={`${shop}?category=${encodeURIComponent(item.value || item.name)}`} className={`group relative overflow-hidden bg-muted ${index === 0 ? "col-span-2 aspect-[16/10] md:col-span-2 md:row-span-2 md:aspect-auto" : "aspect-[4/5]"}`}>
            {item.image ? <SafeStorefrontImage src={item.image} alt={item.name} fill className="object-cover transition-transform duration-700 group-hover:scale-[1.025]" /> : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white md:p-5"><h3 className="text-lg font-semibold tracking-[-0.025em] md:text-2xl">{item.name}</h3>{item.description ? <p className="mt-1 hidden text-xs text-white/75 md:block">{item.description}</p> : null}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FashionProducts({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const { data: products = [] } = useProducts(store?.id);
  const props = block.props as Record<string, unknown>;
  const limit = typeof props.limit === "number" ? props.limit : 8;
  const source = asString(props.source);
  const filtered = source === "featured" ? products.filter((p) => p.featured) : products;
  if (filtered.length === 0) return null;
  return (
    <section className="mx-auto max-w-[1500px] px-5 py-14 md:px-8 md:py-24 lg:px-12">
      <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-5 md:mb-10"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{asString(props.tagline) || "New season"}</p><h2 className="text-3xl font-semibold tracking-[-0.045em] md:text-5xl">{asString(props.title) || "New arrivals"}</h2></div><Link href={storefrontPath("/shop", store?.slug)} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">View all <ArrowRight className="h-4 w-4" /></Link></div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">{filtered.slice(0, limit).map((product) => <FashionV3ProductCard key={product.id} product={product} />)}</div>
    </section>
  );
}

function FashionPromo({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const props = block.props as Record<string, unknown>;
  return <section className="bg-foreground text-background"><div className="mx-auto grid max-w-[1500px] gap-7 px-5 py-12 md:grid-cols-[1fr_auto] md:items-end md:px-8 md:py-16 lg:px-12"><div><p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-background/55">{asString(props.badgeText) || "Edit"}</p><h2 className="max-w-[15ch] text-3xl font-semibold leading-[0.95] tracking-[-0.045em] md:text-5xl">{asString(props.title) || "A new season, considered."}</h2>{asString(props.subtitle) ? <p className="mt-4 max-w-2xl text-sm leading-6 text-background/70">{asString(props.subtitle)}</p> : null}</div>{asString(props.ctaText) ? <Link href={storefrontPath(asString(props.ctaLink) || "/shop", store?.slug)} className="inline-flex min-h-11 items-center gap-2 border-b border-background/80 pb-1 text-xs font-semibold uppercase tracking-[0.12em]">{asString(props.ctaText)} <ArrowRight className="h-4 w-4" /></Link> : null}</div></section>;
}

function FashionSocial({ block }: { block: StorePageBlock }) {
  const props = block.props as Record<string, unknown>;
  const images = Array.isArray(props.images) ? props.images.map(asString).filter(Boolean) : [];
  if (images.length === 0) return null;
  return <section className="py-14 md:py-24"><div className="mx-auto max-w-[1500px] px-5 md:px-8 lg:px-12"><div className="mb-8"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Lookbook</p><h2 className="text-3xl font-semibold tracking-[-0.045em] md:text-5xl">{asString(props.title) || "Seen outside the studio"}</h2>{asString(props.subtitle) ? <p className="mt-3 max-w-xl text-sm text-muted-foreground">{asString(props.subtitle)}</p> : null}</div><div className="grid grid-cols-2 gap-1 md:grid-cols-4">{images.slice(0, 4).map((src, index) => <div key={`${src}-${index}`} className="relative aspect-[4/5] overflow-hidden bg-muted"><SafeStorefrontImage src={src} alt={`Lookbook ${index + 1}`} fill className="object-cover" /></div>)}</div></div></section>;
}


function FashionTestimonials({ block }: { block: StorePageBlock }) {
  const props = block.props as Record<string, unknown>;
  const reviews = Array.isArray(props.reviews)
    ? props.reviews.filter((review): review is Record<string, unknown> => Boolean(review) && typeof review === "object")
    : [];
  if (reviews.length === 0) return null;
  return (
    <section className="bg-muted/55 py-14 md:py-20">
      <div className="mx-auto max-w-[1500px] px-5 md:px-8 lg:px-12">
        <div className="mb-9 max-w-3xl">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Customer notes</p>
          <h2 className="text-3xl font-semibold tracking-[-0.045em] md:text-5xl">{asString(props.title) || "What customers say"}</h2>
          {asString(props.subtitle) ? <p className="mt-3 text-sm text-muted-foreground">{asString(props.subtitle)}</p> : null}
        </div>
        <div className="grid border-t border-border md:grid-cols-3">
          {reviews.slice(0, 3).map((review, index) => {
            const rating = Number(review.rating);
            const text = asString(review.comment) || asString(review.text);
            const name = asString(review.name) || asString(review.author);
            return (
              <article key={`${name}-${index}`} className="border-b border-border py-6 md:border-b-0 md:border-r md:px-7 first:md:pl-0 last:md:border-r-0">
                {Number.isFinite(rating) && rating >= 1 && rating <= 5 ? <p className="text-[11px] font-semibold tracking-[0.12em] text-primary">{rating.toFixed(0)}/5</p> : null}
                {text ? <p className="mt-4 max-w-sm text-base leading-7 text-foreground/80">“{text}”</p> : null}
                {name ? <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{name}</p> : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}


function extractRichText(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!value || typeof value !== "object") return [];
  const node = value as Record<string, unknown>;
  const ownText = typeof node.text === "string" && node.text.trim() ? [node.text.trim()] : [];
  const content = Array.isArray(node.content) ? node.content.flatMap(extractRichText) : [];
  return [...ownText, ...content];
}

function FashionStory({ block }: { block: StorePageBlock }) {
  const props = block.props as Record<string, unknown>;
  const paragraphs = extractRichText(props.body);
  const image = asString(props.imageUrl);
  if (!asString(props.title) && paragraphs.length === 0 && !image) return null;
  return (
    <section className="border-y border-border py-14 md:py-24">
      <div className="mx-auto grid max-w-[1500px] gap-9 px-5 md:grid-cols-2 md:items-center md:px-8 lg:gap-16 lg:px-12">
        {image ? <div className="relative aspect-[4/5] overflow-hidden bg-muted"><SafeStorefrontImage src={image} alt={asString(props.imageAlt) || asString(props.title) || "Brand story"} fill className="object-cover" /></div> : null}
        <div className={image ? "" : "md:col-span-2 md:max-w-4xl"}>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{asString(props.eyebrow) || "Our story"}</p>
          {asString(props.title) ? <h2 className="max-w-[13ch] text-4xl font-semibold leading-[0.95] tracking-[-0.05em] md:text-6xl">{asString(props.title)}</h2> : null}
          {paragraphs.length > 0 ? <div className="mt-6 max-w-2xl space-y-4 text-sm leading-7 text-muted-foreground md:text-base">{paragraphs.slice(0, 6).map((paragraph, index) => <p key={`${paragraph.slice(0, 24)}-${index}`}>{paragraph}</p>)}</div> : null}
        </div>
      </div>
    </section>
  );
}

function selectProducts(products: ReturnType<typeof useProducts>["data"] extends infer T ? NonNullable<T> : never, props: Record<string, unknown>) {
  const source = asString(props.source);
  const category = asString(props.category);
  const productType = asString(props.productType);
  let selected = [...(products ?? [])];
  if (source === "featured") selected = selected.filter((product) => product.featured);
  if (source === "category" && category) selected = selected.filter((product) => product.category === category);
  if (source === "type" && productType) selected = selected.filter((product) => product.type === productType);
  if (source === "featured-or-all") {
    const featured = selected.filter((product) => product.featured);
    if (featured.length > 0) selected = featured;
  }
  return selected;
}

function FashionRecommended({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const { data: products = [] } = useProducts(store?.id);
  const props = block.props as Record<string, unknown>;
  const limit = typeof props.limit === "number" ? props.limit : 4;
  const selected = selectProducts(products, props).slice(0, limit);
  if (selected.length === 0) return null;
  return (
    <section className="border-t border-border py-14 md:py-20">
      <div className="mx-auto max-w-[1500px] px-5 md:px-8 lg:px-12">
        <div className="mb-8 flex items-end justify-between border-b border-border pb-5">
          <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{asString(props.tagline) || "Curated for you"}</p><h2 className="text-3xl font-semibold tracking-[-0.045em] md:text-4xl">{asString(props.title) || "More to explore"}</h2></div>
          <Link href={storefrontPath("/shop", store?.slug)} className="text-xs font-semibold uppercase tracking-[0.12em]">View all</Link>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-5">{selected.map((product) => <FashionV3ProductCard key={product.id} product={product} />)}</div>
      </div>
    </section>
  );
}

function FashionCountdown({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const props = block.props as Record<string, unknown>;
  const endDate = asString(props.endDate);
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!endDate) { setRemaining(null); return; }
    const target = new Date(endDate).getTime();
    if (!Number.isFinite(target)) { setRemaining(null); return; }
    const update = () => setRemaining(Math.max(0, target - Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [endDate]);
  if (!asString(props.title) && !endDate) return null;
  const totalSeconds = Math.floor((remaining ?? 0) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return (
    <section className="bg-foreground py-12 text-background md:py-16">
      <div className="mx-auto grid max-w-[1500px] gap-8 px-5 md:grid-cols-[1fr_auto] md:items-end md:px-8 lg:px-12">
        <div><p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-background/55">Limited release</p><h2 className="max-w-[14ch] text-3xl font-semibold leading-[0.95] tracking-[-0.045em] md:text-5xl">{asString(props.title) || "The next drop is almost here"}</h2>{asString(props.subtitle) ? <p className="mt-4 max-w-xl text-sm leading-6 text-background/70">{asString(props.subtitle)}</p> : null}</div>
        <div>
          {remaining !== null ? <div className="grid grid-cols-4 gap-5 border-y border-background/20 py-4 text-center"><div><b className="block text-2xl font-medium">{days}</b><span className="text-[9px] uppercase tracking-[0.16em] text-background/55">Days</span></div><div><b className="block text-2xl font-medium">{String(hours).padStart(2, "0")}</b><span className="text-[9px] uppercase tracking-[0.16em] text-background/55">Hours</span></div><div><b className="block text-2xl font-medium">{String(minutes).padStart(2, "0")}</b><span className="text-[9px] uppercase tracking-[0.16em] text-background/55">Min</span></div><div><b className="block text-2xl font-medium">{String(seconds).padStart(2, "0")}</b><span className="text-[9px] uppercase tracking-[0.16em] text-background/55">Sec</span></div></div> : null}
          {asString(props.ctaText) ? <Link href={storefrontPath(asString(props.ctaLink) || "/shop", store?.slug)} className="mt-5 inline-flex min-h-11 items-center gap-2 border-b border-background/80 pb-1 text-xs font-semibold uppercase tracking-[0.12em]">{asString(props.ctaText)} <ArrowRight className="h-4 w-4" /></Link> : null}
        </div>
      </div>
    </section>
  );
}

function FashionVideo({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const props = block.props as Record<string, unknown>;
  const videoUrl = asString(props.videoUrl);
  const isEmbed = videoUrl.includes("youtube.com/embed") || videoUrl.includes("player.vimeo.com");
  if (!videoUrl) return null;
  return (
    <section className="relative min-h-[65vh] overflow-hidden bg-black text-white md:min-h-[80vh]">
      {isEmbed ? <iframe src={videoUrl} title={asString(props.title) || "Campaign film"} className="absolute inset-0 h-full w-full opacity-80" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : <video src={videoUrl} muted playsInline controls className="absolute inset-0 h-full w-full object-cover" />}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      <div className="relative mx-auto flex min-h-[65vh] max-w-[1500px] items-end px-5 py-10 md:min-h-[80vh] md:px-8 md:py-14 lg:px-12"><div className="max-w-3xl"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">Campaign film</p>{asString(props.title) ? <h2 className="text-4xl font-semibold leading-[0.93] tracking-[-0.05em] md:text-6xl">{asString(props.title)}</h2> : null}{asString(props.ctaText) ? <Link href={storefrontPath(asString(props.ctaLink) || "/shop", store?.slug)} className="pointer-events-auto mt-6 inline-flex min-h-12 items-center bg-white px-6 text-xs font-semibold uppercase tracking-[0.12em] text-black">{asString(props.ctaText)}</Link> : null}</div></div>
    </section>
  );
}

function FashionRecentlyViewed({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const { data: products = [] } = useProducts(store?.id);
  const key = getScopedStorefrontStorageKey("recently-viewed", store?.id);
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try { setIds(JSON.parse(localStorage.getItem(key) || "[]")); } catch { setIds([]); }
  }, [key]);
  const recent = ids.map((id) => products.find((product) => product.id === id)).filter((product): product is NonNullable<typeof product> => Boolean(product)).slice(0, 4);
  if (recent.length === 0) return null;
  const props = block.props as Record<string, unknown>;
  return (
    <section className="border-t border-border py-14 md:py-20"><div className="mx-auto max-w-[1500px] px-5 md:px-8 lg:px-12"><div className="mb-8"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Continue browsing</p><h2 className="text-3xl font-semibold tracking-[-0.04em]">{asString(props.title) || "Recently viewed"}</h2></div><div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-5">{recent.map((product) => <FashionV3ProductCard key={product.id} product={product} />)}</div></div></section>
  );
}

function FashionFaq({ block }: { block: StorePageBlock }) {
  const props = block.props as Record<string, unknown>;
  const entries = Array.isArray(props.faqs) ? props.faqs.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object") : [];
  const [open, setOpen] = useState<number | null>(null);
  if (entries.length === 0) return null;
  return <section className="border-t border-border py-14 md:py-20"><div className="mx-auto grid max-w-[1200px] gap-10 px-5 md:grid-cols-[0.75fr_1.25fr] md:px-8"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Need to know</p><h2 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">{asString(props.title) || "Before you order"}</h2></div><div className="border-t border-border">{entries.map((entry, index) => { const q = asString(entry.question) || asString(entry.q); const a = asString(entry.answer) || asString(entry.a); return <div key={`${q}-${index}`} className="border-b border-border"><button type="button" onClick={() => setOpen(open === index ? null : index)} className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-medium"><span>{q}</span><ChevronDown className={`h-4 w-4 transition ${open === index ? "rotate-180" : ""}`} /></button>{open === index ? <p className="pb-5 pr-8 text-sm leading-6 text-muted-foreground">{a}</p> : null}</div>; })}</div></div></section>;
}

function FashionTrust({ block }: { block: StorePageBlock }) {
  const props = block.props as Record<string, unknown>;
  const badges = Array.isArray(props.badges) ? props.badges.filter((badge): badge is Record<string, unknown> => Boolean(badge) && typeof badge === "object") : [];
  if (badges.length === 0) return null;
  return <section className="border-y border-border bg-muted/45"><div className="mx-auto grid max-w-[1500px] divide-y divide-border px-5 md:grid-cols-3 md:divide-x md:divide-y-0 md:px-8 lg:px-12">{badges.slice(0, 3).map((badge, index) => <div key={`${asString(badge.label)}-${index}`} className="py-8 md:px-8 md:py-10 first:md:pl-0"><Check className="mb-4 h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">{asString(badge.label)}</h3>{asString(badge.description) ? <p className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">{asString(badge.description)}</p> : null}</div>)}</div></section>;
}

export function FashionV3BlockRenderer({ block, template }: { block: StorePageBlock; template: StorefrontTemplateDefinition }) {
  if (!shouldUseSpecializedBlockRenderer(block, template)) {
    return <StorefrontBlockRenderer block={block} template={template} />;
  }

  switch (block.type) {
    case "hero": return <FashionHero block={block} />;
    case "category-showcase": return <FashionCategories block={block} />;
    case "featured-products": return <FashionProducts block={block} />;
    case "recommended-products": return <FashionRecommended block={block} />;
    case "rich-text": return <FashionStory block={block} />;
    case "countdown": return <FashionCountdown block={block} />;
    case "video-reel": return <FashionVideo block={block} />;
    case "promo-banner": return <FashionPromo block={block} />;
    case "social-feed": return <FashionSocial block={block} />;
    case "testimonials": return <FashionTestimonials block={block} />;
    case "trust-badges": return <FashionTrust block={block} />;
    case "faq-accordion": return <FashionFaq block={block} />;
    case "recently-viewed": return <FashionRecentlyViewed block={block} />;
    default: return <StorefrontBlockRenderer block={block} template={template} />;
  }
}
