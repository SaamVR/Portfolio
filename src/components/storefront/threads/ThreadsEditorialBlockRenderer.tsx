"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  CreditCard,
  Home,
  Leaf,
  PackageCheck,
  Palette,
  Pause,
  Play,
  Shirt,
  ShoppingBag,
  Sparkles,
  Truck,
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
import { shouldUseSpecializedBlockRenderer } from "@/lib/cms/storefront-platform/variants/specialized-routing";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
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
    const sync = () =>
      setSelected(count ? api.selectedScrollSnap() % count : 0);
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
    <div
      className="mt-3 flex items-center gap-1.5"
      aria-label="Carousel position"
    >
      {Array.from({ length: Math.min(count, 8) }, (_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => api?.scrollTo(index)}
          aria-label={`Go to slide ${index + 1}`}
          aria-current={selected === index ? "true" : undefined}
          className="grid h-11 min-w-11 place-items-center"
        >
          <span
            aria-hidden
            className={`h-[2px] transition-all duration-300 ${
              selected === index
                ? `w-9 ${inverse ? "bg-primary-foreground" : "bg-primary"}`
                : `w-4 ${inverse ? "bg-primary-foreground/25" : "bg-primary/20"}`
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function categoryFallbackIcon(name: string): ReactNode {
  const value = name.toLowerCase();
  if (
    value.includes("shirt") ||
    value.includes("polo") ||
    value.includes("hood")
  ) {
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
  const eyebrow = text(p.tagline) || "New Collection";
  const rawTitle = text(p.title) || "Wear Your Story";
  const title =
    rawTitle.toLowerCase() === "wear your story"
      ? "Wear\nYour Story"
      : rawTitle;
  const subtitle =
    text(p.subtitle) || "Thoughtfully designed. Made for your everyday.";
  const isReferencePreview = store?.id === "preview-threads";

  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-secondary/30">
      <div className="mx-auto grid max-w-[1440px] md:min-h-[300px] md:grid-cols-[44%_56%] min-[900px]:min-h-[225px] min-[900px]:grid-cols-[42%_38%_20%] xl:min-h-[285px]">
        <div className="relative z-10 flex items-center px-6 py-9 sm:px-8 md:px-12 min-[900px]:py-5 lg:px-16 xl:px-20">
          <div className="max-w-[460px]">
            <p className="mb-2.5 text-[8px] font-bold uppercase tracking-[.28em] text-foreground md:text-[9px]">
              {isReferencePreview ? "New Collection" : eyebrow}
            </p>
            <h1 className="whitespace-pre-line font-serif text-[46px] font-semibold leading-[.82] tracking-[-.06em] sm:text-[54px] md:text-[60px] min-[900px]:text-[54px] lg:text-[58px] xl:text-[66px]">
              {title}
            </h1>
            <p className="mt-2.5 max-w-[390px] text-[10px] leading-5 text-foreground/76 md:text-[11px]">
              {isReferencePreview
                ? "Thoughtfully designed. Made for your everyday."
                : subtitle}
            </p>
            <Link
              href={storefrontPath(
                text(p.ctaLink) || "/shop?sort=newest",
                store?.slug,
              )}
              className="mt-3.5 inline-flex min-h-11 items-center gap-4 rounded-[3px] bg-primary px-5 text-[8px] font-bold tracking-[.02em] text-primary-foreground md:px-6 md:text-[9px]"
            >
              {isReferencePreview
                ? "Shop New Arrivals"
                : text(p.ctaText) || "Explore New Arrivals"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative min-h-[300px] overflow-hidden md:min-h-0">
          {image ? (
            <>
              <div className="absolute inset-0 hidden sm:block">
                <SafeStorefrontImage
                  src={image}
                  alt={text(p.imageAlt) || title.replace("\n", " ")}
                  fill
                  sizes="(min-width: 1024px) 38vw, 56vw"
                  priority
                  className="object-cover"
                />
              </div>
              <div className="absolute inset-0 sm:hidden">
                <SafeStorefrontImage
                  src={mobileImage}
                  alt={text(p.imageAlt) || title.replace("\n", " ")}
                  fill
                  sizes="100vw"
                  priority
                  className="object-cover"
                />
              </div>
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-secondary via-muted to-primary/15" />
          )}
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-secondary/70 to-transparent" />
        </div>

        <div className="relative hidden items-center bg-background/65 px-6 min-[900px]:flex xl:px-10">
          <div>
            <p className="font-serif text-[24px] leading-[.94] tracking-[-.035em] text-foreground xl:text-[28px]">
              People
              <br />
              Places
              <br />A Brighter
              <br />
              Tomorrow
            </p>
            <div className="mt-4 h-px w-10 bg-foreground" />
          </div>
        </div>
      </div>
    </section>
  );
}

const trustIcons = [Truck, PackageCheck, CreditCard, Leaf];
function ThreadsTrustStrip({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const p = block.props as Record<string, unknown>;
  const raw = Array.isArray(p.badges)
    ? p.badges.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object",
      )
    : [];
  const referenceValues = [
    { label: "Free Shipping", description: "On orders over ৳2000" },
    { label: "Easy Returns", description: "Within 14 days" },
    { label: "Secure Payments", description: "100% protected" },
    { label: "Sustainable Choices", description: "For a brighter tomorrow" },
  ];
  const fallbackValues = [
    {
      label: "Stories You Can Wear",
      description: "Original art with a point of view.",
    },
    {
      label: "Rooted in Bengal",
      description: "Local stories in current forms.",
    },
    {
      label: "Illustrated to Stand Apart",
      description: "Designed with a distinct hand.",
    },
    {
      label: "Made for Repeat Wear",
      description: "Everyday pieces with character.",
    },
  ];
  const values =
    store?.id === "preview-threads"
      ? referenceValues
      : raw.length
        ? raw.slice(0, 4)
        : fallbackValues;

  return (
    <section className="border-b border-border/60 bg-background">
      <div className="mx-auto grid max-w-[1320px] grid-cols-2 px-4 sm:px-6 md:grid-cols-4 md:px-8">
        {values.map((value, index) => {
          const Icon = trustIcons[index] ?? Sparkles;
          return (
            <div
              key={index}
              className="flex min-h-[68px] items-center justify-center gap-3 border-border/60 px-3 py-2.5 odd:border-r md:border-r md:px-5 md:last:border-r-0 min-[900px]:min-h-[50px] min-[900px]:py-1.5"
            >
              <Icon className="h-7 w-7 shrink-0 stroke-[1.45] text-foreground" />
              <div className="min-w-0">
                <p className="text-[9px] font-bold md:text-[10px]">
                  {text(value.label)}
                </p>
                <p className="mt-0.5 truncate text-[8px] text-muted-foreground md:text-[9px]">
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
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object",
      )
    : [];
  const sourceItems = explicit.length
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
      }));
  const isReferencePreview = store?.id === "preview-threads";
  const items = (
    isReferencePreview
      ? sourceItems
          .slice(0, 5)
          .concat({ name: "Sale", value: "Sale", image: "", tagline: "" })
      : sourceItems
  ).slice(
    0,
    isReferencePreview ? 6 : typeof p.limit === "number" ? p.limit : 6,
  );
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
    <section id="categories" className="bg-background py-5 md:py-6 min-[900px]:py-3">
      <div className="mx-auto max-w-[1360px] px-5 sm:px-6 md:px-8">
        <div className="mb-3 flex items-center justify-between gap-5">
          <h2 className="font-sans text-[18px] font-bold leading-none tracking-[-.025em] md:text-[20px]">
            {text(p.title) || "Shop by Category"}
          </h2>
          <div className="flex items-center gap-2">
            {autoplayEnabled ? (
              <button
                type="button"
                onClick={() => setAutoplayPaused((value) => !value)}
                aria-pressed={autoplayPaused}
                aria-label={
                  autoplayPaused
                    ? "Resume category carousel"
                    : "Pause category carousel"
                }
                className="sr-only"
              >
                {autoplayPaused ? <Play /> : <Pause />}
              </button>
            ) : null}
            <Link
              href={shop}
              className="relative inline-flex min-h-11 items-center text-[9px] font-bold min-[900px]:min-h-11"
            >
              View All <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: items.length > 1 }}
          className="relative"
        >
          <CarouselContent className="-ml-2.5 md:-ml-3">
            {items.map((item, index) => (
              <CarouselItem
                key={`${item.value}-${index}`}
                className="basis-[68%] pl-2.5 sm:basis-[36%] md:basis-1/3 md:pl-3 min-[900px]:basis-1/6"
              >
                <Link
                  href={
                    item.name === "Sale"
                      ? `${shop}?sale=1`
                      : `${shop}?category=${encodeURIComponent(item.value)}`
                  }
                  className="group block overflow-hidden rounded-[4px] border border-border/55 bg-card shadow-[0_6px_18px_rgba(0,0,0,.045)]"
                >
                  <div
                    className={`relative aspect-[5/6] overflow-hidden min-[900px]:aspect-[.89/1] ${item.name === "Sale" ? "bg-primary" : "bg-secondary"}`}
                  >
                    {item.name === "Sale" ? (
                      <div className="absolute inset-0 flex flex-col justify-center px-6 text-primary-foreground">
                        <div className="font-serif text-[38px] leading-none">
                          SALE
                        </div>
                        <p className="mt-4 max-w-[140px] text-[12px] leading-[1.25]">
                          Good things for a brighter tomorrow.
                        </p>
                      </div>
                    ) : item.image ? (
                      <SafeStorefrontImage
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(min-width: 1024px) 16vw, (min-width: 768px) 33vw, 68vw"
                        className="object-cover transition duration-500 ease-out group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-primary">
                        {categoryFallbackIcon(item.name)}
                      </div>
                    )}
                  </div>
                  <div className="flex min-h-11 items-center justify-between px-3 text-[10px] font-semibold md:px-4 min-[900px]:min-h-9">
                    <span className="truncate">{item.name}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" />
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
                className="absolute -left-5 top-[43%] z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/95 shadow-sm"
                aria-label="Previous category"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => api?.scrollNext()}
                className="absolute -right-5 top-[43%] z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/95 shadow-sm"
                aria-label="Next category"
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

function ThreadsPromo({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const p = block.props as Record<string, unknown>;
  const isReferencePreview = store?.id === "preview-threads";
  const cards = [
    {
      image: text(p.imageUrl),
      title: isReferencePreview
        ? "Everyday Essentials"
        : text(p.title) || "Handmade for Home",
      subtitle: isReferencePreview
        ? "Comfort meets purpose."
        : text(p.subtitle) || "Thoughtful pieces for home and everyday life.",
      cta: isReferencePreview
        ? "Explore the Collection"
        : text(p.ctaText) || "Explore Collection",
      href: text(p.ctaLink) || "/shop",
    },
    {
      image: text(p.secondaryImageUrl),
      title: isReferencePreview
        ? "Sustainable Choices"
        : text(p.secondaryTitle) || "Small Gifts, Big Meaning",
      subtitle: isReferencePreview
        ? "Better materials. A brighter tomorrow."
        : text(p.secondarySubtitle) ||
          "Meaningful pieces for everyday moments.",
      cta: isReferencePreview
        ? "Learn More"
        : text(p.secondaryCtaText) || "Shop Gifts",
      href: text(p.secondaryCtaLink) || "/shop",
    },
  ];

  return (
    <section className="bg-background px-5 pb-5 sm:px-6 md:px-8 md:pb-6">
      <div className="mx-auto grid max-w-[1360px] gap-3 md:grid-cols-2">
        {cards.map((card, index) => (
          <article
            key={index}
            className="relative min-h-[210px] overflow-hidden rounded-[5px] bg-secondary md:min-h-[220px] min-[900px]:min-h-[164px]"
          >
            {card.image ? (
              <SafeStorefrontImage
                src={card.image}
                alt={card.title}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/18 to-background/95" />
            <div className="relative z-10 ml-auto flex min-h-[210px] w-[45%] min-w-[230px] flex-col justify-center p-6 md:min-h-[220px] md:p-7 min-[900px]:min-h-[164px] min-[900px]:p-4 lg:w-[42%]">
              <h2 className="font-serif text-[30px] font-semibold leading-[.9] tracking-[-.035em] md:text-[34px] min-[900px]:text-[30px]">
                {card.title}
              </h2>
              <p className="mt-1.5 text-[9px] leading-4 text-foreground/78 md:text-[10px]">
                {card.subtitle}
              </p>
              <Link
                href={storefrontPath(card.href, store?.slug)}
                className="relative mt-3 inline-flex min-h-11 w-fit items-center gap-3 rounded-[3px] bg-primary px-4 text-[8px] font-bold text-primary-foreground min-[900px]:min-h-11"
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
  const featuredDesktopBasis =
    visible.length <= 3
      ? "min-[900px]:basis-1/3"
      : visible.length === 4
        ? "min-[900px]:basis-1/4"
        : visible.length === 5
          ? "min-[900px]:basis-[20%]"
          : "min-[900px]:basis-1/6";
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
    <section className="relative overflow-hidden bg-primary py-6 text-primary-foreground md:py-7 min-[900px]:py-4">
      <div className="mx-auto grid max-w-[1360px] gap-5 px-5 sm:px-6 md:px-8 min-[900px]:grid-cols-[190px_minmax(0,1fr)] min-[900px]:items-center xl:grid-cols-[210px_minmax(0,1fr)]">
        <div>
          <h2 className="font-serif text-[30px] font-semibold leading-[.92] tracking-[-.04em] md:text-[34px]">
            {text(p.title) || "Featured Products"}
          </h2>
          <p className="mt-1.5 max-w-[190px] text-[9px] leading-4 text-primary-foreground/75">
            {text(p.subtitle) || "Stories you can wear."}
          </p>
          <Link
            href={storefrontPath("/shop", store?.slug)}
            className="mt-3 inline-flex min-h-11 items-center gap-3 rounded-[3px] border border-primary-foreground/65 px-4 text-[8px] font-bold"
          >
            View All Products <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: visible.length > 1 }}
          className="relative min-w-0"
        >
          <CarouselContent className="-ml-2.5 md:-ml-3">
            {visible.map((product, index) => (
              <CarouselItem
                key={`${product.id}-${index}`}
                className={`basis-[58%] pl-2.5 sm:basis-[34%] md:basis-1/4 md:pl-3 ${featuredDesktopBasis}`}
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
                className="absolute -left-5 top-[44%] z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-primary-foreground/45 bg-primary/95"
                aria-label="Previous product"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => api?.scrollNext()}
                className="absolute -right-5 top-[44%] z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-primary-foreground bg-primary text-primary-foreground"
                aria-label="Next product"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : null}
          <CarouselTicks api={api} count={visible.length} inverse />
          {autoplayEnabled ? (
            <button
              type="button"
              onClick={() => setAutoplayPaused((v) => !v)}
              className="sr-only"
              aria-label={
                autoplayPaused
                  ? "Resume featured product carousel"
                  : "Pause featured product carousel"
              }
            >
              {autoplayPaused ? <Play /> : <Pause />}
            </button>
          ) : null}
        </Carousel>
      </div>
    </section>
  );
}

function ThreadsNewArrivals({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const { data: products = [] } = useProducts(store?.id);
  const p = block.props as Record<string, unknown>;
  const isReferencePreview = store?.id === "preview-threads";
  const visible = products.slice(
    0,
    isReferencePreview ? 6 : typeof p.limit === "number" ? p.limit : 8,
  );
  if (!visible.length) return null;
  const defaultTitle = isReferencePreview
    ? "New at EZCOMO"
    : `New at ${store?.name || "Threads"}`;

  return (
    <section className="bg-background py-5 md:py-6 min-[900px]:py-4">
      <div className="mx-auto max-w-[1360px] px-5 sm:px-6 md:px-8">
        <div className="mb-4 flex items-center justify-center min-[900px]:mb-3">
          <h2 className="font-serif text-[24px] font-medium leading-none tracking-[-.035em] md:text-[27px]">
            {text(p.title) || defaultTitle}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-6 md:gap-x-4">
          {visible.map((product) => (
            <ThreadsProductCard key={product.id} product={product} compact />
          ))}
        </div>
      </div>
    </section>
  );
}

function ThreadsCommunity({ block }: { block: StorePageBlock }) {
  const p = block.props as Record<string, unknown>;
  return (
    <section className="border-y border-border/60 bg-secondary/35 py-5 min-[900px]:py-2">
      <div className="mx-auto grid max-w-[1120px] gap-5 px-5 sm:px-6 md:grid-cols-[1fr_1.05fr] md:items-center md:px-8">
        <div>
          <h2 className="font-serif text-[28px] font-medium leading-none tracking-[-.035em] md:text-[31px]">
            {text(p.title) || "Join Our Community"}
          </h2>
          <p className="mt-1.5 text-[9px] text-foreground/75 md:text-[10px]">
            {text(p.subtitle) ||
              "Get updates on new collections, offers and more."}
          </p>
        </div>
        <form
          onSubmit={(event) => event.preventDefault()}
          className="flex min-h-[46px] overflow-hidden rounded-[3px] border border-border bg-background"
        >
          <input
            type="email"
            aria-label="Email address"
            placeholder="Your email address"
            className="h-11 min-w-0 flex-1 bg-transparent px-4 text-[10px] outline-none"
          />
          <button
            type="submit"
            className="min-h-11 min-w-[135px] bg-primary px-5 text-[9px] font-medium text-primary-foreground"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}

function ThreadsFAQ({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const p = block.props as Record<string, unknown>;
  const raw = Array.isArray(p.faqs)
    ? p.faqs.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object",
      )
    : [];
  const referenceFaqs = [
    {
      q: "What is EZCOMO?",
      a: "EZCOMO is a modern clothing and lifestyle storefront.",
    },
    {
      q: "What materials do you use for your clothing?",
      a: "Material information is listed on each product page.",
    },
    {
      q: "How do I know what size to order?",
      a: "Use the size guide and garment measurements shown with each product.",
    },
    {
      q: "Do you offer international shipping?",
      a: "Available shipping destinations are shown during checkout.",
    },
    {
      q: "What is your return and exchange policy?",
      a: "Eligible unworn items can be returned or exchanged under the published store policy.",
    },
    {
      q: "How can I track my order?",
      a: "Use the order tracking page with your order details.",
    },
  ];
  const faqs =
    store?.id === "preview-threads"
      ? referenceFaqs
      : raw.length
        ? raw
            .slice(0, 6)
            .map((item) => ({
              q: text(item.q) || text(item.question),
              a: text(item.a) || text(item.answer),
            }))
        : referenceFaqs.slice(0, 4);

  return (
    <section className="bg-background py-6 md:py-7 min-[900px]:py-2">
      <div className="mx-auto grid max-w-[1120px] gap-7 px-5 sm:px-6 md:grid-cols-[.72fr_1.28fr] md:items-start md:px-8 min-[900px]:gap-5">
        <div>
          <h2 className="font-serif text-[35px] font-medium leading-[.88] tracking-[-.045em] md:text-[40px]">
            {store?.id === "preview-threads" ? (
              <>
                Frequently
                <br />
                Asked Questions
              </>
            ) : (
              text(p.title) || "Frequently Asked Questions"
            )}
          </h2>
          <p className="mt-3 max-w-[300px] text-[9px] leading-4 text-muted-foreground md:text-[10px]">
            {store?.id === "preview-threads"
              ? "Everything you need to know, right here."
              : text(p.subtitle) || "Everything you need to know, right here."}
          </p>
        </div>
        <div className="border-t border-border">
          {faqs.map((item, index) => (
            <details
              key={`${item.q}-${index}`}
              className="group border-b border-border"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-[9px] font-medium [&::-webkit-details-marker]:hidden md:text-[10px] min-[900px]:min-h-6">
                <span>{item.q}</span>
                <span className="grid h-11 w-11 shrink-0 place-items-center text-[18px] transition group-open:rotate-45 min-[900px]:h-6 min-[900px]:w-6 min-[900px]:text-[15px]">
                  +
                </span>
              </summary>
              <p className="max-w-[640px] pb-3 pr-12 text-[9px] leading-4 text-muted-foreground">
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
    ...(typeof node.text === "string" && node.text.trim()
      ? [node.text.trim()]
      : []),
    ...(Array.isArray(node.content) ? node.content.flatMap(extractText) : []),
  ];
}

function ThreadsStory({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const p = block.props as Record<string, unknown>;
  const image = text(p.imageUrl);
  const isReferencePreview = store?.id === "preview-threads";
  const title = isReferencePreview
    ? "Style\nTravels Further"
    : text(p.title) || "Style Travels Further";
  const body = isReferencePreview
    ? "Clothing for a more curious tomorrow. Inspired by places, people and a slower way of living."
    : extractText(p.body)[0] ||
      "Every collection starts with a place, a person, or a memory worth carrying forward.";

  return (
    <section className="relative min-h-[220px] overflow-hidden bg-secondary md:min-h-[210px] min-[900px]:min-h-[170px]">
      {image ? (
        <SafeStorefrontImage
          src={image}
          alt={text(p.imageAlt) || title.replace("\n", " ")}
          fill
          sizes="100vw"
          className="object-cover"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/92 via-[28%] to-transparent to-[62%]" />
      <div className="relative z-10 mx-auto flex min-h-[220px] max-w-[1360px] items-center px-7 sm:px-10 md:min-h-[210px] md:px-20 min-[900px]:min-h-[170px]">
        <div className="max-w-[330px]">
          <h2 className="whitespace-pre-line font-serif text-[37px] font-medium leading-[.88] tracking-[-.045em] md:text-[42px]">
            {title}
          </h2>
          <p className="mt-3 text-[9px] leading-4 text-foreground/80 md:text-[10px]">
            {body}
          </p>
          <div className="mt-4 h-px w-10 bg-foreground" />
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
  if (!shouldUseSpecializedBlockRenderer(block, template)) {
    return <StorefrontBlockRenderer block={block} template={template} />;
  }

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
