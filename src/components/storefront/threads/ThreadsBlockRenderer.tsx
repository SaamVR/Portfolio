"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Leaf, PackageOpen, Shirt, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { StorePageBlock } from "@/lib/cms/schema";
import type { StorefrontTemplateDefinition } from "@/lib/cms/storefront-templates";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useProducts } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { ThreadsProductCard } from "@/components/storefront/threads/ThreadsProductCard";
import { storefrontPath } from "@/lib/slug";
import { StorefrontBlockRenderer } from "@/components/storefront/StorefrontBlockRenderer";

const asString = (value: unknown) => typeof value === "string" ? value.trim() : "";

type DecorationLevel = "none" | "subtle" | "full";

function getDecoration(block: StorePageBlock): DecorationLevel {
  return block.decoration ?? "subtle";
}

function SectionLeaves({ side = "right", level = "subtle" }: { side?: "left" | "right"; level?: DecorationLevel }) {
  if (level === "none") return null;
  const scale = level === "full" ? "scale-125 opacity-100" : "opacity-70";
  return <div aria-hidden className={`pointer-events-none absolute top-3 hidden text-primary/15 md:block ${scale} ${side === "right" ? "right-0" : "left-0 -scale-x-100"}`}><Leaf className="h-28 w-28 rotate-[22deg] stroke-[1.1]" /><Leaf className="-mt-12 ml-10 h-20 w-20 -rotate-[8deg] stroke-[1.1]" /></div>;
}

function useAutoRail(ref: RefObject<HTMLDivElement | null>, intervalMs: number, enabled: boolean) {
  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let paused = false;
    const pause = () => { paused = true; };
    const resume = () => { paused = false; };
    node.addEventListener("mouseenter", pause);
    node.addEventListener("mouseleave", resume);
    node.addEventListener("focusin", pause);
    node.addEventListener("focusout", resume);
    node.addEventListener("pointerdown", pause);
    node.addEventListener("pointerup", resume);
    const timer = window.setInterval(() => {
      if (paused || node.scrollWidth <= node.clientWidth + 8) return;
      const step = Math.max(220, Math.round(node.clientWidth * 0.72));
      const atEnd = node.scrollLeft + node.clientWidth >= node.scrollWidth - 16;
      node.scrollTo({ left: atEnd ? 0 : node.scrollLeft + step, behavior: "smooth" });
    }, intervalMs);
    return () => {
      window.clearInterval(timer);
      node.removeEventListener("mouseenter", pause);
      node.removeEventListener("mouseleave", resume);
      node.removeEventListener("focusin", pause);
      node.removeEventListener("focusout", resume);
      node.removeEventListener("pointerdown", pause);
      node.removeEventListener("pointerup", resume);
    };
  }, [enabled, intervalMs, ref]);
}

function RailControls({ rail, inverse = false }: { rail: RefObject<HTMLDivElement | null>; inverse?: boolean }) {
  const move = (direction: number) => rail.current?.scrollBy({ left: direction * Math.max(240, Math.round((rail.current?.clientWidth ?? 320) * 0.7)), behavior: "smooth" });
  const buttonClass = inverse
    ? "grid h-10 w-10 place-items-center rounded-full border border-primary-foreground/35 bg-primary-foreground/10 text-primary-foreground transition hover:bg-primary-foreground hover:text-primary"
    : "grid h-10 w-10 place-items-center rounded-full border border-border bg-background transition hover:border-primary hover:text-primary";
  return <div className="flex items-center gap-2"><button type="button" onClick={() => move(-1)} className={buttonClass} aria-label="Previous"><ArrowLeft className="h-4 w-4" /></button><button type="button" onClick={() => move(1)} className={buttonClass} aria-label="Next"><ArrowRight className="h-4 w-4" /></button></div>;
}

function ThreadsHero({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const props = block.props as Record<string, unknown>;
  const image = asString(props.imageUrl) || asString(props.mediaUrl);
  const mobileImage = asString(props.mobileImageUrl);
  const title = asString(props.title) || "Everyday pieces, made to feel like you.";
  const highlight = asString(props.highlight);
  const subtitle = asString(props.subtitle);
  const cta = asString(props.ctaText) || "Shop the collection";
  const secondary = asString(props.secondaryCtaText);
  return (
    <section className="relative overflow-hidden px-4 pb-10 pt-7 md:px-8 md:pb-16 md:pt-10 lg:px-12">
      <SectionLeaves side="left" level={getDecoration(block)} />
      <div className="relative mx-auto grid min-h-[650px] max-w-[1450px] overflow-hidden rounded-[2.2rem] bg-secondary/55 md:min-h-[680px] md:grid-cols-[.93fr_1.07fr] md:rounded-[3rem]">
        <div className="relative z-10 flex items-center px-7 py-14 md:px-12 lg:px-16">
          <div className="max-w-xl">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[.24em] text-primary">{asString(props.tagline) || "New season / natural rhythm"}</p>
            <h1 className="text-[clamp(3.2rem,6.4vw,6.9rem)] font-black leading-[.88] tracking-[-.065em] text-foreground">{title}{highlight ? <><br /><span className="font-medium italic text-primary">{highlight}</span></> : null}</h1>
            {subtitle ? <p className="mt-6 max-w-lg text-sm leading-7 text-muted-foreground md:text-[15px]">{subtitle}</p> : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={storefrontPath(asString(props.ctaLink) || "/shop", store?.slug)} className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 text-[11px] font-bold uppercase tracking-[.14em] text-primary-foreground transition hover:-translate-y-0.5">{cta}</Link>
              {secondary ? <Link href={storefrontPath(asString(props.secondaryCtaLink) || "/shop", store?.slug)} className="inline-flex min-h-12 items-center justify-center rounded-full border border-foreground/20 bg-background/55 px-7 text-[11px] font-bold uppercase tracking-[.14em] text-foreground backdrop-blur">{secondary}</Link> : null}
            </div>
          </div>
        </div>
        <div className="relative min-h-[390px] overflow-hidden md:min-h-0">
          {image ? <><div className="absolute inset-0 hidden sm:block"><SafeStorefrontImage src={image} alt={asString(props.imageAlt) || title} fill priority className="object-cover" /></div><div className="absolute inset-0 sm:hidden"><SafeStorefrontImage src={mobileImage || image} alt={asString(props.imageAlt) || title} fill priority className="object-cover" /></div></> : <div className="absolute inset-0 bg-primary/10" />}
          <div className="absolute inset-y-0 left-0 hidden w-24 bg-gradient-to-r from-secondary/70 to-transparent md:block" />
          <div className="absolute bottom-5 right-5 rounded-full border border-white/45 bg-black/15 px-4 py-2 text-[10px] font-semibold uppercase tracking-[.16em] text-white backdrop-blur">Made for repeat wear</div>
        </div>
      </div>
    </section>
  );
}

const categoryIcons: ReactNode[] = [<Shirt key="shirt" className="h-8 w-8" />, <Sparkles key="sparkles" className="h-8 w-8" />, <PackageOpen key="pack" className="h-8 w-8" />, <Leaf key="leaf" className="h-8 w-8" />];

function ThreadsCategories({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const { data: categories = [] } = useProductCategories(store?.id);
  const props = block.props as Record<string, unknown>;
  const explicit = Array.isArray(props.items) ? props.items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
  const allItems = explicit.length ? explicit.map((item) => ({ name: asString(item.label) || asString(item.name), image: asString(item.imageUrl) || asString(item.image_url), value: asString(item.value) || asString(item.label) })) : categories.map((item) => ({ name: item.name, image: (item as { image_url?: string }).image_url || "", value: item.name }));
  const limit = typeof props.limit === "number" ? props.limit : 10;
  const items = allItems.slice(0, limit);
  const rail = useRef<HTMLDivElement>(null);
  const autoplay = props.autoplay !== false;
  const intervalMs = typeof props.autoplayIntervalMs === "number" ? props.autoplayIntervalMs : 3400;
  const showArrows = props.showArrows !== false;
  useAutoRail(rail, intervalMs, autoplay);
  if (!items.length) return null;
  const shop = storefrontPath("/shop", store?.slug);
  return (
    <section className="relative py-16 md:py-24">
      <SectionLeaves level={getDecoration(block)} />
      <div className="mx-auto max-w-[1450px] px-5 md:px-8 lg:px-12">
        <div className="mb-9 flex items-end justify-between gap-6"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.22em] text-primary">{asString(props.tagline) || "Browse your mood"}</p><h2 className="text-3xl font-black tracking-[-.045em] md:text-5xl">{asString(props.title) || "Shop by collection"}</h2></div>{showArrows ? <RailControls rail={rail} /> : null}</div>
        <div ref={rail} className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-7">
          {items.map((item, index) => <Link key={`${item.name}-${index}`} href={`${shop}?category=${encodeURIComponent(item.value || item.name)}`} className="group w-[138px] shrink-0 snap-start text-center sm:w-[160px] md:w-[184px]"><div className="relative mx-auto aspect-square overflow-hidden rounded-full border border-border bg-secondary/55 p-2 transition group-hover:-translate-y-1 group-hover:border-primary"><div className="relative h-full w-full overflow-hidden rounded-full bg-background">{item.image ? <SafeStorefrontImage src={item.image} alt={item.name} fill className="object-cover transition duration-700 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-primary">{categoryIcons[index % categoryIcons.length]}</div>}</div></div><h3 className="mt-4 text-sm font-bold tracking-[-.015em]">{item.name}</h3><p className="mt-1 text-[10px] uppercase tracking-[.14em] text-muted-foreground">Explore</p></Link>)}
        </div>
      </div>
    </section>
  );
}

function ThreadsProducts({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const { data: products = [] } = useProducts(store?.id);
  const props = block.props as Record<string, unknown>;
  const source = asString(props.source);
  const filtered = source === "featured" ? products.filter((product) => product.featured) : products;
  const limit = typeof props.limit === "number" ? props.limit : 10;
  const visible = filtered.slice(0, limit);
  const rail = useRef<HTMLDivElement>(null);
  const autoplay = props.autoplay !== false;
  const intervalMs = typeof props.autoplayIntervalMs === "number" ? props.autoplayIntervalMs : 4300;
  const showArrows = props.showArrows !== false;
  useAutoRail(rail, intervalMs, autoplay);
  if (!visible.length) return null;
  return (
    <section className="relative overflow-hidden bg-primary py-16 text-primary-foreground md:py-24">
      <SectionLeaves side="left" level={getDecoration(block)} />
      <div className="mx-auto max-w-[1450px] px-5 md:px-8 lg:px-12">
        <div className="mb-9 flex items-end justify-between gap-6"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.22em] text-primary-foreground/65">{asString(props.tagline) || "Current favourites"}</p><h2 className="text-3xl font-black tracking-[-.045em] md:text-5xl">{asString(props.title) || "Featured pieces"}</h2></div><div className="flex items-center gap-4"><Link href={storefrontPath("/shop", store?.slug)} className="hidden text-[11px] font-bold uppercase tracking-[.14em] text-primary-foreground sm:block">View all</Link>{showArrows ? <RailControls rail={rail} inverse /> : null}</div></div>
        <div ref={rail} className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-5">
          {visible.map((product) => <div key={product.id} className="w-[76vw] max-w-[285px] shrink-0 snap-start sm:w-[42vw] md:w-[29vw] lg:w-[22vw] lg:max-w-[320px]"><ThreadsProductCard product={product} framed /></div>)}
        </div>
      </div>
    </section>
  );
}

function extractText(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!value || typeof value !== "object") return [];
  const node = value as Record<string, unknown>;
  return [...(typeof node.text === "string" && node.text.trim() ? [node.text.trim()] : []), ...(Array.isArray(node.content) ? node.content.flatMap(extractText) : [])];
}

function ThreadsStory({ block }: { block: StorePageBlock }) {
  const props = block.props as Record<string, unknown>;
  const image = asString(props.imageUrl);
  const paragraphs = extractText(props.body);
  if (!asString(props.title) && !paragraphs.length && !image) return null;
  return <section className="relative overflow-hidden py-16 md:py-28"><SectionLeaves level={getDecoration(block)} /><div className="mx-auto grid max-w-[1320px] items-center gap-10 px-5 md:grid-cols-2 md:px-8 lg:gap-16"><div className="relative aspect-[4/5] overflow-hidden rounded-[2.4rem] bg-secondary/55">{image ? <SafeStorefrontImage src={image} alt={asString(props.imageAlt) || asString(props.title) || "Our story"} fill className="object-cover" /> : <div className="grid h-full place-items-center text-primary/25"><Leaf className="h-28 w-28" /></div>}</div><div><p className="mb-3 text-[10px] font-bold uppercase tracking-[.22em] text-primary">{asString(props.eyebrow) || "Why Threads"}</p><h2 className="max-w-[12ch] text-4xl font-black leading-[.96] tracking-[-.055em] md:text-6xl">{asString(props.title) || "Clothes with a little more soul."}</h2>{paragraphs.length ? <div className="mt-6 max-w-xl space-y-4 text-sm leading-7 text-muted-foreground md:text-[15px]">{paragraphs.slice(0, 5).map((text, index) => <p key={`${text.slice(0, 20)}-${index}`}>{text}</p>)}</div> : null}</div></div></section>;
}

function ThreadsPromo({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const props = block.props as Record<string, unknown>;
  const cards = [
    {
      image: asString(props.imageUrl),
      alt: asString(props.imageAlt),
      badge: asString(props.badgeText) || "Everyday essentials",
      title: asString(props.title) || "Made for the everyday.",
      subtitle: asString(props.subtitle),
      cta: asString(props.ctaText) || "Shop essentials",
      href: asString(props.ctaLink) || "/shop",
    },
    {
      image: asString(props.secondaryImageUrl),
      alt: asString(props.secondaryImageAlt),
      badge: "Considered choices",
      title: asString(props.secondaryTitle) || "Wear more. Waste less.",
      subtitle: asString(props.secondarySubtitle),
      cta: asString(props.secondaryCtaText) || "Explore the edit",
      href: asString(props.secondaryCtaLink) || "/shop",
    },
  ];

  return (
    <section className="relative px-5 py-8 md:px-8 md:py-12 lg:px-12">
      <SectionLeaves level={getDecoration(block)} />
      <div className="mx-auto grid max-w-[1450px] gap-5 md:grid-cols-2">
        {cards.map((card, index) => (
          <article key={`${card.title}-${index}`} className="group relative min-h-[420px] overflow-hidden rounded-[2.2rem] bg-secondary md:min-h-[560px]">
            {card.image ? <SafeStorefrontImage src={card.image} alt={card.alt || card.title} fill className="object-cover transition duration-700 group-hover:scale-[1.025]" /> : <div className="absolute inset-0 bg-primary/12" />}
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-7 text-background md:p-10">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-background/70">{card.badge}</p>
              <h2 className="max-w-[13ch] text-3xl font-black leading-[.95] tracking-[-.045em] md:text-5xl">{card.title}</h2>
              {card.subtitle ? <p className="mt-4 max-w-lg text-sm leading-6 text-background/75">{card.subtitle}</p> : null}
              <Link href={storefrontPath(card.href, store?.slug)} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-background px-5 text-[10px] font-bold uppercase tracking-[.14em] text-foreground">{card.cta}<ArrowRight className="ml-2 h-4 w-4" /></Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ThreadsNewArrivals({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const { data: products = [] } = useProducts(store?.id);
  const props = block.props as Record<string, unknown>;
  const source = asString(props.source);
  const filtered = source === "featured" ? products.filter((product) => product.featured) : products;
  const limit = typeof props.limit === "number" ? props.limit : 8;
  const visible = filtered.slice(0, limit);
  if (!visible.length) return null;
  return (
    <section className="relative py-16 md:py-24">
      <SectionLeaves side="right" level={getDecoration(block)} />
      <div className="mx-auto max-w-[1450px] px-5 md:px-8 lg:px-12">
        <div className="mb-9 flex items-end justify-between gap-4">
          <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.22em] text-primary">{asString(props.tagline) || "Fresh from the studio"}</p><h2 className="text-3xl font-black tracking-[-.045em] md:text-5xl">{asString(props.title) || "New at Threads"}</h2></div>
          <Link href={storefrontPath("/shop?sort=newest", store?.slug)} className="text-[10px] font-bold uppercase tracking-[.14em] text-foreground underline decoration-border underline-offset-8">View all</Link>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((product) => <ThreadsProductCard key={product.id} product={product} />)}
        </div>
      </div>
    </section>
  );
}

function ThreadsCommunity({ block }: { block: StorePageBlock }) {
  const props = block.props as Record<string, unknown>;
  const images = Array.isArray(props.images) ? props.images.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, 4) : [];
  return (
    <section className="relative overflow-hidden bg-secondary/55 py-16 md:py-24">
      <SectionLeaves side="left" level={getDecoration(block)} />
      <div className="mx-auto max-w-[1450px] px-5 md:px-8 lg:px-12">
        <div className="mx-auto mb-10 max-w-2xl text-center"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.22em] text-primary">Wear it your way</p><h2 className="text-3xl font-black tracking-[-.045em] md:text-5xl">{asString(props.title) || "Join our community"}</h2>{asString(props.subtitle) ? <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground">{asString(props.subtitle)}</p> : null}</div>
        {images.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">{images.map((image, index) => <div key={`${image}-${index}`} className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-card"><SafeStorefrontImage src={image} alt={`Community look ${index + 1}`} fill className="object-cover" /></div>)}</div> : null}
      </div>
    </section>
  );
}

function ThreadsTrust({ block }: { block: StorePageBlock }) {
  const props = block.props as Record<string, unknown>;
  const badges = Array.isArray(props.badges) ? props.badges.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
  if (!badges.length) return null;
  return <section className="border-y border-border/70 bg-secondary/35"><div className="mx-auto grid max-w-[1450px] divide-y divide-border/70 px-5 md:grid-cols-3 md:divide-x md:divide-y-0 md:px-8 lg:px-12">{badges.slice(0, 3).map((badge, index) => <div key={`${asString(badge.label)}-${index}`} className="py-8 md:px-8 md:py-10 first:md:pl-0"><div className="mb-4 grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary"><Check className="h-4 w-4" /></div><h3 className="text-sm font-bold">{asString(badge.label)}</h3>{asString(badge.description) ? <p className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">{asString(badge.description)}</p> : null}</div>)}</div></section>;
}

function ThreadsTestimonials({ block }: { block: StorePageBlock }) {
  const props = block.props as Record<string, unknown>;
  const reviews = Array.isArray(props.reviews) ? props.reviews.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
  if (!reviews.length) return null;
  return <section className="relative py-16 md:py-24"><SectionLeaves side="left" level={getDecoration(block)} /><div className="mx-auto max-w-[1280px] px-5 md:px-8"><div className="mx-auto mb-10 max-w-2xl text-center"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.22em] text-primary">Community notes</p><h2 className="text-3xl font-black tracking-[-.045em] md:text-5xl">{asString(props.title) || "Loved in real life"}</h2></div><div className="grid gap-4 md:grid-cols-3">{reviews.slice(0, 3).map((review, index) => <article key={`${asString(review.name)}-${index}`} className="rounded-[1.75rem] border border-border bg-card p-6 md:p-7"><p className="text-primary">★★★★★</p><p className="mt-4 text-sm leading-7 text-foreground/80">“{asString(review.comment) || asString(review.text)}”</p><p className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">{asString(review.name) || asString(review.author) || "Customer"}</p></article>)}</div></div></section>;
}

function ThreadsFaq({ block }: { block: StorePageBlock }) {
  const props = block.props as Record<string, unknown>;
  const entries = Array.isArray(props.faqs) ? props.faqs.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
  const [open, setOpen] = useState<number | null>(0);
  if (!entries.length) return null;
  return <section className="bg-card/55 py-16 md:py-24"><div className="mx-auto grid max-w-[1180px] gap-10 px-5 md:grid-cols-[.75fr_1.25fr] md:px-8"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.22em] text-primary">Need to know</p><h2 className="text-3xl font-black tracking-[-.045em] md:text-5xl">{asString(props.title) || "Before you order"}</h2></div><div className="border-t border-border">{entries.map((entry, index) => { const question = asString(entry.question) || asString(entry.q); const answer = asString(entry.answer) || asString(entry.a); return <div key={`${question}-${index}`} className="border-b border-border"><button type="button" onClick={() => setOpen(open === index ? null : index)} className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-bold"><span>{question}</span><ChevronDown className={`h-4 w-4 transition ${open === index ? "rotate-180" : ""}`} /></button>{open === index ? <p className="pb-5 pr-8 text-sm leading-6 text-muted-foreground">{answer}</p> : null}</div>; })}</div></div></section>;
}

export function ThreadsBlockRenderer({ block, template }: { block: StorePageBlock; template: StorefrontTemplateDefinition }) {
  switch (block.type) {
    case "hero": return <ThreadsHero block={block} />;
    case "category-showcase": return <ThreadsCategories block={block} />;
    case "featured-products": return <ThreadsProducts block={block} />;
    case "recommended-products": return <ThreadsNewArrivals block={block} />;
    case "promo-banner": return <ThreadsPromo block={block} />;
    case "social-feed": return <ThreadsCommunity block={block} />;
    case "rich-text": return <ThreadsStory block={block} />;
    case "trust-badges": return <ThreadsTrust block={block} />;
    case "testimonials": return <ThreadsTestimonials block={block} />;
    case "faq-accordion": return <ThreadsFaq block={block} />;
    default: return <StorefrontBlockRenderer block={block} template={template} />;
  }
}
