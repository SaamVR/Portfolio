import Link from "next/link";
import { useState, useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ArrowRight, Clock } from "lucide-react";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";

interface CountdownSettings {
  enabled: boolean;
  title: string;
  end_date: string;
  cta_text: string;
  cta_link: string;
  bg_gradient?: string;
}

interface CountdownTimerProps {
  overrides?: {
    title?: string;
    subtitle?: string;
    endDate?: string;
    ctaText?: string;
    ctaLink?: string;
    bgGradient?: string;
  };
}

export const CountdownTimer = ({ overrides }: CountdownTimerProps) => {
  const currentStore = useOptionalStore();
  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore.siteSettings.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    templateSeedId: typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });
  const isFashion = templateId === "fashion";
  const { data: settings } = useSiteSettings<CountdownSettings>("countdown_timer", currentStore?.id);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const endDate = overrides?.endDate ?? settings?.end_date;
    if (settings?.enabled === false || !endDate) return;

    const calculateTimeLeft = () => {
      const difference = +new Date(endDate) - +new Date();
      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
      setIsExpired(false);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [overrides?.endDate, settings]);

  if (settings?.enabled === false || isExpired || !timeLeft) return null;

  const getGradientStyle = (gradientStr: string) => {
    const premiumGreenGradient = "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #15803d 100%)";
    if (!gradientStr) return { background: premiumGreenGradient };
    if (gradientStr.includes("linear-gradient") || gradientStr.includes("rgb") || gradientStr.startsWith("#")) {
      return { background: gradientStr };
    }

    const classes = gradientStr.toLowerCase();
    if (classes.includes("from-red") || classes.includes("from-destructive") || classes.includes("via-orange") || classes.includes("via-red")) {
      return { background: premiumGreenGradient };
    }
    if (classes.includes("from-purple-600") && classes.includes("to-pink-600")) {
      return { background: "linear-gradient(135deg, #9333ea 0%, #db2777 100%)" };
    }
    if (classes.includes("from-blue-600") && classes.includes("to-indigo-600")) {
      return { background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)" };
    }
    return { background: premiumGreenGradient };
  };

  const explicitGradient = overrides?.bgGradient ?? settings?.bg_gradient ?? "";
  const gradientStyle = getGradientStyle(explicitGradient);
  const useFashionDefaultTreatment = isFashion && !explicitGradient.trim();
  const title = overrides?.title ?? settings?.title ?? "Offer Ends Soon";
  const subtitle = overrides?.subtitle ?? "Use this space for launch windows, seasonal campaigns, or time-sensitive updates.";
  const ctaHref = storefrontPath(overrides?.ctaLink ?? settings?.cta_link ?? "/shop", currentStore?.slug);
  const ctaText = overrides?.ctaText ?? settings?.cta_text;

  if (useFashionDefaultTreatment) {
    const parts = [
      ["Days", timeLeft.days],
      ["Hrs", timeLeft.hours],
      ["Mins", timeLeft.minutes],
      ["Secs", timeLeft.seconds],
    ] as const;

    return (
      <section className="border-y border-border bg-background py-7 md:py-9" aria-label="Campaign countdown">
        <div className="container mx-auto grid gap-6 px-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center lg:gap-10">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary md:text-xs">Limited window</p>
            <h3 className="mt-2 font-heading text-xl font-semibold tracking-tight text-foreground md:text-2xl">{title}</h3>
            {subtitle ? <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground md:text-sm">{subtitle}</p> : null}
          </div>
          <div className="grid grid-cols-4 gap-2 sm:gap-3" aria-label="Time remaining">
            {parts.map(([label, value]) => (
              <div key={label} className="min-w-0 border-l border-border pl-2.5 sm:pl-4">
                <div className="font-heading text-2xl font-semibold tabular-nums text-foreground sm:text-3xl">{String(value).padStart(2, "0")}</div>
                <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
          {ctaText ? (
            <Link href={ctaHref} className="inline-flex min-h-11 w-fit items-center gap-2 border-b border-foreground pb-1 text-sm font-semibold text-foreground transition-colors hover:text-primary">
              {ctaText}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <div className="relative overflow-hidden text-white py-4 shadow-md" style={gradientStyle}>
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full animate-pulse">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base md:text-lg tracking-wide uppercase">
              {title}
            </h3>
            <p className="text-xs text-white font-semibold">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 font-mono">
          <div className="flex flex-col items-center">
            <div className="bg-black/45 backdrop-blur-sm rounded-md px-3 py-1.5 min-w-[3rem] text-center text-lg md:text-xl font-bold border border-white/20">
              {String(timeLeft.days).padStart(2, "0")}
            </div>
            <span className="text-[10px] uppercase font-bold mt-1 tracking-wider text-white">Days</span>
          </div>
          <span className="text-lg md:text-xl font-bold animate-pulse -mt-4">:</span>
          <div className="flex flex-col items-center">
            <div className="bg-black/45 backdrop-blur-sm rounded-md px-3 py-1.5 min-w-[3rem] text-center text-lg md:text-xl font-bold border border-white/20">
              {String(timeLeft.hours).padStart(2, "0")}
            </div>
            <span className="text-[10px] uppercase font-bold mt-1 tracking-wider text-white">Hrs</span>
          </div>
          <span className="text-lg md:text-xl font-bold animate-pulse -mt-4">:</span>
          <div className="flex flex-col items-center">
            <div className="bg-black/45 backdrop-blur-sm rounded-md px-3 py-1.5 min-w-[3rem] text-center text-lg md:text-xl font-bold border border-white/20">
              {String(timeLeft.minutes).padStart(2, "0")}
            </div>
            <span className="text-[10px] uppercase font-bold mt-1 tracking-wider text-white">Mins</span>
          </div>
          <span className="text-lg md:text-xl font-bold animate-pulse -mt-4">:</span>
          <div className="flex flex-col items-center">
            <div className="bg-black/45 backdrop-blur-sm rounded-md px-3 py-1.5 min-w-[3rem] text-center text-lg md:text-xl font-bold border border-white/20">
              {String(timeLeft.seconds).padStart(2, "0")}
            </div>
            <span className="text-[10px] uppercase font-bold mt-1 tracking-wider text-white">Secs</span>
          </div>
        </div>

        {(overrides?.ctaLink ?? settings?.cta_link) && (overrides?.ctaText ?? settings?.cta_text) ? (
          <Link
            href={ctaHref}
            className="flex items-center gap-1.5 bg-white text-gray-900 px-5 py-2 rounded-full text-sm font-bold tracking-wide hover:bg-white/90 transition-all duration-300 hover:scale-105 shadow-md active:scale-100"
          >
            {ctaText}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
};
