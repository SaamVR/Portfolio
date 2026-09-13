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
  Users,
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
    };
  }, [api, enabled, interval]);
}

function categoryFallbackIcon(name: string): ReactNode {
  const value = name.toLowerCase();
  if (value.includes("shirt") || value.includes("hood"))
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
  const tagline = preview
    ? "WEAR YOUR STORY"
    : s(p.tagline) || "Wear your story";
  const title = preview ? "Wear\nYour Story" : s(p.title) || "Wear Your Story";
  const subtitle = preview
    ? "Art. Culture. People. On a Higher Thread."
    : s(p.subtitle) ||
      "Art, culture and everyday pieces made to carry a story.";
  const cta = preview
    ? "Explore New Arrivals"
    : s(p.ctaText) || "Explore New Arrivals";

  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-secondary/40">
      <div className="mx-auto grid min-h-[220px] max-w-[1280px] grid-cols-[44%_56%] sm:min-h-[250px] md:min-h-[290px] md:grid-cols-[42%_58%] lg:min-h-[330px]">
        <div className="relative z-10 flex items-center px-4 py-5 sm:px-6 sm:py-7 md:px-10 md:py-8 lg:px-12">
          <div className="max-w-[430px]">
            <p className="mb-1.5 text-[7px] font-bold uppercase tracking-[.2em] text-primary sm:text-[8px] md:mb-2 md:text-[9px] md:tracking-[.24em]">
              {tagline}
            </p>
            <h1 className="whitespace-pre-line font-serif text-[32px] font-semibold leading-[.88] tracking-[-.05em] sm:text-[42px] md:text-[56px] lg:text-[66px]">
              {title}
            </h1>
            <p className="mt-2 max-w-[370px] text-[9px] leading-3.5 text-foreground/72 sm:text-[10px] sm:leading-4 md:mt-3 md:text-[13px] md:leading-5">
              {subtitle}
            </p>
            <Link
              href={storefrontPath(
                s(p.ctaLink) || "/shop?sort=newest",
                store?.slug,
              )}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-sm bg-primary px-3 text-[8px] font-semibold text-primary-foreground sm:px-4 sm:text-[9px] md:mt-4 md:gap-3 md:px-5 md:text-[10px]"
            >
              {cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <div className="relative min-h-[220px] overflow-hidden sm:min-h-[250px] md:min-h-0">
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
          <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-secondary/90 to-transparent md:w-28" />
          <div className="absolute right-5 top-5 hidden rotate-[-5deg] font-serif text-[20px] italic leading-[1.05] text-foreground/70 lg:block">
            Good People.
            <br />
            Brighter Tomorrow.
          </div>
        </div>
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
        (item): item is Record<string, unknown> =>
          !!item && typeof item === "object",
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
    typeof p.autoplayIntervalMs === "number" ? p.autoplayIntervalMs : 4200,
    p.autoplay !== false && items.length > 1,
  );
  if (!items.length) return null;
  const shop = storefrontPath("/shop", store?.slug);

  return (
    <section id="categories" className="bg-background py-5 md:py-7">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-5 md:px-8">
        <div className="mb-3 flex items-end justify-between gap-4">
          <h2 className="font-serif text-[24px] font-semibold leading-none md:text-[27px]">
            {s(p.title) || "Shop by Category"}
          </h2>
          <Link href={shop} className="min-h-11 py-3 text-[9px] font-semibold">
            Explore all categories →
          </Link>
        </div>
        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: items.length > 2 }}
        >
          <CarouselContent className="-ml-2.5">
            {items.map((item, index) => (
              <CarouselItem
                key={`${item.value}-${index}`}
                className="basis-[21%] pl-2.5 sm:basis-[19%] md:basis-1/5"
              >
                <Link
                  href={`${shop}?category=${encodeURIComponent(item.value)}`}
                  className="group relative block text-center md:overflow-hidden md:rounded-[5px] md:border md:border-border/70 md:bg-card md:text-left"
                >
                  <div className="relative mx-auto aspect-square w-[56px] overflow-hidden rounded-full border border-border/70 bg-secondary sm:w-[70px] md:aspect-[1.12/1] md:w-full md:rounded-none md:border-0">
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
                    <div className="absolute inset-0 hidden bg-gradient-to-t from-primary/90 via-primary/10 to-transparent md:block" />
                  </div>
                  <div className="mt-1 px-0.5 text-foreground md:absolute md:inset-x-0 md:bottom-0 md:mt-0 md:p-3 md:text-primary-foreground">
                    <div className="truncate text-[8px] font-semibold sm:text-[9px] md:text-[12px]">
                      {item.name}
                    </div>
                    <div className="mt-0.5 hidden line-clamp-1 text-[8px] text-primary-foreground/75 md:block">
                      {item.tagline || "Stories you can wear"}
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
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
      cta: preview
        ? "Explore Home Decor"
        : s(p.ctaText) || "Explore Collection",
      href: s(p.ctaLink) || "/shop",
      tone: "clay",
    },
    {
      image: s(p.secondaryImageUrl),
      title: preview
        ? "Small Gifts,\nBig Meaning"
        : s(p.secondaryTitle) || "Small Gifts, Big Meaning",
      subtitle: preview
        ? "Handcrafted gifts for every special moment."
        : s(p.secondarySubtitle) || "Meaningful pieces for everyday moments.",
      cta: preview ? "Shop Gifts" : s(p.secondaryCtaText) || "Shop Gifts",
      href: s(p.secondaryCtaLink) || "/shop",
      tone: "green",
    },
  ];

  return (
    <section className="bg-background px-4 pb-5 sm:px-5 md:px-8 md:pb-7">
      <div className="mx-auto grid max-w-[1280px] gap-3 md:grid-cols-2">
        {cards.map((card, index) => (
          <article
            key={index}
            className={`relative min-h-[180px] overflow-hidden rounded-[6px] border border-border/60 ${card.tone === "clay" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}
          >
            {card.image ? (
              <SafeStorefrontImage
                src={card.image}
                alt={card.title.replace("\n", " ")}
                fill
                className="object-cover"
              />
            ) : null}
            <div
              className={`absolute inset-0 ${card.tone === "clay" ? "bg-gradient-to-r from-accent via-accent/90 to-accent/10" : "bg-gradient-to-r from-primary via-primary/92 to-primary/10"}`}
            />
            <div className="relative z-10 flex min-h-[180px] max-w-[58%] flex-col justify-center p-5 md:p-6">
              <h2 className="whitespace-pre-line font-serif text-[28px] font-semibold leading-[.9] md:text-[34px]">
                {card.title}
              </h2>
              <p className="mt-2 text-[10px] leading-4 opacity-80">
                {card.subtitle}
              </p>
              <Link
                href={storefrontPath(card.href, store?.slug)}
                className="mt-4 inline-flex min-h-11 w-fit items-center gap-2 rounded-sm bg-background px-4 text-[9px] font-semibold text-foreground"
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

function ThreadsNewArrivals({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const { data: products = [] } = useProducts(store?.id);
  const p = block.props as Record<string, unknown>;
  const visible = products.slice(0, typeof p.limit === "number" ? p.limit : 8);
  if (!visible.length) return null;
  return (
    <section className="bg-background py-4 md:py-6">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-5 md:px-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-serif text-[24px] font-semibold leading-none md:text-[27px]">
            {isPreview(store?.id)
              ? "New at CHAPCHITRA"
              : s(p.title) || `New at ${store?.name || "Threads"}`}
          </h2>
          <Link
            href={storefrontPath("/shop?sort=newest", store?.slug)}
            className="min-h-11 py-3 text-[9px] font-semibold"
          >
            See All New Arrivals →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((product) => (
            <ThreadsProductCard key={product.id} product={product} compact />
          ))}
        </div>
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
  const visible = source.slice(0, typeof p.limit === "number" ? p.limit : 8);
  const [api, setApi] = useState<CarouselApi>();
  useThreadsAutoplay(
    api,
    typeof p.autoplayIntervalMs === "number" ? p.autoplayIntervalMs : 4600,
    p.autoplay !== false && visible.length > 1,
  );
  if (!visible.length) return null;

  return (
    <section className="relative overflow-hidden bg-primary py-6 text-primary-foreground md:py-8">
      <Botanical side="left" level={decorationLevel(block)} inverse />
      <Botanical side="right" level={decorationLevel(block)} inverse />
      <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-5 md:px-8">
        <div className="mb-4 flex items-end justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-[27px] font-semibold leading-none md:text-[31px]">
              {s(p.title) || "Featured Products"}
            </h2>
            <span className="hidden h-px w-12 bg-primary-foreground/50 sm:block" />
          </div>
          <p className="hidden text-[9px] text-primary-foreground/70 sm:block">
            {s(p.subtitle) || "Curated pieces. Timeless stories."}
          </p>
        </div>
        <Carousel
          setApi={setApi}
          opts={{ align: "center", loop: visible.length > 1 }}
          className="relative"
        >
          <CarouselContent className="-ml-3">
            {visible.map((product, index) => (
              <CarouselItem
                key={`${product.id}-${index}`}
                className="basis-[76%] pl-3 sm:basis-[46%] md:basis-[34%] lg:basis-[27%]"
              >
                <ThreadsProductCard product={product} framed />
              </CarouselItem>
            ))}
          </CarouselContent>
          {p.showArrows !== false ? (
            <>
              <button
                type="button"
                onClick={() => api?.scrollPrev()}
                className="absolute left-1 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-primary-foreground/60 bg-primary/80"
                aria-label="Previous product"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => api?.scrollNext()}
                className="absolute right-1 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-primary-foreground/60 bg-primary/80"
                aria-label="Next product"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </Carousel>
      </div>
    </section>
  );
}

const valueIcons = [Shirt, Users, Palette, Heart];
function ThreadsValues({ block }: { block: StorePageBlock }) {
  const p = block.props as Record<string, unknown>;
  const raw = Array.isArray(p.badges)
    ? p.badges.filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === "object",
      )
    : [];
  const defaults = [
    {
      label: "Stories You Can Wear",
      description: "Our clothing carries real people and places.",
    },
    {
      label: "Rooted in Bengal",
      description: "Inspired by our heritage, made for today.",
    },
    {
      label: "Illustrated to Stand Apart",
      description: "Original art, not mass production.",
    },
    {
      label: "Own What You Wear",
      description: "Wear with purpose and personality.",
    },
  ];
  const values = raw.length ? raw.slice(0, 4) : defaults;
  return (
    <section className="bg-background py-5 md:py-7">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-5 md:px-8">
        <h2 className="mb-4 text-center font-serif text-[24px] font-semibold md:text-[28px]">
          {s(p.title) || "More Than a T-Shirt"}
        </h2>
        <div className="grid gap-3 md:grid-cols-4 md:gap-4">
          {values.map((value, index) => {
            const Icon = valueIcons[index] ?? Sparkles;
            return (
              <div
                key={index}
                className="flex items-center gap-3 text-left md:block md:text-center"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground md:mx-auto">
                  <Icon className="h-5 w-5 stroke-[1.6]" />
                </div>
                <div className="min-w-0 md:mt-2">
                  <div className="text-[10px] font-semibold">
                    {s(value.label)}
                  </div>
                  <div className="mt-0.5 max-w-[220px] text-[8px] leading-3 text-muted-foreground md:mx-auto md:mt-1 md:max-w-[150px]">
                    {s(value.description)}
                  </div>
                </div>
              </div>
            );
          })}
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
    ...(typeof node.text === "string" && node.text.trim()
      ? [node.text.trim()]
      : []),
    ...(Array.isArray(node.content) ? node.content.flatMap(extractText) : []),
  ];
}

function ThreadsStory({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const p = block.props as Record<string, unknown>;
  const image = s(p.imageUrl);
  const title = isPreview(store?.id)
    ? "Objects\nThat Tell Stories"
    : s(p.title) || "Objects That Tell Stories";
  const body = isPreview(store?.id)
    ? "More than merchandise — we bring people, places and stories into everyday things."
    : extractText(p.body)[0] ||
      "Every collection starts with a place, a person, or a memory worth carrying forward.";
  return (
    <section className="bg-secondary/35">
      <div className="mx-auto grid max-w-[1280px] grid-cols-[54%_46%] md:grid-cols-[36%_64%]">
        <div className="relative order-2 min-h-[170px] md:min-h-[260px]">
          {image ? (
            <SafeStorefrontImage
              src={image}
              alt={s(p.imageAlt) || title.replace("\n", " ")}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-secondary to-muted" />
          )}
        </div>
        <div className="order-1 flex items-center px-4 py-5 sm:px-5 md:px-8 md:py-7">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[.2em] text-primary">
              Our Story
            </p>
            <h2 className="mt-1 whitespace-pre-line font-serif text-[24px] font-semibold leading-[.9] sm:text-[27px] md:text-[36px]">
              {title}
            </h2>
            <p className="mt-2 text-[8px] leading-3.5 text-foreground/70 sm:text-[9px] md:mt-3 md:text-[10px] md:leading-4">
              {body}
            </p>
            <Link
              href={storefrontPath(s(p.ctaLink) || "/about", store?.slug)}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-sm bg-primary px-4 text-[9px] font-semibold text-primary-foreground"
            >
              {s(p.ctaText) || "Read Our Story"}
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
    case "category-showcase":
      return <ThreadsCategories block={block} />;
    case "promo-banner":
      return <ThreadsPromo block={block} />;
    case "recommended-products":
      return <ThreadsNewArrivals block={block} />;
    case "featured-products":
      return <ThreadsFeatured block={block} />;
    case "trust-badges":
      return <ThreadsValues block={block} />;
    case "rich-text":
      return <ThreadsStory block={block} />;
    default:
      return <StorefrontBlockRenderer block={block} template={template} />;
  }
}
