import Link from "next/link";
import heroBanner from "@/assets/hero-banner.jpg";
import { useEffect, useRef, useState } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { usePublicPaymentSettings } from "@/hooks/usePublicPaymentSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";
import { BadgeCheck, CreditCard, ShieldCheck, Truck } from "lucide-react";

interface HeroSettings {
  tagline?: string;
  title?: string;
  highlight?: string;
  subtitle?: string;
  cta_text?: string;
  cta_link?: string;
  secondary_cta_text?: string;
  secondary_cta_link?: string;
  media_url?: string;
  media_type?: "image" | "video";
  overlay_color?: string;
  overlay_opacity?: number;
}

interface DeliverySettings {
  enabled?: boolean;
  free_threshold?: number;
}

interface HeroSectionProps {
  overrides?: {
    anchorId?: string;
    tagline?: string;
    title?: string;
    highlight?: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    secondaryCtaText?: string;
    secondaryCtaLink?: string;
    mediaUrl?: string;
    mediaType?: "image" | "video";
    overlayColor?: string;
    overlayOpacity?: number;
  };
}

const HeroSection = ({ overrides }: HeroSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const { data: hero } = useSiteSettings<HeroSettings>("hero_section");
  const currentStore = useOptionalStore();
  const { data: paymentSettings } = usePublicPaymentSettings(currentStore?.id);
  const { data: deliverySettings } = useSiteSettings<DeliverySettings>("delivery_settings");

  const tagline = overrides?.tagline ?? hero?.tagline ?? "Built for your next launch";
  const title = overrides?.title ?? hero?.title ?? "Shape Your";
  const highlight = overrides?.highlight ?? hero?.highlight ?? "Storefront";
  const subtitle =
    overrides?.subtitle ??
    hero?.subtitle ??
    "Showcase products, offers, and brand trust in a storefront that fits your business instead of a fixed niche.";
  const ctaText = overrides?.ctaText ?? hero?.cta_text ?? "Shop Now";
  const ctaLink = storefrontPath(overrides?.ctaLink ?? hero?.cta_link ?? "/shop", currentStore?.slug);
  const secondaryCtaText = overrides?.secondaryCtaText ?? hero?.secondary_cta_text ?? "View Collection";
  const secondaryCtaLink = storefrontPath(overrides?.secondaryCtaLink ?? hero?.secondary_cta_link ?? "/shop", currentStore?.slug);
  const mediaUrl = overrides?.mediaUrl ?? hero?.media_url ?? "";
  const mediaType = overrides?.mediaType ?? hero?.media_type ?? "image";
  const overlayColor = overrides?.overlayColor ?? hero?.overlay_color ?? "";
  const overlayOpacity = overrides?.overlayOpacity ?? hero?.overlay_opacity ?? 50;
  const trustHighlights = [
    paymentSettings?.cod_enabled !== false
      ? { icon: Truck, label: "Cash on delivery available" }
      : null,
    paymentSettings?.bkash_enabled || paymentSettings?.nagad_enabled
      ? { icon: CreditCard, label: "bKash and mobile payments" }
      : null,
    deliverySettings?.enabled !== false
      ? { icon: BadgeCheck, label: `Fast delivery${deliverySettings?.free_threshold ? ` from BDT ${deliverySettings.free_threshold}` : ""}` }
      : null,
    { icon: ShieldCheck, label: "Trusted support after purchase" },
  ].filter(Boolean) as Array<{ icon: typeof Truck; label: string }>;

  useEffect(() => {
    const handleScroll = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        if (rect.bottom > 0) {
          setScrollY(window.scrollY * 0.3);
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isVideo = mediaType === "video" && mediaUrl;

  return (
    <section
      id={overrides?.anchorId}
      ref={sectionRef}
      className="relative flex min-h-[82svh] items-center justify-center overflow-hidden md:min-h-[90vh]"
    >
      <div className="absolute inset-0">
        {isVideo ? (
          <video
            src={mediaUrl}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
            style={{ transform: `translateY(${scrollY}px) scale(1.1)` }}
          />
        ) : (
          <img
            src={mediaUrl || heroBanner.src}
            alt="Storefront hero media"
            className="h-full w-full object-cover transition-transform duration-100"
            style={{ transform: `translateY(${scrollY}px) scale(1.1)` }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: overlayColor || "hsl(var(--background))",
            opacity: overlayOpacity / 100,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10 md:from-black/55 md:via-transparent md:to-transparent" />
        <div className="absolute inset-0 grain-texture opacity-[0.03]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16 text-center sm:py-20 md:py-24">
        <div className="mx-auto mb-4 h-px w-12 bg-primary opacity-0 animate-blur-in sm:mb-6" />
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-primary drop-shadow-md opacity-0 animate-blur-in sm:mb-4 sm:text-sm sm:tracking-[0.3em]">
          {tagline}
        </p>
        <h1
          className="mx-auto mb-4 max-w-[12ch] font-heading text-4xl font-black leading-[0.98] text-white opacity-0 animate-blur-in drop-shadow-[0_0_30px_rgba(0,0,0,0.5)] sm:mb-6 sm:max-w-[11ch] sm:text-6xl md:max-w-none md:text-8xl"
          style={{ animationDelay: "0.15s" }}
        >
          {title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-accent">{highlight}</span>
        </h1>
        <p
          className="mx-auto mb-8 max-w-[34ch] text-sm leading-6 text-gray-100 opacity-0 animate-blur-in drop-shadow-md sm:mb-10 sm:max-w-2xl sm:text-lg sm:leading-8 md:text-xl"
          style={{ animationDelay: "0.3s" }}
        >
          {subtitle}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 opacity-0 animate-blur-in" style={{ animationDelay: "0.45s" }}>
          <Link
            href={ctaLink}
            className="button-premium w-full sm:w-auto rounded-full bg-primary px-8 py-3.5 sm:px-10 sm:py-4 font-heading text-[15px] font-bold tracking-wide text-primary-foreground text-center shadow-lg"
          >
            {ctaText}
          </Link>
          <Link
            href={secondaryCtaLink}
            className="w-full sm:w-auto rounded-full border border-white/20 glass-panel px-8 py-3.5 sm:px-10 sm:py-4 font-heading text-[15px] font-semibold text-white text-center transition-all duration-500 hover:bg-white/10 hover:border-white/40"
          >
            {secondaryCtaText}
          </Link>
        </div>
        <div
          className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-2.5 opacity-0 animate-blur-in sm:mt-10"
          style={{ animationDelay: "0.6s" }}
        >
          {trustHighlights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-4 py-2 text-xs font-medium text-white/95 backdrop-blur-md"
              >
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
