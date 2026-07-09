import { CountdownTimer } from "@/components/CountdownTimer";
import CategoryShowcase from "@/components/CategoryShowcase";
import FeaturedProducts from "@/components/FeaturedProducts";
import HeroSection from "@/components/HeroSection";
import PromoBanner from "@/components/PromoBanner";
import RecentlyViewed from "@/components/RecentlyViewed";
import type { StorePageBlock } from "@/lib/cms/schema";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AlertTriangle, Play, Instagram } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

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

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className={`max-w-3xl ${contentAlignClass} ${textAlignClass}`}>
          {eyebrow ? (
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-primary">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-base leading-8 text-muted-foreground md:text-lg">
            {body}
          </p>
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
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <Instagram className="h-6 w-6 mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-2xl font-bold font-heading">{title || "Follow Us"}</h2>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 md:gap-4 max-w-5xl mx-auto">
          {displayImages.map((src, i) => (
            <div key={i} className="aspect-square bg-muted overflow-hidden relative group">
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
  return (
    <section className="py-12 md:py-24 bg-foreground text-background overflow-hidden relative flex items-center justify-center min-h-[60vh] md:min-h-[80vh]">
      {videoUrl ? (
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
            <a href={ctaLink || "#"}>{ctaText}</a>
          </Button>
        )}
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
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold font-heading">{title || "Frequently Asked Questions"}</h2>
          {subtitle && <p className="text-muted-foreground mt-3">{subtitle}</p>}
        </div>
        <Accordion type="single" collapsible className="w-full">
          {displayFaqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-border">
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
    default:
      return null;
  };}; return (
    <ErrorBoundary fallback={BlockFallback}>
      {renderBlock()}
    </ErrorBoundary>
  );
}

