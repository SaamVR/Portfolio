import { Link } from "react-router-dom";
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

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const { data: hero } = useSiteSettings<HeroSettings>("hero_section");

  const tagline = hero?.tagline || "Premium Menswear from Dhaka";
  const title = hero?.title || "Wear Your";
  const highlight = hero?.highlight || "Identity";
  const subtitle = hero?.subtitle || "Tees, polos, shirts & more — designed in Bangladesh. Premium fabrics, bold designs, bKash checkout.";
  const ctaText = hero?.cta_text || "Shop Now";
  const ctaLink = hero?.cta_link || "/shop";
  const secondaryCtaText = hero?.secondary_cta_text || "View Collection";
  const secondaryCtaLink = hero?.secondary_cta_link || "/shop";
  const mediaUrl = hero?.media_url || "";
  const mediaType = hero?.media_type || "image";
  const overlayColor = hero?.overlay_color || "";
  const overlayOpacity = hero?.overlay_opacity ?? 50;

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
    <section ref={sectionRef} className="relative flex min-h-[85vh] items-center justify-center overflow-hidden">
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
            src={mediaUrl || heroBanner}
            alt="Premium menswear"
            className="h-full w-full object-cover transition-transform duration-100"
            style={{ transform: `translateY(${scrollY}px) scale(1.1)` }}
          />
        )}
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: overlayColor || "hsl(var(--background))",
            opacity: overlayOpacity / 100,
          }}
        />
      </div>

      {/* Floating accent */}
      <div className="absolute right-10 top-32 h-20 w-20 rounded-full bg-primary/10 blur-2xl animate-float" />
      <div className="absolute left-16 bottom-40 h-14 w-14 rounded-full bg-accent/10 blur-xl animate-float" style={{ animationDelay: "1.5s" }} />

      <div className="relative z-10 container mx-auto px-4 text-center">
        <p className="mb-4 opacity-0 animate-blur-in text-sm font-medium uppercase tracking-[0.3em] text-primary">
          {tagline}
        </p>
        <h1
          className="mb-6 font-heading text-5xl font-bold leading-tight text-foreground opacity-0 animate-blur-in md:text-7xl"
          style={{ animationDelay: "0.15s" }}
        >
          {title} <span className="text-gradient">{highlight}</span>
        </h1>
        <p
          className="mx-auto mb-10 max-w-lg text-lg text-muted-foreground opacity-0 animate-blur-in"
          style={{ animationDelay: "0.3s" }}
        >
          {subtitle}
        </p>
        <div className="flex items-center justify-center gap-4 opacity-0 animate-blur-in" style={{ animationDelay: "0.45s" }}>
          <Link
            to={ctaLink}
            className="rounded-md bg-primary px-8 py-3 font-heading text-sm font-semibold text-primary-foreground smooth-hover hover:opacity-90 glow-shadow"
          >
            {ctaText}
          </Link>
          <Link
            to={secondaryCtaLink}
            className="rounded-md border border-border px-8 py-3 font-heading text-sm font-semibold text-foreground smooth-hover hover:bg-secondary"
          >
            {secondaryCtaText}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
