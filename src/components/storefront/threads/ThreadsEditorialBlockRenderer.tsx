"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Home,
  Leaf,
  Palette,
  Pause,
  Play,
  Shirt,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { StorePageBlock } from "@/lib/cms/schema";
import type { StorefrontTemplateDefinition } from "@/lib/cms/storefront-templates";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useProducts } from "@/hooks/useProducts";
import { useProductCategories } from "@/hooks/useProductCategories";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { ThreadsProductCard } from "@/components/storefront/threads/ThreadsProductCard";
import { storefrontPath } from "@/lib/slug";
import { StorefrontBlockRenderer } from "@/components/storefront/StorefrontBlockRenderer";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
type DecorationLevel = "none" | "subtle" | "full";
const decorationLevel = (block: StorePageBlock): DecorationLevel =>
  block.decoration ?? "subtle";

function Botanical({
  side = "left",
  level = "subtle",
  inverse = false,
}: {
  side?: "left" | "right";
  level?: DecorationLevel;
  inverse?: boolean;
}) {
  if (level === "none") return null;
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute z-[1] hidden lg:block ${
        side === "left" ? "-left-8" : "-right-8 -scale-x-100"
      } ${level === "full" ? "opacity-[.18]" : "opacity-[.1]"} ${
        inverse ? "text-primary-foreground" : "text-primary"
      }`}
    >
      <Leaf className="h-32 w-32 -rotate-[28deg] stroke-[.8]" />
      <Leaf className="-mt-14 ml-16 h-20 w-20 rotate-[8deg] stroke-[.8]" />
    </div>
  );
}

function useThreadsAutoplay(
  api: CarouselApi | undefined,
  interval: number,
  enabled: boolean,
) {
  const pausedRef = useRef(false);
  useEffect(() => {
    if (
      !api ||
      !enabled ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    let timer: number | undefined;
    const root = api.rootNode();
    const clear = () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
    const schedule = () => {
      clear();
      if (!pausedRef.current) {
        timer = window.setTimeout(() => api.scrollNext(), interval);
      }
    };
    const pause = () => {
      pausedRef.current = true;
      clear();
    };
    const resume = () => {
      pausedRef.current = false;
      schedule();
    };

    root.addEventListener("mouseenter", pause);
    root.addEventListener("mouseleave", resume);
    root.addEventListener("focusin", pause);
    root.addEventListener("focusout", resume);
    root.addEventListener("pointerdown", pause);
    root.addEventListener("pointerup", resume);
    root.addEventListener("pointercancel", resume);
    api.on("select", schedule);
    schedule();

    return () => {
      clear();
      api.off("select", schedule);
      root.removeEventListener("mouseenter", pause);
      root.removeEventListener("mouseleave", resume);
      root.removeEventListener("focusin", pause);
      root.removeEventListener("focusout", resume);
      root.removeEventListener("pointerdown", pause);
      root.removeEventListener("pointerup", resume);
      root.removeEventListener("pointercancel", resume);
    };
  }, [api, enabled, interval]);
}

function CarouselTicks({
  api,
  count,
  inverse = false,
}: {
  api: CarouselApi | undefined;
  count: number;
  inverse?: boolean;
}) {
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    if (!api) return;
    const sync = () => setSelected(count ? api.selectedScrollSnap() % count : 0);
    sync();
    api.on("select", sync);
    api.on("reInit", sync);
    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api, count]);

  if (count <= 1) return null;
  return (
    <div className="mt-5 flex items-center gap-1.5" aria-label="Carousel position">
      {Array.from({ length: Math.min(count, 8) }, (_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => api?.scrollTo(index)}
          aria-label={`Go to slide ${index + 1}`}
          aria-current={selected === index ? "true" : undefined}
          className={`h-[2px] transition-all duration-300 ${
            selected === index
              ? `w-9 ${inverse ? "bg-primary-foreground" : "bg-primary"}`
              : `w-4 ${
                  inverse ? "bg-primary-foreground/25" : "bg-primary/20"
                }`
          }`}
        />
      ))}
    </div>
  );
}

function categoryFallbackIcon(name: string): ReactNode {
  const value = name.toLowerCase();
  if (value.includes("shirt") || value.includes("polo") || value.includes("hood")) {
    return <Shirt className="h-8 w-8" />;
  }
  if (value.includes("bag")) return <ShoppingBag className="h-8 w-8" />;
  if (value.includes("home") || value.includes("decor")) {
    return <Home className="h-8 w-8" />;
  }
  return <Sparkles className="h-8 w-8" />;
}

function ThreadsHero({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const p = block.props as Record<string, unknown>;
  const image = text(p.imageUrl) || text(p.mediaUrl);
  const mobileImage = text(p.mobileImageUrl) || image;
  const eyebrow = text(p.tagline) || "Wear your story";
  const rawTitle = text(p.title) || "Wear Your Story";
  const title = rawTitle.toLowerCase() === "wear your story" ? "Wear\nYour Story" : rawTitle;
  const subtitle =
    text(p.subtitle) ||
    "Original art, rooted stories, and everyday pieces made to live with you.";

  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-secondary/35">
      <div className="mx-auto grid min-h-[390px] max-w-[1440px] grid-cols-[46%_54%] sm:min-h-[440px] md:min-h-[500px] md:grid-cols-[43%_57%] lg:min-h-[560px]">
        <div className="relative z-10 flex items-center px-5 py-10 sm:px-8 md:px-12 lg:px-16 xl:px-20">
          <div className="max-w-[500px]">
            <p className="mb-4 text-[8px] font-bold uppercase tracking-[.28em] text-primary md:text-[9px]">
              {eyebrow}
            </p>
            <h1 className="whitespace-pre-line font-serif text-[46px] font-semibold leading-[.82] tracking-[-.06em] sm:text-[58px] md:text-[74px] lg:text-[88px]">
              {title}
            </h1>
            <p className="mt-5 max-w-[390px] text-[10px] leading-5 text-foreground/68 sm:text-[11px] md:text-[12px] md:leading-6">
              {subtitle}
            </p>
            <Link
              href={storefrontPath(text(p.ctaLink) || "/shop?sort=newest", store?.slug)}
              className="mt-6 inline-flex min-h-12 items-center gap-3 rounded-[2px] bg-primary px-5 text-[8px] font-bold uppercase tracking-[.13em] text-primary-foreground md:mt-8 md:px-6 md:text-[9px]"
            >
              {text(p.ctaText) || "Explore New Arrivals"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative min-h-[390px] overflow-hidden sm:min-h-[440px] md:min-h-0">
          {image ? (
            <>
              <div className="absolute inset-0 hidden sm:block">
                <SafeStorefrontImage
                  src={image}
                  alt={text(p.imageAlt) || title.replace("\n", " ")}
                  fill
                  sizes="(min-width: 768px) 57vw, 54vw"
                  priority
                  className="object-cover"
                />
              </div>
              <div className="absolute inset-0 sm:hidden">
                <SafeStorefrontImage
                  src={mobileImage}
                  alt={text(p.imageAlt) || title.replace("\n", " ")}
                  fill
                  sizes="54vw"
                  priority
                  className="object-cover"
                />
              </div>
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-secondary via-muted to-primary/15" />
          )}
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-secondary/92 via-secondary/35 to-transparent md:w-36" />
          <div className="absolute bottom-8 right-8 hidden max-w-[210px] border-l border-background/55 pl-4 font-serif text-[20px] italic leading-[1.04] text-background/95 drop-shadow md:block lg:bottom-11 lg:right-12 lg:text-[24px]">
            Good People.
            <br />
            Brighter Tomorrow.
          </div>
        </div>
      </div>
    </section>
  );
}

const trustIcons = [Sparkles, Leaf, Palette, Heart];
function ThreadsTrustStrip({ block }: { block: StorePageBlock }) {
  const p = block.props as Record<string, unknown>;
  const raw = Array.isArray(p.badges)
    ? p.badges.filter(
        (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
      )
    : [];
  const defaults = [
    { label: "Stories You Can Wear", description: "Original art with a point of view." },
    { label: "Rooted in Bengal", description: "Local stories in current forms." },
    { label: "Illustrated to Stand Apart", description: "Designed with a distinct hand." },
    { label: "Made for Repeat Wear", description: "Everyday pieces with character." },
  ];
  const values = raw.length ? raw.slice(0, 4) : defaults;

  return (
    <section className="border-b border-border/60 bg-background">
      <div className="mx-auto grid max-w-[1320px] grid-cols-2 px-4 sm:px-6 md:grid-cols-4 md:px-8">
        {values.map((value, index) => {
          const Icon = trustIcons[index] ?? Sparkles;
          return (
            <div
              key={index}
              className="flex min-h-[88px] items-center gap-3 border-border/60 px-2 py-4 odd:border-r md:min-h-[98px] md:border-r md:px-5 md:last:border-r-0"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-primary/25 text-primary">
                <Icon className="h-4 w-4 stroke-[1.5]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold md:text-[10px]">{text(value.label)}</p>
                <p className="mt-1 line-clamp-2 text-[8px] leading-4 text-muted-foreground md:text-[9px]">
                  {text(value.description)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ThreadsCategories({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const { data: categories = [] } = useProductCategories(store?.id);
  const p = block.props as Record<string, unknown>;
  const explicit = Array.isArray(p.items)
    ? p.items.filter(
        (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
      )
    : [];
  const items = (
    explicit.length
      ? explicit.map((item) => ({
          name: text(item.label) || text(item.name),
          image: text(item.imageUrl) || text(item.image_url),
          value: text(item.value) || text(item.label) || text(item.name),
          tagline: text(item.tagline),
        }))
      : categories.map((category) => ({
          name: category.name,
          image: (category as { image_url?: string }).image_url || "",
          value: category.name,
          tagline: "",
        }))
  ).slice(0, typeof p.limit === "number" ? p.limit : 6);
  const [api, setApi] = useState<CarouselApi>();
  const [autoplayPaused, setAutoplayPaused] = useState(false);
  const autoplayEnabled = p.autoplay !== false && items.length > 1;
  useThreadsAutoplay(
    api,
    typeof p.autoplayIntervalMs === "number" ? p.autoplayIntervalMs : 4000,
    autoplayEnabled && !autoplayPaused,
  );
  if (!items.length) return null;

  const shop = storefrontPath("/shop", store?.slug);
  return (
    <section id="categories" className="bg-background py-11 md:py-14">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8">
        <div className="mb-7 flex items-end justify-between gap-5 md:mb-8">
          <div>
            <p className="mb-2 text-[8px] font-bold uppercase tracking-[.22em] text-primary">
              {text(p.tagline) || "Find your everyday"}
            </p>
            <h2 className="font-serif text-[32px] font-semibold leading-[.92] tracking-[-.035em] md:text-[42px]">
              {text(p.title) || "Shop by Category"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {autoplayEnabled ? (
              <button
                type="button"
                onClick={() => setAutoplayPaused((value) => !value)}
                aria-pressed={autoplayPaused}
                aria-label={autoplayPaused ? "Resume category carousel" : "Pause category carousel"}
                className="grid h-11 w-11 place-items-center rounded-full border border-border text-primary transition hover:border-primary"
              >
                {autoplayPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
            ) : null}
            <Link href={shop} className="inline-flex min-h-11 items-center py-3 text-[9px] font-bold text-primary">
              Explore all →
            </Link>
          </div>
        </div>

        <Carousel setApi={setApi} opts={{ align: "start", loop: items.length > 3 }} className="relative">
          <CarouselContent className="-ml-3 md:-ml-4">
            {items.map((item, index) => (
              <CarouselItem
                key={`${item.value}-${index}`}
                className="basis-[62%] pl-3 sm:basis-[38%] md:basis-[27%] md:pl-4 lg:basis-1/5"
              >
                <Link
                  href={`${shop}?category=${encodeURIComponent(item.value)}`}
                  className="group relative block overflow-hidden rounded-[3px] bg-card"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
                    {item.image ? (
                      <SafeStorefrontImage
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(min-width: 1024px) 20vw, (min-width: 768px) 27vw, (min-width: 640px) 38vw, 62vw"
                        className="object-cover transition duration-500 ease-out group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-primary">
                        {categoryFallbackIcon(item.name)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/92 via-primary/8 to-transparent" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4 text-primary-foreground md:p-5">
                    <div className="truncate font-serif text-[20px] font-semibold leading-none md:text-[23px]">
                      {item.name}
                    </div>
                    <div className="mt-1.5 truncate text-[8px] uppercase tracking-[.11em] text-primary-foreground/70 md:text-[9px]">
                      {item.tagline || "Stories you can wear"}
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          {p.showArrows !== false && items.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => api?.scrollPrev()}
                className="absolute -left-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/95 shadow-sm md:-left-5"
                aria-label="Previous category"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => api?.scrollNext()}
                className="absolute -right-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/95 shadow-sm md:-right-5"
                aria-label="Next category"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </Carousel>
        <CarouselTicks api={api} count={items.length} />
      </div>
    </section>
  );
}

function ThreadsPromo({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const p = block.props as Record<string, unknown>;
  const cards = [
    {
      image: text(p.imageUrl),
      title: text(p.title) || "Handmade for Home",
      subtitle: text(p.subtitle) || "Thoughtful pieces for home and everyday life.",
      cta: text(p.ctaText) || "Explore Collection",
      href: text(p.ctaLink) || "/shop",
      tone: "clay",
    },
    {
      image: text(p.secondaryImageUrl),
      title: text(p.secondaryTitle) || "Small Gifts, Big Meaning",
      subtitle: text(p.secondarySubtitle) || "Meaningful pieces for everyday moments.",
      cta: text(p.secondaryCtaText) || "Shop Gifts",
      href: text(p.secondaryCtaLink) || "/shop",
      tone: "green",
    },
  ];

  return (
    <section className="bg-background px-4 pb-12 sm:px-6 md:px-8 md:pb-16">
      <div className="mx-auto grid max-w-[1320px] gap-4 md:grid-cols-2 md:gap-5">
        {cards.map((card, index) => (
          <article
            key={index}
            className={`relative min-h-[300px] overflow-hidden rounded-[4px] md:min-h-[360px] ${
              card.tone === "clay"
                ? "bg-accent text-accent-foreground"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {card.image ? (
              <SafeStorefrontImage
                src={card.image}
                alt={card.title.replace("\n", " ")}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            ) : null}
            <div
              className={`absolute inset-0 ${
                card.tone === "clay"
                  ? "bg-gradient-to-r from-accent via-accent/88 to-accent/8"
                  : "bg-gradient-to-r from-primary via-primary/90 to-primary/8"
              }`}
            />
            <div className="relative z-10 flex min-h-[300px] max-w-[67%] flex-col justify-center p-7 md:min-h-[360px] md:max-w-[61%] md:p-9 lg:p-11">
              <h2 className="whitespace-pre-line font-serif text-[36px] font-semibold leading-[.88] tracking-[-.035em] md:text-[46px]">
                {card.title}
              </h2>
              <p className="mt-3 max-w-[300px] text-[9px] leading-5 opacity-80 md:text-[10px]">
                {card.subtitle}
              </p>
              <Link
                href={storefrontPath(card.href, store?.slug)}
                className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-[2px] bg-background px-4 text-[8px] font-bold uppercase tracking-[.1em] text-foreground"
              >
                {card.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ThreadsFeatured({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const { data: products = [] } = useProducts(store?.id);
  const p = block.props as Record<string, unknown>;
  const featured = products.filter((product) => product.featured);
  const source = featured.length >= 3 ? featured : products;
  const visible = source.slice(0, typeof p.limit === "number" ? p.limit : 10);
  const [api, setApi] = useState<CarouselApi>();
  const [autoplayPaused, setAutoplayPaused] = useState(false);
  const autoplayEnabled = p.autoplay !== false && visible.length > 1;
  useThreadsAutoplay(
    api,
    typeof p.autoplayIntervalMs === "number" ? p.autoplayIntervalMs : 4600,
    autoplayEnabled && !autoplayPaused,
  );
  if (!visible.length) return null;

  return (
    <section className="relative overflow-hidden bg-primary py-12 text-primary-foreground md:py-16">
      <Botanical side="right" level={decorationLevel(block)} inverse />
      <div className="relative z-10 mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8">
        <div className="mb-8 grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="max-w-[640px]">
            <p className="text-[8px] font-bold uppercase tracking-[.24em] text-primary-foreground/62">
              {text(p.tagline) || "Most loved"}
            </p>
            <h2 className="mt-2 font-serif text-[42px] font-semibold leading-[.88] tracking-[-.045em] sm:text-[48px] md:text-[58px]">
              {text(p.title) || "Featured Products"}
            </h2>
            <p className="mt-3 max-w-[500px] text-[9px] leading-5 text-primary-foreground/68 md:text-[10px]">
              {text(p.subtitle) ||
                "Curated pieces, original stories, and the styles people keep reaching for."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {autoplayEnabled ? (
              <button
                type="button"
                onClick={() => setAutoplayPaused((value) => !value)}
                aria-pressed={autoplayPaused}
                aria-label={autoplayPaused ? "Resume featured product carousel" : "Pause featured product carousel"}
                className="grid h-11 w-11 place-items-center rounded-full border border-primary-foreground/30 text-primary-foreground transition hover:border-primary-foreground/70"
              >
                {autoplayPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
            ) : null}
            <Link
              href={storefrontPath("/shop", store?.slug)}
              className="inline-flex min-h-11 items-center gap-2 px-2 py-3 text-[8px] font-bold uppercase tracking-[.1em] text-primary-foreground"
            >
              Shop collection <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <Carousel setApi={setApi} opts={{ align: "start", loop: visible.length > 3 }} className="relative">
          <CarouselContent className="-ml-3 md:-ml-4">
            {visible.map((product, index) => (
              <CarouselItem
                key={`${product.id}-${index}`}
                className="basis-[78%] pl-3 sm:basis-[46%] md:pl-4 lg:basis-[31%] xl:basis-[27%]"
              >
                <ThreadsProductCard product={product} framed />
              </CarouselItem>
            ))}
          </CarouselContent>
          {p.showArrows !== false && visible.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => api?.scrollPrev()}
                className="absolute -left-2 top-[42%] z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-primary-foreground/35 bg-primary/90 backdrop-blur-sm md:-left-5"
                aria-label="Previous product"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => api?.scrollNext()}
                className="absolute -right-2 top-[42%] z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-background bg-background text-primary shadow-xl md:-right-5"
                aria-label="Next product"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </Carousel>
        <CarouselTicks api={api} count={visible.length} inverse />
      </div>
    </section>
  );
}

function ThreadsNewArrivals({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const { data: products = [] } = useProducts(store?.id);
  const p = block.props as Record<string, unknown>;
  const visible = products.slice(0, typeof p.limit === "number" ? p.limit : 8);
  if (!visible.length) return null;

  const defaultTitle = store?.id === "preview-threads"
    ? "New at EZCOMO"
    : `New at ${store?.name || "Threads"}`;

  return (
    <section className="bg-background py-12 md:py-16">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 md:px-8">
        <div className="mb-7 flex items-end justify-between gap-5 md:mb-9">
          <div>
            <p className="mb-2 text-[8px] font-bold uppercase tracking-[.22em] text-primary">
              {text(p.tagline) || "Just landed"}
            </p>
            <h2 className="font-serif text-[34px] font-semibold leading-[.92] tracking-[-.035em] md:text-[46px]">
              {text(p.title) || defaultTitle}
            </h2>
          </div>
          <Link
            href={storefrontPath("/shop?sort=newest", store?.slug)}
            className="inline-flex min-h-11 items-center py-3 text-[9px] font-bold text-primary"
          >
            See all new arrivals →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 md:gap-x-5 md:gap-y-10">
          {visible.map((product) => (
            <ThreadsProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ThreadsCommunity({ block }: { block: StorePageBlock }) {
  const p = block.props as Record<string, unknown>;
  const images = Array.isArray(p.images)
    ? p.images
        .filter((image): image is string => typeof image === "string" && image.trim().length > 0)
        .slice(0, 4)
    : [];

  return (
    <section className="border-y border-border/60 bg-secondary/35 py-12 md:py-16">
      <div className="mx-auto grid max-w-[1320px] gap-5 px-4 sm:px-6 md:grid-cols-[.82fr_1.18fr] md:px-8">
        <div className="relative overflow-hidden rounded-[4px] bg-primary p-7 text-primary-foreground md:p-9 lg:p-11">
          <Botanical side="right" level={decorationLevel(block)} inverse />
          <div className="relative z-10">
            <p className="text-[8px] font-bold uppercase tracking-[.24em] text-primary-foreground/60">
              Community
            </p>
            <h2 className="mt-2 font-serif text-[38px] font-semibold leading-[.88] tracking-[-.04em] md:text-[50px]">
              {text(p.title) || "Join our community"}
            </h2>
            <p className="mt-4 max-w-[360px] text-[9px] leading-5 text-primary-foreground/70 md:text-[10px]">
              {text(p.subtitle) ||
                "Real outfits, repeat wears, new drops, and stories from the people who make these pieces their own."}
            </p>
            <p className="mt-6 text-[8px] font-bold uppercase tracking-[.14em] text-primary-foreground/75">
              #WearYourStory
            </p>
            <form
              onSubmit={(event) => event.preventDefault()}
              className="mt-7 flex max-w-[390px] border-b border-primary-foreground/45"
            >
              <input
                type="email"
                aria-label="Email address"
                placeholder="Your email address"
                className="h-12 min-w-0 flex-1 bg-transparent text-[10px] text-primary-foreground outline-none placeholder:text-primary-foreground/45"
              />
              <button
                type="submit"
                className="inline-flex h-12 items-center gap-2 px-2 text-[8px] font-bold uppercase tracking-[.12em]"
              >
                Join <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
          {(images.length ? images : ["", "", "", ""]).map((src, index) => (
            <div
              key={`${src || "placeholder"}-${index}`}
              className="relative aspect-[4/5] overflow-hidden rounded-[3px] bg-muted"
            >
              {src ? (
                <SafeStorefrontImage
                  src={src}
                  alt={`Community look ${index + 1}`}
                  fill
                  sizes="(min-width: 768px) 18vw, 50vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-secondary to-accent/20" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ThreadsFAQ({ block }: { block: StorePageBlock }) {
  const p = block.props as Record<string, unknown>;
  const raw = Array.isArray(p.faqs)
    ? p.faqs.filter(
        (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
      )
    : [];
  const faqs = raw.length
    ? raw.slice(0, 6).map((item) => ({
        q: text(item.q) || text(item.question),
        a: text(item.a) || text(item.answer),
      }))
    : [
        {
          q: "How do I choose the right size?",
          a: "Use the size guide on product pages and compare it with a garment you already like.",
        },
        {
          q: "How long does delivery take?",
          a: "Available delivery options and timing are shown during checkout.",
        },
        {
          q: "Can I exchange an item?",
          a: "Eligible unworn items can be exchanged according to the store's published exchange policy.",
        },
        {
          q: "How should I care for printed pieces?",
          a: "Follow the care instructions listed on the product page to keep the print and fabric looking their best.",
        },
      ];

  return (
    <section className="bg-background py-12 md:py-16">
      <div className="mx-auto grid max-w-[1160px] gap-8 px-4 sm:px-6 md:grid-cols-[.72fr_1.28fr] md:px-8">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[.24em] text-primary">Need to know</p>
          <h2 className="mt-2 font-serif text-[36px] font-semibold leading-[.9] tracking-[-.035em] md:text-[48px]">
            {text(p.title) || "Questions? We have answers"}
          </h2>
          <p className="mt-4 max-w-[320px] text-[9px] leading-5 text-muted-foreground md:text-[10px]">
            {text(p.subtitle) || "Sizing, delivery, care, and everything before checkout."}
          </p>
        </div>
        <div className="border-t border-border">
          {faqs.map((item, index) => (
            <details key={`${item.q}-${index}`} className="group border-b border-border py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[10px] font-bold [&::-webkit-details-marker]:hidden md:text-[11px]">
                <span>{item.q}</span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border text-primary transition group-open:rotate-45">+</span>
              </summary>
              <p className="max-w-[640px] pb-5 pr-10 text-[9px] leading-5 text-muted-foreground md:text-[10px]">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function extractText(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!value || typeof value !== "object") return [];
  const node = value as Record<string, unknown>;
  return [
    ...(typeof node.text === "string" && node.text.trim() ? [node.text.trim()] : []),
    ...(Array.isArray(node.content) ? node.content.flatMap(extractText) : []),
  ];
}

function ThreadsStory({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const p = block.props as Record<string, unknown>;
  const image = text(p.imageUrl);
  const eyebrow = text(p.eyebrow) || "Our Story";
  const rawTitle = text(p.title) || "Style Travels Further";
  const title =
    rawTitle.toLowerCase() === "made for wherever the day takes you."
      ? "Made for wherever\nthe day takes you."
      : rawTitle;
  const body =
    extractText(p.body)[0] ||
    "Every collection starts with a place, a person, or a memory worth carrying forward.";

  return (
    <section className="bg-background px-4 pb-12 sm:px-6 md:px-8 md:pb-16">
      <div className="relative mx-auto min-h-[360px] max-w-[1320px] overflow-hidden rounded-[4px] bg-primary text-primary-foreground md:min-h-[440px]">
        {image ? (
          <SafeStorefrontImage
            src={image}
            alt={text(p.imageAlt) || title.replace("\n", " ")}
            fill
            sizes="100vw"
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/88 to-primary/8" />
        <div className="relative z-10 flex min-h-[360px] max-w-[72%] items-center p-7 sm:max-w-[62%] md:min-h-[440px] md:max-w-[50%] md:p-11 lg:p-14">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[.24em] text-primary-foreground/60">
              {eyebrow}
            </p>
            <h2 className="mt-2 whitespace-pre-line font-serif text-[40px] font-semibold leading-[.87] tracking-[-.04em] md:text-[56px]">
              {title}
            </h2>
            <p className="mt-4 max-w-[420px] text-[9px] leading-5 text-primary-foreground/72 md:text-[10px]">
              {body}
            </p>
            <Link
              href={storefrontPath(text(p.ctaLink) || "/shop", store?.slug)}
              className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-[2px] bg-background px-5 text-[8px] font-bold uppercase tracking-[.1em] text-primary"
            >
              {text(p.ctaText) || "Explore the collection"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ThreadsEditorialBlockRenderer({
  block,
  template,
}: {
  block: StorePageBlock;
  template: StorefrontTemplateDefinition;
}) {
  switch (block.type) {
    case "hero":
      return <ThreadsHero block={block} />;
    case "trust-badges":
      return <ThreadsTrustStrip block={block} />;
    case "category-showcase":
      return <ThreadsCategories block={block} />;
    case "promo-banner":
      return <ThreadsPromo block={block} />;
    case "featured-products":
      return <ThreadsFeatured block={block} />;
    case "recommended-products":
      return <ThreadsNewArrivals block={block} />;
    case "social-feed":
      return <ThreadsCommunity block={block} />;
    case "faq-accordion":
      return <ThreadsFAQ block={block} />;
    case "rich-text":
      return <ThreadsStory block={block} />;
    default:
      return <StorefrontBlockRenderer block={block} template={template} />;
  }
}
