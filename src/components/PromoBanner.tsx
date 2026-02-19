import { Link } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ArrowRight } from "lucide-react";

interface PromoBannerSettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  badge_text: string;
  bg_style: "gradient" | "dark" | "accent"; // colour theme
}

const bgClasses: Record<string, string> = {
  gradient: "bg-gradient-to-r from-primary to-emerald-600",
  dark:     "bg-foreground",
  accent:   "bg-secondary",
};

const textClasses: Record<string, string> = {
  gradient: "text-primary-foreground",
  dark:     "text-background",
  accent:   "text-foreground",
};

const PromoBanner = () => {
  const { data: settings } = useSiteSettings<PromoBannerSettings>("promo_banner");

  if (!settings?.enabled) return null;

  const bg     = settings.bg_style ?? "gradient";
  const bgCls  = bgClasses[bg]   ?? bgClasses.gradient;
  const txtCls = textClasses[bg] ?? textClasses.gradient;

  return (
    <section className={`${bgCls} py-12`} aria-label="Promotional banner">
      <div className="container mx-auto px-4 text-center">
        {settings.badge_text && (
          <span
            className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-widest uppercase ${
              bg === "accent" ? "bg-primary text-primary-foreground" : "bg-white/20 text-white"
            }`}
          >
            {settings.badge_text}
          </span>
        )}

        <h2 className={`font-heading text-3xl font-bold md:text-4xl ${txtCls}`}>
          {settings.title || "Special Offer"}
        </h2>

        {settings.subtitle && (
          <p className={`mt-3 text-base md:text-lg ${txtCls} opacity-80`}>
            {settings.subtitle}
          </p>
        )}

        {settings.cta_link && settings.cta_text && (
          <Link
            to={settings.cta_link}
            className={`mt-6 inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold transition-transform hover:scale-105 active:scale-100 ${
              bg === "accent"
                ? "bg-primary text-primary-foreground"
                : "bg-white text-gray-900 hover:bg-white/90"
            }`}
          >
            {settings.cta_text}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </section>
  );
};

export default PromoBanner;
