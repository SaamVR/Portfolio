import Link from "next/link";
import { CountdownTimer } from "@/components/CountdownTimer";
import CategoryShowcase from "@/components/CategoryShowcase";
import FeaturedProducts from "@/components/FeaturedProducts";
import HeroSection from "@/components/HeroSection";
import PromoBanner from "@/components/PromoBanner";
import RecentlyViewed from "@/components/RecentlyViewed";
import type { StorePageBlock } from "@/lib/cms/schema";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AlertTriangle, BadgeCheck, CreditCard, Headset, Instagram, Play, ShieldCheck, Star, Truck, Undo2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";

function parseRichTextBody(body: string) {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const bullets = lines
    .filter((line) => line.startsWith("- ") || line.startsWith("* "))
    .map((line) => line.slice(2).trim());

  const paragraphs = lines.filter((line) => !line.startsWith("- ") && !line.startsWith("* "));

  return { bullets, paragraphs };
}

function RichTextBlock({
  eyebrow,
  title,
  body,
  align,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  align: "left" | "center";
}) {
  const textAlignClass = align === "left" ? "text-left" : "text-center";
  const contentAlignClass = align === "left" ? "mr-auto" : "mx-auto";
  const { bullets, paragraphs } = parseRichTextBody(body);
  const reassuranceItems = [
    { icon: ShieldCheck, title: "Clear policies", description: "Customers buy faster when delivery, support, and exchange information is easy to understand." },
    { icon: CreditCard, title: "Familiar payments", description: "Show that bKash, Nagad, or cash on delivery are available without making people hunt for it." },
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
              {(paragraphs.length ? paragraphs : [body]).map((paragraph) => (
                <p key={paragraph} className="text-base leading-8 text-muted-foreground md:text-lg">
                  {paragraph}
                </p>
              ))}
            </div>
            {bullets.length ? (
              <div className={`mt-8 grid gap-3 ${align === "left" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                {bullets.map((bullet) => (
                  <div
                    key={bullet}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-card/70 px-4 py-4 text-left shadow-sm"
                  >
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm font-medium leading-6 text-foreground">{bullet}</span>
                  </div>
                ))}
              </div>
            ) : null}
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
    { icon: "truck" as const, label: "Fast Delivery", description: "Dhaka and nationwide courier support." },
    { icon: "payment" as const, label: "bKash Accepted", description: "Mobile payments, cards, and COD options." },
    { icon: "returns" as const, label: "Easy Returns", description: "Clear exchange support for eligible items." },
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
    { name: "Nusrat A.", rating: 5, comment: "The fabric felt premium and delivery inside Dhaka was very quick." },
    { name: "Rafi H.", rating: 5, comment: "Loved that I could pay with bKash and confirm sizing before ordering." },
    { name: "Sadia M.", rating: 4, comment: "Support replied fast and helped me exchange for the right fit." },
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
    { q: "How long does shipping take?", a: "Inside Dhaka: 24-48 hours. Outside Dhaka: 3-5 days." },
    { q: "Do you offer cash on delivery?", a: "Yes, we offer Cash on Delivery (COD) across Bangladesh." }
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

export function StorefrontBlockRenderer({ block }: { block: StorePageBlock }) {
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

  const renderBlock = () => {
    switch (block.type) {
      case "countdown":
        return <CountdownTimer overrides={block.props} />;
      case "hero":
        return <HeroSection overrides={block.props} />;
      case "promo-banner":
        return <PromoBanner overrides={block.props} />;
      case "category-showcase":
        return <CategoryShowcase overrides={block.props} />;
      case "featured-products":
        return <FeaturedProducts limit={block.props.limit} title={block.props.title} tagline={block.props.tagline} />;
      case "recently-viewed":
        return <RecentlyViewed title={block.props.title} />;
      case "rich-text":
        return <RichTextBlock {...block.props} />;
      case "social-feed":
        return <SocialFeedBlock {...block.props} />;
      case "video-reel":
        return <VideoReelBlock {...block.props} />;
      case "faq-accordion":
        return <FaqAccordionBlock {...block.props} />;
      case "trust-badges":
        return <TrustBadgesBlock {...block.props} />;
      case "testimonials":
        return <TestimonialsBlock {...block.props} />;
      default:
        return null;
    }
  };

  return (
    <ErrorBoundary fallback={BlockFallback}>
      {renderBlock()}
    </ErrorBoundary>
  );
}

