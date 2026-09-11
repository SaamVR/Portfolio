import Link from "next/link";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";

interface PromoBannerSettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  badge_text: string;
  bg_style: "gradient" | "dark" | "accent" | "luxury-gold" | "indigo" | "rose" | "aurora" | "luxury-dark" | "confetti" | "mesh-gradient";
  enable_glow?: boolean;
  text_alignment?: "left" | "center" | "right";
  padding_size?: "compact" | "cozy" | "large";
  enable_particles?: boolean;
  enable_orbs?: boolean;
  card_opacity?: number;
}

interface WhatsAppSettings {
  enabled?: boolean;
  number?: string;
  message?: string;
}

interface PromoBannerProps {
  overrides?: {
    disableLegacyFallback?: boolean;
    layoutVariant?: string;
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    badgeText?: string;
    bgStyle?: PromoBannerSettings["bg_style"];
    textAlignment?: PromoBannerSettings["text_alignment"];
    paddingSize?: PromoBannerSettings["padding_size"];
    enableGlow?: boolean;
    enableParticles?: boolean;
    enableOrbs?: boolean;
    cardOpacity?: number;
  };
}

function hasExplicitPromoThemeOverrides(settings?: PromoBannerSettings | null) {
  if (!settings) return false;
  return [
    settings.bg_style,
    settings.text_alignment,
    settings.padding_size,
    settings.enable_glow,
    settings.enable_particles,
    settings.enable_orbs,
    settings.card_opacity,
  ].some((value) => {
    if (value === undefined || value === null) return false;
    return typeof value === "string" ? value.trim().length > 0 : true;
  });
}

const getBannerStyle = (bgStyle: string) => {
  switch (bgStyle) {
    case "gradient":
      return { background: "linear-gradient(135deg, #021a12 0%, #064e3b 50%, #10b981 100%)", borderColor: "transparent" };
    case "luxury-gold":
      return { background: "linear-gradient(135deg, #0b0f12 0%, #201a10 50%, #d97706 100%)", borderColor: "transparent" };
    case "indigo":
      return { background: "linear-gradient(135deg, #022c22 0%, #064e3b 40%, #166534 70%, #854d0e 100%)", borderColor: "transparent" };
    case "rose":
      return { background: "linear-gradient(135deg, #0a0204 0%, #4c0519 60%, #1c0209 100%)", borderColor: "transparent" };
    case "aurora":
      return { background: "linear-gradient(120deg, #06131f 0%, #064e3b 35%, #4c1d95 70%, #111827 100%)", borderColor: "transparent" };
    case "luxury-dark":
      return { background: "linear-gradient(135deg, #050505 0%, #111111 55%, #3f2f12 100%)", borderColor: "transparent" };
    case "confetti":
      return { background: "radial-gradient(circle at 12% 20%, rgba(244,63,94,.35), transparent 18%), radial-gradient(circle at 84% 18%, rgba(250,204,21,.32), transparent 16%), radial-gradient(circle at 70% 84%, rgba(16,185,129,.28), transparent 18%), linear-gradient(135deg, #24030a 0%, #5b1121 50%, #111827 100%)", borderColor: "transparent" };
    case "mesh-gradient":
      return { background: "radial-gradient(circle at 20% 20%, rgba(16,185,129,.32), transparent 28%), radial-gradient(circle at 80% 30%, rgba(217,119,6,.28), transparent 26%), radial-gradient(circle at 50% 90%, rgba(59,130,246,.22), transparent 30%), hsl(var(--background))", borderColor: "transparent" };
    case "dark":
      return { background: "linear-gradient(135deg, #050708 0%, #0d1216 50%, #111827 100%)", borderColor: "transparent" };
    case "accent":
      return { background: "hsl(var(--primary) / 0.15)", borderColor: "transparent" };
    default:
      return { background: "linear-gradient(135deg, #021a12 0%, #064e3b 50%, #10b981 100%)", borderColor: "transparent" };
  }
};

const getOrbColors = (bgStyle: string) => {
  switch (bgStyle) {
    case "gradient":
      return { orb1: "bg-emerald-500/10", orb2: "bg-teal-400/10" };
    case "luxury-gold":
      return { orb1: "bg-amber-500/10", orb2: "bg-yellow-600/5" };
    case "indigo":
      return { orb1: "bg-emerald-500/10", orb2: "bg-amber-500/10" };
    case "rose":
      return { orb1: "bg-rose-500/10", orb2: "bg-pink-500/10" };
    case "aurora":
      return { orb1: "bg-emerald-400/10", orb2: "bg-violet-500/10" };
    case "luxury-dark":
      return { orb1: "bg-amber-400/10", orb2: "bg-neutral-300/5" };
    case "confetti":
      return { orb1: "bg-rose-400/10", orb2: "bg-yellow-300/10" };
    case "mesh-gradient":
      return { orb1: "bg-primary/10", orb2: "bg-accent/10" };
    case "dark":
      return { orb1: "bg-emerald-500/5", orb2: "bg-slate-400/5" };
    default:
      return { orb1: "bg-primary/5", orb2: "bg-emerald-500/5" };
  }
};

const getBorderGradient = (bgStyle: string) => {
  switch (bgStyle) {
    case "gradient":
      return "from-transparent via-emerald-400/30 to-transparent";
    case "luxury-gold":
      return "from-transparent via-amber-400/30 to-transparent";
    case "indigo":
      return "from-transparent via-emerald-400/30 to-transparent";
    case "rose":
      return "from-transparent via-rose-400/30 to-transparent";
    case "aurora":
      return "from-transparent via-violet-400/30 to-transparent";
    case "luxury-dark":
      return "from-transparent via-amber-300/30 to-transparent";
    case "confetti":
      return "from-transparent via-yellow-300/30 to-transparent";
    case "mesh-gradient":
      return "from-transparent via-primary/30 to-transparent";
    case "dark":
      return "from-transparent via-emerald-500/20 to-transparent";
    case "accent":
      return "from-transparent via-primary/30 to-transparent";
    default:
      return "from-transparent via-primary/30 to-transparent";
  }
};

const DARK_BANNER_STYLES: PromoBannerSettings["bg_style"][] = [
  "gradient",
  "luxury-gold",
  "indigo",
  "rose",
  "dark",
  "aurora",
  "luxury-dark",
  "confetti",
  "mesh-gradient",
];

const SparkleSVG = ({ className }: { className: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
  </svg>
);

const PromoBanner = ({ overrides }: PromoBannerProps) => {
  const currentStore = useOptionalStore();
  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore.siteSettings.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    templateSeedId: typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });
  const isFashion = templateId === "fashion";
  const { data: settings } = useSiteSettings<PromoBannerSettings>("promo_banner", currentStore?.id);
  const preloadedWhatsApp = currentStore?.siteSettings?.whatsapp_support as WhatsAppSettings | undefined;
  const { data: fetchedWhatsApp } = useSiteSettings<WhatsAppSettings>("whatsapp_support", currentStore?.id);
  const whatsapp = fetchedWhatsApp ?? preloadedWhatsApp;
  const legacySettings = overrides?.disableLegacyFallback ? null : settings;
  const useLegacyThemeOverrides = hasExplicitPromoThemeOverrides(legacySettings);
  const isContactVariant = overrides?.layoutVariant === "contact-cta";

  if (legacySettings?.enabled === false) return null;

  const bg: PromoBannerSettings["bg_style"] | undefined = overrides?.bgStyle ?? (useLegacyThemeOverrides ? legacySettings?.bg_style : undefined);
  const usesCustomBannerTheme = Boolean(bg);
  const isDarkBg = bg ? DARK_BANNER_STYLES.includes(bg) : false;
  const style = bg ? getBannerStyle(bg) : undefined;
  const orbCls = getOrbColors(bg ?? "accent");
  const borderGrad = getBorderGradient(bg ?? "accent");

  const badgeText = overrides?.badgeText ?? legacySettings?.badge_text ?? (isContactVariant ? "Talk to us" : "");
  const title = overrides?.title ?? legacySettings?.title ?? (isContactVariant ? "Questions before you decide?" : "Spotlight What Matters Most");
  const subtitle =
    overrides?.subtitle ??
    legacySettings?.subtitle ??
    (isContactVariant
      ? "Reach the store directly for product questions, bookings, quotes, availability, or help choosing the right option."
      : "Use this section for one timely reason to act now: a launch, a seasonal offer, a service push, or a direct contact moment.");
  const contactNumber = whatsapp?.enabled && whatsapp.number ? whatsapp.number.replace(/\D/g, "") : "";
  const contactHref = contactNumber
    ? `https://wa.me/${contactNumber}?text=${encodeURIComponent(whatsapp?.message || "Hi! I would like more information.")}`
    : storefrontPath("/contact", currentStore?.slug);
  const ctaText = overrides?.ctaText ?? legacySettings?.cta_text ?? (isContactVariant ? (contactNumber ? "Chat on WhatsApp" : "Contact us") : "See the offer");
  const ctaLink = isContactVariant
    ? contactHref
    : storefrontPath(overrides?.ctaLink ?? legacySettings?.cta_link ?? "/", currentStore?.slug);
  const isExternalContact = isContactVariant && Boolean(contactNumber);

  const align = overrides?.textAlignment ?? (useLegacyThemeOverrides ? legacySettings?.text_alignment : undefined) ?? "center";
  const alignCls = align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
  const containerAlignCls = align === "left" ? "items-start" : align === "right" ? "items-end" : "items-center";
  const textMaxCls = align === "left" ? "mr-auto" : align === "right" ? "ml-auto" : "mx-auto";

  const padding = overrides?.paddingSize ?? (useLegacyThemeOverrides ? legacySettings?.padding_size : undefined) ?? "cozy";
  const paddingCls = padding === "compact" ? "py-8" : padding === "large" ? "py-20 md:py-24" : "py-12 md:py-16";

  const buttonGlowCls =
    (overrides?.enableGlow ?? (useLegacyThemeOverrides ? legacySettings?.enable_glow : undefined))
      ? bg === "accent"
        ? "animate-pulse-glow-primary"
        : "animate-pulse-glow"
      : "";

  const showParticles = overrides?.enableParticles ?? (useLegacyThemeOverrides ? legacySettings?.enable_particles : undefined) ?? false;
  const showOrbs = overrides?.enableOrbs ?? (useLegacyThemeOverrides ? legacySettings?.enable_orbs : undefined) ?? false;

  const customOpacitySource = overrides?.cardOpacity ?? (useLegacyThemeOverrides ? legacySettings?.card_opacity : undefined);
  const customOpacity = customOpacitySource !== undefined ? customOpacitySource / 100 : null;

  const cardBgCls = usesCustomBannerTheme
    ? isDarkBg
      ? `${customOpacity !== null ? "" : "bg-white/[0.03]"} border-white/10 text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]`
      : `${customOpacity !== null ? "" : "bg-black/[0.02] dark:bg-white/[0.02]"} border-black/[0.08] dark:border-white/10 text-foreground shadow-lg dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]`
    : `${customOpacity !== null ? "" : "bg-card/80"} border-border text-foreground shadow-lg`;

  const badgeBgCls = usesCustomBannerTheme && isDarkBg
    ? "bg-white/10 text-white border-white/10 hover:bg-white/20"
    : "bg-black/5 dark:bg-white/10 text-foreground border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/20";

  const headingCls = usesCustomBannerTheme && isDarkBg
    ? "bg-gradient-to-r from-white via-neutral-100 to-neutral-300 bg-clip-text text-transparent"
    : "text-foreground";

  const actionClass = `mt-6 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-xs md:mt-8 md:px-8 md:py-4 md:text-sm font-bold tracking-wider uppercase transition-all duration-500 hover:scale-105 active:scale-100 shadow-md ${buttonGlowCls} ${
    bg === "luxury-gold"
      ? "bg-accent text-accent-foreground hover:bg-accent/90 border-accent/20"
      : "bg-primary text-primary-foreground hover:bg-primary/90 border-primary/20"
  }`;

  if (isFashion && !isContactVariant && !usesCustomBannerTheme) {
    return (
      <section className="border-y border-foreground/10 bg-foreground py-12 text-background md:py-16" aria-label="Promotional banner">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-10">
            <div className="max-w-4xl">
              {badgeText ? (
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-background/65 md:text-xs">{badgeText}</p>
              ) : null}
              <h2 className="max-w-[14ch] font-heading text-3xl font-bold leading-[0.98] tracking-tight text-background sm:text-4xl md:text-5xl">
                {title}
              </h2>
              {subtitle ? <p className="mt-4 max-w-2xl text-sm leading-7 text-background/70 md:text-base">{subtitle}</p> : null}
            </div>
            {ctaLink && ctaText ? (
              <Link
                href={ctaLink}
                className="inline-flex min-h-11 w-fit items-center gap-2 border-b border-background pb-1 text-sm font-semibold text-background transition-opacity hover:opacity-70"
              >
                {ctaText}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      style={style}
      className={`${paddingCls} relative overflow-hidden transition-all duration-300 ${usesCustomBannerTheme ? "" : "border-y border-border bg-secondary/35"}`}
      aria-label={isContactVariant ? "Contact call to action" : "Promotional banner"}
    >
      {usesCustomBannerTheme ? <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r ${borderGrad}`} /> : null}
      {usesCustomBannerTheme ? <div className={`absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r ${borderGrad}`} /> : null}

      {usesCustomBannerTheme && showOrbs && isDarkBg ? (
        <>
          <div className={`absolute left-[5%] top-[-10%] h-64 w-64 rounded-full ${orbCls.orb1} blur-3xl pointer-events-none animate-float-orb-1`} />
          <div className={`absolute right-[5%] bottom-[-10%] h-64 w-64 rounded-full ${orbCls.orb2} blur-3xl pointer-events-none animate-float-orb-2`} />
        </>
      ) : null}

      {usesCustomBannerTheme && showParticles && isDarkBg ? (
        <>
          <SparkleSVG className="absolute top-10 left-[10%] animate-float-particle-slow text-amber-400/25 h-5 w-5 hidden md:block pointer-events-none" />
          <SparkleSVG className="absolute bottom-12 right-[12%] animate-float-particle-fast text-emerald-400/20 h-6 w-6 hidden md:block pointer-events-none" />
          <SparkleSVG className="absolute top-[40%] right-[8%] animate-float-particle-slow text-teal-400/20 h-4 w-4 hidden md:block pointer-events-none" />
          <SparkleSVG className="absolute bottom-8 left-[15%] animate-float-particle-fast text-indigo-400/20 h-5 w-5 hidden md:block pointer-events-none" />
        </>
      ) : null}

      {usesCustomBannerTheme && isDarkBg ? <div className="absolute inset-0 grain-texture opacity-[0.025] pointer-events-none" /> : null}

      <div className="container mx-auto px-4 relative z-10">
        <div
          style={
            customOpacity !== null
              ? {
                  backgroundColor: isDarkBg ? `rgba(255, 255, 255, ${customOpacity})` : `rgba(0, 0, 0, ${customOpacity})`,
                }
              : undefined
          }
          className={`max-w-4xl ${textMaxCls} rounded-lg border ${cardBgCls} backdrop-blur-xl p-6 md:p-10 relative overflow-hidden group transition-all duration-700 hover:border-white/20 hover:shadow-primary/10 hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)]`}
        >
          <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-white/5 blur-2xl pointer-events-none group-hover:bg-white/10 transition-colors duration-500" />
          <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-white/5 blur-2xl pointer-events-none group-hover:bg-white/10 transition-colors duration-500" />

          <div className={`flex flex-col ${containerAlignCls} ${alignCls} relative z-10`}>
            {badgeText ? (
              <span className={`mb-5 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[10px] font-bold tracking-widest uppercase shadow-sm border ${badgeBgCls} backdrop-blur-md transition-all duration-300`}>
                {isContactVariant ? <MessageCircle className="h-3.5 w-3.5 text-primary" /> : <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />}
                {badgeText}
              </span>
            ) : null}

            <h2 className={`font-heading text-[1.9rem] font-extrabold tracking-tight md:text-5xl md:leading-tight ${headingCls} drop-shadow-md`}>
              {title}
            </h2>

            {subtitle ? (
              <p className={`${textMaxCls} mt-3 max-w-2xl text-sm leading-7 md:text-base opacity-80 font-normal`}>
                {subtitle}
              </p>
            ) : null}

            {ctaLink && ctaText ? (
              isExternalContact ? (
                <a href={ctaLink} target="_blank" rel="noopener noreferrer" className={actionClass}>
                  {ctaText}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              ) : (
                <Link href={ctaLink} className={actionClass}>
                  {ctaText}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              )
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;