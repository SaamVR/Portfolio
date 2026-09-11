import Link from "next/link";
import { useEffect, useState } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { usePublicPaymentSettings } from "@/hooks/usePublicPaymentSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import { RealEstatePropertySearchSection } from "@/components/storefront/real-estate/RealEstatePropertySearchSection";
import { storefrontPath } from "@/lib/slug";
import { resolveStorefrontTemplateId, type StorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { getStorefrontExperienceProfile } from "@/lib/storefront-template-experience";
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

const legacyTemplateHeroDefaults: Partial<Record<StorefrontTemplateId, string>> = {
  blank: "split",
  landing: "centered",
  beauty: "split",
  electronics: "split",
  crafts: "editorial",
  subscriptions: "split",
  "digital-downloads": "split",
  "single-product": "split",
  service: "split",
  booking: "split",
  hotel: "split",
  "real-estate": "split",
};

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
  const experience = getStorefrontExperienceProfile(templateId);

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
  const requestedLayout = overrides?.layoutVariant;
  const legacyDefaultLayout = legacyTemplateHeroDefaults[templateId];
  const layoutVariant = requestedLayout && requestedLayout !== legacyDefaultLayout ? requestedLayout : experience.heroLayout;
  const heroExperience = experience.hero;
  const isSplit = layoutVariant === "split";
  const isCentered = layoutVariant === "centered";
  const isEditorial = layoutVariant === "editorial";
  const isContained = mediaFit === "contain";
  const hasSideMedia = isSplit || isEditorial;
  const isVideo = mediaType === "video" && Boolean(mediaUrl);
  const isDarkTechnical = heroExperience === "tech" || heroExperience === "digital";
  const isWarm = heroExperience === "food" || heroExperience === "artisan";
  const isSoft = heroExperience === "beauty";
  const isCampaign = heroExperience === "campaign" || heroExperience === "subscription";
  const isHospitality = heroExperience === "booking" || heroExperience === "hotel" || heroExperience === "property";
  const useLightSideSurface = hasSideMedia && !isDarkTechnical;

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
          isDarkTechnical
            ? "bg-gradient-to-br from-slate-950 via-slate-900 to-primary/25"
            : isSoft
              ? "bg-gradient-to-br from-primary/10 via-background to-secondary/70"
              : isWarm
                ? "bg-gradient-to-br from-amber-950 via-orange-950 to-stone-950"
                : isCampaign
                  ? "bg-gradient-to-br from-primary/20 via-background to-secondary/60"
                  : hasSideMedia
                    ? "bg-gradient-to-br from-primary/15 via-muted to-background"
                    : "bg-slate-950",
        )}
        aria-hidden="true"
      />
    );
  };

  const sectionSurface = hasSideMedia
    ? isDarkTechnical
      ? "bg-slate-950 text-white"
      : isSoft
        ? "bg-gradient-to-br from-background via-primary/[0.035] to-secondary/45 text-foreground"
        : isWarm
          ? "bg-gradient-to-br from-stone-50 via-background to-amber-50/60 text-foreground dark:from-stone-950 dark:via-background dark:to-amber-950/20"
          : isCampaign
            ? "bg-gradient-to-br from-background via-primary/[0.045] to-secondary/45 text-foreground"
            : "bg-background text-foreground"
    : isDarkTechnical
      ? "bg-slate-950 text-white"
      : isWarm
        ? "bg-amber-950 text-white"
        : "bg-slate-950 text-white";

  return (
    <>
      <section
        id={overrides?.anchorId}
        data-storefront-hero-experience={heroExperience}
        className={cn(
          "relative flex items-center overflow-hidden",
          sectionSurface,
          isHospitality ? "min-h-[76svh] md:min-h-[86vh]" : "min-h-[70svh] md:min-h-[78vh]",
          isCentered && "min-h-[64svh] md:min-h-[72vh]",
          heroExperience === "editorial" && "md:min-h-[88vh]",
          heroExperience === "subscription" && "min-h-[68svh] md:min-h-[74vh]",
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
                    backgroundColor: overlayColor || (isWarm ? "#451a03" : "#020617"),
                    opacity: overlayOpacity / 100,
                  }}
                />
                <div
                  className={cn(
                    "absolute inset-0",
                    isHospitality
                      ? "bg-gradient-to-t from-black/90 via-black/30 to-black/10 md:bg-gradient-to-r md:from-black/80 md:via-black/35 md:to-transparent"
                      : isWarm
                        ? "bg-gradient-to-t from-black/85 via-black/40 to-black/15 md:bg-gradient-to-r md:from-black/75 md:via-black/35 md:to-transparent"
                        : "bg-gradient-to-t from-black/90 via-black/55 to-black/30 md:bg-gradient-to-r md:from-black/80 md:via-black/50 md:to-black/25",
                  )}
                />
              </>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            "relative z-10 container mx-auto px-4 py-14 sm:py-16 md:py-20 lg:py-24",
            hasSideMedia && "grid gap-8 lg:items-center lg:gap-14",
            hasSideMedia && heroExperience === "beauty" && "lg:grid-cols-[minmax(0,0.78fr)_minmax(420px,1.22fr)]",
            hasSideMedia && heroExperience === "editorial" && "lg:grid-cols-[minmax(0,0.72fr)_minmax(440px,1.28fr)]",
            hasSideMedia && heroExperience === "tech" && "lg:grid-cols-[minmax(0,1fr)_minmax(420px,1fr)]",
            hasSideMedia && heroExperience === "artisan" && "lg:grid-cols-[minmax(0,0.92fr)_minmax(400px,1.08fr)]",
            hasSideMedia && !["beauty", "editorial", "tech", "artisan"].includes(heroExperience) && "lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,1.1fr)]",
            !hasSideMedia && (isCentered ? "text-center" : "text-left"),
          )}
        >
          <div className={cn(isEditorial && "order-2 lg:order-1", !hasSideMedia && !isCentered && "max-w-3xl")}>
            {tagline ? (
              <p
                className={cn(
                  "mb-4 inline-flex items-center border px-3 py-1.5 text-xs font-bold uppercase sm:mb-5",
                  heroExperience === "editorial" ? "rounded-none border-current/25 bg-transparent tracking-[0.28em]" : "rounded-full tracking-[0.18em]",
                  useLightSideSurface
                    ? "border-border bg-card/80 text-foreground"
                    : "border-white/30 bg-black/45 text-white backdrop-blur-md",
                  isCentered && "mx-auto",
                )}
              >
                {tagline}
              </p>
            ) : null}

            <h1
              className={cn(
                "max-w-[14ch] font-heading font-black leading-[0.96] tracking-[-0.04em]",
                heroExperience === "editorial" ? "text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem]" : "text-4xl sm:text-5xl md:text-6xl lg:text-7xl",
                heroExperience === "tech" && "font-extrabold uppercase tracking-[-0.045em]",
                heroExperience === "beauty" && "max-w-[12ch] font-semibold tracking-[-0.03em]",
                heroExperience === "food" && "max-w-[11ch] text-5xl sm:text-6xl lg:text-[5.25rem]",
                useLightSideSurface ? "text-foreground" : "text-white drop-shadow-[0_3px_24px_rgba(0,0,0,0.55)]",
                isCentered && "mx-auto max-w-[16ch]",
              )}
            >
              {title}
              {highlight ? (
                <>
                  {" "}
                  <span
                    className={cn(
                      "mt-2 inline-block",
                      heroExperience === "editorial" && "border-b-[0.16em] border-primary px-0 pb-[0.02em] text-current",
                      heroExperience === "beauty" && "rounded-none bg-transparent px-0 italic text-primary",
                      heroExperience === "tech" && "rounded-md border border-primary/50 bg-primary/10 px-[0.18em] py-[0.04em] text-primary",
                      !["editorial", "beauty", "tech"].includes(heroExperience) && "rounded-[0.35em] bg-primary px-[0.18em] py-[0.05em] text-primary-foreground",
                    )}
                  >
                    {highlight}
                  </span>
                </>
              ) : null}
            </h1>

            <p
              className={cn(
                "mt-5 max-w-[42rem] text-base leading-7 sm:mt-6 sm:text-lg sm:leading-8",
                useLightSideSurface ? "text-muted-foreground" : "text-white/90 drop-shadow-md",
                isCentered && "mx-auto",
                heroExperience === "editorial" && "max-w-[34rem]",
              )}
            >
              {subtitle}
            </p>

            <div
              className={cn(
                "mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap",
                hasSideMedia && !isCentered ? "items-stretch justify-start sm:items-center" : "items-center justify-center",
              )}
            >
              <Link
                href={ctaLink}
                className={cn(
                  "inline-flex min-h-12 w-full items-center justify-center bg-primary px-7 py-3 font-heading text-[15px] font-bold tracking-wide text-primary-foreground shadow-[0_12px_30px_-14px_rgba(0,0,0,0.55)] transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none sm:w-auto sm:px-9",
                  heroExperience === "tech" ? "rounded-lg" : heroExperience === "editorial" ? "rounded-none" : "rounded-full",
                )}
              >
                {ctaText}
              </Link>
              <Link
                href={secondaryCtaLink}
                className={cn(
                  "inline-flex min-h-12 w-full items-center justify-center border px-7 py-3 font-heading text-[15px] font-semibold transition-[background-color,border-color,color] duration-200 motion-reduce:transition-none sm:w-auto sm:px-9",
                  heroExperience === "tech" ? "rounded-lg" : heroExperience === "editorial" ? "rounded-none" : "rounded-full",
                  useLightSideSurface
                    ? "border-border bg-card/80 text-foreground hover:border-primary/50 hover:bg-primary/5"
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
                  hasSideMedia ? "justify-start" : "justify-start",
                )}
              >
                {trustHighlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-2 border px-3 py-2 text-xs font-semibold leading-5 sm:px-4",
                        heroExperience === "tech" ? "rounded-md" : heroExperience === "editorial" ? "rounded-none" : "rounded-full",
                        useLightSideSurface
                          ? "border-border bg-card/80 text-foreground"
                          : "border-white/30 bg-black/45 text-white backdrop-blur-md",
                      )}
                    >
                      <Icon className={cn("h-4 w-4", useLightSideSurface ? "text-primary" : "text-white")} aria-hidden="true" />
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
                "relative overflow-hidden border bg-muted",
                heroExperience === "beauty" && "aspect-[4/5] rounded-[2.75rem] border-primary/15 shadow-[0_35px_90px_-50px_rgba(120,80,100,0.65)] lg:aspect-[5/6]",
                heroExperience === "editorial" && "order-1 aspect-[4/5] rounded-none border-foreground/15 shadow-none lg:order-2 lg:aspect-[4/5]",
                heroExperience === "tech" && "aspect-[5/4] rounded-xl border-white/15 bg-slate-900 shadow-[0_30px_90px_-42px_rgba(0,0,0,0.95)] lg:aspect-[6/5]",
                heroExperience === "artisan" && "order-1 aspect-[4/5] rounded-[2rem_5rem_2rem_5rem] border-amber-900/15 shadow-[0_30px_80px_-45px_rgba(120,70,25,0.55)] lg:order-2",
                !["beauty", "editorial", "tech", "artisan"].includes(heroExperience) && "aspect-[4/5] rounded-[var(--sf-card-radius)] border-border shadow-[0_24px_70px_-36px_rgba(15,23,42,0.55)] lg:aspect-[5/6]",
              )}
            >
              {renderMedia(cn("absolute inset-0 h-full w-full", isContained && "bg-muted p-4 md:p-6"))}
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
