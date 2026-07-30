import Link from "next/link";
import { CountdownTimer } from "@/components/CountdownTimer";
import CategoryShowcase from "@/components/CategoryShowcase";
import FeaturedProducts from "@/components/FeaturedProducts";
import HeroSection from "@/components/HeroSection";
import PromoBanner from "@/components/PromoBanner";
import RecentlyViewed from "@/components/RecentlyViewed";
import { buildTechnicalSpecs } from "@/components/storefront/electronics/ElectronicsProductCard";
import type { RichTextDoc, RichTextNode, StorePageBlock } from "@/lib/cms/schema";
import type { StorefrontTemplateDefinition } from "@/lib/cms/storefront-templates";
import { parseLegacyStringToDoc } from "@/lib/cms/rich-text-adapter";
import React, { useMemo } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AlertTriangle, BadgeCheck, CreditCard, Headset, Instagram, Play, ShieldCheck, Star, Truck, Undo2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useOptionalStore } from "@/components/storefront/store-context";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { sanitizeStoreBlockCustomCss, sanitizeStoreBlockCustomHtml } from "@/lib/cms/validation";
import { productUrl, storefrontPath } from "@/lib/slug";

function renderRichTextNodes(nodes?: RichTextNode[]): React.ReactNode {
  if (!nodes || !Array.isArray(nodes)) return null;

  return nodes.map((node, i) => {
    switch (node.type) {
      case "paragraph":
        return (
          <p key={i} className="text-base leading-8 text-muted-foreground md:text-lg">
            {renderRichTextNodes(node.content)}
          </p>
        );
      case "heading": {
        const level = (node.attrs?.level as number) || 2;
        if (level === 1) {
          return (
            <h2 key={i} className="font-heading text-2xl font-bold text-foreground mt-4 mb-2">
              {renderRichTextNodes(node.content)}
            </h2>
          );
        }
        if (level === 3) {
          return (
            <h4 key={i} className="font-heading text-lg font-bold text-foreground mt-3 mb-1">
              {renderRichTextNodes(node.content)}
            </h4>
          );
        }
        return (
          <h3 key={i} className="font-heading text-xl font-bold text-foreground mt-4 mb-2">
            {renderRichTextNodes(node.content)}
          </h3>
        );
      }
      case "bulletList":
        return (
          <div key={i} className="mt-6 grid gap-3 sm:grid-cols-2">
            {node.content?.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-2xl border border-border bg-card/70 px-4 py-4 text-left shadow-sm">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm font-medium leading-6 text-foreground">
                  {renderRichTextNodes(item.content)}
                </span>
              </div>
            ))}
          </div>
        );
      case "orderedList":
        return (
          <ol key={i} className="mt-4 list-decimal pl-6 space-y-2 text-foreground">
            {renderRichTextNodes(node.content)}
          </ol>
        );
      case "listItem":
        return <span key={i}>{renderRichTextNodes(node.content)}</span>;
      case "text": {
        let textElement: React.ReactNode = node.text || "";
        if (node.marks) {
          for (const mark of node.marks) {
            if (mark.type === "bold") {
              textElement = <strong>{textElement}</strong>;
            } else if (mark.type === "italic") {
              textElement = <em>{textElement}</em>;
            } else if (mark.type === "code") {
              textElement = <code className="bg-muted px-1 py-0.5 rounded text-sm">{textElement}</code>;
            }
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
  title,
  body,
  align,
}: {
  eyebrow?: string;
  title: string;
  body: RichTextDoc | string;
  align: "left" | "center";
}) {
  const textAlignClass = align === "left" ? "text-left" : "text-center";
  const contentAlignClass = align === "left" ? "mr-auto" : "mx-auto";
  const doc = typeof body === "string" ? parseLegacyStringToDoc(body) : (body || { type: "doc", content: [] });

  const reassuranceItems = [
    { icon: ShieldCheck, title: "Clear policies", description: "Customers buy faster when delivery, support, and exchange information is easy to understand." },
    { icon: CreditCard, title: "Checkout clarity", description: "Show which payment, inquiry, or booking steps apply without making people hunt for them." },
    { icon: Headset, title: "Real support", description: "Give buyers confidence that someone will respond if they need help after ordering." },
  ];

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div
          className={
            align === "left"
              ? "grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-start"
              : "mx-auto max-w-4xl"
          }
        >
          <div className={`max-w-3xl ${contentAlignClass} ${textAlignClass}`}>
            {eyebrow ? (
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-primary">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              {title}
            </h2>
            <div className="mt-5 space-y-4">
              {renderRichTextNodes(doc.content)}
            </div>
          </div>
          {align === "left" ? (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Why this matters</p>
              <div className="mt-5 space-y-4">
                {reassuranceItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SocialFeedBlock({ title, subtitle, images }: { title?: string; subtitle?: string; images?: string[] }) {
  const displayImages = images?.length ? images : [
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80",
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80",
    "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80",
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80"
  ];

  return (
    <section className="bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <Instagram className="h-6 w-6 mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-2xl font-bold font-heading">{title || "Follow Us"}</h2>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="grid max-w-5xl grid-cols-2 gap-1 md:grid-cols-4 md:gap-4 mx-auto">
          {displayImages.map((src, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-md bg-muted md:rounded-2xl">
              <img src={src} alt="Social feed item" className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110" loading="lazy" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
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
    <section className="py-12 md:py-24 bg-foreground text-background overflow-hidden relative flex items-center justify-center min-h-[60vh] md:min-h-[80vh]">
      {isEmbed ? (
        <iframe
          src={videoUrl}
          title={title || "Video highlight"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full opacity-70"
        />
      ) : videoUrl ? (
        <video 
          src={videoUrl} 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
          <Play className="h-16 w-16 text-white/20" />
        </div>
      )}
      
      <div className="relative z-10 container mx-auto px-4 text-center max-w-2xl">
        {title && <h2 className="text-4xl md:text-6xl font-bold font-heading mb-6 tracking-tight text-white drop-shadow-lg">{title}</h2>}
        {ctaText && (
          <Button asChild size="lg" className="rounded-full bg-white text-black hover:bg-white/90 shadow-xl">
            <Link href={storefrontPath(ctaLink || "#", currentStore?.slug)}>{ctaText}</Link>
          </Button>
        )}
      </div>
    </section>
  );
}

function TrustBadgesBlock({
  title,
  badges,
}: {
  title?: string;
  badges?: { label: string; description?: string; icon?: "truck" | "payment" | "returns" | "support" | "shield" }[];
}) {
  const displayBadges = badges?.length ? badges : [
    { icon: "truck" as const, label: "Flexible Fulfillment", description: "Local delivery, shipping, pickup, or other merchant-defined fulfillment options." },
    { icon: "payment" as const, label: "Secure Checkout", description: "Payment methods are configured by the merchant for this store." },
    { icon: "returns" as const, label: "Clear Support", description: "Customers can review the store's return, exchange, and support terms before ordering." },
  ];
  const iconMap = {
    truck: Truck,
    payment: CreditCard,
    returns: Undo2,
    support: Headset,
    shield: ShieldCheck,
  };

  return (
    <section className="border-y border-border bg-secondary/35 py-10 md:py-14">
      <div className="container mx-auto px-4">
        {title ? (
          <h2 className="mb-7 text-center font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {title}
          </h2>
        ) : null}
        <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {displayBadges.map((badge) => {
            const Icon = iconMap[badge.icon ?? "shield"];
            return (
              <div key={badge.label} className="flex min-h-[116px] items-start gap-4 rounded-lg border border-border bg-card px-5 py-5 shadow-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-heading text-base font-bold text-foreground">{badge.label}</p>
                  {badge.description ? (
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{badge.description}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TestimonialsBlock({
  title,
  subtitle,
  reviews,
}: {
  title?: string;
  subtitle?: string;
  reviews?: { name: string; rating?: number; comment: string }[];
}) {
  const displayReviews = reviews?.length ? reviews : [
    { name: "Jordan P.", rating: 5, comment: "The product quality matched the photos and the ordering experience felt smooth." },
    { name: "Avery L.", rating: 5, comment: "Support answered quickly and helped me pick the right option before checkout." },
    { name: "Taylor M.", rating: 4, comment: "Shipping updates were clear and the store handled my follow-up questions well." },
  ];

  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Social proof</p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {title || "Customers are talking"}
          </h2>
          {subtitle ? <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">{subtitle}</p> : null}
        </div>
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {displayReviews.map((review) => (
            <article key={`${review.name}-${review.comment}`} className="flex min-h-[220px] flex-col justify-between rounded-lg border border-border bg-card p-6 shadow-sm">
              <div>
                <div className="mb-5 flex items-center gap-1 text-accent">
                  {Array.from({ length: Math.max(1, Math.min(5, review.rating ?? 5)) }).map((_, index) => (
                    <Star key={index} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-base leading-7 text-foreground">"{review.comment}"</p>
              </div>
              <p className="mt-6 text-sm font-semibold text-muted-foreground">{review.name}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqAccordionBlock({ title, subtitle, faqs }: { title?: string; subtitle?: string; faqs?: {q: string, a: string}[] }) {
  const displayFaqs = faqs?.length ? faqs : [
    { q: "What is your return policy?", a: "We offer 7-day returns on all unworn items." },
    { q: "How long does shipping take?", a: "Shipping times depend on the merchant's fulfillment process, destination, and selected delivery method." },
    { q: "How does checkout work?", a: "Checkout options depend on how the merchant has configured payment, inquiry, or booking for this store." }
  ];

  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-[0.9fr_minmax(0,1.1fr)] lg:items-start">
        <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Customer confidence</p>
          <h2 className="mt-4 text-3xl font-bold font-heading tracking-tight text-foreground md:text-4xl">
            {title || "Frequently Asked Questions"}
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground md:text-base">
            {subtitle || "Answer the practical questions customers ask right before they decide to place an order."}
          </p>
          <div className="mt-6 space-y-3">
            {[
              { icon: Truck, label: "Delivery timing and coverage" },
              { icon: ShieldCheck, label: "Exchange and return expectations" },
              { icon: CreditCard, label: "Payment confidence before checkout" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-secondary/60 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <Accordion type="single" collapsible className="w-full space-y-3">
          {displayFaqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="overflow-hidden rounded-2xl border border-border bg-card px-5">
              <AccordionTrigger className="text-left font-medium hover:text-primary transition-colors">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.a}
              </AccordionContent>
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
  const { data: allProducts = [] } = useProducts(storeId);
  const { data: featuredProducts = [] } = useFeaturedProducts(storeId);

  const productsToCompare = useMemo(() => {
    const availableProducts = allProducts.filter((product) => product.isAvailable !== false);
    const base = featuredProducts.length > 0 ? featuredProducts : availableProducts;
    let filtered = [...(base.length > 0 ? base : availableProducts)];

    if (source === "featured") {
      filtered = filtered.filter((product) => product.featured);
    }

    if (source === "category" && category) {
      filtered = filtered.filter((product) => product.category.toLowerCase() === category.toLowerCase());
    }

    if (source === "type" && productType) {
      filtered = filtered.filter((product) => product.type?.toLowerCase() === productType.toLowerCase());
    }

    if ((source === "featured-or-all" || source === "featured") && filtered.length === 0) {
      filtered = [...availableProducts];
    }

    return filtered.slice(0, Math.min(Math.max(limit ?? 2, 2), 4));
  }, [allProducts, category, featuredProducts, limit, productType, source]);

  if (productsToCompare.length < 2) {
    return null;
  }

  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{tagline || "Compare before you buy"}</p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {title || "Quick product comparison"}
          </h2>
        </div>
        <div className="mx-auto grid max-w-6xl gap-4 xl:grid-cols-2">
          {productsToCompare.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <div className="grid gap-5 p-5 sm:grid-cols-[220px_1fr]">
                <div className="flex aspect-[4/3] items-center justify-center rounded-[24px] bg-secondary/40 p-5">
                  <img src={product.image} alt={product.name} className="h-full w-full object-contain" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      {product.category || product.type || "Product"}
                    </span>
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{product.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{product.description}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {buildTechnicalSpecs(product).map((spec) => (
                      <div key={spec} className="rounded-2xl border border-border bg-secondary/30 px-3 py-3 text-sm text-muted-foreground">
                        {spec}
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 text-primary">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-sm font-semibold text-foreground">Spec-led pick</span>
                    </div>
                    <p className="text-[1.35rem] font-bold text-primary">৳{product.price.toLocaleString()}</p>
                    <Button asChild variant="outline" className="ml-auto">
                      <Link href={productUrl(product.id, product.name, storeSlug)}>{ctaText || "View details"}</Link>
                    </Button>
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

export function StorefrontBlockRenderer({
  block,
  template,
}: {
  block: StorePageBlock;
  template?: StorefrontTemplateDefinition;
}) {
  if (!block.isVisible) {
    return null;
  }

  const BlockFallback = (
    <div className="py-12 border-2 border-dashed border-destructive/20 bg-destructive/5 m-4 rounded-xl flex flex-col items-center justify-center text-center p-6">
      <AlertTriangle className="h-8 w-8 text-destructive/60 mb-3" />
      <h3 className="text-sm font-semibold text-destructive/80">Failed to load block</h3>
      <p className="text-xs text-muted-foreground mt-1">Block type: {block.type}</p>
    </div>
  );

  // Mock data context for tag resolution - in production this would come from a React Context or Global State
  const dataContext = {
    store: {
      name: "Acme Store",
      meta_description: "The best products in the world",
    },
    product: {
      price: "$99.00",
      inventory_count: "42",
    },
    customer: {
      name: "Valued Customer",
    }
  };

  const resolveTags = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const keys = path.trim().split('.');
        let current: any = dataContext;
        for (const key of keys) {
          if (current === undefined || current === null) return match;
          current = current[key];
        }
        return current !== undefined ? String(current) : match;
      });
    } else if (Array.isArray(obj)) {
      return obj.map(item => resolveTags(item));
    } else if (typeof obj === 'object' && obj !== null) {
      const newObj: any = {};
      for (const key in obj) {
        newObj[key] = resolveTags(obj[key]);
      }
      return newObj;
    }
    return obj;
  };

  const resolvedProps = resolveTags(block.props);
  const blockLayoutVariant = block.layoutVariant ?? template?.presentation.blockLayoutVariants?.[block.type];

  const renderBlock = () => {
    switch (block.type) {
      case "countdown":
        return <CountdownTimer overrides={resolvedProps} />;
      case "hero":
        return <HeroSection overrides={{ ...resolvedProps, layoutVariant: blockLayoutVariant, disableLegacyFallback: true }} />;
      case "promo-banner":
        return <PromoBanner overrides={{ ...resolvedProps, disableLegacyFallback: true }} />;
      case "category-showcase":
        return <CategoryShowcase overrides={{ ...resolvedProps, layoutVariant: blockLayoutVariant, disableLegacyFallback: true }} />;
      case "featured-products":
        return (
          <FeaturedProducts
            limit={resolvedProps.limit}
            title={resolvedProps.title}
            tagline={resolvedProps.tagline}
            source={resolvedProps.source}
            category={resolvedProps.category}
            productType={resolvedProps.productType}
            layoutVariant={blockLayoutVariant}
            disableLegacyFallback
          />
        );
      case "recommended-products":
        return (
          <FeaturedProducts
            limit={resolvedProps.limit}
            title={resolvedProps.title ?? "Products you may like"}
            tagline={resolvedProps.tagline ?? "More to explore"}
            source={resolvedProps.source}
            category={resolvedProps.category}
            productType={resolvedProps.productType}
            layoutVariant={blockLayoutVariant}
            disableLegacyFallback
          />
        );
      case "comparison":
        return <ComparisonBlock {...resolvedProps} />;
      case "recently-viewed":
        return <RecentlyViewed title={resolvedProps.title} />;
      case "rich-text":
        return <RichTextBlock {...resolvedProps} />;
      case "social-feed":
        return <SocialFeedBlock {...resolvedProps} />;
      case "video-reel":
        return <VideoReelBlock {...resolvedProps} />;
      case "faq-accordion":
        return <FaqAccordionBlock {...resolvedProps} />;
      case "trust-badges":
        return <TrustBadgesBlock {...resolvedProps} />;
      case "testimonials":
        return <TestimonialsBlock {...resolvedProps} />;
      default:
        return null;
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
         if (key.startsWith("tablet:")) {
           tabletCss += `${cssKey}: ${value};\n`;
         } else if (key.startsWith("mobile:")) {
           mobileCss += `${cssKey}: ${value};\n`;
         } else {
           baseCss += `${cssKey}: ${value};\n`;
         }
      }
      
      if (baseCss || tabletCss || mobileCss) {
        styleString += `.${blockClass} { \n${baseCss} }`;
        if (tabletCss) {
          styleString += `\n@media (max-width: 1024px) { .${blockClass} { \n${tabletCss} } }`;
        }
        if (mobileCss) {
          styleString += `\n@media (max-width: 768px) { .${blockClass} { \n${mobileCss} } }`;
        }
      }
    }

    if (safeCustomCss) {
      styleString += `\n${safeCustomCss}`;
    }
    
    if (!styleString) return null;
    return <style dangerouslySetInnerHTML={{ __html: styleString }} />;
  };

  return (
    <ErrorBoundary fallback={BlockFallback}>
      {renderCustomCss()}
      <div className={`w-full transition-all duration-200 ${blockClass}`}>
        {renderBlock()}
        {safeCustomHtml ? <div dangerouslySetInnerHTML={{ __html: safeCustomHtml }} /> : null}
      </div>
    </ErrorBoundary>
  );
}

