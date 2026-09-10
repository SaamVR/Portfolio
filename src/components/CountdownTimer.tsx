import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ArrowRight, Clock } from "lucide-react";
import { useOptionalStore } from "@/components/storefront/store-context";
import { storefrontPath } from "@/lib/slug";

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

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const EMPTY_TIME: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

function calculateRemaining(endDate: string): TimeLeft | null {
  const endTime = Date.parse(endDate);
  if (!Number.isFinite(endTime)) return null;

  const difference = endTime - Date.now();
  if (difference <= 0) return null;

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

function getGradientStyle(gradientStr: string) {
  const fallback = "linear-gradient(135deg, #111827 0%, #1f2937 52%, #0f172a 100%)";
  const value = gradientStr.trim();
  if (!value) return { background: fallback };

  if (value.includes("linear-gradient") || value.includes("radial-gradient") || value.includes("rgb") || value.startsWith("#")) {
    return { background: value };
  }

  const classes = value.toLowerCase();
  if (classes.includes("from-purple-600") && classes.includes("to-pink-600")) {
    return { background: "linear-gradient(135deg, #7e22ce 0%, #be185d 100%)" };
  }
  if (classes.includes("from-blue-600") && classes.includes("to-indigo-600")) {
    return { background: "linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)" };
  }

  return { background: fallback };
}

export const CountdownTimer = ({ overrides }: CountdownTimerProps) => {
  const currentStore = useOptionalStore();
  const preloadedSettings = currentStore?.siteSettings?.countdown_timer as CountdownSettings | undefined;
  const { data: fetchedSettings } = useSiteSettings<CountdownSettings>("countdown_timer", currentStore?.id);
  const settings = fetchedSettings ?? preloadedSettings;
  const endDate = overrides?.endDate ?? settings?.end_date ?? "";
  const enabled = overrides?.endDate ? true : settings?.enabled !== false;
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateRemaining(endDate) ?? EMPTY_TIME);
  const [isActive, setIsActive] = useState(() => Boolean(calculateRemaining(endDate)));

  useEffect(() => {
    if (!enabled || !endDate) {
      setIsActive(false);
      return;
    }

    const update = () => {
      const next = calculateRemaining(endDate);
      if (!next) {
        setTimeLeft(EMPTY_TIME);
        setIsActive(false);
        return;
      }
      setTimeLeft(next);
      setIsActive(true);
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [enabled, endDate]);

  const accessibleTime = useMemo(() => {
    const parts = [
      timeLeft.days > 0 ? `${timeLeft.days} day${timeLeft.days === 1 ? "" : "s"}` : "",
      `${timeLeft.hours} hour${timeLeft.hours === 1 ? "" : "s"}`,
      `${timeLeft.minutes} minute${timeLeft.minutes === 1 ? "" : "s"}`,
      `${timeLeft.seconds} second${timeLeft.seconds === 1 ? "" : "s"}`,
    ].filter(Boolean);
    return `${parts.join(", ")} remaining`;
  }, [timeLeft]);

  if (!enabled || !endDate || !isActive) return null;

  const gradientStyle = getGradientStyle(overrides?.bgGradient ?? settings?.bg_gradient ?? "");
  const title = (overrides?.title ?? settings?.title?.trim()) || "Time remaining";
  const subtitle = overrides?.subtitle?.trim() || "This countdown ends at the time set by the store.";
  const ctaText = overrides?.ctaText ?? settings?.cta_text;
  const ctaLink = overrides?.ctaLink ?? settings?.cta_link;

  return (
    <section
      className="relative overflow-hidden py-5 text-white shadow-md md:py-6"
      style={gradientStyle}
      aria-labelledby="storefront-countdown-title"
    >
      <div className="container mx-auto grid items-center gap-5 px-4 md:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:gap-8">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 bg-black/20 motion-safe:animate-pulse">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="storefront-countdown-title" className="font-heading text-lg font-bold tracking-tight text-white md:text-xl">
              {title}
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-white/90">{subtitle}</p>
          </div>
        </div>

        <div
          role="timer"
          aria-label={accessibleTime}
          className="grid grid-cols-4 gap-2 font-mono sm:gap-3"
        >
          {[
            ["Days", timeLeft.days],
            ["Hrs", timeLeft.hours],
            ["Mins", timeLeft.minutes],
            ["Secs", timeLeft.seconds],
          ].map(([label, value]) => (
            <div key={String(label)} className="min-w-0 text-center" aria-hidden="true">
              <div className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/30 bg-black/45 px-2 text-base font-bold tabular-nums text-white backdrop-blur-sm sm:min-w-[3.4rem] sm:text-lg">
                {String(value).padStart(2, "0")}
              </div>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-white/90">{label}</span>
            </div>
          ))}
        </div>

        {ctaLink && ctaText ? (
          <Link
            href={storefrontPath(ctaLink, currentStore?.slug)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white bg-white px-5 py-2.5 text-sm font-bold text-gray-950 shadow-md transition-colors hover:bg-white/90 focus-visible:outline-none lg:w-auto"
          >
            {ctaText}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </section>
  );
};
