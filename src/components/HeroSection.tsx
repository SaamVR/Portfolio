import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { usePublicPaymentSettings } from "@/hooks/usePublicPaymentSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";
import { BadgeCheck, CreditCard, ShieldCheck, Truck } from "lucide-react";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";

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
  image_url?: string;
  mobile_image_url?: string;
}

interface DeliverySettings {
  enabled?: boolean;
  free_threshold?: number;
}

interface HeroSectionProps {
  overrides?: {
    anchorId?: string;
    disableLegacyFallback?: boolean;
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
    layoutVariant?: "full-bleed" | "split" | "centered" | "editorial" | string;
  };
}

const HeroSection = ({ overrides }: HeroSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const currentStore = useOptionalStore();
  const { data: hero } = useSiteSettings<HeroSettings>("hero_section", currentStore?.id);
  const { data: paymentSettings } = usePublicPaymentSettings(currentStore?.id);
  const { data: deliverySettings } = useSiteSettings<DeliverySettings>("delivery_settings", currentStore?.id);
  const legacyHero = overrides?.disableLegacyFallback ? null : hero;

  const tagline = overrides?.tagline ?? legacyHero?.tagline ?? "Discover";
  const title = overrides?.title ?? legacyHero?.title ?? "Built For";
  const highlight = overrides?.highlight ?? legacyHero?.highlight ?? "Your Business";
  const subtitle =
    overrides?.subtitle ??
    legacyHero?.subtitle ??
    "Share your products, services, and offers with a storefront shaped around your business.";
  const ctaText = overrides?.ctaText ?? legacyHero?.cta_text ?? "Explore";
  const ctaLink = storefrontPath(overrides?.ctaLink ?? legacyHero?.cta_link ?? "/", currentStore?.slug);
  const secondaryCtaText = overrides?.secondaryCtaText ?? legacyHero?.secondary_cta_text ?? "View Details";
  const secondaryCtaLink = storefrontPath(overrides?.secondaryCtaLink ?? legacyHero?.secondary_cta_link ?? "/contact", currentStore?.slug);
  const mediaUrl = overrides?.mediaUrl ?? legacyHero?.media_url ?? "";
  const mediaType = overrides?.mediaType ?? legacyHero?.media_type ?? "image";
  const overlayColor = overrides?.overlayColor ?? legacyHero?.overlay_color ?? "";
  const overlayOpacity = overrides?.overlayOpacity ?? legacyHero?.overlay_opacity ?? 50;
  const layoutVariant = overrides?.layoutVariant ?? "full-bleed";
  const isSplit = layoutVariant === "split";
  const isCentered = layoutVariant === "centered";
  const isEditorial = layoutVariant === "editorial";
  const trustHighlights = [
    paymentSettings?.cod_enabled !== false
      ? { icon: Truck, label: "Flexible checkout options available" }
      : null,
    paymentSettings?.bkash_enabled || paymentSettings?.nagad_enabled
      ? { icon: CreditCard, label: "Digital and manual payment methods supported" }
      : null,
    deliverySettings?.enabled !== false
      ? { icon: BadgeCheck, label: deliverySettings?.free_threshold ? `Delivery incentives from BDT ${deliverySettings.free_threshold}` : "Delivery and fulfillment options available" }
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
  const renderMedia = (className: string) => {
    if (isVideo) {
      return (
        <video
          src={mediaUrl}
          autoPlay
          muted
          loop
          playsInline
          className={className}
          style={{ transform: `translateY(${scrollY}px) scale(1.08)` }}
        />
      );
    }

    if (mediaUrl) {
      return (
        <SafeStorefrontImage
          src={mediaUrl}
          fallbackSrc={legacyHero?.image_url ?? null}
          fill
          priority
          alt="Storefront hero media"
          className={`${className} transition-transform duration-100`}
          style={{ transform: `translateY(${scrollY}px) scale(1.08)` }}
        />
      );
    }

    return <div className={`${className} bg-gradient-to-br from-primary/20 via-accent/10 to-background`} />;
  };

  return (
    <section
      id={overrides?.anchorId}
      ref={sectionRef}
      className={[
        "relative flex min-h-[82svh] items-center justify-center overflow-hidden md:min-h-[90vh]",
        isSplit || isEditorial ? "bg-background text-foreground" : "",
        isCentered ? "min-h-[72svh] md:min-h-[78vh]" : "",
      ].filter(Boolean).join(" ")}
    >
      {!isSplit && !isEditorial ? (
        <div className="absolute inset-0">
          {renderMedia("h-full w-full object-cover")}
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
      ) : null}

      <div
        className={[
          "relative z-10 container mx-auto px-4 py-16 sm:py-20 md:py-24",
          isSplit ? "grid gap-10 text-left lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-center" : "",
          isEditorial ? "grid gap-10 text-left lg:grid-cols-[minmax(360px,0.72fr)_minmax(0,1fr)] lg:items-center" : "",
          !isSplit && !isEditorial ? "text-center" : "",
        ].filter(Boolean).join(" ")}
      >
        <div className={isEditorial ? "order-2 lg:order-1" : ""}>
          <div className={`${isSplit || isEditorial ? "mb-4" : "mx-auto mb-4"} h-px w-12 bg-primary opacity-0 animate-blur-in sm:mb-6`} />
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-primary drop-shadow-md opacity-0 animate-blur-in sm:mb-4 sm:text-sm sm:tracking-[0.3em]">
            {tagline}
          </p>
          <h1
            className={[
              "mb-4 max-w-[12ch] font-heading text-4xl font-black leading-[0.98] opacity-0 animate-blur-in sm:mb-6 sm:max-w-[11ch] sm:text-6xl",
              isEditorial ? "text-foreground md:text-7xl lg:text-8xl" : "",
              isSplit ? "text-foreground md:max-w-[10ch] md:text-7xl" : "",
              !isSplit && !isEditorial ? "mx-auto text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.5)] md:max-w-none md:text-8xl" : "",
              isCentered ? "md:max-w-[12ch] md:text-7xl" : "",
            ].filter(Boolean).join(" ")}
            style={{ animationDelay: "0.15s" }}
          >
            {title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-accent">{highlight}</span>
          </h1>
          <p
            className={[
              "mb-8 max-w-[34ch] text-sm leading-6 opacity-0 animate-blur-in sm:mb-10 sm:max-w-2xl sm:text-lg sm:leading-8 md:text-xl",
              isSplit || isEditorial ? "text-muted-foreground" : "mx-auto text-gray-100 drop-shadow-md",
            ].filter(Boolean).join(" ")}
            style={{ animationDelay: "0.3s" }}
          >
            {subtitle}
          </p>
          <div
            className={[
              "flex flex-col gap-4 opacity-0 animate-blur-in sm:flex-row sm:gap-6",
              isSplit || isEditorial ? "items-start justify-start" : "items-center justify-center",
            ].filter(Boolean).join(" ")}
            style={{ animationDelay: "0.45s" }}
          >
            <Link
              href={ctaLink}
              className="button-premium w-full sm:w-auto rounded-full bg-primary px-8 py-3.5 sm:px-10 sm:py-4 font-heading text-[15px] font-bold tracking-wide text-primary-foreground text-center shadow-lg"
            >
              {ctaText}
            </Link>
            <Link
              href={secondaryCtaLink}
              className={[
                "w-full sm:w-auto rounded-full border px-8 py-3.5 sm:px-10 sm:py-4 font-heading text-[15px] font-semibold text-center transition-all duration-500",
                isSplit || isEditorial
                  ? "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
                  : "border-white/20 glass-panel text-white hover:bg-white/10 hover:border-white/40",
              ].filter(Boolean).join(" ")}
            >
              {secondaryCtaText}
            </Link>
          </div>
          {!isCentered ? (
            <div
              className={[
                "mt-8 flex max-w-4xl flex-wrap items-center gap-2.5 opacity-0 animate-blur-in sm:mt-10",
                isSplit || isEditorial ? "justify-start" : "mx-auto justify-center",
              ].filter(Boolean).join(" ")}
              style={{ animationDelay: "0.6s" }}
            >
              {trustHighlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={[
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium backdrop-blur-md",
                      isSplit || isEditorial ? "border-border bg-card text-foreground" : "border-white/15 bg-black/25 text-white/95",
                    ].filter(Boolean).join(" ")}
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
        {isSplit || isEditorial ? (
          <div
            className={[
              "relative overflow-hidden border border-border bg-card shadow-2xl",
              isSplit ? "min-h-[420px] rounded-lg lg:min-h-[620px]" : "order-1 aspect-[4/5] rounded-lg lg:order-2",
            ].filter(Boolean).join(" ")}
          >
            {renderMedia("absolute inset-0 h-full w-full object-cover")}
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default HeroSection;
