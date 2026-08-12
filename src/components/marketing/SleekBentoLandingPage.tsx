"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  ArrowRight, Play, Sparkles, Layers, Paintbrush, ChevronRight, Check, Moon, Sun,
  Star, ShieldCheck, Truck, CreditCard, HelpCircle, ChevronDown, Zap, Globe, Users, ShoppingBag
} from "lucide-react";
import { CmsPricing } from "./CmsPricing";
import { PLATFORM_BRAND_NAME, PLATFORM_PRIMARY_DOMAIN } from "@/lib/platform/site-config";
import { storefrontTemplateSeedRegistry, type StorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { getStorefrontTemplateReferenceImage } from "@/lib/cms/storefront-template-reference-images";
import { TRANSLATIONS, type Language } from "@/i18n";

export type { Language };

const featuredTemplates: StorefrontTemplateId[] = ["fashion", "beauty", "electronics", "food", "hotel", "booking", "service"];


/**
 * Bi-Directional Cinematic Scroll Reveal Component
 * Animates elements in from left/right/up/down when scrolling down, and reverses the animation back to origin when scrolling up out of view.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  scale = false,
  once = false
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  scale?: boolean;
  once?: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Check initial position on mount
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setIsVisible(true);
    }

    // Safety fallback: if it's meant to be revealed once (like hero elements), 
    // force it to appear after a short delay in case IntersectionObserver fails or layout shifts push it out of bounds.
    const fallbackTimer = once ? setTimeout(() => setIsVisible(true), 800) : null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(entry.target);
        } else {
          if (!once) {
            setIsVisible(false);
          }
        }
      },
      {
        threshold: 0.05,
        rootMargin: "50px 0px 50px 0px",
      }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [once]);

  const getTransform = () => {
    let t = "";
    if (direction === "up") t += "translate-y-6 ";
    if (direction === "down") t += "-translate-y-6 ";
    if (direction === "left") t += "-translate-x-16 ";
    if (direction === "right") t += "translate-x-16 ";
    if (scale) t += "scale-90 ";
    return t.trim();
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[opacity,transform] ${isVisible
        ? "opacity-100 translate-x-0 translate-y-0 scale-100"
        : `opacity-0 ${getTransform()}`
        } ${className}`}
      style={{ transitionDelay: isVisible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}

/**
 * 3D Perspective Tilt Card with Radial Cursor Spotlight
 */
function TiltCard({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -4; // subtle 4deg tilt
    const rotateY = ((x - centerX) / centerX) * 4;

    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)`;
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`landing-bento-card transition-transform duration-300 ease-out will-change-transform ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Magnetic Button Effect - Pulls subtly towards cursor on hover
 */
function MagneticButton({
  children,
  className = "",
  href = "/auth"
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
}) {
  const btnRef = useRef<HTMLAnchorElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    btn.style.transform = `translate3d(${x * 0.15}px, ${y * 0.15}px, 0) scale(1.02)`;
  };

  const handleMouseLeave = () => {
    const btn = btnRef.current;
    if (!btn) return;
    btn.style.transform = `translate3d(0, 0, 0) scale(1)`;
  };

  return (
    <Link
      ref={btnRef}
      href={href}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-200 ease-out inline-flex items-center justify-center ${className}`}
    >
      {children}
    </Link>
  );
}

/**
 * Animated Metric Counter with Observer
 */
function AnimatedCounter({
  value,
  label,
  icon,
  iconCls
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
  iconCls: string;
}) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const numericMatch = value.match(/\d+/);
  const numericValue = numericMatch ? parseInt(numericMatch[0], 10) : 0;
  const prefix = numericMatch ? value.substring(0, value.indexOf(numericMatch[0])) : "";
  const suffix = numericMatch ? value.substring(value.indexOf(numericMatch[0]) + numericMatch[0].length) : value;

  useEffect(() => {
    if (!numericValue) return;
    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = performance.now();
          const duration = 1200;

          const animate = (currentTime: number) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentVal = Math.floor(easeOut * numericValue);

            if (currentRef) {
              currentRef.innerText = `${prefix}${currentVal}${suffix}`;
            }

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              if (currentRef) {
                currentRef.innerText = `${prefix}${numericValue}${suffix}`;
              }
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [numericValue, hasAnimated, prefix, suffix]);

  return (
    <div className="metric-card h-full text-center p-6 md:p-8 rounded-3xl bg-card/80 border border-border hover:border-primary/30 transition-all duration-300 group cursor-default shadow-sm hover:shadow-md">
      <div className={`inline-flex h-12 w-12 rounded-2xl items-center justify-center mb-6 ring-1 group-hover:scale-110 transition-transform duration-300 ${iconCls}`}>
        {icon}
      </div>
      <p className="text-4xl md:text-5xl font-heading font-semibold text-foreground mb-3 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-emerald-600 group-hover:to-teal-500 dark:group-hover:from-emerald-400 dark:group-hover:to-teal-300 transition-all duration-300">
        {numericValue > 0 ? (
          <span ref={ref}>
            {prefix}0{suffix}
          </span>
        ) : (
          <span>{value}</span>
        )}
      </p>
      <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
    </div>
  );
}



function getTemplateLocalized(id: StorefrontTemplateId, lang: Language) {
  const seed = storefrontTemplateSeedRegistry[id];
  if (lang === "bn") {
    const bnData: Partial<Record<StorefrontTemplateId, { name: string; shortName: string; description: string; heroTitle: string; heroHighlight: string; heroSubtitle: string }>> = {
      fashion: {
        name: "ফ্যাশন ক্যাটালগ স্টোর",
        shortName: "ফ্যাশন",
        description: "ট্রেন্দি অ্যাপারেল, পোশাক ও লাইফস্টাইল ব্র্যান্ডের জন্য বিশেষায়িত টেমপ্লেট। ভিজ্যুয়াল সোয়াচ, লুকবুক ক্যারোজেল এবং দ্রুততম মোবাইল চেকআউট সহ।",
        heroTitle: "সামার কালেকশন ",
        heroHighlight: "২০২৬",
        heroSubtitle: "আধুনিক মার্চেন্টদের জন্য সম্পূর্ণ কোড-ফ্রি ফ্যাশন ই-কমার্স প্ল্যাটফর্ম।"
      },
      beauty: {
        name: "বিউটি ও কসমোটিকস স্টোর",
        shortName: "বিউটি",
        description: "স্কিনকেয়ার ও মেকআপ ব্র্যান্ডের জন্য আকর্ষণীয় লেআউট। উপাদান সম্বলিত হাইলাইট ব্লক, বিফোর/আফটার স্লাইডার এবং সাবস্ক্রিপশন চেকআউট।",
        heroTitle: "প্রাকৃতিক গ্লো ও ",
        heroHighlight: "স্কিনকেয়ার",
        heroSubtitle: "আপনার স্কিনকেয়ার ব্র্যান্ডকে বিশ্বমানের অনলাইন স্টোরে রূপান্তর করুন।"
      },
      electronics: {
        name: "ইলেকট্রনিক্স ও গ্যাজেট হাব",
        shortName: "গ্যাজেট",
        description: "স্মার্টফোন, গ্যাজেট ও ইলেকট্রনিক্স টেক স্টোরের জন্য তৈরি। সর্টেবল স্পেক্স টেবিল, ওয়ারেন্টি ব্যাজ এবং রিয়েল-টাইম ইনভেন্টরি ট্র্যাকিং।",
        heroTitle: "নেক্সট-জেন ",
        heroHighlight: "স্মার্ট গ্যাজেটস",
        heroSubtitle: "হাই-টেক ইলেকট্রনিক্স এবং অরিজিনাল এক্সেসরিজের নির্ভরযোগ্য অনলাইন হাব।"
      },
      food: {
        name: "অর্গানিক ফুড ও গ্রোসারি",
        shortName: "ফুড",
        description: "ফ্রেশ ফুড, অর্গানিক গ্রোসারি ও সুইটস ডেলিভারির জন্য প্রস্তুত। ওয়েট-বেসড শিপিং ক্যালকুলেটর, মেয়াদের ব্যাজ এবং পাইকারি ডিসকাウント।",
        heroTitle: "১০০% পিওর ",
        heroHighlight: "অর্গানিক ফুড",
        heroSubtitle: "প্রাকৃতিক ও ফ্রেশ পণ্য সরাসরি কাস্টমারের দোরগোড়ায় পৌঁছে দিন।"
      },
      hotel: {
        name: "হোটেল ও রিসোর্ট",
        shortName: "হোটেল",
        description: "রুম বুকিং, ফেসিলিটি শোকেস এবং অ্যাভেইল্যাবিলিটি ক্যালেন্ডার সহ হোটেল ব্যবসার জন্য প্রিমিয়াম টেমপ্লেট।",
        heroTitle: "লাক্সারি ",
        heroHighlight: "স্টে",
        heroSubtitle: "আপনার হোটেল ও রিসোর্টের জন্য নিখুঁত অনলাইন বুকিং অভিজ্ঞতা।"
      },
      booking: {
        name: "অ্যাপয়েন্টমেন্ট ও বুকিং",
        shortName: "বুকিং",
        description: "ডাক্তার, সেলুন বা ইভেন্ট বুকিংয়ের জন্য ডাইনামিক ডেট পিকার এবং স্লট ম্যানেজমেন্ট সহ সম্পূর্ণ টেমপ্লেট।",
        heroTitle: "সহজ বুকিং ",
        heroHighlight: "ম্যানেজমেন্ট",
        heroSubtitle: "আপনার বুকিং ব্যবসা ডিজিটাল করুন নিমিষেই।"
      },
      service: {
        name: "সার্ভিস ও কনসালটেন্সি",
        shortName: "সার্ভিস",
        description: "প্রফেশনাল সার্ভিস, এজেন্সি বা কনসালটেন্টদের জন্য। অ্যাপয়েন্টমেন্ট শিডিউলিং এবং পোর্টফোলিও শোকেস।",
        heroTitle: "প্রফেশনাল ",
        heroHighlight: "সার্ভিসেস",
        heroSubtitle: "আপনার দক্ষতা এবং সেবাকে অনলাইনের মাধ্যমে ছড়িয়ে দিন।"
      }
    };
    const bn = bnData[id];
    if (bn) {
      return {
        ...seed,
        name: bn.name,
        shortName: bn.shortName,
        description: bn.description,
        hero: {
          ...seed.hero,
          title: bn.heroTitle,
          highlight: bn.heroHighlight,
          subtitle: bn.heroSubtitle
        }
      };
    }
  }
  return seed;
}

export function SleekBentoLandingPage() {
  const [lang, setLang] = useState<Language>("en");
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState<StorefrontTemplateId>("fashion");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const [wordIndex, setWordIndex] = useState(0);

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ezcomo_lang", newLang);
      } catch (err) {
        console.error("Failed to save language preference:", err);
      }
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedLang = localStorage.getItem("ezcomo_lang") as Language;
        if (savedLang && (savedLang === "en" || savedLang === "bn")) {
          setLang(savedLang);
        }
      } catch (err) {
        console.error("Failed to load language preference:", err);
      }
    }
  }, []);

  const t = TRANSLATIONS[lang];
  const headlineWords = t.hero.headlineWords;

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % headlineWords.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [headlineWords.length]);

  useEffect(() => {
    setMounted(true);
    let rafId: number;
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (spotlightRef.current) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          if (spotlightRef.current) {
            spotlightRef.current.style.setProperty('--x', `${e.clientX}px`);
            spotlightRef.current.style.setProperty('--y', `${e.clientY}px`);
          }
        });
      }
    };
    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Performance-optimized scroll listener (Zero React re-renders unless crossing 30px threshold)
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrolled = window.scrollY > 30;
          setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const currentTheme = theme === 'system' ? resolvedTheme : theme;
  const isDark = mounted ? (currentTheme === 'dark' || resolvedTheme === 'dark') : false;

  return (
    <div data-lang={lang} lang={lang} className={`min-h-screen bg-background text-foreground overflow-hidden transition-colors duration-300 bg-grid-pattern relative ${lang === 'bn' ? 'font-bengali' : 'font-sans'}`}>

      {/* Global Cursor Spotlight */}
      <div
        ref={spotlightRef}
        className="pointer-events-none fixed inset-0 z-50 transition-opacity duration-300 hidden md:block mix-blend-screen dark:mix-blend-color-dodge"
        style={{
          background: `radial-gradient(500px circle at var(--x, -1000px) var(--y, -1000px), rgba(16, 185, 129, 0.07), transparent 50%)`
        }}
      />
      {/* Classic Floating Navbar (Preserved from original CmsLandingPage) */}
      <header className="fixed inset-x-0 top-1 z-50 px-4 w-full flex flex-col items-center justify-center pointer-events-none">
        <nav className={`pointer-events-auto mx-auto flex h-[4.6rem] max-w-6xl w-full items-center justify-between gap-3 rounded-[2rem] border-x border-b border-t-0 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-[24px] saturate-[1.8] px-4 sm:px-6 transition-all duration-300 ${isScrolled
          ? "border-border/60 bg-card/65 dark:bg-slate-950/50 shadow-lg"
          : "border-white/10 dark:border-white/10 bg-card/30 dark:bg-slate-950/20"
          }`}>
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black shadow-lg bg-emerald-500 text-white font-heading">
              EZ
            </div>
            <div>
              <p className="font-heading text-base sm:text-lg font-extrabold tracking-[0.18em] text-foreground">{PLATFORM_BRAND_NAME.toUpperCase()}</p>
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground hidden sm:block">{PLATFORM_PRIMARY_DOMAIN}</p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            {[
              { href: "#how-it-works", label: t.nav.howItWorks },
              { href: "#templates", label: t.nav.templates },
              { href: "#comparison", label: t.nav.features },
              { href: "/plans", label: t.nav.pricing },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="group hover:text-foreground transition-colors relative py-1"
              >
                {label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full rounded-full" />
              </a>
            ))}
          </div>

          {/* Right Action Items */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher Segmented Toggle */}
            <div className="inline-flex items-center p-0.5 rounded-full border border-border/80 bg-muted/60 text-[11px] font-bold shadow-sm">
              <button
                type="button"
                onClick={() => handleSetLang("en")}
                className={`px-2.5 py-1 rounded-full transition-all duration-200 ${
                  lang === "en"
                    ? "bg-primary text-primary-foreground shadow-sm font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleSetLang("bn")}
                className={`px-2.5 py-1 rounded-full transition-all duration-200 ${
                  lang === "bn"
                    ? "bg-primary text-primary-foreground shadow-sm font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                বাংলা
              </button>
            </div>

            {mounted ? (
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                aria-label="Toggle color mode"
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm ${!isDark
                  ? "border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-100"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                  }`}
              >
                {!isDark ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
              </button>
            ) : (
              <div className="h-10 w-10 rounded-full border border-border bg-muted/30" />
            )}

            <Link
              href="/auth"
              className="hidden sm:inline-flex rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.nav.login}
            </Link>

            <Link
              href="/signup"
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-primary-foreground bg-primary shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:shadow-emerald-500/30 group"
            >
              <span>{t.nav.startTrial}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((p) => !p)}
              className="md:hidden p-2 rounded-full border border-border/60 bg-muted/40 hover:bg-muted transition-colors text-foreground"
              aria-label="Toggle mobile menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </nav>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="pointer-events-auto mt-2 w-full max-w-6xl bg-card/75 dark:bg-slate-950/75 backdrop-blur-2xl border border-border/60 rounded-3xl shadow-2xl p-4 flex flex-col gap-1 md:hidden">
            {[
              { href: "#how-it-works", label: t.nav.howItWorks },
              { href: "#templates", label: t.nav.templates },
              { href: "#comparison", label: t.nav.features },
              { href: "/plans", label: t.nav.pricing },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 rounded-2xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                {label}
              </a>
            ))}
            <div className="border-t border-border/60 mt-2 pt-3 grid grid-cols-2 gap-2">
              <Link href="/auth" className="text-center py-2.5 rounded-full border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                {t.nav.login}
              </Link>
              <Link href="/signup" className="text-center py-2.5 rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                {t.nav.startTrial}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-8 md:pt-24 md:pb-10 overflow-hidden">
        {/* Animated Background Textures */}
        <div className="aurora-bg" />
        <div className="bg-grain overflow-hidden" />

        {/* GPU-Accelerated Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-emerald-500/15 dark:bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none animate-float-orb-1" />
        <div className="absolute top-44 -left-44 w-[450px] h-[450px] bg-indigo-500/15 dark:bg-indigo-500/10 blur-[110px] rounded-full pointer-events-none animate-float-orb-2" />

        {/* Floating Ambient Particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-emerald-500 rounded-full animate-float-particle-slow shadow-[0_0_10px_rgba(16,185,129,0.5)] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-indigo-500 rounded-full animate-float-particle-fast shadow-[0_0_15px_rgba(99,102,241,0.5)] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-rose-500 rounded-full animate-float-particle-slow shadow-[0_0_8px_rgba(244,63,94,0.5)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
          <Reveal delay={0} scale once>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-8 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {t.hero.badge}
            </div>
          </Reveal>

          <Reveal delay={100} direction="up" once>
            <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tighter mb-8 leading-[1.05] max-w-5xl text-foreground">
              {t.hero.titlePrefix} <br className="hidden md:block" />
              <span key={wordIndex} className="inline-block animate-fade-in-up text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 dark:from-emerald-400 dark:via-emerald-300 dark:to-indigo-400 animate-text-shimmer bg-[length:200%_auto]">
                {headlineWords[wordIndex]}
              </span>
            </h1>
          </Reveal>

          <Reveal delay={200} direction="up" once>
            <p className="max-w-2xl text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed">
              {t.hero.subtitle}
            </p>
          </Reveal>

          <Reveal delay={300} direction="up" once>
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <MagneticButton
                href="/signup"
                className="w-full sm:w-auto inline-flex h-13 items-center justify-center rounded-full bg-primary px-9 font-semibold text-primary-foreground shadow-lg shadow-emerald-500/20"
              >
                {t.hero.primaryCta}
              </MagneticButton>
              <MagneticButton
                href="#comparison"
                className="w-full sm:w-auto inline-flex h-13 items-center justify-center rounded-full border border-border bg-card px-9 font-medium text-foreground hover:bg-muted transition-colors gap-2 shadow-sm"
              >
                <Play className="h-4 w-4" /> {t.hero.secondaryCta}
              </MagneticButton>
            </div>
          </Reveal>

          {/* Hero Sub-badges / Trust signals */}
          <Reveal delay={400} direction="up" once>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 md:gap-8 text-xs text-muted-foreground font-medium">
              {t.hero.trustBadges.map((badge, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="hidden sm:inline text-border">•</span>}
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" /> {badge}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </Reveal>

          {/* Hero UI Mockup Showcase */}
          <Reveal delay={500} scale direction="up" once className="w-full max-w-5xl">
            <div className="mt-10 md:mt-14 w-full relative">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 bottom-0 h-32 mt-auto pointer-events-none" />
              <div className="rounded-t-[2rem] border-x border-t border-border bg-card p-4 md:p-6 pb-0 shadow-2xl relative overflow-hidden transition-colors">
                {/* Browser Chrome */}
                <div className="flex items-center gap-2 mb-4 px-2">
                  <div className="h-3 w-3 rounded-full bg-red-400/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
                  <div className="ml-4 h-6.5 w-64 bg-muted border border-border flex items-center px-3 text-[10px] text-muted-foreground rounded-md">
                    https://yourstore.ezcomo.site
                  </div>
                </div>

                {/* Video Demo Embed */}
                <div className="rounded-t-xl bg-muted/40 border-x border-t border-border h-[320px] flex overflow-hidden relative group cursor-pointer">
                  <Image
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200"
                    alt="EZComo Builder Demo"
                    width={1200}
                    height={800}
                    className="w-full h-full object-cover opacity-80 mix-blend-luminosity group-hover:mix-blend-normal group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
                    priority
                  />
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-20 w-20 rounded-full bg-background/30 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:bg-primary/90 transition-all duration-500">
                      <Play className="h-8 w-8 text-white fill-white ml-1.5" />
                    </div>
                  </div>
                  <div className="absolute top-5 right-5 h-8 w-28 bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center rounded-full shadow-md animate-pulse">
                    Live Demo
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Glassmorphic Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent backdrop-blur-md opacity-50 relative z-20" />

      {/* Integration Trust Bar */}
      <section className="py-5 md:py-6 bg-muted/30 relative bg-dot-pattern overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 to-transparent pointer-events-none" />
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className="w-full px-6 text-center relative z-10">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-4 relative z-10">
            {t.trustBar}
          </p>
          <div className="flex animate-marquee gap-16 items-center opacity-70 hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-500 w-max hover:[animation-play-state:paused]">
            {[...Array(4)].map((_, i) => (
              <React.Fragment key={i}>
                <span className="font-heading font-bold text-xl tracking-tight text-foreground flex items-center gap-3 shrink-0">
                  <CreditCard className="h-6 w-6 text-emerald-500" /> bKash &amp; Nagad
                </span>
                <span className="font-heading font-bold text-xl tracking-tight text-foreground flex items-center gap-3 shrink-0">
                  <Truck className="h-6 w-6 text-indigo-500" /> Pathao Courier
                </span>
                <span className="font-heading font-bold text-xl tracking-tight text-foreground flex items-center gap-3 shrink-0">
                  <ShieldCheck className="h-6 w-6 text-amber-500" /> SSLCommerz
                </span>
                <span className="font-heading font-bold text-xl tracking-tight text-foreground flex items-center gap-3 shrink-0">
                  <Globe className="h-6 w-6 text-rose-500" /> Stripe Global
                </span>
                <span className="font-heading font-bold text-xl tracking-tight text-foreground flex items-center gap-3 shrink-0">
                  <Zap className="h-6 w-6 text-teal-500" /> Steadfast Courier
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Glassmorphic Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent backdrop-blur-md opacity-50 relative z-20" />

      {/* How It Works Section */}
      <section id="how-it-works" className="py-14 md:py-20 relative bg-muted/20 bg-dot-pattern">
        <div className="absolute inset-0 bg-background/80 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <Reveal direction="up" className="text-center mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-6">
              <Zap className="h-3.5 w-3.5" />
              {t.howItWorks.badge}
            </div>
            <h2 className="font-heading text-4xl md:text-6xl font-medium tracking-tight mb-6 text-foreground">
              {t.howItWorks.titleMain}<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500">{t.howItWorks.titleHighlight}</span>{t.howItWorks.titleSuffix}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t.howItWorks.subtitle}
            </p>
          </Reveal>

          <div className="relative max-w-5xl mx-auto mt-6 pb-4">
            {/* Connecting Line */}
            <div className="absolute top-12 left-[12%] right-[12%] h-1 bg-gradient-to-r from-emerald-500/30 via-indigo-500/30 to-amber-500/30 hidden md:block" />

            <div className="grid md:grid-cols-3 gap-8 relative z-10">
              {/* Step 1 */}
              <Reveal direction="up" delay={100}>
                <div className="flex flex-col items-center text-center p-6 rounded-3xl bg-card border border-border/80 shadow-lg hover:border-emerald-500/40 transition-all duration-300 group h-full">
                  <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-heading font-extrabold text-2xl mb-6 ring-1 ring-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                    <ShoppingBag className="h-7 w-7" />
                  </div>
                  <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2">{lang === 'bn' ? 'ধাপ ১' : 'Step 01'}</span>
                  <h3 className="text-xl font-bold font-heading text-foreground mb-3">{t.howItWorks.step1.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t.howItWorks.step1.desc}
                  </p>
                </div>
              </Reveal>
              {/* Step 2 */}
              <Reveal direction="up" delay={200}>
                <div className="flex flex-col items-center text-center p-6 rounded-3xl bg-card border border-border/80 shadow-lg hover:border-indigo-500/40 transition-all duration-300 group h-full">
                  <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-heading font-extrabold text-2xl mb-6 ring-1 ring-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                    <Paintbrush className="h-7 w-7" />
                  </div>
                  <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">{lang === 'bn' ? 'ধাপ ২' : 'Step 02'}</span>
                  <h3 className="text-xl font-bold font-heading text-foreground mb-3">{t.howItWorks.step2.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t.howItWorks.step2.desc}
                  </p>
                </div>
              </Reveal>
              {/* Step 3 */}
              <Reveal direction="up" delay={300}>
                <div className="flex flex-col items-center text-center p-6 rounded-3xl bg-card border border-border/80 shadow-lg hover:border-amber-500/40 transition-all duration-300 group h-full">
                  <div className="h-16 w-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-heading font-extrabold text-2xl mb-6 ring-1 ring-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                    <CreditCard className="h-7 w-7" />
                  </div>
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">{lang === 'bn' ? 'ধাপ ৩' : 'Step 03'}</span>
                  <h3 className="text-xl font-bold font-heading text-foreground mb-3">{t.howItWorks.step3.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t.howItWorks.step3.desc}
                  </p>
                </div>
              </Reveal>
            </div>

            {/* Prominent High-Visibility CTA Button */}
            <Reveal direction="up" delay={400} className="mt-12 text-center">
              <Link
                href="/how-it-works"
                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold text-base shadow-xl shadow-emerald-500/25 ring-4 ring-emerald-500/20 hover:ring-emerald-500/40 hover:scale-105 transition-all duration-300 overflow-hidden"
              >
                <Sparkles className="h-5 w-5 text-emerald-300 animate-pulse" />
                <span>{t.howItWorks.ctaBtn}</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1.5" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Glassmorphic Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent backdrop-blur-md opacity-50 relative z-20" />

      {/* Template Showcase Section */}
      <section id="templates" className="py-12 md:py-16 relative z-20 overflow-hidden">
        {/* Section gradient mesh */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[550px] h-[550px] bg-indigo-500/5 dark:bg-indigo-500/3 blur-[160px] rounded-full animate-mesh-drift" />
          <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-emerald-500/5 dark:bg-emerald-500/3 blur-[130px] rounded-full animate-mesh-drift" style={{ animationDelay: '-10s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <Reveal direction="up" className="text-center mb-8 md:mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-6">
              <Layers className="h-3.5 w-3.5" />
              {t.templates.badge}
            </div>
            <h2 className="font-heading text-4xl md:text-6xl font-medium tracking-tight mb-6 text-foreground leading-[1.1]">
              {t.templates.titleMain}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500 dark:from-indigo-400 dark:to-violet-300">{t.templates.titleHighlight}</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">{t.templates.subtitle}</p>
          </Reveal>

          {/* Template Tab Controls */}
          <Reveal direction="up" delay={100} className="flex flex-wrap justify-center gap-4 mb-10">
            {featuredTemplates.map((id) => {
              const template = getTemplateLocalized(id, lang);
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`px-8 py-3.5 rounded-full text-sm font-semibold transition-all duration-300 ${isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-emerald-500/20 scale-105 ring-2 ring-primary/30"
                    : "bg-card border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground hover:shadow-md"
                    }`}
                >
                  {template.shortName}
                </button>
              );
            })}
          </Reveal>

          {/* Smooth Crossfade Template Showcase */}
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center min-h-[480px]">
            {/* Left Side: Template Info */}
            <Reveal direction="left" delay={150} className="order-2 md:order-1">
              <div className="relative min-h-[400px]">
                {featuredTemplates.map((id) => {
                  const template = getTemplateLocalized(id, lang);
                  const isCurrent = activeTab === id;
                  const features = t.templates.templateFeatures[id] || [];
                  return (
                    <div
                      key={id}
                      className={`transition-all duration-400 ease-out ${isCurrent
                        ? "opacity-100 translate-y-0 relative z-10 pointer-events-auto"
                        : "opacity-0 translate-y-2 absolute inset-0 z-0 pointer-events-none"
                        }`}
                    >
                      <div className="space-y-4">
                        <h3 className="text-4xl font-heading font-medium text-foreground">{template.name}</h3>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                          {template.description}
                        </p>
                      </div>
                      <ul className="space-y-4 mt-8">
                        {features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-3.5 group/feat">
                            <div className="h-7.5 w-7.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 ring-1 ring-emerald-500/20 group-hover/feat:bg-emerald-500/20 group-hover/feat:scale-110 transition-all duration-300">
                              <Check className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Link href={`/signup?template=${id}`} className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all duration-300 group/tpl mt-7">
                        {t.templates.useTemplate.replace('{name}', template.shortName)} <ArrowRight className="h-4 w-4 transition-transform group-hover/tpl:translate-x-1" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </Reveal>

            {/* Right Side: Template Image Preview */}
            <Reveal direction="right" delay={200} className="order-1 md:order-2">
              <div
                className="aspect-[4/5] rounded-3xl overflow-hidden border border-border bg-card shadow-2xl relative group hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.5)] transition-shadow duration-500"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = (e.clientX - rect.left) / rect.width - 0.5;
                  const y = (e.clientY - rect.top) / rect.height - 0.5;
                  e.currentTarget.style.setProperty('--px', `${x * -35}px`);
                  e.currentTarget.style.setProperty('--py', `${y * -35}px`);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.setProperty('--px', '0px');
                  e.currentTarget.style.setProperty('--py', '0px');
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none" />

                {featuredTemplates.map((id) => {
                  const isCurrent = activeTab === id;
                  const template = getTemplateLocalized(id, lang);
                  const imgUrl = getStorefrontTemplateReferenceImage(id) || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80";

                  return (
                    <div
                      key={id}
                      className={`absolute inset-0 transition-all duration-400 ease-out ${isCurrent
                        ? "opacity-100 scale-100 translate-x-0 z-10"
                        : "opacity-0 scale-98 -translate-x-3 z-0 pointer-events-none"
                        }`}
                    >
                      <div className="w-full h-full transition-transform duration-300 ease-out" style={{ transform: 'translate3d(var(--px, 0px), var(--py, 0px), 0)' }}>
                        <Image src={imgUrl} alt={template.name} width={800} height={1000} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" priority={isCurrent} />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                      <div className="absolute top-5 right-5 z-20 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold uppercase tracking-wider shadow-lg">
                        {template.shortName} {lang === 'bn' ? 'টেমপ্লেট' : 'Template'}
                      </div>
                      <div className="absolute bottom-0 inset-x-0 p-8 text-white z-20">
                        <h4 className="text-3xl font-medium font-heading mb-2">
                          {template.hero.title} <span className="text-emerald-400">{template.hero.highlight}</span>
                        </h4>
                        <p className="text-white/70 text-sm line-clamp-2">{template.hero.subtitle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Live Storefront Showcase Strip */}
      <section className="py-5 relative overflow-hidden bg-muted/20 border-y border-border/60">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee gap-6 items-center px-4 w-max hover:[animation-play-state:paused]">
          {[...featuredTemplates, ...featuredTemplates, ...featuredTemplates, ...featuredTemplates].map((id, index) => {
            const template = getTemplateLocalized(id, lang);
            const imgUrl = getStorefrontTemplateReferenceImage(id) || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80";

            return (
              <div key={`${id}-${index}`} className="flex-none w-72 group cursor-pointer">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-border bg-card shadow-sm group-hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1 relative">
                  <Image src={imgUrl} width={400} height={300} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={template.name} loading="lazy" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-sm bg-white/10">{lang === 'bn' ? 'স্টোর প্রিভিউ' : 'Preview Store'}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between px-1">
                  <h4 className="font-semibold text-foreground text-sm">{template.name}</h4>
                  <span className="text-xs text-muted-foreground">{template.shortName}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>


      {/* Merchant Testimonials / Social Proof */}
      <section className="py-12 md:py-16 bg-card/50 relative overflow-hidden bg-dot-pattern">
        <div className="absolute inset-0 bg-background/50 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <Reveal direction="up" className="text-center mb-8 md:mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-widest mb-6">
              <Users className="h-3.5 w-3.5" />
              {t.testimonials.badge}
            </div>
            <h2 className="font-heading text-4xl md:text-6xl font-medium tracking-tight mb-6 text-foreground">
              {t.testimonials.titleMain}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300">{t.testimonials.titleHighlight}</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">{t.testimonials.subtitle}</p>
          </Reveal>

          <div className="relative -mx-6 px-6 overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

            <div className="flex animate-marquee gap-8 items-stretch py-4 w-max hover:[animation-play-state:paused]">
              {[...Array(2)].map((_, arrayIdx) => (
                <React.Fragment key={arrayIdx}>
                  {t.testimonials.list.map((item, index) => (
                    <div key={`${arrayIdx}-${index}`} className="w-[350px] md:w-[450px] shrink-0 p-8 rounded-3xl bg-card border border-border flex flex-col justify-between hover:border-amber-500/30 transition-all duration-300 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing group">
                      <div>
                        <div className="flex gap-1 mb-5 text-amber-400">
                          {[...Array(item.rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <p className="text-foreground leading-relaxed text-[15px] mb-8 line-clamp-4">
                          &quot;{item.quote}&quot;
                        </p>
                      </div>
                      <div className="pt-6 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Image src={item.avatar} alt={item.author} width={40} height={40} className="h-10 w-10 rounded-full bg-muted object-cover" loading="lazy" />
                          <div>
                            <h4 className="font-heading font-bold text-foreground text-sm">{item.author}</h4>
                            <p className="text-[11px] text-muted-foreground">{item.role}</p>
                          </div>
                        </div>
                        <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-muted border border-border text-muted-foreground">
                          {item.template}
                        </span>
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Modern Metrics/Social Proof with Animated Counter */}
      <section className="py-8 md:py-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { value: '15+', label: t.metrics.templates, icon: <Layers className="h-5 w-5" />, iconCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20' },
              { value: '< 300ms', label: t.metrics.edge, icon: <Sparkles className="h-5 w-5" />, iconCls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20' },
              { value: '0%', label: t.metrics.fee, icon: <CreditCard className="h-5 w-5" />, iconCls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20' },
              { value: '0', label: t.metrics.code, icon: <Check className="h-5 w-5" />, iconCls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20' },
            ].map((metric, i) => (
              <Reveal key={i} direction="up" delay={i * 100}>
                <AnimatedCounter
                  value={metric.value}
                  label={metric.label}
                  icon={metric.icon}
                  iconCls={metric.iconCls}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-12 md:py-16 relative bg-background">
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <Reveal direction="up" className="text-center mb-8 md:mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-6">
              <Check className="h-3.5 w-3.5" />
              {t.comparison.badge}
            </div>
            <h2 className="font-heading text-4xl md:text-5xl font-medium tracking-tight mb-6 text-foreground">
              {t.comparison.titleMain} <span className="text-rose-500/70">{t.comparison.titleHighlight}</span>
            </h2>
          </Reveal>

          <Reveal direction="up" delay={100}>
            <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-xl">
              <div className="grid grid-cols-3 bg-muted/50 border-b border-border p-6 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-1">{t.comparison.colFeature}</div>
                <div className="col-span-1 text-center text-foreground flex items-center justify-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500"><Check className="h-3 w-3" /></div>
                  {t.comparison.colEzcomo}
                </div>
                <div className="col-span-1 text-center opacity-60">{t.comparison.colDiy}</div>
              </div>

              <div className="divide-y divide-border/50">
                {t.comparison.rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-3 py-4 px-6 text-sm hover:bg-muted/30 transition-colors">
                    <div className="col-span-1 font-medium text-foreground flex items-center">{row.name}</div>
                    <div className="col-span-1 text-center font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center">{row.ezcomo}</div>
                    <div className="col-span-1 text-center text-muted-foreground flex items-center justify-center">{row.diy}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>




      {/* Glassmorphic Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent backdrop-blur-md opacity-50 relative z-20" />

      {/* Massive CTA */}
      <section className="py-14 md:py-18 relative overflow-hidden bg-card/30">
        {/* CTA Background Orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[450px] bg-emerald-500/10 dark:bg-emerald-500/8 blur-[160px] rounded-full animate-pulse-glow" />
          <div className="absolute bottom-0 right-0 w-[350px] h-[350px] bg-indigo-500/10 dark:bg-indigo-500/6 blur-[120px] rounded-full animate-mesh-drift" />
        </div>

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <Reveal direction="up" delay={100}>
            <h2 className="font-heading text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight mb-6 text-foreground leading-[1.08]">
              {t.cta.titleMain} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-indigo-600 dark:from-emerald-400 dark:via-teal-300 dark:to-indigo-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] dark:drop-shadow-[0_0_15px_rgba(52,211,153,0.4)] animate-pulse-glow inline-block">{t.cta.titleHighlight}</span>
            </h2>
          </Reveal>

          <Reveal direction="up" delay={200}>
            <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">{t.cta.subtitle}</p>
          </Reveal>

          <Reveal direction="up" delay={300}>
            <MagneticButton
              href="/signup"
              className="group relative inline-flex h-16 items-center justify-center rounded-full bg-primary px-12 text-lg font-semibold text-primary-foreground shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:shadow-2xl overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                {t.cta.btn}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </MagneticButton>
          </Reveal>
        </div>
      </section>

      {/* Glassmorphic Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent backdrop-blur-md opacity-50 relative z-20" />

      {/* Rich Footer */}
      <footer className="bg-card/80 py-10 md:py-12 text-muted-foreground text-sm">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-300 flex items-center justify-center text-black shadow-md">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-heading font-bold text-xl text-foreground">{PLATFORM_BRAND_NAME}</span>
            </div>
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground mb-6">
              {t.footer.desc}
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              © {new Date().getFullYear()} {PLATFORM_BRAND_NAME}. All rights reserved.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-foreground text-xs uppercase tracking-wider mb-5">{t.footer.product}</h4>
            <ul className="space-y-3 text-xs">
              <li><a href="#comparison" className="hover:text-foreground transition-colors">{t.nav.features}</a></li>
              <li><a href="#templates" className="hover:text-foreground transition-colors">{t.nav.templates}</a></li>
              <li><Link href="/plans" className="hover:text-foreground transition-colors">{t.nav.pricing}</Link></li>
              <li><Link href="/auth" className="hover:text-foreground transition-colors">{t.nav.login}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-foreground text-xs uppercase tracking-wider mb-5">{t.footer.integrations}</h4>
            <ul className="space-y-3 text-xs">
              <li><span className="hover:text-foreground transition-colors">bKash &amp; Nagad</span></li>
              <li><span className="hover:text-foreground transition-colors">Pathao Courier</span></li>
              <li><span className="hover:text-foreground transition-colors">Steadfast Courier</span></li>
              <li><span className="hover:text-foreground transition-colors">Stripe Payments</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-foreground text-xs uppercase tracking-wider mb-5">{t.footer.platform}</h4>
            <ul className="space-y-3 text-xs">
              <li><Link href="/plans#faq" className="hover:text-foreground transition-colors">FAQ &amp; Help</Link></li>
              <li><Link href="/how-it-works" className="hover:text-foreground transition-colors">Detailed Workflow</Link></li>
              <li><Link href="/auth" className="hover:text-foreground transition-colors">Merchant Portal</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
