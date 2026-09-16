import { useEffect, useRef, useState } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { usePublicPaymentSettings } from "@/hooks/usePublicPaymentSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import { RealEstatePropertySearchSection } from "@/components/storefront/real-estate/RealEstatePropertySearchSection";
import { storefrontPath } from "@/lib/slug";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { BadgeCheck, CreditCard, ShieldCheck, Truck } from "lucide-react";
import { SafeStorefrontImage } from "@/components/storefront/SafeStorefrontImage";
import { resolveStorefrontImageObjectPosition } from "@/lib/cms/storefront-media";
import { HeroVisualStyles } from "@/components/storefront/section-styles/HeroVisualStyles";
import type { StorefrontVariantOptions } from "@/lib/cms/storefront-platform/variants/variant-option-contract";

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
    variantOptions?: StorefrontVariantOptions;
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
  const storeName = currentStore?.name?.trim() || "your storefront";
  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore.siteSettings.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    templateSeedId: typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });

  const tagline = overrides?.tagline ?? legacyHero?.tagline ?? "Now available";
  const title = overrides?.title ?? legacyHero?.title ?? "Built for";
  const highlight = overrides?.highlight ?? legacyHero?.highlight ?? storeName;
  const subtitle =
    overrides?.subtitle ??
    legacyHero?.subtitle ??
    (currentStore?.description?.trim() || "Share products, services, bookings, or offers with a storefront that feels clear, modern, and ready to buy from.");
  const ctaText = overrides?.ctaText ?? legacyHero?.cta_text ?? "Start exploring";
  const ctaLink = storefrontPath(overrides?.ctaLink ?? legacyHero?.cta_link ?? "/", currentStore?.slug);
  const secondaryCtaText = overrides?.secondaryCtaText ?? legacyHero?.secondary_cta_text ?? "Learn more";
  const secondaryCtaLink = storefrontPath(overrides?.secondaryCtaLink ?? legacyHero?.secondary_cta_link ?? "/contact", currentStore?.slug);
  const mediaUrl = overrides?.mediaUrl ?? legacyHero?.media_url ?? "";
  const mediaType = overrides?.mediaType ?? legacyHero?.media_type ?? "image";
  const mediaFit = overrides?.variantOptions?.mediaFit ?? overrides?.mediaFit ?? "cover";
  const imageObjectPosition = resolveStorefrontImageObjectPosition({
    position: overrides?.imagePosition ?? legacyHero?.image_position,
    focalX: overrides?.focalX ?? legacyHero?.focal_x,
    focalY: overrides?.focalY ?? legacyHero?.focal_y,
  });
  const overlayColor = overrides?.overlayColor ?? legacyHero?.overlay_color ?? "";
  const overlayOpacity = overrides?.overlayOpacity ?? legacyHero?.overlay_opacity ?? 50;
  const layoutVariant = overrides?.layoutVariant ?? "full-bleed";
  const useContainedMedia = mediaFit === "contain";
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
        if (rect.bottom > 0) setScrollY(window.scrollY * 0.3);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isVideo = mediaType === "video" && mediaUrl;
  const renderMedia = (className: string) => {
    const transform = useContainedMedia ? undefined : `translateY(${scrollY}px) scale(1.08)`;

    if (isVideo) {
      return (
        <div className={className}>
          <video
            src={mediaUrl}
            autoPlay
            muted
            loop
            playsInline
            className={`h-full w-full ${useContainedMedia ? "object-contain" : "object-cover"}`}
            style={{ transform, objectPosition: imageObjectPosition }}
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
            alt="Storefront hero media"
            className={`${useContainedMedia ? "object-contain" : "object-cover"} transition-transform duration-100`}
            style={{ transform, objectPosition: imageObjectPosition }}
          />
        </div>
      );
    }

    return <div className={`${className} bg-gradient-to-br from-primary/20 via-accent/10 to-background`} />;
  };

  return (
    <>
      <HeroVisualStyles
        anchorId={overrides?.anchorId}
        sectionRef={sectionRef}
        layoutVariant={layoutVariant}
        variantOptions={overrides?.variantOptions}
        tagline={tagline}
        title={title}
        highlight={highlight}
        subtitle={subtitle}
        ctaText={ctaText}
        ctaLink={ctaLink}
        secondaryCtaText={secondaryCtaText}
        secondaryCtaLink={secondaryCtaLink}
        overlayColor={overlayColor}
        overlayOpacity={overlayOpacity}
        trustHighlights={trustHighlights}
        renderMedia={renderMedia}
      />
      {templateId === "real-estate" ? <RealEstatePropertySearchSection /> : null}
    </>
  );
};

export default HeroSection;