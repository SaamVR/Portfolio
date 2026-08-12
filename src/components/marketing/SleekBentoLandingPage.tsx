"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CreditCard,
  Globe,
  Layers,
  Moon,
  Paintbrush,
  Play,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { CmsPricing } from "./CmsPricing";
import { PLATFORM_BRAND_NAME, PLATFORM_PRIMARY_DOMAIN } from "@/lib/platform/site-config";
import { storefrontTemplateSeedRegistry, type StorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { getStorefrontTemplateReferenceImage } from "@/lib/cms/storefront-template-reference-images";
import { TRANSLATIONS, type Language } from "@/i18n";

export type { Language };

const featuredTemplates: StorefrontTemplateId[] = ["fashion", "beauty", "electronics", "food", "hotel", "booking", "service"];

type TemplateCopy = {
  name: string;
  shortName: string;
  description: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
};

const bengaliTemplateCopy: Partial<Record<StorefrontTemplateId, TemplateCopy>> = {
  fashion: {
    name: "\u09ab\u09cd\u09af\u09be\u09b6\u09a8 \u0995\u09cd\u09af\u09be\u099f\u09be\u09b2\u0997 \u09b8\u09cd\u099f\u09cb\u09b0",
    shortName: "\u09ab\u09cd\u09af\u09be\u09b6\u09a8",
    description: "\u0995\u09be\u09b2\u09c7\u0995\u09b6\u09a8, \u09ad\u09cd\u09af\u09be\u09b0\u09bf\u09df\u09c7\u09a8\u09cd\u099f \u098f\u09ac\u0982 \u09ae\u09cb\u09ac\u09be\u0987\u09b2 \u09ac\u09cd\u09b0\u09be\u0989\u099c\u09bf\u0982\u0995\u09c7 \u09b8\u09be\u09ae\u09a8\u09c7 \u09b0\u09c7\u0996\u09c7 \u09a4\u09c8\u09b0\u09bf \u09ab\u09cd\u09af\u09be\u09b6\u09a8-\u09ab\u09be\u09b0\u09cd\u09b8\u09cd\u099f \u09b8\u09cd\u099f\u09cb\u09b0\u09ab\u09cd\u09b0\u09a8\u09cd\u099f\u0964",
    heroTitle: "\u09b8\u09be\u09ae\u09be\u09b0 \u0995\u09be\u09b2\u09c7\u0995\u09b6\u09a8",
    heroHighlight: "\u09e8\u09e6\u09e8\u09ec",
    heroSubtitle: "\u09ab\u09cd\u09af\u09be\u09b6\u09a8 \u09ae\u09be\u09b0\u09cd\u099a\u09c7\u09a8\u09cd\u099f\u09a6\u09c7\u09b0 \u099c\u09a8\u09cd\u09af \u09a6\u09cd\u09b0\u09c1\u09a4, \u09ad\u09bf\u099c\u09cd\u09af\u09c1\u09df\u09be\u09b2 \u098f\u09ac\u0982 \u0995\u09a8\u09ad\u09be\u09b0\u09cd\u09b8\u09a8-\u09ab\u09cd\u09b0\u09c7\u09a8\u09cd\u09a1\u09b2\u09bf \u09b8\u09cd\u099f\u09cb\u09b0 \u0985\u09ad\u09bf\u099c\u09cd\u099e\u09a4\u09be\u0964",
  },
  beauty: {
    name: "\u09ac\u09bf\u0989\u099f\u09bf \u0993 \u09b8\u09cd\u0995\u09bf\u09a8\u0995\u09c7\u09df\u09be\u09b0 \u09b8\u09cd\u099f\u09cb\u09b0",
    shortName: "\u09ac\u09bf\u0989\u099f\u09bf",
    description: "\u09b0\u09c1\u099f\u09bf\u09a8, \u0987\u09a8\u0997\u09cd\u09b0\u09c7\u09a1\u09bf\u09df\u09c7\u09a8\u09cd\u099f \u098f\u09ac\u0982 \u09ac\u09bf\u0989\u099f\u09bf \u099f\u09cd\u09b0\u09be\u09b8\u09cd\u099f \u09b8\u09bf\u0997\u09a8\u09cd\u09af\u09be\u09b2\u0995\u09c7 \u09b8\u09be\u09ae\u09a8\u09c7 \u09b0\u09c7\u0996\u09c7 \u09b8\u09be\u099c\u09be\u09a8\u09cb \u09aa\u09b0\u09bf\u09b7\u09cd\u0995\u09be\u09b0 \u09b2\u09c7\u0986\u0989\u099f\u0964",
    heroTitle: "\u09aa\u09cd\u09b0\u09be\u0995\u09c3\u09a4\u09bf\u0995 \u0997\u09cd\u09b2\u09cb \u0993",
    heroHighlight: "\u09b8\u09cd\u0995\u09bf\u09a8\u0995\u09c7\u09df\u09be\u09b0",
    heroSubtitle: "\u09ac\u09bf\u0989\u099f\u09bf \u09ac\u09cd\u09b0\u09cd\u09af\u09be\u09a8\u09cd\u09a1\u09c7\u09b0 \u099c\u09a8\u09cd\u09af \u0986\u09b0\u0993 \u09aa\u09b0\u09bf\u09aa\u09be\u099f\u09bf, \u09ac\u09bf\u09b6\u09cd\u09ac\u09be\u09b8\u09af\u09cb\u0997\u09cd\u09af \u098f\u09ac\u0982 \u09ae\u09cb\u09ac\u09be\u0987\u09b2-\u09b0\u09c7\u09a1\u09bf \u0989\u09aa\u09b8\u09cd\u09a5\u09be\u09aa\u09a8\u0964",
  },
  electronics: {
    name: "\u0987\u09b2\u09c7\u0995\u099f\u09cd\u09b0\u09a8\u09bf\u0995\u09b8 \u0993 \u0997\u09cd\u09af\u09be\u099c\u09c7\u099f \u09b9\u09be\u09ac",
    shortName: "\u0997\u09cd\u09af\u09be\u099c\u09c7\u099f",
    description: "\u09b8\u09cd\u09aa\u09c7\u0995, \u09a4\u09c1\u09b2\u09a8\u09be \u098f\u09ac\u0982 \u0997\u09ac\u09c7\u09b7\u09a3\u09be\u09ad\u09bf\u09a4\u09cd\u09a4\u09bf\u0995 \u09b6\u09aa\u09bf\u0982\u0995\u09c7 \u09b8\u09b9\u099c \u0995\u09b0\u09a4\u09c7 \u09a4\u09c8\u09b0\u09bf \u0997\u09ac\u09c7\u09b7\u09a3\u09be-\u09ab\u09cd\u09b0\u09c7\u09a8\u09cd\u09a1\u09b2\u09bf \u09b8\u09cd\u099f\u09cb\u09b0\u09ab\u09cd\u09b0\u09a8\u09cd\u099f\u0964",
    heroTitle: "\u09a8\u09c7\u0995\u09cd\u09b8\u099f-\u099c\u09c7\u09a8",
    heroHighlight: "\u09b8\u09cd\u09ae\u09be\u09b0\u09cd\u099f \u0997\u09cd\u09af\u09be\u099c\u09c7\u099f",
    heroSubtitle: "\u0987\u09b2\u09c7\u0995\u099f\u09cd\u09b0\u09a8\u09bf\u0995\u09b8 \u09ae\u09be\u09b0\u09cd\u099a\u09c7\u09a8\u09cd\u099f\u09a6\u09c7\u09b0 \u099c\u09a8\u09cd\u09af \u0986\u09b0\u0993 \u09ac\u09bf\u09b6\u09cd\u09ac\u09be\u09b8\u09af\u09cb\u0997\u09cd\u09af \u098f\u09ac\u0982 \u09b0\u09bf\u09b8\u09be\u09b0\u09cd\u099a-\u09b0\u09c7\u09a1\u09bf \u0995\u09c7\u09a8\u09be\u0995\u09be\u099f\u09be\u09b0 \u0985\u09ad\u09bf\u099c\u09cd\u099e\u09a4\u09be\u0964",
  },
  food: {
    name: "\u09ab\u09c1\u09a1 \u0993 \u0997\u09cd\u09b0\u09cb\u09b8\u09be\u09b0\u09bf \u09b8\u09cd\u099f\u09cb\u09b0",
    shortName: "\u09ab\u09c1\u09a1",
    description: "\u09a6\u09cd\u09b0\u09c1\u09a4 \u09ac\u09cd\u09b0\u09be\u0989\u099c\u09bf\u0982, \u0985\u09ab\u09be\u09b0 \u098f\u09ac\u0982 \u09b2\u09cb\u0995\u09be\u09b2 \u09a1\u09c7\u09b2\u09bf\u09ad\u09be\u09b0\u09bf \u0995\u09a8\u099f\u09c7\u0995\u09cd\u09b8\u099f\u0995\u09c7 \u09b8\u09be\u09ae\u09a8\u09c7 \u09b0\u09c7\u0996\u09c7 \u09a4\u09c8\u09b0\u09bf \u09ab\u09c1\u09a1-\u09ab\u09be\u09b0\u09cd\u09b8\u09cd\u099f \u09b2\u09c7\u0986\u0989\u099f\u0964",
    heroTitle: "\u09a4\u09be\u099c\u09be \u0996\u09be\u09ac\u09be\u09b0 \u0993",
    heroHighlight: "\u09a6\u09cd\u09b0\u09c1\u09a4 \u0985\u09b0\u09cd\u09a1\u09be\u09b0",
    heroSubtitle: "\u09ab\u09c1\u09a1 \u098f\u09ac\u0982 \u0997\u09cd\u09b0\u09cb\u09b8\u09be\u09b0\u09bf \u09ae\u09be\u09b0\u09cd\u099a\u09c7\u09a8\u09cd\u099f\u09a6\u09c7\u09b0 \u099c\u09a8\u09cd\u09af \u0986\u09b0\u0993 \u09aa\u09b0\u09bf\u09b7\u09cd\u0995\u09be\u09b0 \u0993 \u09a6\u09cd\u09b0\u09c1\u09a4 \u09ae\u09cb\u09ac\u09be\u0987\u09b2 \u09b6\u09aa\u09bf\u0982 \u09ab\u09cd\u09b2\u09cb\u0964",
  },
  hotel: {
    name: "\u09b9\u09cb\u099f\u09c7\u09b2 \u0993 \u09b0\u09bf\u09b8\u09cb\u09b0\u09cd\u099f",
    shortName: "\u09b9\u09cb\u099f\u09c7\u09b2",
    description: "\u09b0\u09c1\u09ae, \u0985\u09cd\u09af\u09be\u09ae\u09c7\u09a8\u09bf\u099f\u09bf \u098f\u09ac\u0982 \u09ac\u09c1\u0995\u09bf\u0982 \u0987\u09a8\u099f\u09c7\u09a8\u09cd\u099f\u0995\u09c7 \u09b8\u09be\u09ae\u09a8\u09c7 \u09b0\u09c7\u0996\u09c7 \u09a4\u09c8\u09b0\u09bf \u09b9\u09b8\u09aa\u09bf\u099f\u09be\u09b2\u09bf\u099f\u09bf-\u09ab\u09be\u09b0\u09cd\u09b8\u09cd\u099f \u0989\u09aa\u09b8\u09cd\u09a5\u09be\u09aa\u09a8\u0964",
    heroTitle: "\u0986\u09b0\u09be\u09ae\u09a6\u09be\u09df\u0995",
    heroHighlight: "\u09b8\u09cd\u099f\u09c7",
    heroSubtitle: "\u09b9\u09cb\u099f\u09c7\u09b2 \u0993 \u09b0\u09bf\u09b8\u09cb\u09b0\u09cd\u099f \u09ac\u09cd\u09b0\u09cd\u09af\u09be\u09a8\u09cd\u09a1\u09c7\u09b0 \u099c\u09a8\u09cd\u09af \u09ad\u09bf\u099c\u09cd\u09af\u09c1\u09df\u09be\u09b2 \u098f\u09ac\u0982 \u09ac\u09c1\u0995\u09bf\u0982-\u09b0\u09c7\u09a1\u09bf \u09b8\u09cd\u099f\u09cb\u09b0\u09ab\u09cd\u09b0\u09a8\u09cd\u099f\u0964",
  },
  booking: {
    name: "\u0985\u09cd\u09af\u09be\u09aa\u09df\u09c7\u09a8\u09cd\u099f\u09ae\u09c7\u09a8\u09cd\u099f \u0993 \u09ac\u09c1\u0995\u09bf\u0982",
    shortName: "\u09ac\u09c1\u0995\u09bf\u0982",
    description: "\u09b8\u09ae\u09df, \u09b8\u09cd\u09b2\u099f \u098f\u09ac\u0982 \u09aa\u09b0\u09c7\u09b0 \u09a7\u09be\u09aa\u0995\u09c7 \u09aa\u09b0\u09bf\u09b7\u09cd\u0995\u09be\u09b0\u09ad\u09be\u09ac\u09c7 \u09a6\u09c7\u0996\u09be\u09a8\u09cb\u09b0 \u099c\u09a8\u09cd\u09af \u09a4\u09c8\u09b0\u09bf \u09ac\u09c1\u0995\u09bf\u0982-\u0995\u09c7\u09a8\u09cd\u09a6\u09cd\u09b0\u09bf\u0995 \u0985\u09ad\u09bf\u099c\u09cd\u099e\u09a4\u09be\u0964",
    heroTitle: "\u09b8\u09b9\u099c \u09ac\u09c1\u0995\u09bf\u0982",
    heroHighlight: "\u09ae\u09cd\u09af\u09be\u09a8\u09c7\u099c\u09ae\u09c7\u09a8\u09cd\u099f",
    heroSubtitle: "\u09b8\u09bf\u09a1\u09bf\u0989\u09b2-\u09ad\u09bf\u09a4\u09cd\u09a4\u09bf\u0995 \u09ac\u09cd\u09af\u09ac\u09b8\u09be\u09b0 \u099c\u09a8\u09cd\u09af \u09a6\u09cd\u09b0\u09c1\u09a4, \u09aa\u09b0\u09bf\u09b7\u09cd\u0995\u09be\u09b0 \u098f\u09ac\u0982 \u09ae\u09cb\u09ac\u09be\u0987\u09b2-\u09ab\u09cd\u09b0\u09c7\u09a8\u09cd\u09a1\u09b2\u09bf \u09b8\u09c7\u099f\u0986\u09aa\u0964",
  },
  service: {
    name: "\u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8 \u0993 \u0995\u09a8\u09b8\u09be\u09b2\u099f\u09c7\u09a8\u09cd\u09b8\u09bf",
    shortName: "\u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8",
    description: "\u0985\u09ab\u09be\u09b0, \u09aa\u09cd\u09b0\u09c1\u09ab \u098f\u09ac\u0982 \u09b2\u09bf\u09a1-\u0995\u09cd\u09af\u09be\u09aa\u099a\u09be\u09b0\u0995\u09c7 \u09b8\u09be\u09ae\u09a8\u09c7 \u09b0\u09c7\u0996\u09c7 \u09a4\u09c8\u09b0\u09bf \u09aa\u09b0\u09bf\u09b7\u09cd\u0995\u09be\u09b0 \u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8-\u09ab\u09be\u09b0\u09cd\u09b8\u09cd\u099f \u0985\u09ad\u09bf\u099c\u09cd\u099e\u09a4\u09be\u0964",
    heroTitle: "\u09aa\u09cd\u09b0\u09ab\u09c7\u09b6\u09a8\u09be\u09b2",
    heroHighlight: "\u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8",
    heroSubtitle: "\u09b8\u09be\u09b0\u09cd\u09ad\u09bf\u09b8 \u09ac\u09cd\u09af\u09ac\u09b8\u09be\u09b0 \u099c\u09a8\u09cd\u09af \u0986\u09b0\u0993 \u09ab\u09cb\u0995\u09be\u09b8\u09a1, \u09ac\u09bf\u09b6\u09cd\u09ac\u09be\u09b8\u09af\u09cb\u0997\u09cd\u09af \u098f\u09ac\u0982 \u0995\u09a8\u09ad\u09be\u09b0\u09cd\u09b8\u09a8-\u09b0\u09c7\u09a1\u09bf \u09b8\u09cd\u099f\u09cb\u09b0\u09ab\u09cd\u09b0\u09a8\u09cd\u099f\u0964",
  },
};

const integrationItems = [
  { label: "bKash & Nagad", icon: CreditCard, tone: "text-emerald-500" },
  { label: "Pathao Courier", icon: Truck, tone: "text-indigo-500" },
  { label: "Steadfast Courier", icon: Zap, tone: "text-amber-500" },
  { label: "Stripe Global", icon: Globe, tone: "text-rose-500" },
];

export function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  once = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  once?: boolean;
}) {
  const [isVisible, setIsVisible] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  const hiddenTransform =
    direction === "left"
      ? "-translate-x-10"
      : direction === "right"
        ? "translate-x-10"
        : direction === "down"
          ? "-translate-y-8"
          : direction === "none"
            ? ""
            : "translate-y-8";

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${isVisible ? "opacity-100 translate-x-0 translate-y-0" : `opacity-0 ${hiddenTransform}`} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function MetricCard({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.75rem] border border-border/80 bg-card/90 p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur-sm">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{label}</p>
    </div>
  );
}

function MagneticButton({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 ${className}`}
    >
      {children}
    </Link>
  );
}

function getTemplateLocalized(id: StorefrontTemplateId, lang: Language) {
  const seed = storefrontTemplateSeedRegistry[id];
  if (lang !== "bn") return seed;

  const localized = bengaliTemplateCopy[id];
  if (!localized) return seed;

  return {
    ...seed,
    name: localized.name,
    shortName: localized.shortName,
    description: localized.description,
    hero: {
      ...seed.hero,
      title: localized.heroTitle,
      highlight: localized.heroHighlight,
      subtitle: localized.heroSubtitle,
    },
  };
}

export function SleekBentoLandingPage() {
  const [lang, setLang] = useState<Language>("en");
  const [activeTab, setActiveTab] = useState<StorefrontTemplateId>("fashion");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const spotlightRef = useRef<HTMLDivElement>(null);

  const t = TRANSLATIONS[lang];
  const isBangla = lang === "bn";
  const isDark = mounted && (theme === "dark" || (theme === "system" && resolvedTheme === "dark"));

  useEffect(() => {
    setMounted(true);
    try {
      const saved = window.localStorage.getItem("ezcomo_lang");
      if (saved === "en" || saved === "bn") {
        setLang(saved);
      }
    } catch {
      // Ignore storage errors in the landing page.
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    const handleMouseMove = (event: MouseEvent) => {
      spotlightRef.current?.style.setProperty("--x", `${event.clientX}px`);
      spotlightRef.current?.style.setProperty("--y", `${event.clientY}px`);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWordIndex((current) => (current + 1) % t.hero.headlineWords.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [t.hero.headlineWords.length]);

  const activeTemplate = useMemo(() => getTemplateLocalized(activeTab, lang), [activeTab, lang]);

  const handleSetLang = (next: Language) => {
    setLang(next);
    try {
      window.localStorage.setItem("ezcomo_lang", next);
    } catch {
      // Ignore storage failures and keep the UI working.
    }
  };

  const sectionHeadingClass = isBangla
    ? "font-heading text-[2rem] font-semibold leading-[1.3] tracking-normal text-foreground md:text-[3.4rem]"
    : "font-heading text-4xl font-semibold tracking-tight text-foreground md:text-6xl";
  const sectionBodyClass = isBangla
    ? "mx-auto max-w-3xl text-base leading-8 text-muted-foreground md:text-xl md:leading-9"
    : "mx-auto max-w-3xl text-lg leading-8 text-muted-foreground md:text-xl";

  return (
    <div data-lang={lang} lang={lang} className={`relative min-h-screen overflow-hidden bg-background text-foreground ${isBangla ? "font-bengali landing-bn" : "font-sans"}`}>
      <div
        ref={spotlightRef}
        className="pointer-events-none fixed inset-0 z-0 hidden md:block"
        style={{
          background: isDark
            ? "radial-gradient(540px circle at var(--x, -999px) var(--y, -999px), rgba(16,185,129,0.14), transparent 52%)"
            : "radial-gradient(520px circle at var(--x, -999px) var(--y, -999px), rgba(16,185,129,0.10), transparent 50%)",
        }}
      />

      <header className="fixed inset-x-0 top-0 z-40 px-4 pt-3">
        <nav
          className={`mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-[1.9rem] border px-4 py-3 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.65)] backdrop-blur-xl transition-all sm:px-6 ${
            isScrolled
              ? "border-border/70 bg-background/88"
              : "border-border/40 bg-background/70"
          }`}
        >
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-black text-primary-foreground shadow-lg">
              EZ
            </div>
            <div className="min-w-0">
              <p className="truncate font-heading text-base font-extrabold tracking-[0.16em] text-foreground sm:text-lg">
                {PLATFORM_BRAND_NAME.toUpperCase()}
              </p>
              <p className="hidden text-[10px] uppercase tracking-[0.26em] text-muted-foreground sm:block">
                {PLATFORM_PRIMARY_DOMAIN}
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-foreground">{t.nav.howItWorks}</a>
            <a href="#templates" className="transition-colors hover:text-foreground">{t.nav.templates}</a>
            <a href="#comparison" className="transition-colors hover:text-foreground">{t.nav.features}</a>
            <Link href="/plans" className="transition-colors hover:text-foreground">{t.nav.pricing}</Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center rounded-full border border-border/80 bg-muted/55 p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => handleSetLang("en")}
                className={`rounded-full px-2.5 py-1 transition-colors ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleSetLang("bn")}
                className={`rounded-full px-2.5 py-1 transition-colors ${lang === "bn" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                বাংলা
              </button>
            </div>

            {mounted ? (
              <button
                type="button"
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              </button>
            ) : (
              <div className="h-10 w-10 rounded-full border border-border/70 bg-card" />
            )}

            <Link href="/admin/login" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground sm:inline-flex">
              {t.nav.login}
            </Link>
            <Link href="/signup" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5">
              {t.nav.startTrial}
              <ArrowRight className="h-4 w-4" />
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card text-foreground md:hidden"
              aria-label="Toggle navigation"
            >
              <span className="text-lg">{mobileMenuOpen ? "×" : "≡"}</span>
            </button>
          </div>
        </nav>

        {mobileMenuOpen ? (
          <div className="mx-auto mt-2 max-w-6xl rounded-[1.6rem] border border-border/70 bg-background/92 p-4 shadow-[0_18px_60px_-35px_rgba(15,23,42,0.45)] backdrop-blur-xl md:hidden">
            <div className="grid gap-2 text-sm font-medium">
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="rounded-2xl px-4 py-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{t.nav.howItWorks}</a>
              <a href="#templates" onClick={() => setMobileMenuOpen(false)} className="rounded-2xl px-4 py-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{t.nav.templates}</a>
              <a href="#comparison" onClick={() => setMobileMenuOpen(false)} className="rounded-2xl px-4 py-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{t.nav.features}</a>
              <Link href="/plans" onClick={() => setMobileMenuOpen(false)} className="rounded-2xl px-4 py-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{t.nav.pricing}</Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/70 pt-3">
              <Link href="/admin/login" onClick={() => setMobileMenuOpen(false)} className="rounded-full border border-border px-4 py-2.5 text-center text-sm font-medium text-foreground">
                {t.nav.login}
              </Link>
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">
                {t.nav.startTrial}
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main className="relative z-10">
        <section className="relative overflow-hidden px-6 pb-16 pt-28 md:pb-24 md:pt-36">
          <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.20),transparent_58%)]" />
          <div className="absolute left-[-10rem] top-24 h-[26rem] w-[26rem] rounded-full bg-emerald-500/10 blur-[130px]" />
          <div className="absolute right-[-8rem] top-12 h-[22rem] w-[22rem] rounded-full bg-indigo-500/10 blur-[120px]" />

          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <Reveal once>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t.hero.badge}
                </div>
              </Reveal>

              <Reveal delay={80} once>
                <h1 className={`mt-6 max-w-4xl font-heading font-semibold text-foreground ${isBangla ? "text-[2.65rem] leading-[1.24] tracking-normal md:text-[4.75rem]" : "text-5xl leading-[1.02] tracking-[-0.04em] md:text-7xl lg:text-[5.45rem]"}`}>
                  {t.hero.titlePrefix}
                  <span className="block bg-gradient-to-r from-emerald-600 via-teal-500 to-indigo-600 bg-clip-text pt-2 text-transparent dark:from-emerald-400 dark:via-teal-300 dark:to-indigo-400">
                    {t.hero.headlineWords[wordIndex]}
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={160} once>
                <p className={`mt-6 max-w-3xl text-muted-foreground ${isBangla ? "text-[1.08rem] leading-8 md:text-[1.22rem] md:leading-9" : "text-lg leading-8 md:text-xl"}`}>
                  {t.hero.subtitle}
                </p>
              </Reveal>

              <Reveal delay={220} once>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <MagneticButton href="/signup" className="min-h-14 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/25">
                    {t.hero.primaryCta}
                  </MagneticButton>
                  <MagneticButton href="#comparison" className="min-h-14 rounded-full border border-border bg-card/85 px-8 text-base font-medium text-foreground shadow-sm">
                    <Play className="mr-2 h-4.5 w-4.5" />
                    {t.hero.secondaryCta}
                  </MagneticButton>
                </div>
              </Reveal>

              <Reveal delay={280} once>
                <div className="mt-8 flex flex-wrap gap-4 text-sm leading-6 text-muted-foreground">
                  {t.hero.trustBadges.map((badge) => (
                    <div key={badge} className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3.5 py-2 shadow-sm">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span>{badge}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>

            <Reveal delay={120} direction="right" once>
              <div className="rounded-[2rem] border border-border/70 bg-card/85 p-4 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.85)] backdrop-blur-sm">
                <div className="mb-4 flex items-center gap-2 px-2">
                  <div className="h-3 w-3 rounded-full bg-rose-400/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
                  <div className="ml-4 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground">
                    https://yourstore.ezcomo.site
                  </div>
                </div>
                <div className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-muted/30">
                  <Image
                    src="/images/guide/site_creation_and_management_demo.webp"
                    alt="EZComo storefront builder preview"
                    width={1200}
                    height={800}
                    className="h-[20rem] w-full object-cover md:h-[27rem]"
                    priority
                  />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{isBangla ? "স্টোরফ্রন্ট" : "Storefront"}</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{isBangla ? "ডেস্কটপ ও মোবাইল রিভিউ" : "Desktop and mobile review"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{isBangla ? "মার্চেন্ট ফ্লো" : "Merchant flow"}</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{isBangla ? "টেমপ্লেট, সেটআপ, লঞ্চ" : "Template, setup, launch"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{isBangla ? "অপারেশন" : "Operations"}</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{isBangla ? "পেমেন্ট ও ডেলিভারি" : "Payments and delivery"}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/20 py-5">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 px-6 text-center">
            <p className="w-full text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{t.trustBar}</p>
            {integrationItems.map(({ label, icon: Icon, tone }) => (
              <div key={label} className="inline-flex items-center gap-3 rounded-full border border-border/70 bg-card/75 px-4 py-2 text-sm text-foreground shadow-sm">
                <Icon className={`h-4.5 w-4.5 ${tone}`} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="px-6 py-16 md:py-24">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  <Zap className="h-3.5 w-3.5" />
                  {t.howItWorks.badge}
                </div>
                <h2 className={`mt-6 ${sectionHeadingClass}`}>
                  {t.howItWorks.titleMain}
                  <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 bg-clip-text text-transparent"> {t.howItWorks.titleHighlight}</span>
                  {t.howItWorks.titleSuffix}
                </h2>
                <p className={`mt-5 ${sectionBodyClass}`}>{t.howItWorks.subtitle}</p>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                { icon: ShoppingBag, color: "text-emerald-500", ring: "border-emerald-500/20 bg-emerald-500/10", label: isBangla ? "ধাপ ১" : "Step 01", data: t.howItWorks.step1 },
                { icon: Paintbrush, color: "text-indigo-500", ring: "border-indigo-500/20 bg-indigo-500/10", label: isBangla ? "ধাপ ২" : "Step 02", data: t.howItWorks.step2 },
                { icon: CreditCard, color: "text-amber-500", ring: "border-amber-500/20 bg-amber-500/10", label: isBangla ? "ধাপ ৩" : "Step 03", data: t.howItWorks.step3 },
              ].map(({ icon: Icon, color, ring, label, data }, index) => (
                <Reveal key={label} delay={index * 100}>
                  <div className="h-full rounded-[1.9rem] border border-border/80 bg-card/90 p-7 shadow-[0_24px_65px_-45px_rgba(15,23,42,0.7)]">
                    <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl border ${ring} ${color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className={`mt-5 text-xs font-bold uppercase tracking-[0.22em] ${color}`}>{label}</p>
                    <h3 className="mt-3 font-heading text-2xl font-semibold leading-tight text-foreground">{data.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">{data.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={300}>
              <div className="mt-12 text-center">
                <Link href="/how-it-works" className="inline-flex min-h-14 items-center gap-3 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition-transform hover:-translate-y-0.5">
                  {t.howItWorks.ctaBtn}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="templates" className="border-y border-border/60 bg-card/30 px-6 py-16 md:py-24">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
                  <Layers className="h-3.5 w-3.5" />
                  {t.templates.badge}
                </div>
                <h2 className={`mt-6 ${sectionHeadingClass}`}>
                  {t.templates.titleMain}
                  <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent"> {t.templates.titleHighlight}</span>
                </h2>
                <p className={`mt-5 ${sectionBodyClass}`}>{t.templates.subtitle}</p>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                {featuredTemplates.map((templateId) => {
                  const template = getTemplateLocalized(templateId, lang);
                  const isActive = activeTab === templateId;
                  return (
                    <button
                      key={templateId}
                      type="button"
                      onClick={() => setActiveTab(templateId)}
                      className={`rounded-full px-6 py-3 text-sm font-semibold transition-all ${isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "border border-border/80 bg-card/85 text-muted-foreground hover:text-foreground"}`}
                    >
                      {template.shortName}
                    </button>
                  );
                })}
              </div>
            </Reveal>

            <div className="mt-12 grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
              <Reveal delay={140} direction="left">
                <div className="rounded-[2rem] border border-border/70 bg-background/85 p-7 shadow-[0_25px_80px_-48px_rgba(15,23,42,0.75)]">
                  <h3 className="font-heading text-3xl font-semibold text-foreground">{activeTemplate.name}</h3>
                  <p className="mt-4 text-base leading-8 text-muted-foreground">{activeTemplate.description}</p>
                  <ul className="mt-7 space-y-3">
                    {(t.templates.templateFeatures[activeTab] ?? []).map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm leading-7 text-foreground">
                        <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href={`/signup?template=${encodeURIComponent(activeTab)}`} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20">
                      {t.templates.useTemplate.replace("{name}", activeTemplate.shortName)}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href={`/templates/${activeTab}`} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border px-6 text-sm font-medium text-foreground">
                      {isBangla ? "প্রিভিউ দেখুন" : "Preview template"}
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={220} direction="right">
                <Link href={`/templates/${activeTab}`} className="group block overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-[0_28px_90px_-48px_rgba(15,23,42,0.9)]">
                  <div className="relative aspect-[4/3] md:aspect-[5/4]">
                    <Image
                      src={getStorefrontTemplateReferenceImage(activeTab) || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80"}
                      alt={activeTemplate.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                    <div className="absolute right-5 top-5 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                      {activeTemplate.shortName}
                    </div>
                    <div className="absolute bottom-0 inset-x-0 p-7 text-white">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{isBangla ? "লাইভ প্রিভিউ" : "Live preview"}</p>
                      <h4 className="mt-3 font-heading text-3xl font-semibold leading-tight">
                        {activeTemplate.hero.title} <span className="text-emerald-300">{activeTemplate.hero.highlight}</span>
                      </h4>
                      <p className="mt-3 max-w-xl text-sm leading-7 text-white/78">{activeTemplate.hero.subtitle}</p>
                    </div>
                  </div>
                </Link>
              </Reveal>
            </div>

            <Reveal delay={260}>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {featuredTemplates.map((templateId) => {
                  const template = getTemplateLocalized(templateId, lang);
                  return (
                    <Link key={templateId} href={`/templates/${templateId}`} className="group rounded-[1.6rem] border border-border/70 bg-card/85 p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                        <Image
                          src={getStorefrontTemplateReferenceImage(templateId) || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80"}
                          alt={template.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>
                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-heading text-lg font-semibold text-foreground">{template.shortName}</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{template.description}</p>
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="px-6 py-16 md:py-20">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-500">
                  <Users className="h-3.5 w-3.5" />
                  {t.testimonials.badge}
                </div>
                <h2 className={`mt-6 ${sectionHeadingClass}`}>
                  {t.testimonials.titleMain}
                  <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent"> {t.testimonials.titleHighlight}</span>
                </h2>
                <p className={`mt-5 ${sectionBodyClass}`}>{t.testimonials.subtitle}</p>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-6 xl:grid-cols-2">
              {t.testimonials.list.map((item, index) => (
                <Reveal key={`${item.author}-${index}`} delay={index * 80}>
                  <div className="flex h-full flex-col justify-between rounded-[1.9rem] border border-border/80 bg-card/92 p-7 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.7)]">
                    <div>
                      <div className="mb-5 flex gap-1 text-amber-400">
                        {Array.from({ length: item.rating }).map((_, starIndex) => (
                          <Star key={starIndex} className="h-4 w-4 fill-current" />
                        ))}
                      </div>
                      <p className="text-base leading-8 text-foreground/90">&ldquo;{item.quote}&rdquo;</p>
                    </div>
                    <div className="mt-7 flex items-center justify-between gap-4 border-t border-border/70 pt-5">
                      <div className="flex items-center gap-3">
                        <Image src={item.avatar} alt={item.author} width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
                        <div>
                          <p className="font-heading text-base font-semibold text-foreground">{item.author}</p>
                          <p className="text-xs leading-5 text-muted-foreground">{item.role}</p>
                        </div>
                      </div>
                      <span className="hidden rounded-full border border-border bg-muted/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:inline-flex">
                        {item.template}
                      </span>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={220}>
              <div className="mt-10 text-center">
                <Link href="/stories" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                  {isBangla ? "আরও মার্চেন্ট স্টোরি দেখুন" : "See more merchant stories"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="px-6 pb-8 md:pb-12">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-5 md:grid-cols-4">
              <Reveal><MetricCard value="15+" label={t.metrics.templates} icon={<Layers className="h-5 w-5" />} /></Reveal>
              <Reveal delay={70}><MetricCard value="< 300ms" label={t.metrics.edge} icon={<Sparkles className="h-5 w-5" />} /></Reveal>
              <Reveal delay={140}><MetricCard value="0%" label={t.metrics.fee} icon={<CreditCard className="h-5 w-5" />} /></Reveal>
              <Reveal delay={210}><MetricCard value="0" label={t.metrics.code} icon={<Check className="h-5 w-5" />} /></Reveal>
            </div>
          </div>
        </section>

        <section id="comparison" className="border-y border-border/60 bg-card/30 px-6 py-16 md:py-24">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  <Check className="h-3.5 w-3.5" />
                  {t.comparison.badge}
                </div>
                <h2 className={`mt-6 ${sectionHeadingClass}`}>
                  {t.comparison.titleMain}
                  <span className="text-rose-500/80"> {t.comparison.titleHighlight}</span>
                </h2>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="mt-12 overflow-hidden rounded-[2rem] border border-border/70 bg-background/88 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.85)]">
                <div className="grid grid-cols-3 border-b border-border/70 bg-muted/45 px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:px-7">
                  <div>{t.comparison.colFeature}</div>
                  <div className="text-center text-foreground">{t.comparison.colEzcomo}</div>
                  <div className="text-center">{t.comparison.colDiy}</div>
                </div>
                <div className="divide-y divide-border/60">
                  {t.comparison.rows.map((row) => (
                    <div key={row.name} className="grid grid-cols-3 gap-4 px-5 py-4 text-sm leading-6 md:px-7 md:text-base">
                      <div className="font-medium text-foreground">{row.name}</div>
                      <div className="text-center font-semibold text-emerald-600 dark:text-emerald-400">{row.ezcomo}</div>
                      <div className="text-center text-muted-foreground">{row.diy}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="px-6 py-16 md:py-24">
          <div className="mx-auto max-w-4xl rounded-[2.4rem] border border-border/70 bg-card/75 px-6 py-12 text-center shadow-[0_28px_90px_-50px_rgba(15,23,42,0.85)] backdrop-blur-sm md:px-12">
            <Reveal>
              <h2 className={`mx-auto max-w-3xl ${isBangla ? "font-heading text-[2.25rem] font-semibold leading-[1.26] tracking-normal text-foreground md:text-[4.3rem]" : "font-heading text-5xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-7xl"}`}>
                {t.cta.titleMain}
                <span className="block bg-gradient-to-r from-emerald-600 via-teal-500 to-indigo-600 bg-clip-text pt-2 text-transparent dark:from-emerald-400 dark:via-teal-300 dark:to-indigo-400">
                  {t.cta.titleHighlight}
                </span>
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <p className={`mx-auto mt-6 max-w-2xl text-muted-foreground ${isBangla ? "text-[1.02rem] leading-8 md:text-xl md:leading-9" : "text-lg leading-8 md:text-xl"}`}>
                {t.cta.subtitle}
              </p>
            </Reveal>
            <Reveal delay={220}>
              <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                <Link href="/signup" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition-transform hover:-translate-y-0.5">
                  {t.cta.btn}
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link href="/admin/login" className="inline-flex min-h-14 items-center justify-center rounded-full border border-border px-8 text-base font-medium text-foreground">
                  {t.nav.login}
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-card/80 px-6 py-10 text-sm text-muted-foreground">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-5 md:gap-12">
          <div className="md:col-span-2">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-300 text-black shadow-md">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-heading text-xl font-bold text-foreground">{PLATFORM_BRAND_NAME}</span>
            </div>
            <p className="max-w-sm text-xs leading-7 text-muted-foreground">{t.footer.desc}</p>
            <p className="mt-4 text-[11px] text-muted-foreground/80">&copy; {new Date().getFullYear()} {PLATFORM_BRAND_NAME}. All rights reserved.</p>
          </div>

          <div>
            <h4 className="mb-5 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-foreground">{t.footer.product}</h4>
            <ul className="space-y-3 text-xs">
              <li><a href="#comparison" className="transition-colors hover:text-foreground">{t.nav.features}</a></li>
              <li><a href="#templates" className="transition-colors hover:text-foreground">{t.nav.templates}</a></li>
              <li><Link href="/plans" className="transition-colors hover:text-foreground">{t.nav.pricing}</Link></li>
              <li><Link href="/templates" className="transition-colors hover:text-foreground">{isBangla ? "সব টেমপ্লেট" : "All templates"}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-5 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-foreground">{t.footer.integrations}</h4>
            <ul className="space-y-3 text-xs">
              <li>bKash &amp; Nagad</li>
              <li>Pathao Courier</li>
              <li>Steadfast Courier</li>
              <li>Stripe Payments</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-5 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-foreground">{t.footer.platform}</h4>
            <ul className="space-y-3 text-xs">
              <li><Link href="/plans#faq" className="transition-colors hover:text-foreground">{isBangla ? "প্রশ্ন ও সহায়তা" : "FAQ & Help"}</Link></li>
              <li><Link href="/how-it-works" className="transition-colors hover:text-foreground">{isBangla ? "বিস্তারিত ওয়ার্কফ্লো" : "Detailed Workflow"}</Link></li>
              <li><Link href="/stories" className="transition-colors hover:text-foreground">{isBangla ? "মার্চেন্ট স্টোরি" : "Merchant Stories"}</Link></li>
              <li><Link href="/admin/login" className="transition-colors hover:text-foreground">{isBangla ? "মার্চেন্ট পোর্টাল" : "Merchant Portal"}</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
