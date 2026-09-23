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
import { launchProducts, type Product } from "@/data/products";
import { resolveImageUrl } from "@/lib/imageMap";
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
    <section className="relative overflow-hidden border-b border-border/40 bg-secondary/20">
      {/* Subtle grain overlay for editorial texture */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[2] opacity-[.025] mix-blend-overlay" style={{backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"}} />
      <div className="mx-auto grid max-w-[1440px] md:min-h-[340px] md:grid-cols-[44%_56%] min-[900px]:min-h-[280px] min-[900px]:grid-cols-[42%_38%_20%] xl:min-h-[340px]">
        <div className="relative z-10 flex items-center px-6 py-10 sm:px-8 md:px-12 min-[900px]:py-6 lg:px-16 xl:px-20">
          <div className="max-w-[460px]">
            {/* Accent bar above eyebrow */}
            <div className="mb-3 h-[2px] w-8 bg-accent" aria-hidden />
            <p className="mb-3 text-[9px] font-bold uppercase tracking-[.3em] text-accent md:text-[10px]">
              {isReferencePreview ? "New Collection" : eyebrow}
            </p>
            <h1 className="whitespace-pre-line font-serif text-[50px] font-semibold leading-[.82] tracking-[-.055em] sm:text-[58px] md:text-[64px] min-[900px]:text-[58px] lg:text-[64px] xl:text-[72px]">
              {title}
            </h1>
            <p className="mt-3 max-w-[390px] text-[11px] leading-[1.65] text-foreground/68 md:text-[12px]">
              {isReferencePreview
                ? "Thoughtfully designed. Made for your everyday."
                : subtitle}
            </p>
            <Link
              href={storefrontPath(
                text(p.ctaLink) || "/shop?sort=newest",
                store?.slug,
              )}
              className="mt-5 inline-flex min-h-12 items-center gap-4 rounded-[3px] bg-primary px-6 text-[9px] font-bold uppercase tracking-[.08em] text-primary-foreground transition-all duration-300 hover:gap-5 md:px-7 md:text-[10px]"
            >
              {isReferencePreview
                ? "Shop New Arrivals"
                : text(p.ctaText) || "Explore New Arrivals"}
              <ArrowRight className="h-4 w-4 transition-transform duration-300" />
            </Link>
          </div>
        </div>

        <div className="relative min-h-[320px] overflow-hidden md:min-h-0">
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
            <div className="absolute inset-0 bg-gradient-to-br from-secondary via-muted/60 to-primary/10" />
          )}
          <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-secondary/80 via-secondary/30 to-transparent" />
        </div>

        <div className="relative hidden items-center bg-background/50 px-6 backdrop-blur-[2px] min-[900px]:flex xl:px-10">
          <div>
            <p className="font-serif text-[26px] italic leading-[.96] tracking-[-.03em] text-foreground/85 xl:text-[30px]">
              People
              <br />
              Places
              <br />A Brighter
              <br />
              Tomorrow
            </p>
            <div className="mt-5 h-[2px] w-12 bg-accent/70" />
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
    <section className="border-b border-border/40 bg-background">
      <div className="mx-auto grid max-w-[1320px] grid-cols-2 px-4 sm:px-6 md:grid-cols-4 md:px-8">
        {values.map((value, index) => {
          const Icon = trustIcons[index] ?? Sparkles;
          return (
            <div
              key={index}
              className="flex min-h-[76px] items-center justify-center gap-3.5 border-border/40 px-3 py-3 odd:border-r md:border-r md:px-5 md:last:border-r-0 min-[900px]:min-h-[56px] min-[900px]:py-2"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-primary/15 bg-primary/5">
                <Icon className="h-4.5 w-4.5 stroke-[1.5] text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-[.01em] md:text-[11px]">
                  {text(value.label)}
                </p>
                <p className="mt-0.5 truncate text-[8px] leading-[1.5] text-muted-foreground md:text-[9px]">
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

const DEFAULT_THREAD_CATEGORIES = [
  {
    name: "T-Shirts",
    value: "T-Shirts",
    image: "/demo-assets/urban-threads-bd/categories/t-shirts.jpg",
    tagline: "Everyday cotton tees.",
  },
  {
    name: "Polos",
    value: "Polos",
    image: "/demo-assets/urban-threads-bd/categories/polos.jpg",
    tagline: "Smart casual staples.",
  },
  {
    name: "Shirts",
    value: "Shirts",
    image: "/demo-assets/urban-threads-bd/categories/shirts.jpg",
    tagline: "Refined and versatile.",
  },
  {
    name: "Drop Shoulders",
    value: "Drop Shoulders",
    image: "/demo-assets/urban-threads-bd/categories/drop-shoulders.jpg",
    tagline: "Relaxed streetwear.",
  },
  {
    name: "Pants & Joggers",
    value: "Pants & Joggers",
    image: "/demo-assets/urban-threads-bd/categories/pants.jpg",
    tagline: "Complete the look.",
  },
  {
    name: "Women",
    value: "Women",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80",
    tagline: "Thoughtfully designed.",
  },
  {
    name: "Men",
    value: "Men",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
    tagline: "Everyday essentials.",
  },
  {
    name: "Accessories",
    value: "Accessories",
    image: "/demo-assets/urban-threads-bd/categories/polos.jpg",
    tagline: "Caps, totes & more.",
  },
  {
    name: "Sale",
    value: "Sale",
    image: "",
    tagline: "Good things for a brighter tomorrow.",
  },
];

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
  const effectiveSourceItems = sourceItems.length ? sourceItems : DEFAULT_THREAD_CATEGORIES;
  const items = (
    isReferencePreview && sourceItems.length
      ? sourceItems
          .slice(0, 5)
          .concat({ name: "Sale", value: "Sale", image: "", tagline: "" })
      : effectiveSourceItems
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
    <section id="categories" className="bg-background py-8 md:py-10 min-[900px]:py-6">
      <div className="mx-auto max-w-[1360px] px-5 sm:px-6 md:px-8">
        {/* Refined section header with accent divider */}
        <div className="mb-5 flex items-end justify-between gap-5">
          <div>
            <p className="mb-1.5 text-[8px] font-bold uppercase tracking-[.22em] text-accent md:text-[9px]">Collections</p>
            <h2 className="font-serif text-[24px] font-medium leading-none tracking-[-.035em] md:text-[28px]">
              {text(p.title) || "Shop by Category"}
            </h2>
          </div>
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
              className="relative inline-flex min-h-11 items-center gap-2 text-[9px] font-bold uppercase tracking-[.06em] text-primary transition-colors hover:text-primary/80 min-[900px]:min-h-11"
            >
              View All <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
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
                className="basis-[60%] pl-2.5 sm:basis-[34%] md:basis-1/3 md:pl-3 min-[900px]:basis-1/6"
              >
                <Link
                  href={
                    item.name === "Sale"
                      ? `${shop}?sale=1`
                      : `${shop}?category=${encodeURIComponent(item.value)}`
                  }
                  className="group block overflow-hidden rounded-[5px] border border-border/40 bg-card shadow-[0_4px_16px_rgba(0,0,0,.04)] transition-all duration-350"
                >
                  <div
                    className={`relative overflow-hidden ${item.name === "Sale" ? "aspect-[5/6] bg-primary min-[900px]:aspect-[.89/1]" : "aspect-[5/6] bg-secondary min-[900px]:aspect-[.89/1]"}`}
                  >
                    {item.name === "Sale" ? (
                      <div className="absolute inset-0 flex flex-col justify-center px-6 text-primary-foreground">
                        <div className="font-serif text-[42px] font-semibold italic leading-none tracking-[-.02em]">
                          Sale
                        </div>
                        <p className="mt-3 max-w-[140px] text-[11px] leading-[1.35] text-primary-foreground/80">
                          Good things for a brighter tomorrow.
                        </p>
                      </div>
                    ) : item.image ? (
                      <SafeStorefrontImage
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(min-width: 1024px) 16vw, (min-width: 768px) 33vw, 68vw"
                        className="object-cover transition duration-600 ease-out group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-primary/60">
                        {categoryFallbackIcon(item.name)}
                      </div>
                    )}
                    {/* Hover overlay */}
                    {item.name !== "Sale" && <div className="absolute inset-0 bg-primary/0 transition-colors duration-300 group-hover:bg-primary/8" />}
                  </div>
                  <div className="flex min-h-12 items-center justify-between border-t border-border/30 px-3.5 text-[10px] font-semibold tracking-[.01em] md:px-4 min-[900px]:min-h-10">
                    <span className="truncate">{item.name}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-primary" />
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
                className="absolute -left-5 top-[43%] z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-border/60 bg-background shadow-[0_4px_12px_rgba(0,0,0,.08)] transition-all hover:border-primary/40 hover:shadow-[0_6px_20px_rgba(0,0,0,.12)]"
                aria-label="Previous category"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => api?.scrollNext()}
                className="absolute -right-5 top-[43%] z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-border/60 bg-background shadow-[0_4px_12px_rgba(0,0,0,.08)] transition-all hover:border-primary/40 hover:shadow-[0_6px_20px_rgba(0,0,0,.12)]"
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
    <section className="bg-background px-5 pb-6 sm:px-6 md:px-8 md:pb-8">
      <div className="mx-auto grid max-w-[1360px] gap-4 md:grid-cols-2">
        {cards.map((card, index) => (
          <article
            key={index}
            className="group relative min-h-[230px] overflow-hidden rounded-[6px] bg-secondary shadow-[0_4px_20px_rgba(0,0,0,.06)] transition-shadow duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,.1)] md:min-h-[240px] min-[900px]:min-h-[180px]"
          >
            {card.image ? (
              <SafeStorefrontImage
                src={card.image}
                alt={card.title}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/20 to-background/95" />
            <div className="relative z-10 ml-auto flex min-h-[230px] w-[46%] min-w-[240px] flex-col justify-center p-7 md:min-h-[240px] md:p-8 min-[900px]:min-h-[180px] min-[900px]:p-5 lg:w-[43%]">
              <h2 className="font-serif text-[32px] font-semibold leading-[.88] tracking-[-.04em] md:text-[36px] min-[900px]:text-[32px]">
                {card.title}
              </h2>
              <p className="mt-2 text-[10px] leading-[1.6] text-foreground/72 md:text-[11px]">
                {card.subtitle}
              </p>
              <Link
                href={storefrontPath(card.href, store?.slug)}
                className="relative mt-4 inline-flex min-h-11 w-fit items-center gap-3 rounded-[3px] bg-primary px-5 text-[9px] font-bold uppercase tracking-[.06em] text-primary-foreground transition-all duration-300 hover:gap-4 min-[900px]:min-h-11"
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

const DEFAULT_THREAD_PRODUCTS: Product[] = launchProducts.map((p) => ({
  ...p,
  image: resolveImageUrl(p.image),
  images: (p.images || []).map(resolveImageUrl).filter(Boolean),
}));

function ThreadsFeatured({ block }: { block: StorePageBlock }) {
  const store = useOptionalStore();
  const { data: dbProducts = [] } = useProducts(store?.id);
  const products = dbProducts.length > 0 ? dbProducts : DEFAULT_THREAD_PRODUCTS;
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
    <section className="relative overflow-hidden bg-primary py-10 text-primary-foreground md:py-12 min-[900px]:py-8">
      {/* Subtle pattern overlay */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[.03]" style={{backgroundImage:"radial-gradient(circle at 1px 1px, currentColor 0.5px, transparent 0)" ,backgroundSize:"24px 24px"}} />
      <Botanical side="left" level="subtle" inverse />
      <Botanical side="right" level="subtle" inverse />
      <div className="relative mx-auto grid max-w-[1360px] gap-6 px-5 sm:px-6 md:px-8 min-[900px]:grid-cols-[220px_minmax(0,1fr)] min-[900px]:items-center xl:grid-cols-[240px_minmax(0,1fr)]">
        <div>
          <div className="mb-2 h-[2px] w-8 bg-primary-foreground/40" aria-hidden />
          <h2 className="font-serif text-[32px] font-semibold leading-[.9] tracking-[-.04em] md:text-[38px]">
            {text(p.title) || "Featured Products"}
          </h2>
          <p className="mt-2 max-w-[200px] text-[10px] leading-[1.6] text-primary-foreground/70">
            {text(p.subtitle) || "Stories you can wear."}
          </p>
          <Link
            href={storefrontPath("/shop", store?.slug)}
            className="mt-5 inline-flex min-h-12 items-center gap-3 rounded-[3px] border border-primary-foreground/50 px-5 text-[9px] font-bold uppercase tracking-[.06em] transition-all duration-300 hover:border-primary-foreground/80 hover:bg-primary-foreground/10"
          >
            View All Products <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: visible.length > 1 }}
          className="relative min-w-0"
        >
          <CarouselContent className="-ml-3 md:-ml-4">
            {visible.map((product, index) => (
              <CarouselItem
                key={`${product.id}-${index}`}
                className={`basis-[56%] pl-3 sm:basis-[34%] md:basis-1/4 md:pl-4 ${featuredDesktopBasis}`}
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
                className="absolute -left-5 top-[44%] z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-primary-foreground/30 bg-primary/90 shadow-[0_4px_14px_rgba(0,0,0,.2)] backdrop-blur-sm transition-all hover:border-primary-foreground/60 hover:bg-primary/95"
                aria-label="Previous product"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => api?.scrollNext()}
                className="absolute -right-5 top-[44%] z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-primary-foreground/30 bg-primary/90 shadow-[0_4px_14px_rgba(0,0,0,.2)] backdrop-blur-sm transition-all hover:border-primary-foreground/60 hover:bg-primary/95"
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
  const { data: dbProducts = [] } = useProducts(store?.id);
  const products = dbProducts.length > 0 ? dbProducts : DEFAULT_THREAD_PRODUCTS;
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
    <section className="bg-background py-10 md:py-12 min-[900px]:py-8">
      <div className="mx-auto max-w-[1360px] px-5 sm:px-6 md:px-8">
        {/* Section header with accent line */}
        <div className="mb-6 flex flex-col items-center text-center min-[900px]:mb-5">
          <div className="mb-3 h-[2px] w-8 bg-accent" aria-hidden />
          <h2 className="font-serif text-[26px] font-medium leading-none tracking-[-.035em] md:text-[30px]">
            {text(p.title) || defaultTitle}
          </h2>
          <p className="mt-2 text-[10px] text-muted-foreground">The latest additions to our collection</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-6 md:gap-x-5">
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
    <section className="border-y border-border/40 bg-secondary/25 py-10 min-[900px]:py-6">
      <div className="mx-auto grid max-w-[1120px] gap-6 px-5 sm:px-6 md:grid-cols-[1fr_1.1fr] md:items-center md:px-8">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Heart className="h-4 w-4 text-accent" />
            <span className="text-[8px] font-bold uppercase tracking-[.18em] text-accent">Stay Connected</span>
          </div>
          <h2 className="font-serif text-[30px] font-medium leading-[.92] tracking-[-.035em] md:text-[34px]">
            {text(p.title) || "Join Our Community"}
          </h2>
          <p className="mt-2 max-w-[340px] text-[10px] leading-[1.6] text-foreground/68 md:text-[11px]">
            {text(p.subtitle) ||
              "Get updates on new collections, offers and more."}
          </p>
        </div>
        <form
          onSubmit={(event) => event.preventDefault()}
          className="flex min-h-[48px] overflow-hidden rounded-[4px] border border-border/60 bg-background shadow-[0_2px_8px_rgba(0,0,0,.04)] transition-shadow focus-within:border-primary/40 focus-within:shadow-[0_4px_16px_rgba(0,0,0,.08)]"
        >
          <input
            type="email"
            aria-label="Email address"
            placeholder="Your email address"
            className="h-12 min-w-0 flex-1 bg-transparent px-5 text-[11px] outline-none placeholder:text-muted-foreground/50"
          />
          <button
            type="submit"
            className="min-h-12 min-w-[140px] bg-primary px-6 text-[10px] font-semibold uppercase tracking-[.06em] text-primary-foreground transition-colors hover:bg-primary/90"
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
    <section className="bg-background py-12 md:py-14 min-[900px]:py-8">
      <div className="mx-auto grid max-w-[1120px] gap-8 px-5 sm:px-6 md:grid-cols-[.72fr_1.28fr] md:items-start md:px-8 min-[900px]:gap-6">
        <div>
          <div className="mb-3 h-[2px] w-8 bg-accent" aria-hidden />
          <h2 className="font-serif text-[38px] font-medium leading-[.88] tracking-[-.045em] md:text-[44px]">
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
          <p className="mt-4 max-w-[300px] text-[10px] leading-[1.6] text-muted-foreground md:text-[11px]">
            {store?.id === "preview-threads"
              ? "Everything you need to know, right here."
              : text(p.subtitle) || "Everything you need to know, right here."}
          </p>
        </div>
        <div className="rounded-[4px] border border-border/50 bg-card/50 shadow-[0_2px_12px_rgba(0,0,0,.03)]">
          {faqs.map((item, index) => (
            <details
              key={`${item.q}-${index}`}
              className="group border-b border-border/40 last:border-b-0"
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 text-[10px] font-medium [&::-webkit-details-marker]:hidden md:text-[11px] min-[900px]:min-h-11 min-[900px]:px-6">
                <span>{item.q}</span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border/50 text-[16px] transition-all duration-300 group-open:rotate-45 group-open:border-primary/30 group-open:bg-primary/8 group-open:text-primary">
                  +
                </span>
              </summary>
              <p className="max-w-[640px] px-5 pb-4 pr-14 text-[10px] leading-[1.7] text-muted-foreground min-[900px]:px-6">
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
  const image = text(p.imageUrl) || "/images/chapchitra-street.jpg";
  const isReferencePreview = store?.id === "preview-threads";
  const title = isReferencePreview
    ? "Style\nTravels Further"
    : text(p.title) || "Style Travels Further";
  const body = isReferencePreview
    ? "Clothing for a more curious tomorrow. Inspired by places, people and a slower way of living."
    : extractText(p.body)[0] ||
      "Every collection starts with a place, a person, or a memory worth carrying forward.";

  return (
    <section className="relative min-h-[320px] overflow-hidden bg-secondary md:min-h-[380px] lg:min-h-[420px]">
      {image ? (
        <SafeStorefrontImage
          src={image}
          alt={text(p.imageAlt) || title.replace("\n", " ")}
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/88 via-[30%] to-transparent to-[70%]" />
      <div className="relative z-10 mx-auto flex min-h-[320px] max-w-[1360px] items-center px-7 sm:px-10 md:min-h-[380px] md:px-20 lg:min-h-[420px]">
        <div className="max-w-[380px]">
          <div className="mb-3 h-[2px] w-8 bg-accent" aria-hidden />
          <h2 className="whitespace-pre-line font-serif text-[40px] font-medium leading-[.88] tracking-[-.045em] md:text-[48px] lg:text-[54px]">
            {title}
          </h2>
          <p className="mt-4 text-[10.5px] leading-[1.7] text-foreground/75 md:text-[12px]">
            {body}
          </p>
          <div className="mt-5 h-[2px] w-12 bg-accent/60" />
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
