import Link from "next/link";
import { useState, useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ArrowRight, Clock } from "lucide-react";

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
  const { data: settings } = useSiteSettings<CountdownSettings>("countdown_timer");
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

  const gradientStyle = getGradientStyle(overrides?.bgGradient ?? settings?.bg_gradient ?? "from-destructive via-red-600 to-amber-600");

  return (
    <div className="relative overflow-hidden text-white py-4 shadow-md" style={gradientStyle}>
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full animate-pulse">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base md:text-lg tracking-wide uppercase">
              {overrides?.title ?? settings?.title ?? "Limited Time Offer!"}
            </h3>
            <p className="text-xs text-white font-semibold">{overrides?.subtitle ?? "Deals are vanishing fast. Grab yours now!"}</p>
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
            href={overrides?.ctaLink ?? settings?.cta_link ?? "/shop"}
            className="flex items-center gap-1.5 bg-white text-gray-900 px-5 py-2 rounded-full text-sm font-bold tracking-wide hover:bg-white/90 transition-all duration-300 hover:scale-105 shadow-md active:scale-100"
          >
            {overrides?.ctaText ?? settings?.cta_text}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
};
