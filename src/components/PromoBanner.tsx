import Link from "next/link";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ArrowRight } from "lucide-react";

interface PromoBannerSettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  badge_text: string;
  bg_style: "gradient" | "dark" | "accent" | "luxury-gold" | "indigo" | "rose";
  enable_glow?: boolean;
  text_alignment?: "left" | "center" | "right";
  padding_size?: "compact" | "cozy" | "large";
  enable_particles?: boolean;
  enable_orbs?: boolean;
  card_opacity?: number;
}

interface PromoBannerProps {
  overrides?: {
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
    case "dark":
      return "from-transparent via-emerald-500/20 to-transparent";
    case "accent":
      return "from-transparent via-primary/30 to-transparent";
    default:
      return "from-transparent via-primary/30 to-transparent";
  }
};

const SparkleSVG = ({ className }: { className: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
  </svg>
);

const PromoBanner = ({ overrides }: PromoBannerProps) => {
  const { data: settings } = useSiteSettings<PromoBannerSettings>("promo_banner");

  if (settings?.enabled === false) return null;

  const bg = overrides?.bgStyle ?? settings?.bg_style ?? "gradient";
  const isDarkBg = ["gradient", "luxury-gold", "indigo", "rose", "dark"].includes(bg);
  const style = getBannerStyle(bg);
  const orbCls = getOrbColors(bg);
  const borderGrad = getBorderGradient(bg);

  const badgeText = overrides?.badgeText ?? settings?.badge_text ?? "EXCLUSIVE DEALS";
  const title = overrides?.title ?? settings?.title ?? "Eid-ul-Adha Special Drop";
  const subtitle =
    overrides?.subtitle ??
    settings?.subtitle ??
    "Premium dropshoulder tees & summer polos designed in Dhaka. Grab yours before stocks run out. 20% flat discount on pre-orders!";
  const ctaText = overrides?.ctaText ?? settings?.cta_text ?? "Explore The Collection";
  const ctaLink = overrides?.ctaLink ?? settings?.cta_link ?? "/shop?sale=1";

  const align = overrides?.textAlignment ?? settings?.text_alignment ?? "center";
  const alignCls = align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
  const containerAlignCls = align === "left" ? "items-start" : align === "right" ? "items-end" : "items-center";
  const textMaxCls = align === "left" ? "mr-auto" : align === "right" ? "ml-auto" : "mx-auto";

  const padding = overrides?.paddingSize ?? settings?.padding_size ?? "cozy";
  const paddingCls = padding === "compact" ? "py-8" : padding === "large" ? "py-24" : "py-14";

  const buttonGlowCls =
    (overrides?.enableGlow ?? settings?.enable_glow)
      ? bg === "accent"
        ? "animate-pulse-glow-primary"
        : "animate-pulse-glow"
      : "";

  const showParticles = overrides?.enableParticles ?? settings?.enable_particles ?? true;
  const showOrbs = overrides?.enableOrbs ?? settings?.enable_orbs ?? true;

  const customOpacitySource = overrides?.cardOpacity ?? settings?.card_opacity;
  const customOpacity = customOpacitySource !== undefined ? customOpacitySource / 100 : null;

  const cardBgCls = isDarkBg
    ? `${customOpacity !== null ? "" : "bg-white/[0.03]"} border-white/10 text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]`
    : `${customOpacity !== null ? "" : "bg-black/[0.02] dark:bg-white/[0.02]"} border-black/[0.08] dark:border-white/10 text-foreground shadow-lg dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]`;

  const badgeBgCls = isDarkBg
    ? "bg-white/10 text-white border-white/10 hover:bg-white/20"
    : "bg-black/5 dark:bg-white/10 text-foreground border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/20";

  const headingCls = isDarkBg
    ? "bg-gradient-to-r from-white via-neutral-100 to-neutral-300 bg-clip-text text-transparent"
    : "text-foreground";

  return (
    <section style={style} className={`${paddingCls} relative overflow-hidden transition-all duration-300`} aria-label="Promotional banner">
      <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r ${borderGrad}`} />
      <div className={`absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r ${borderGrad}`} />

      {showOrbs && isDarkBg ? (
        <>
          <div className={`absolute left-[5%] top-[-10%] h-64 w-64 rounded-full ${orbCls.orb1} blur-3xl pointer-events-none animate-float-orb-1`} />
          <div className={`absolute right-[5%] bottom-[-10%] h-64 w-64 rounded-full ${orbCls.orb2} blur-3xl pointer-events-none animate-float-orb-2`} />
        </>
      ) : null}

      {showParticles && isDarkBg ? (
        <>
          <SparkleSVG className="absolute top-10 left-[10%] animate-float-particle-slow text-amber-400/25 h-5 w-5 hidden md:block pointer-events-none" />
          <SparkleSVG className="absolute bottom-12 right-[12%] animate-float-particle-fast text-emerald-400/20 h-6 w-6 hidden md:block pointer-events-none" />
          <SparkleSVG className="absolute top-[40%] right-[8%] animate-float-particle-slow text-teal-400/20 h-4 w-4 hidden md:block pointer-events-none" />
          <SparkleSVG className="absolute bottom-8 left-[15%] animate-float-particle-fast text-indigo-400/20 h-5 w-5 hidden md:block pointer-events-none" />
        </>
      ) : null}

      {isDarkBg ? <div className="absolute inset-0 grain-texture opacity-[0.025] pointer-events-none" /> : null}

      <div className="container mx-auto px-4 relative z-10">
        <div
          style={
            customOpacity !== null
              ? {
                  backgroundColor: isDarkBg ? `rgba(255, 255, 255, ${customOpacity})` : `rgba(0, 0, 0, ${customOpacity})`,
                }
              : undefined
          }
          className={`max-w-4xl ${textMaxCls} rounded-3xl border ${cardBgCls} backdrop-blur-xl p-8 md:p-16 relative overflow-hidden group transition-all duration-700 hover:border-white/20 hover:shadow-primary/10 hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)]`}
        >
          <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-white/5 blur-2xl pointer-events-none group-hover:bg-white/10 transition-colors duration-500" />
          <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-white/5 blur-2xl pointer-events-none group-hover:bg-white/10 transition-colors duration-500" />

          <div className={`flex flex-col ${containerAlignCls} ${alignCls} relative z-10`}>
            {badgeText ? (
              <span className={`mb-6 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[10px] font-bold tracking-widest uppercase shadow-sm border ${badgeBgCls} backdrop-blur-md transition-all duration-300`}>
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                {badgeText}
              </span>
            ) : null}

            <h2 className={`font-heading text-3xl font-extrabold tracking-tight md:text-5xl md:leading-tight ${headingCls} drop-shadow-md`}>
              {title}
            </h2>

            {subtitle ? (
              <p className={`${textMaxCls} mt-4 max-w-2xl text-sm md:text-base opacity-80 leading-relaxed font-normal`}>
                {subtitle}
              </p>
            ) : null}

            {ctaLink && ctaText ? (
              <Link
                href={ctaLink}
                className={`mt-8 inline-flex items-center gap-2 rounded-full px-8 py-4 text-xs md:text-sm font-bold tracking-wider uppercase transition-all duration-500 hover:scale-105 active:scale-100 shadow-md ${buttonGlowCls} ${
                  bg === "luxury-gold"
                    ? "bg-accent text-accent-foreground hover:bg-accent/90 border-accent/20"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 border-primary/20"
                }`}
              >
                {ctaText}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
