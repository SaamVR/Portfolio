"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Home,
  Leaf,
  Palette,
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

const s = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const isPreview = (id?: string | null) => id === "preview-threads";

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
      className={`pointer-events-none absolute z-[1] hidden md:block ${side === "left" ? "-left-8" : "-right-8 -scale-x-100"} ${level === "full" ? "opacity-25" : "opacity-15"} ${inverse ? "text-primary-foreground" : "text-primary"}`}
    >
      <Leaf className="h-24 w-24 -rotate-[24deg] stroke-[1]" />
      <Leaf className="-mt-11 ml-12 h-16 w-16 rotate-[12deg] stroke-[1]" />
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
      if (!pausedRef.current)
        timer = window.setTimeout(() => api.scrollNext(), interval);
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

function ThreadsCarouselTicks({
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
    const sync = () => setSelected(count > 0 ? api.selectedScrollSnap() % count : 0);
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
    <div className="mt-3 flex items-center justify-center gap-1.5" aria-label="Carousel position">
      {Array.from({ length: Math.min(count, 8) }, (_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => api?.scrollTo(index)}
          aria-label={`Go to slide ${index + 1}`}
          aria-current={selected === index ? "true" : undefined}
          className={`h-[2px] transition-all ${selected === index ? `w-7 ${inverse ? "bg-primary-foreground" : "bg-primary"}` : `w-3 ${inverse ? "bg-primary-foreground/30" : "bg-primary/25"}`}`}
        />
      ))}
    </div>
  );
}

function categoryFallbackIcon(name: string): ReactNode {
  const value = name.toLowerCase();
  if (value.includes("shirt") || value.includes("polo") || value.includes("hood"))
    return <Shirt className="h-7 w-7" />;
  if (value.includes("bag")) return <ShoppingBag className="h-7 w-7" />;
  if (value.includes("home") || value.includes("decor"))
    return <Home className="h-7 w-7" />;
  return <Sparkles className="h-7 w-7" />;
}

function ThreadsHero({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const p = block.props as Record<string, unknown>;
  const preview = isPreview(store?.id);
  const image = s(p.imageUrl) || s(p.mediaUrl);
  const mobileImage = s(p.mobileImageUrl) || image;
  const tagline = preview ? "WEAR YOUR STORY" : s(p.tagline) || "Wear your story";
  const title = preview ? "Wear\nYour Story" : s(p.title) || "Wear Your Story";
  const subtitle = preview
    ? "Art. Culture. People. On a Higher Thread."
    : s(p.subtitle) || "Art, culture and everyday pieces made to carry a story.";
  const cta = preview ? "Explore New Arrivals" : s(p.ctaText) || "Explore New Arrivals";

  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-secondary/35">
      <div className="mx-auto grid min-h-[230px] max-w-[1280px] grid-cols-[44%_56%] sm:min-h-[270px] md:min-h-[330px] md:grid-cols-[41%_59%] lg:min-h-[365px]">
        <div className="relative z-10 flex items-center px-4 py-5 sm:px-6 sm:py-7 md:px-10 lg:px-12">
          <div className="max-w-[430px]">
            <p className="mb-2 text-[7px] font-bold uppercase tracking-[.24em] text-primary sm:text-[8px] md:text-[9px]">
              {tagline}
            </p>
            <h1 className="whitespace-pre-line font-serif text-[34px] font-semibold leading-[.86] tracking-[-.055em] sm:text-[45px] md:text-[59px] lg:text-[68px]">
              {title}
            </h1>
            <p className="mt-2.5 max-w-[360px] text-[9px] leading-4 text-foreground/72 sm:text-[10px] md:mt-3 md:text-[12px] md:leading-5">
              {subtitle}
            </p>
            <Link
              href={storefrontPath(s(p.ctaLink) || "/shop?sort=newest", store?.slug)}
              className="mt-3.5 inline-flex min-h-11 items-center gap-2.5 rounded-[3px] bg-primary px-4 text-[8px] font-bold uppercase tracking-[.08em] text-primary-foreground md:mt-5 md:px-5 md:text-[9px]"
            >
              {cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <div className="relative min-h-[230px] overflow-hidden sm:min-h-[270px] md:min-h-0">
          {image ? (
            <>
              <div className="absolute inset-0 hidden sm:block">
                <SafeStorefrontImage
                  src={image}
                  alt={s(p.imageAlt) || title.replace("\n", " ")}
                  fill
                  priority
                  className="object-cover"
                />
              </div>
              <div className="absolute inset-0 sm:hidden">
                <SafeStorefrontImage
                  src={mobileImage}
                  alt={s(p.imageAlt) || title.replace("\n", " ")}
                  fill
                  priority
                  className="object-cover"
                />
              </div>
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted" />
          )}
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-secondary/85 to-transparent sm:w-20 md:w-28" />
          <div className="absolute right-5 top-5 hidden rotate-[-4deg] font-serif text-[20px] italic leading-[1.02] text-background/90 drop-shadow md:block lg:right-8 lg:top-8 lg:text-[24px]">
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
        (item): item is Record<string, unknown> => !!item && typeof item === "object",
      )
    : [];
  const defaults = [
    { label: "Stories You Can Wear", description: "Art with a point of view." },
    { label: "Rooted in Bengal", description: "Local stories, current forms." },
    { label: "Original Illustration", description: "Designed to stand apart." },
    { label: "Made for Repeat Wear", description: "Everyday pieces with character." },
  ];
  const values = raw.length ? raw.slice(0, 4) : defaults;

  return (
    <section className="border-b border-border/70 bg-background">
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 px-4 sm:px-5 md:grid-cols-4 md:px-8">
        {values.map((value, index) => {
          const Icon = trustIcons[index] ?? Sparkles;
          return (
            <div
              key={index}
              className="flex min-h-[72px] items-center gap-2.5 border-border/65 px-1 py-3 odd:border-r md:min-h-[78px] md:border-r md:px-4 md:odd:border-r last:border-r-0"
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-primary/25 text-primary">
                <Icon className="h-3.5 w-3.5 stroke-[1.6]" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[8px] font-bold sm:text-[9px]">{s(value.label)}</p>
                <p className="mt-0.5 line-clamp-2 text-[7px] leading-3 text-muted-foreground sm:text-[8px]">
                  {s(value.description)}
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
        (item): item is Record<string, unknown> => !!item && typeof item === "object",
      )
    : [];
  const items = (
    explicit.length
      ? explicit.map((item) => ({
          name: s(item.label) || s(item.name),
          image: s(item.imageUrl) || s(item.image_url),
          value: s(item.value) || s(item.label) || s(item.name),
          tagline: s(item.tagline),
        }))
      : categories.map((category) => ({
          name: category.name,
          image: (category as { image_url?: string }).image_url || "",
          value: category.name,
          tagline: "",
        }))
  ).slice(0, typeof p.limit === "number" ? p.limit : 5);
  const [api, setApi] = useState<CarouselApi>();
  useThreadsAutoplay(
    api,
    typeof p.autoplayIntervalMs === "number" ? p.autoplayIntervalMs : 3600,
    p.autoplay !== false && items.length > 1,
  );
  if (!items.length) return null;
  const shop = storefrontPath("/shop", store?.slug);

  return (
    <section id="categories" className="bg-background py-6 md:py-8">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-5 md:px-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[7px] font-bold uppercase tracking-[.2em] text-primary md:text-[8px]">
              {s(p.tagline) || "Find your everyday"}
            </p>
            <h2 className="font-serif text-[25px] font-semibold leading-none md:text-[30px]">
              {s(p.title) || "Shop by Category"}
            </h2>
          </div>
          <Link href={shop} className="inline-flex min-h-11 items-center py-3 text-[8px] font-bold text-primary md:text-[9px]">
            Explore all →
          </Link>
        </div>
        <Carousel setApi={setApi} opts={{ align: "start", loop: items.length > 2 }} className="relative">
          <CarouselContent className="-ml-2.5 md:-ml-3">
            {items.map((item, index) => (
              <CarouselItem
                key={`${item.value}-${index}`}
                className="basis-[42%] pl-2.5 sm:basis-[29%] md:basis-1/5 md:pl-3"
              >
                <Link
                  href={`${shop}?category=${encodeURIComponent(item.value)}`}
                  className="group relative block overflow-hidden rounded-[5px] border border-border/70 bg-card"
                >
                  <div className="relative aspect-[1.03/1] overflow-hidden bg-secondary md:aspect-[1.14/1]">
                    {item.image ? (
                      <SafeStorefrontImage
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-[1.025]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-primary">
                        {categoryFallbackIcon(item.name)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/5 to-transparent" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3 text-primary-foreground">
                    <div className="truncate text-[10px] font-bold md:text-[11px]">{item.name}</div>
                    <div className="mt-0.5 hidden truncate text-[7px] text-primary-foreground/70 sm:block md:text-[8px]">
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
        <ThreadsCarouselTicks api={api} count={items.length} />
      </div>
    </section>
  );
}

function ThreadsPromo({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const p = block.props as Record<string, unknown>;
  const preview = isPreview(store?.id);
  const cards = [
    {
      image: s(p.imageUrl),
      title: preview ? "Handmade\nfor Home" : s(p.title) || "Handmade for Home",
      subtitle: preview
        ? "Thoughtful pieces for a warmer, art-led home."
        : s(p.subtitle) || "Thoughtful pieces for home and everyday life.",
      cta: preview ? "Explore Home Decor" : s(p.ctaText) || "Explore Collection",
      href: s(p.ctaLink) || "/shop",
      tone: "clay",
    },
    {
      image: s(p.secondaryImageUrl),
      title: preview ? "Small Gifts,\nBig Meaning" : s(p.secondaryTitle) || "Small Gifts, Big Meaning",
      subtitle: preview
        ? "Handcrafted gifts for every special moment."
        : s(p.secondarySubtitle) || "Meaningful pieces for everyday moments.",
      cta: preview ? "Shop Gifts" : s(p.secondaryCtaText) || "Shop Gifts",
      href: s(p.secondaryCtaLink) || "/shop",
      tone: "green",
    },
  ];

  return (
    <section className="bg-background px-4 pb-6 sm:px-5 md:px-8 md:pb-8">
      <div className="mx-auto grid max-w-[1280px] gap-3 md:grid-cols-2 md:gap-4">
        {cards.map((card, index) => (
          <article
            key={index}
            className={`relative min-h-[190px] overflow-hidden rounded-[6px] border border-border/60 md:min-h-[215px] ${card.tone === "clay" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}
          >
            {card.image ? (
              <SafeStorefrontImage src={card.image} alt={card.title.replace("\n", " ")} fill className="object-cover" />
            ) : null}
            <div
              className={`absolute inset-0 ${card.tone === "clay" ? "bg-gradient-to-r from-accent via-accent/92 to-accent/12" : "bg-gradient-to-r from-primary via-primary/92 to-primary/12"}`}
            />
            <div className="relative z-10 flex min-h-[190px] max-w-[61%] flex-col justify-center p-5 md:min-h-[215px] md:p-7">
              <h2 className="whitespace-pre-line font-serif text-[29px] font-semibold leading-[.9] md:text-[36px]">
                {card.title}
              </h2>
              <p className="mt-2 max-w-[240px] text-[9px] leading-4 opacity-82 md:text-[10px]">{card.subtitle}</p>
              <Link
                href={storefrontPath(card.href, store?.slug)}
                className="mt-4 inline-flex min-h-11 w-fit items-center gap-2 rounded-[3px] bg-background px-4 text-[8px] font-bold uppercase tracking-[.06em] text-foreground"
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
  useThreadsAutoplay(
    api,
    typeof p.autoplayIntervalMs === "number" ? p.autoplayIntervalMs : 4400,
    p.autoplay !== false && visible.length > 1,
  );
  if (!visible.length) return null;

  return (
    <section className="relative overflow-hidden bg-primary py-7 text-primary-foreground md:py-9">
      <Botanical side="right" level={decorationLevel(block)} inverse />
      <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-5 md:px-8">
        <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:gap-5 lg:grid-cols-[245px_minmax(0,1fr)]">
          <aside className="relative overflow-hidden rounded-[6px] bg-background p-5 text-foreground md:min-h-[330px] md:p-6">
            <Botanical level={decorationLevel(block)} />
            <div className="relative z-10 flex h-full flex-col">
              <p className="text-[7px] font-bold uppercase tracking-[.22em] text-primary md:text-[8px]">
                {s(p.tagline) || "Most loved"}
              </p>
              <h2 className="mt-2 font-serif text-[32px] font-semibold leading-[.88] tracking-[-.04em] md:text-[38px]">
                {s(p.title) || "Featured Products"}
              </h2>
              <p className="mt-3 max-w-[185px] text-[9px] leading-4 text-muted-foreground md:text-[10px]">
                {s(p.subtitle) || "Curated pieces, original stories, and the styles people keep reaching for."}
              </p>
              <div className="mt-5 h-px w-12 bg-primary/35 md:mt-auto" />
              <Link
                href={storefrontPath("/shop", store?.slug)}
                className="mt-4 inline-flex min-h-11 items-center gap-2 py-3 text-[8px] font-bold uppercase tracking-[.08em] text-primary"
              >
                Shop the collection <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </aside>

          <div className="min-w-0 self-center">
            <Carousel setApi={setApi} opts={{ align: "start", loop: visible.length > 2 }} className="relative">
              <CarouselContent className="-ml-3">
                {visible.map((product, index) => (
                  <CarouselItem
                    key={`${product.id}-${index}`}
                    className="basis-[72%] pl-3 sm:basis-[47%] lg:basis-[33.333%]"
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
                    className="absolute -left-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-primary-foreground/45 bg-primary/92 backdrop-blur-sm"
                    aria-label="Previous product"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => api?.scrollNext()}
                    className="absolute -right-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-primary-foreground/55 bg-background text-primary shadow-lg md:-right-4"
                    aria-label="Next product"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              ) : null}
            </Carousel>
            <ThreadsCarouselTicks api={api} count={visible.length} inverse />
          </div>
        </div>
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

  return (
    <section className="bg-background py-7 md:py-9">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-5 md:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[7px] font-bold uppercase tracking-[.2em] text-primary md:text-[8px]">
              {s(p.tagline) || "Just landed"}
            </p>
            <h2 className="font-serif text-[27px] font-semibold leading-none md:text-[32px]">
              {isPreview(store?.id)
                ? "New at CHAPCHITRA"
                : s(p.title) || `New at ${store?.name || "Threads"}`}
            </h2>
          </div>
          <Link
            href={storefrontPath("/shop?sort=newest", store?.slug)}
            className="inline-flex min-h-11 items-center py-3 text-[8px] font-bold text-primary md:text-[9px]"
          >
            See all new arrivals →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 md:gap-x-4 md:gap-y-8">
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
    ? p.images.filter((image): image is string => typeof image === "string" && image.trim().length > 0).slice(0, 4)
    : [];
  if (!images.length) return null;

  return (
    <section className="border-y border-border/60 bg-secondary/35 py-7 md:py-9">
      <div className="mx-auto grid max-w-[1280px] gap-4 px-4 sm:px-5 md:grid-cols-[.7fr_1.3fr] md:px-8">
        <div className="flex items-center rounded-[6px] bg-primary p-6 text-primary-foreground md:p-7">
          <div>
            <p className="text-[7px] font-bold uppercase tracking-[.22em] text-primary-foreground/65 md:text-[8px]">Community</p>
            <h2 className="mt-2 font-serif text-[31px] font-semibold leading-[.9] md:text-[38px]">
              {s(p.title) || "Join our community"}
            </h2>
            <p className="mt-3 max-w-[290px] text-[9px] leading-4 text-primary-foreground/72 md:text-[10px]">
              {s(p.subtitle) || "Real outfits, repeat wears, and the people who make these pieces their own."}
            </p>
            <div className="mt-5 h-px w-14 bg-primary-foreground/35" />
            <p className="mt-3 text-[8px] font-bold uppercase tracking-[.12em] text-primary-foreground/80">#WearYourStory</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
          {images.map((src, index) => (
            <div key={`${src}-${index}`} className="relative aspect-[4/5] overflow-hidden rounded-[5px] bg-muted">
              <SafeStorefrontImage src={src} alt={`Community look ${index + 1}`} fill className="object-cover" />
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
    ? p.faqs.filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    : [];
  const faqs = raw.length
    ? raw.slice(0, 6).map((item) => ({ q: s(item.q) || s(item.question), a: s(item.a) || s(item.answer) }))
    : [
        { q: "How do I choose the right size?", a: "Use the size guide on product pages and compare it with a garment you already like." },
        { q: "How long does delivery take?", a: "Available delivery options and timing are shown during checkout." },
        { q: "Can I exchange an item?", a: "Eligible unworn items can be exchanged according to the store's published exchange policy." },
        { q: "How should I care for printed pieces?", a: "Follow the care instructions listed on the product page to keep the print and fabric looking their best." },
      ];

  return (
    <section className="bg-background py-8 md:py-10">
      <div className="mx-auto grid max-w-[1100px] gap-6 px-4 sm:px-5 md:grid-cols-[.72fr_1.28fr] md:px-8">
        <div>
          <p className="text-[7px] font-bold uppercase tracking-[.22em] text-primary md:text-[8px]">Need to know</p>
          <h2 className="mt-2 font-serif text-[30px] font-semibold leading-[.92] md:text-[38px]">
            {s(p.title) || "Questions? We have answers"}
          </h2>
          <p className="mt-3 max-w-[300px] text-[9px] leading-4 text-muted-foreground md:text-[10px]">
            {s(p.subtitle) || "Sizing, delivery, care, and everything before checkout."}
          </p>
        </div>
        <div className="border-t border-border">
          {faqs.map((item, index) => (
            <details key={`${item.q}-${index}`} className="group border-b border-border py-1">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[10px] font-bold [&::-webkit-details-marker]:hidden md:text-[11px]">
                <span>{item.q}</span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border text-primary transition group-open:rotate-45">+</span>
              </summary>
              <p className="max-w-[640px] pb-4 pr-10 text-[9px] leading-4 text-muted-foreground md:text-[10px] md:leading-5">{item.a}</p>
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
  const image = s(p.imageUrl);
  const eyebrow = isPreview(store?.id) ? "Style Travels Further" : s(p.eyebrow) || "Our Story";
  const title = isPreview(store?.id)
    ? "Made for wherever\nthe day takes you."
    : s(p.title) || "Objects That Tell Stories";
  const body = isPreview(store?.id)
    ? "Easy layers and expressive graphics should feel just as good on the tenth wear as the first."
    : extractText(p.body)[0] || "Every collection starts with a place, a person, or a memory worth carrying forward.";

  return (
    <section className="bg-background px-4 pb-8 sm:px-5 md:px-8 md:pb-10">
      <div className="relative mx-auto min-h-[245px] max-w-[1280px] overflow-hidden rounded-[7px] bg-primary text-primary-foreground md:min-h-[310px]">
        {image ? (
          <SafeStorefrontImage
            src={image}
            alt={s(p.imageAlt) || title.replace("\n", " ")}
            fill
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/88 to-primary/12" />
        <div className="relative z-10 flex min-h-[245px] max-w-[58%] items-center p-6 md:min-h-[310px] md:max-w-[48%] md:p-9">
          <div>
            <p className="text-[7px] font-bold uppercase tracking-[.22em] text-primary-foreground/65 md:text-[8px]">{eyebrow}</p>
            <h2 className="mt-2 whitespace-pre-line font-serif text-[31px] font-semibold leading-[.9] md:text-[42px]">{title}</h2>
            <p className="mt-3 max-w-[390px] text-[9px] leading-4 text-primary-foreground/72 md:text-[10px] md:leading-5">{body}</p>
            <Link
              href={storefrontPath(s(p.ctaLink) || "/shop", store?.slug)}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[3px] bg-background px-4 text-[8px] font-bold uppercase tracking-[.08em] text-primary"
            >
              {s(p.ctaText) || "Explore the collection"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ThreadsBlockRenderer({
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
