import Link from "next/link";
import heroBanner from "@/assets/hero-banner.jpg";
import { useEffect, useRef, useState } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

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

  const tagline = overrides?.tagline ?? hero?.tagline ?? "Premium Menswear from Dhaka";
  const title = overrides?.title ?? hero?.title ?? "Wear Your";
  const highlight = overrides?.highlight ?? hero?.highlight ?? "Identity";
  const subtitle =
    overrides?.subtitle ??
    hero?.subtitle ??
    "Tees, polos, shirts & more - designed in Bangladesh. Premium fabrics, bold designs, bKash checkout.";
  const ctaText = overrides?.ctaText ?? hero?.cta_text ?? "Shop Now";
  const ctaLink = overrides?.ctaLink ?? hero?.cta_link ?? "/shop";
  const secondaryCtaText = overrides?.secondaryCtaText ?? hero?.secondary_cta_text ?? "View Collection";
  const secondaryCtaLink = overrides?.secondaryCtaLink ?? hero?.secondary_cta_link ?? "/shop";
  const mediaUrl = overrides?.mediaUrl ?? hero?.media_url ?? "";
  const mediaType = overrides?.mediaType ?? hero?.media_type ?? "image";
  const overlayColor = overrides?.overlayColor ?? hero?.overlay_color ?? "";
  const overlayOpacity = overrides?.overlayOpacity ?? hero?.overlay_opacity ?? 50;

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
    <section id={overrides?.anchorId} ref={sectionRef} className="relative flex min-h-[90vh] items-center justify-center overflow-hidden">
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
            alt="Premium menswear"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute inset-0 grain-texture opacity-[0.03]" />
      </div>

      <div className="absolute right-10 top-32 h-20 w-20 rounded-full bg-primary/10 blur-2xl animate-float" />
      <div className="absolute left-16 bottom-40 h-14 w-14 rounded-full bg-accent/10 blur-xl animate-float" style={{ animationDelay: "1.5s" }} />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="mx-auto mb-4 sm:mb-6 h-px w-12 bg-primary opacity-0 animate-blur-in" />
        <p className="mb-3 sm:mb-4 opacity-0 animate-blur-in text-xs sm:text-sm font-medium uppercase tracking-[0.3em] text-primary drop-shadow-md">
          {tagline}
        </p>
        <h1
          className="mb-4 sm:mb-6 font-heading text-5xl sm:text-6xl md:text-8xl font-black leading-[1.05] text-white opacity-0 animate-blur-in drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]"
          style={{ animationDelay: "0.15s" }}
        >
          {title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-accent">{highlight}</span>
        </h1>
        <p
          className="mx-auto mb-8 sm:mb-10 max-w-2xl text-base sm:text-lg md:text-xl text-gray-200 opacity-0 animate-blur-in drop-shadow-md font-light tracking-wide"
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
      </div>
    </section>
  );
};

export default HeroSection;
