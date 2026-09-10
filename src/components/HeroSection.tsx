import Link from "next/link";
import { useEffect, useState } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { usePublicPaymentSettings } from "@/hooks/usePublicPaymentSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import { RealEstatePropertySearchSection } from "@/components/storefront/real-estate/RealEstatePropertySearchSection";
import { storefrontPath } from "@/lib/slug";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { BadgeCheck, CreditCard, Truck } from "lucide-react";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { resolveStorefrontImageObjectPosition } from "@/lib/cms/storefront-media";
import { cn } from "@/lib/utils";

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
  image_position?: string;
  focal_x?: number;
  focal_y?: number;
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
    mediaFit?: "cover" | "contain";
    imagePosition?: string;
    focalX?: number;
    focalY?: number;
    overlayColor?: string;
    overlayOpacity?: number;
    layoutVariant?: "full-bleed" | "split" | "centered" | "editorial" | string;
  };
}

const HeroSection = ({ overrides }: HeroSectionProps) => {
  const currentStore = useOptionalStore();
  const preloadedHero = currentStore?.siteSettings?.hero_section as HeroSettings | undefined;
  const preloadedDelivery = currentStore?.siteSettings?.delivery_settings as DeliverySettings | undefined;
  const { data: fetchedHero } = useSiteSettings<HeroSettings>("hero_section", currentStore?.id);
  const { data: paymentSettings } = usePublicPaymentSettings(currentStore?.id);
  const { data: fetchedDeliverySettings } = useSiteSettings<DeliverySettings>("delivery_settings", currentStore?.id);
  const hero = fetchedHero ?? preloadedHero;
  const deliverySettings = fetchedDeliverySettings ?? preloadedDelivery;
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const legacyHero = overrides?.disableLegacyFallback ? null : hero;
  const storeName = currentStore?.name?.trim() || "Store";
  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore.siteSettings.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    templateSeedId: typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });

  const tagline = (overrides?.tagline ?? legacyHero?.tagline ?? "").trim();
  const title = overrides?.title ?? legacyHero?.title ?? storeName;
  const highlight = overrides?.highlight ?? legacyHero?.highlight ?? "";
  const subtitle =
    overrides?.subtitle
    ?? legacyHero?.subtitle
    ?? currentStore?.description?.trim()
    ?? "Explore what this store has to offer and open any item for the full details.";
  const ctaText = overrides?.ctaText ?? legacyHero?.cta_text ?? "Browse store";
  const ctaLink = storefrontPath(overrides?.ctaLink ?? legacyHero?.cta_link ?? "/shop", currentStore?.slug);
  const secondaryCtaText = overrides?.secondaryCtaText ?? legacyHero?.secondary_cta_text ?? "Contact us";
  const secondaryCtaLink = storefrontPath(overrides?.secondaryCtaLink ?? legacyHero?.secondary_cta_link ?? "/contact", currentStore?.slug);
  const explicitMediaUrl = overrides?.mediaUrl ?? legacyHero?.media_url ?? "";
  const legacyImageUrl = legacyHero?.image_url ?? "";
  const mediaUrl = explicitMediaUrl || legacyImageUrl;
  const mediaType = explicitMediaUrl ? (overrides?.mediaType ?? legacyHero?.media_type ?? "image") : "image";
  const mediaFit = overrides?.mediaFit ?? "cover";
  const imageObjectPosition = resolveStorefrontImageObjectPosition({
    position: overrides?.imagePosition ?? legacyHero?.image_position,
    focalX: overrides?.focalX ?? legacyHero?.focal_x,
    focalY: overrides?.focalY ?? legacyHero?.focal_y,
  });
  const overlayColor = overrides?.overlayColor ?? legacyHero?.overlay_color ?? "";
  const overlayOpacity = Math.min(90, Math.max(20, overrides?.overlayOpacity ?? legacyHero?.overlay_opacity ?? 48));
  const layoutVariant = overrides?.layoutVariant ?? "full-bleed";
  const isSplit = layoutVariant === "split";
  const isCentered = layoutVariant === "centered";
  const isEditorial = layoutVariant === "editorial";
  const isContained = mediaFit === "contain";
  const hasSideMedia = isSplit || isEditorial;
  const isVideo = mediaType === "video" && Boolean(mediaUrl);

  const trustHighlights = [
    paymentSettings?.cod_enabled === true
      ? { icon: Truck, label: "Cash on delivery available" }
      : null,
    paymentSettings?.bkash_enabled === true || paymentSettings?.nagad_enabled === true
      ? {
          icon: CreditCard,
          label: paymentSettings?.bkash_enabled === true && paymentSettings?.nagad_enabled === true
            ? "bKash and Nagad available"
            : paymentSettings?.bkash_enabled === true
              ? "bKash available"
              : "Nagad available",
        }
      : null,
    deliverySettings?.enabled === true
      ? {
          icon: BadgeCheck,
          label: typeof deliverySettings.free_threshold === "number" && deliverySettings.free_threshold > 0
            ? `Free delivery from BDT ${deliverySettings.free_threshold.toLocaleString()}`
            : "Delivery options available",
        }
      : null,
  ].filter(Boolean) as Array<{ icon: typeof Truck; label: string }>;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncPreference();
    mediaQuery.addEventListener?.("change", syncPreference);
    return () => mediaQuery.removeEventListener?.("change", syncPreference);
  }, []);

  const renderMedia = (className: string) => {
    if (isVideo) {
      return (
        <div className={className}>
          <video
            src={mediaUrl}
            autoPlay={!prefersReducedMotion}
            loop={!prefersReducedMotion}
            muted
            playsInline
            controls={prefersReducedMotion}
            preload="metadata"
            aria-label={`${storeName} hero video`}
            className={cn("h-full w-full", isContained ? "object-contain" : "object-cover")}
            style={{ objectPosition: imageObjectPosition }}
          />
        </div>
      );
    }

    if (mediaUrl) {
      return (
        <div className={className}>
          <SafeStorefrontImage
            src={mediaUrl}
            fallbackSrc={legacyHero?.image_url ?? null}
            fill
            priority
            alt={`${storeName} hero`}
            className={cn("h-full w-full", isContained ? "object-contain" : "object-cover")}
            style={{ objectPosition: imageObjectPosition }}
          />
        </div>
      );
    }

    return (
      <div
        className={cn(
          className,
          hasSideMedia
            ? "bg-gradient-to-br from-primary/15 via-muted to-background"
            : "bg-slate-950",
        )}
        aria-hidden="true"
      />
    );
  };

  return (
    <>
      <section
        id={overrides?.anchorId}
        className={cn(
          "relative flex min-h-[70svh] items-center overflow-hidden md:min-h-[78vh]",
          hasSideMedia ? "bg-background text-foreground" : "bg-slate-950 text-white",
          isCentered && "min-h-[64svh] md:min-h-[70vh]",
        )}
      >
        {!hasSideMedia ? (
          <div className="absolute inset-0" aria-hidden={!mediaUrl}>
            {renderMedia(cn("h-full w-full", isContained && "bg-slate-950 p-4 md:p-8"))}
            {mediaUrl ? (
              <>
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: overlayColor || "#020617",
                    opacity: overlayOpacity / 100,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/30 md:bg-gradient-to-r md:from-black/80 md:via-black/50 md:to-black/25" />
              </>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            "relative z-10 container mx-auto px-4 py-14 sm:py-16 md:py-20 lg:py-24",
            hasSideMedia && "grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,1.1fr)] lg:items-center lg:gap-14",
            !hasSideMedia && "text-center",
          )}
        >
          <div className={cn(isEditorial && "order-2 lg:order-1")}>
            {tagline ? (
              <p
                className={cn(
                  "mb-4 inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] sm:mb-5",
                  hasSideMedia
                    ? "border-border bg-card text-foreground"
                    : "border-white/30 bg-black/45 text-white backdrop-blur-md",
                  !hasSideMedia && "mx-auto",
                )}
              >
                {tagline}
              </p>
            ) : null}

            <h1
              className={cn(
                "max-w-[14ch] font-heading text-4xl font-black leading-[0.98] tracking-[-0.035em] sm:text-5xl md:text-6xl lg:text-7xl",
                hasSideMedia ? "text-foreground" : "mx-auto text-white drop-shadow-[0_3px_24px_rgba(0,0,0,0.55)]",
                isCentered && "max-w-[16ch]",
              )}
            >
              {title}
              {highlight ? (
                <>
                  {" "}
                  <span className="mt-2 inline-block rounded-[0.35em] bg-primary px-[0.18em] py-[0.05em] text-primary-foreground">
                    {highlight}
                  </span>
                </>
              ) : null}
            </h1>

            <p
              className={cn(
                "mt-5 max-w-[42rem] text-base leading-7 sm:mt-6 sm:text-lg sm:leading-8",
                hasSideMedia ? "text-muted-foreground" : "mx-auto text-white/90 drop-shadow-md",
              )}
            >
              {subtitle}
            </p>

            <div
              className={cn(
                "mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap",
                hasSideMedia ? "items-stretch justify-start sm:items-center" : "items-center justify-center",
              )}
            >
              <Link
                href={ctaLink}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-7 py-3 font-heading text-[15px] font-bold tracking-wide text-primary-foreground shadow-[0_12px_30px_-14px_rgba(0,0,0,0.55)] transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none sm:w-auto sm:px-9"
              >
                {ctaText}
              </Link>
              <Link
                href={secondaryCtaLink}
                className={cn(
                  "inline-flex min-h-12 w-full items-center justify-center rounded-full border px-7 py-3 font-heading text-[15px] font-semibold transition-[background-color,border-color,color] duration-200 motion-reduce:transition-none sm:w-auto sm:px-9",
                  hasSideMedia
                    ? "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5"
                    : "border-white/45 bg-black/35 text-white backdrop-blur-md hover:border-white/70 hover:bg-black/50",
                )}
              >
                {secondaryCtaText}
              </Link>
            </div>

            {trustHighlights.length > 0 && !isCentered ? (
              <div
                className={cn(
                  "mt-7 flex max-w-4xl flex-wrap items-center gap-2 sm:mt-9",
                  hasSideMedia ? "justify-start" : "mx-auto justify-center",
                )}
              >
                {trustHighlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold leading-5 sm:px-4",
                        hasSideMedia
                          ? "border-border bg-card text-foreground"
                          : "border-white/30 bg-black/45 text-white backdrop-blur-md",
                      )}
                    >
                      <Icon className={cn("h-4 w-4", hasSideMedia ? "text-primary" : "text-white")} aria-hidden="true" />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {hasSideMedia ? (
            <div
              className={cn(
                "relative overflow-hidden rounded-[var(--sf-card-radius)] border border-border bg-muted shadow-[0_24px_70px_-36px_rgba(15,23,42,0.55)]",
                isEditorial ? "order-1 aspect-[4/5] lg:order-2" : "aspect-[4/5] lg:aspect-[5/6]",
              )}
            >
              {renderMedia(cn("absolute inset-0 h-full width-full", isContained && "bg-muted p-4 md:p-6"))}
            {mediaUrl ? <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" /> : null}
          </div>
        ) : null}
        </div>
      </section>
      {templateId === "real-estate" ? <RealEstatePropertySearchSection /> : null}
    </>
  );
};

export default HeroSection;
