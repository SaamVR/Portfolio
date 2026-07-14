"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createStoreSlug } from "@/lib/slug";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Crown,
  CreditCard,
  Globe,
  HelpCircle,
  Layout,
  MessageSquareQuote,
  Monitor,
  PackageCheck,
  Palette,
  Rocket,
  Settings2,
  ShieldCheck,
  Sliders,
  Sparkles,
  Smartphone,
  Star,
  Store,
  Type,
  WandSparkles,
} from "lucide-react";

const faqs = [
  {
    q: "How do manual bKash payments work?",
    a: "When customers choose manual payment at checkout, they see your bKash or Nagad number and instructions. They submit a TrxID, the order enters review, and you verify it from the admin dashboard.",
  },
  {
    q: "Can I connect my own custom domain?",
    a: "Yes. You can map your own domain from store settings, and Commerce Engine handles SSL provisioning and storefront routing for you.",
  },
  {
    q: "Do I need coding skills to design pages?",
    a: "No. The builder is designed for merchants. You can swap layouts, update sections, change colors, and adjust typography without touching code.",
  },
  {
    q: "How fast can a store go live?",
    a: "A merchant can start from a template, customize the brand, connect payments, and publish in a short guided flow. The landing page demo mirrors that setup story.",
  },
];

const testimonials = [
  {
    quote: "We went from taking orders in Messenger to having a storefront that customers trusted before they even asked a question.",
    name: "Nadia Rahman",
    role: "Founder, Luna Skin Lab",
    result: "Launched in one evening",
  },
  {
    quote: "The biggest win was how quickly we could change the homepage for campaigns. New drop, new colors, new hero, done.",
    name: "Mahin Islam",
    role: "Operator, Trendy Closet",
    result: "Campaign pages update in minutes",
  },
  {
    quote: "The payment instructions and order flow made us look much more professional than selling from inbox threads.",
    name: "Tanzim Hasan",
    role: "Owner, Volt Cart",
    result: "Clearer checkout, fewer support messages",
  },
] as const;

const useCases = [
  {
    title: "Fashion drops",
    body: "Launch lookbooks, spotlight best sellers, and rotate campaign banners for new arrivals and seasonal drops.",
    fit: "Ideal for apparel, accessories, and lifestyle labels",
  },
  {
    title: "Skincare routines",
    body: "Guide buyers from concern to bundle with ingredient-led sections, trust copy, and routine recommendations.",
    fit: "Ideal for skincare, beauty, and wellness brands",
  },
  {
    title: "Bakery menus",
    body: "Highlight daily availability, pre-order windows, and celebration bundles with a warm, giftable storefront.",
    fit: "Ideal for bakeries, gift shops, and food brands",
  },
  {
    title: "Electronics stores",
    body: "Pair specs, warranty reassurance, and support details so technical shoppers feel confident before checkout.",
    fit: "Ideal for gadgets, accessories, and home tech",
  },
] as const;

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Trust-ready storefronts",
    body: "Policy, support, and payment clarity are built into the launch story so the site feels safer from day one.",
  },
  {
    icon: CreditCard,
    title: "Local payment fit",
    body: "bKash, Nagad, and cash on delivery can all be represented in the setup instead of bolted on later.",
  },
  {
    icon: Globe,
    title: "Real domain presence",
    body: "Merchants can see how their store name turns into a branded subdomain before they commit to the full setup.",
  },
  {
    icon: PackageCheck,
    title: "Operational confidence",
    body: "The landing flow hints at the real admin outcome: products, orders, launch status, and editable store setup.",
  },
] as const;

const dayOneItems = [
  "Storefront homepage with real sections",
  "Branded product grid and preview content",
  "Payment instructions and launch settings",
  "Store slug and shareable preview URL",
  "Editable onboarding after signup",
  "Admin workspace ready for publishing",
] as const;

const colorThemes = {
  emerald: {
    name: "Emerald",
    primary: "bg-emerald-500",
    primaryText: "text-emerald-400",
    border: "border-emerald-500/30",
    accent: "bg-emerald-500/10",
    chip: "bg-emerald-500/15 text-emerald-300",
    ring: "ring-emerald-400/50",
    button: "hover:shadow-[0_0_30px_rgba(16,185,129,0.25)]",
    heroSurface: "from-emerald-500/18 via-emerald-400/6 to-transparent",
    glow: "bg-emerald-500/20",
  },
  crimson: {
    name: "Crimson",
    primary: "bg-rose-600",
    primaryText: "text-rose-300",
    border: "border-rose-500/30",
    accent: "bg-rose-500/10",
    chip: "bg-rose-500/15 text-rose-200",
    ring: "ring-rose-400/50",
    button: "hover:shadow-[0_0_30px_rgba(225,29,72,0.25)]",
    heroSurface: "from-rose-500/18 via-rose-400/6 to-transparent",
    glow: "bg-rose-500/20",
  },
  indigo: {
    name: "Indigo",
    primary: "bg-indigo-600",
    primaryText: "text-indigo-300",
    border: "border-indigo-500/30",
    accent: "bg-indigo-500/10",
    chip: "bg-indigo-500/15 text-indigo-200",
    ring: "ring-indigo-400/50",
    button: "hover:shadow-[0_0_30px_rgba(79,70,229,0.25)]",
    heroSurface: "from-indigo-500/18 via-indigo-400/6 to-transparent",
    glow: "bg-indigo-500/20",
  },
  amber: {
    name: "Amber",
    primary: "bg-amber-500",
    primaryText: "text-amber-300",
    border: "border-amber-500/30",
    accent: "bg-amber-500/10",
    chip: "bg-amber-500/15 text-amber-200",
    ring: "ring-amber-400/50",
    button: "hover:shadow-[0_0_30px_rgba(245,158,11,0.25)]",
    heroSurface: "from-amber-500/18 via-amber-400/6 to-transparent",
    glow: "bg-amber-500/20",
  },
} as const;

const fontThemes = {
  modern: {
    name: "Modern Sans",
    hero: "font-body",
    brand: "font-heading",
    accentClass: "tracking-tight",
  },
  editorial: {
    name: "Editorial Serif",
    hero: "font-serif",
    brand: "font-serif",
    accentClass: "tracking-normal",
  },
  campaign: {
    name: "Campaign Bold",
    hero: "font-heading",
    brand: "font-heading",
    accentClass: "uppercase tracking-[0.18em]",
  },
} as const;

const siteProfiles = {
  fashion: {
    name: "Fashion Boutique",
    badge: "Seasonal drop",
    tagline: "Premium streetwear collection",
    hero: "Dress the launch like it already belongs on a billboard.",
    description: "Showcase hero imagery, featured drops, social proof, and a cleaner apparel product grid.",
    storeName: "Trendy Closet",
    announcement: "20% off launch week with code NEWDROP",
    sectionLabel: "Lookbook launch",
    products: [
      { name: "Premium Denim Shirt", price: "BDT 1,850", tag: "Best seller" },
      { name: "Urban Cargo Pants", price: "BDT 2,200", tag: "New arrival" },
      { name: "Structured Fit Trouser", price: "BDT 1,950", tag: "Everyday" },
    ],
    support: "Fast exchange and nationwide shipping",
  },
  skincare: {
    name: "Skincare Brand",
    badge: "Routine builder",
    tagline: "Clinical but soft",
    hero: "Guide shoppers from skin concern to trusted routine in one page.",
    description: "Use ingredient highlights, before-after storytelling, and bundle sections that feel reassuring.",
    storeName: "Luna Skin Lab",
    announcement: "Free cleanser mini on every routine bundle this week",
    sectionLabel: "Ingredient-led homepage",
    products: [
      { name: "Barrier Repair Serum", price: "BDT 1,490", tag: "Sensitive skin" },
      { name: "Daily Cloud Cleanser", price: "BDT 990", tag: "AM / PM" },
      { name: "Glow Reset Moisturizer", price: "BDT 1,250", tag: "Top rated" },
    ],
    support: "Ingredient cards, FAQs, and WhatsApp consult CTA",
  },
  bakery: {
    name: "Bakery & Gifts",
    badge: "Pre-order flow",
    tagline: "Warm and celebratory",
    hero: "Turn daily menus and gifting boxes into a storefront that feels fresh each morning.",
    description: "Feature delivery windows, quick order highlights, occasion bundles, and social proof for custom orders.",
    storeName: "Oven Theory",
    announcement: "Same-day delivery inside Dhaka for orders before 4pm",
    sectionLabel: "Daily menu board",
    products: [
      { name: "Signature Bento Cake", price: "BDT 1,150", tag: "Birthday pick" },
      { name: "Brunch Pastry Box", price: "BDT 890", tag: "Weekend favorite" },
      { name: "Mini Treat Bundle", price: "BDT 650", tag: "Gift-ready" },
    ],
    support: "Delivery slots, pre-orders, and event inquiry sections",
  },
  electronics: {
    name: "Gadget Store",
    badge: "Spec-first",
    tagline: "Trust-driven conversion",
    hero: "Pair product specs, warranty messaging, and local support in one high-converting setup.",
    description: "Use comparison rows, trust badges, and support messaging for fast-moving gadgets and accessories.",
    storeName: "Volt Cart",
    announcement: "Launch bundle: free cable organizer with every smart device order",
    sectionLabel: "Specs and support",
    products: [
      { name: "Noise Cancel Earbuds", price: "BDT 3,490", tag: "12-mo warranty" },
      { name: "MagSafe Power Bank", price: "BDT 2,350", tag: "Fast charge" },
      { name: "Smart Desk Lamp", price: "BDT 1,980", tag: "Work setup" },
    ],
    support: "Warranty, cash on delivery, and support-first trust panel",
  },
} as const;

const onboardingSteps = [
  {
    id: 1,
    title: "Choose a site type",
    description: "Pick a launch style with demo products and sections that match the business.",
    icon: Store,
  },
  {
    id: 2,
    title: "Add your brand",
    description: "Update the store name, hero message, and announcement bar to match the merchant.",
    icon: WandSparkles,
  },
  {
    id: 3,
    title: "Tune colors and fonts",
    description: "Preview how the same storefront changes with a different palette and typography direction.",
    icon: Palette,
  },
  {
    id: 4,
    title: "Connect and publish",
    description: "Show launch readiness, payment setup, and the custom domain before going live.",
    icon: Rocket,
  },
] as const;

type ThemeKey = keyof typeof colorThemes;
type FontKey = keyof typeof fontThemes;
type SiteKey = keyof typeof siteProfiles;

function getMarketingPreviewStoreUrl(slug: string) {
  const directUrl = absoluteStoreUrl({ slug });
  const configuredRootDomain = (
    process.env.NEXT_PUBLIC_STORE_SUBDOMAIN_BASE_DOMAIN ||
    process.env.NEXT_PUBLIC_CMS_ROOT_DOMAIN ||
    ""
  )
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .trim();

  const siteHost = (process.env.NEXT_PUBLIC_SITE_URL || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .trim();

  const previewBaseDomain =
    configuredRootDomain && configuredRootDomain !== "localhost" && configuredRootDomain !== "127.0.0.1"
      ? configuredRootDomain
      : siteHost && siteHost !== "localhost" && siteHost !== "127.0.0.1"
        ? siteHost
        : "commerce-engine.local";

  if (directUrl.includes("localhost") || directUrl.includes("127.0.0.1") || directUrl.includes("/stores/")) {
    return `https://${encodeURIComponent(slug)}.${previewBaseDomain}`;
  }

  return directUrl;
}

export function CmsLandingPage({ children }: { children?: React.ReactNode }) {
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("emerald");
  const [activeFont, setActiveFont] = useState<FontKey>("modern");
  const [siteType, setSiteType] = useState<SiteKey>("fashion");
  const [storeName, setStoreName] = useState("Trendy Closet");
  const [announcementText, setAnnouncementText] = useState("20% off launch week with code NEWDROP");
  const [heroHeading, setHeroHeading] = useState("Dress the launch like it already belongs on a billboard.");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [currentStep, setCurrentStep] = useState<(typeof onboardingSteps)[number]["id"]>(1);
  const [paymentMode, setPaymentMode] = useState<"manual" | "hybrid">("manual");
  const [domainConnected, setDomainConnected] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const theme = colorThemes[activeTheme];
  const fontTheme = fontThemes[activeFont];
  const siteProfile = siteProfiles[siteType];
  const previewSlug = createStoreSlug(storeName || siteProfile.storeName);
  const previewStoreUrl = getMarketingPreviewStoreUrl(previewSlug);

  const setupProgress = useMemo(() => {
    let score = 25;
    if (storeName.trim() !== "") score += 20;
    if (heroHeading.trim() !== "") score += 20;
    if (announcementText.trim() !== "") score += 10;
    if (paymentMode) score += 10;
    if (domainConnected) score += 15;
    return Math.min(score, 100);
  }, [announcementText, domainConnected, heroHeading, paymentMode, storeName]);

  const applySiteProfile = (nextSite: SiteKey) => {
    const profile = siteProfiles[nextSite];
    setSiteType(nextSite);
    setStoreName(profile.storeName);
    setAnnouncementText(profile.announcement);
    setHeroHeading(profile.hero);
    setDomainConnected(true);
    setCurrentStep(1);
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-950 text-white selection:bg-emerald-400 selection:text-slate-950">
      <div className={`pointer-events-none absolute left-[-8%] top-[4%] h-[480px] w-[480px] rounded-full ${theme.glow} blur-[110px] opacity-40 transition-all duration-700 animate-float-orb-1`} />
      <div className="pointer-events-none absolute right-[-10%] top-[18%] h-[560px] w-[560px] rounded-full bg-indigo-500/12 blur-[130px] opacity-30 animate-float-orb-2" />
      <div className="pointer-events-none absolute bottom-[8%] left-[20%] h-[380px] w-[380px] rounded-full bg-white/5 blur-[120px] opacity-20" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,#000_65%,transparent_100%)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3 text-white">
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black shadow-lg ${theme.primary}`}>
              C
            </div>
            <div>
              <p className="font-heading text-lg font-extrabold tracking-[0.18em]">COMMERCE ENGINE</p>
              <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-400">CMS launch studio</p>
            </div>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-zinc-300 md:flex">
            <a href="#builder" className="nav-link-anim pb-1 hover:text-white">Guided Demo</a>
            <a href="#why" className="nav-link-anim pb-1 hover:text-white">Why it converts</a>
            <a href="#plans" className="nav-link-anim pb-1 hover:text-white">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/admin/login" className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-white">
              Login
            </Link>
            <Link href="/signup" className={`rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 ${theme.primary} ${theme.button}`}>
              Start Building
            </Link>
          </div>
        </nav>
      </header>

      <section id="builder" className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-12">
        <div className="grid items-start gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6 lg:sticky lg:top-28">
            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold ${theme.border} ${theme.accent} ${theme.primaryText}`}>
              <Sparkles className="h-4 w-4" />
              Guided CMS launch walkthrough
            </div>

            <div className="space-y-4">
              <h1 className="font-heading text-4xl font-extrabold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
                Show merchants how the site comes together
                <span className="block bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
                  in one clean interactive story.
                </span>
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
                This landing page now walks through a single flow: choose a site type, add brand content, preview colors and typography, then publish with payments and a domain.
              </p>
            </div>

            <div className="grid gap-3">
              {onboardingSteps.map((step) => {
                const Icon = step.icon;
                const active = currentStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setCurrentStep(step.id)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      active
                        ? `${theme.border} bg-white/8 shadow-[0_18px_45px_rgba(0,0,0,0.2)]`
                        : "border-white/8 bg-slate-900/40 hover:border-white/15 hover:bg-slate-900/60"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${active ? theme.accent : "bg-white/5"} ${active ? theme.primaryText : "text-zinc-400"}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Step {step.id}</span>
                          {active ? <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${theme.chip}`}>Live</span> : null}
                        </div>
                        <h2 className="font-heading text-lg font-bold text-white">{step.title}</h2>
                        <p className="text-sm leading-relaxed text-zinc-400">{step.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link href="/signup" className={`inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 ${theme.primary} ${theme.button}`}>
                Build this for a merchant
              </Link>
              <a href="#plans" className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-8 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10">
                See packages
              </a>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/55 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
              <div className="grid gap-5 lg:grid-cols-[1.02fr_1.18fr]">
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                    <Settings2 className="h-4 w-4" />
                    Builder controls
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Site type preview</label>
                    <div className={`rounded-2xl border bg-slate-950/80 p-3 ${theme.border}`}>
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-white">Demo storefront pack</p>
                          <p className="text-xs text-zinc-500">Switch the business type and preview a different structure instantly.</p>
                        </div>
                        <div className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${theme.chip}`}>
                          {siteProfile.badge}
                        </div>
                      </div>
                      <div className="relative">
                        <select
                          value={siteType}
                          onChange={(e) => applySiteProfile(e.target.value as SiteKey)}
                          className={`w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-sm font-semibold text-white outline-none ring-0 transition focus:border-white/20 focus:ring-2 ${theme.ring}`}
                        >
                          {Object.entries(siteProfiles).map(([key, profile]) => (
                            <option key={key} value={key} className="bg-slate-950 text-white">
                              {profile.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-zinc-500" />
                      </div>
                      <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.04] p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{siteProfile.tagline}</p>
                        <p className="mt-2 text-sm font-bold text-white">{siteProfile.name}</p>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-400">{siteProfile.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Store name</label>
                      <input
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        onFocus={() => setCurrentStep(2)}
                        className={`w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:ring-2 ${theme.ring}`}
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Hero message</label>
                      <textarea
                        value={heroHeading}
                        onChange={(e) => setHeroHeading(e.target.value)}
                        onFocus={() => setCurrentStep(2)}
                        rows={3}
                        className={`w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:ring-2 ${theme.ring}`}
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Announcement bar</label>
                      <input
                        type="text"
                        value={announcementText}
                        onChange={(e) => setAnnouncementText(e.target.value)}
                        onFocus={() => setCurrentStep(2)}
                        className={`w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:ring-2 ${theme.ring}`}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        <Palette className="h-3.5 w-3.5" />
                        Color system
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(colorThemes).map(([name, palette]) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              setActiveTheme(name as ThemeKey);
                              setCurrentStep(3);
                            }}
                            className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-all ${
                              activeTheme === name ? `${palette.border} bg-white/10 text-white` : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                            }`}
                          >
                            <span className={`h-3 w-3 rounded-full ${palette.primary}`} />
                            {palette.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        <Type className="h-3.5 w-3.5" />
                        Typography mood
                      </label>
                      <div className="grid gap-2">
                        {Object.entries(fontThemes).map(([name, font]) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              setActiveFont(name as FontKey);
                              setCurrentStep(3);
                            }}
                            className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-all ${
                              activeFont === name ? `${theme.border} bg-white/10 text-white` : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                            }`}
                          >
                            <span className={`block text-sm font-bold text-white ${font.hero}`}>{font.name}</span>
                            <span className="block pt-0.5 text-[11px] text-zinc-500">Preview the same page with a different brand voice.</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">Launch settings</p>
                        <p className="text-xs text-zinc-500">Show the last part of the merchant story before publish.</p>
                      </div>
                      <div className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${setupProgress === 100 ? "bg-green-500/15 text-green-300" : theme.chip}`}>
                        {setupProgress}% ready
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Payments</label>
                        <div className="mt-2 flex gap-2">
                          {[
                            { value: "manual", label: "Manual bKash" },
                            { value: "hybrid", label: "COD + bKash" },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setPaymentMode(option.value as "manual" | "hybrid");
                                setCurrentStep(4);
                              }}
                              className={`rounded-full border px-3 py-2 text-xs font-semibold transition-all ${
                                paymentMode === option.value ? `${theme.border} bg-white/10 text-white` : "border-white/10 bg-white/5 text-zinc-400"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Custom domain</label>
                        <button
                          type="button"
                          onClick={() => {
                            setDomainConnected((value) => !value);
                            setCurrentStep(4);
                          }}
                          className={`mt-2 flex w-full items-center justify-between rounded-xl border px-3 py-3 text-sm transition-all ${
                            domainConnected ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-white/10 bg-white/5 text-zinc-300"
                          }`}
                        >
                          <span>{domainConnected ? `${previewStoreUrl.replace(/^https?:\/\//, "")} connected` : "Domain still in platform preview mode"}</span>
                          <CheckCircle2 className={`h-4 w-4 ${domainConnected ? "text-green-300" : "text-zinc-500"}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 p-2.5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Live storefront preview</p>
                      <p className="text-sm font-bold text-white">{siteProfile.name}</p>
                    </div>
                    <div className="flex gap-1.5 rounded-xl border border-white/5 bg-black/20 p-1">
                      <button
                        type="button"
                        onClick={() => setPreviewDevice("desktop")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                          previewDevice === "desktop" ? `${theme.primary} text-white` : "text-zinc-500 hover:text-white"
                        }`}
                      >
                        <Monitor className="h-3.5 w-3.5" />
                        Desktop
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice("mobile")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                          previewDevice === "mobile" ? `${theme.primary} text-white` : "text-zinc-500 hover:text-white"
                        }`}
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                        Mobile
                      </button>
                    </div>
                  </div>

                  <div
                    className={`overflow-hidden rounded-[2rem] border-2 bg-[#030610] shadow-[0_24px_70px_rgba(0,0,0,0.45)] transition-all duration-500 ${theme.border} ${
                      previewDevice === "mobile" ? "mx-auto max-w-[355px]" : "w-full"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-white/5 bg-slate-900/90 px-4 py-3">
                      <div className="flex gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                      </div>
                      <div className="w-1/2 truncate rounded-md border border-white/5 bg-slate-950/80 px-3 py-0.5 text-center font-mono text-[10px] text-zinc-500">
                        {previewStoreUrl}
                      </div>
                      <div className="w-10" />
                    </div>

                    {announcementText.trim() ? (
                      <div className={`px-4 py-2 text-center text-xs font-bold text-white ${theme.primary}`}>
                        {announcementText}
                      </div>
                    ) : null}

                    <div className="border-b border-white/5 bg-[#040915]/70 px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-bold text-white ${fontTheme.brand} ${fontTheme.accentClass}`}>
                            {storeName || siteProfile.storeName}
                          </p>
                          <p className="pt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">{siteProfile.sectionLabel}</p>
                        </div>
                        <div className="flex gap-4 text-[11px] font-medium text-zinc-400">
                          <span>Shop</span>
                          <span>Story</span>
                          <span>Support</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 p-5">
                      <div className={`relative overflow-hidden rounded-[1.75rem] border border-white/8 bg-gradient-to-br ${theme.heroSurface}`}>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_35%)]" />
                        <div className="relative grid gap-6 px-5 py-6 sm:grid-cols-[1.05fr_0.95fr] sm:px-6">
                          <div className="space-y-4">
                            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${theme.chip}`}>
                              <Sparkles className="h-3 w-3" />
                              {siteProfile.badge}
                            </div>
                            <div className="space-y-3">
                              <h3 className={`text-2xl font-bold text-white transition-all duration-500 sm:text-[2rem] ${fontTheme.hero}`}>
                                {heroHeading || siteProfile.hero}
                              </h3>
                              <p className="max-w-md text-sm leading-relaxed text-zinc-300">
                                {siteProfile.description}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${theme.chip}`}>Theme: {theme.name}</span>
                              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-zinc-200">{fontTheme.name}</span>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-1">
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Section focus</p>
                              <p className="mt-2 text-sm font-bold text-white">{siteProfile.sectionLabel}</p>
                              <p className="mt-2 text-xs leading-relaxed text-zinc-400">{siteProfile.support}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Launch URL</p>
                              <p className="mt-2 text-sm font-bold text-white">{previewStoreUrl.replace(/^https?:\/\//, "")}</p>
                              <p className="mt-2 text-xs text-zinc-400">{paymentMode === "hybrid" ? "COD and manual payment enabled" : "Manual payment verification ready"}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        {siteProfile.products.map((product) => (
                          <article key={product.name} className="rounded-2xl border border-white/8 bg-slate-900/60 p-3.5 transition hover:border-white/15">
                            <div className={`mb-3 flex aspect-[4/5] items-end rounded-xl bg-gradient-to-br ${theme.heroSurface} p-3`}>
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${theme.chip}`}>{product.tag}</span>
                            </div>
                            <div className="space-y-1.5">
                              <p className={`text-sm font-semibold text-white ${fontTheme.brand}`}>{product.name}</p>
                              <p className={`text-xs font-bold ${theme.primaryText}`}>{product.price}</p>
                              <button className={`mt-2 w-full rounded-lg px-3 py-2 text-[11px] font-bold text-white transition ${theme.primary}`}>
                                Add to cart
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4 text-center">
                        <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-3">
                          <div className="text-[11px] font-bold text-white">Fast shipping</div>
                          <div className="pt-1 text-[10px] text-zinc-500">Dhaka and nationwide</div>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-3">
                          <div className="text-[11px] font-bold text-white">Trusted checkout</div>
                          <div className="pt-1 text-[10px] text-zinc-500">{paymentMode === "hybrid" ? "COD + bKash flow" : "Manual TrxID review"}</div>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-3">
                          <div className="text-[11px] font-bold text-white">Easy support</div>
                          <div className="pt-1 text-[10px] text-zinc-500">Policy and WhatsApp prompts</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-white/10 bg-[#060a12] p-5 shadow-2xl">
                    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Launch readiness</p>
                        <h3 className="font-heading text-lg font-bold text-white">One story from setup to publish</h3>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${setupProgress === 100 ? "bg-green-500/10 text-green-300" : theme.chip}`}>
                        {setupProgress}% ready
                      </span>
                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/5">
                      <div className={`h-full rounded-full transition-all duration-500 ${theme.primary}`} style={{ width: `${setupProgress}%` }} />
                    </div>

                    <div className="mt-5 grid gap-3">
                      {[
                        { label: "Template selected", value: siteProfile.name, done: true },
                        { label: "Brand content updated", value: storeName, done: storeName.trim().length > 0 && heroHeading.trim().length > 0 },
                        { label: "Visual system chosen", value: `${theme.name} + ${fontTheme.name}`, done: true },
                        { label: "Launch settings ready", value: domainConnected ? `${previewStoreUrl.replace(/^https?:\/\//, "")} live` : "Waiting on custom domain", done: domainConnected },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs">
                          <span className="flex items-center gap-3">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full ${item.done ? "bg-green-500/15 text-green-300" : "bg-white/5 text-zinc-500"}`}>
                              {item.done ? <Check className="h-3.5 w-3.5" /> : "•"}
                            </span>
                            <span className="font-semibold text-white">{item.label}</span>
                          </span>
                          <span className="text-zinc-500">{item.value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                      <p className="text-sm font-bold text-white">What changed in this pass</p>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                        The old split experience is now a single guided story, the preview URL looks like a real branded subdomain, and the landing page carries stronger sales sections around trust, use cases, and proof.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="relative z-10 mx-auto max-w-6xl px-4 py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-6">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${theme.chip}`}>
              <BadgeCheck className="h-3.5 w-3.5" />
              Conversion-focused structure
            </span>
            <h2 className="font-heading text-3xl font-extrabold text-white sm:text-4xl">
              The homepage now explains both the CMS workflow and the visual outcome.
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400 sm:text-base">
              Instead of showing disconnected demos, the landing page tells a merchant-friendly story: start with a business type, shape the brand, see the storefront react, and finish with launch readiness.
            </p>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.accent} ${theme.primaryText}`}>
                  <Layout className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Site-type dropdown with demo data</h3>
                  <p className="mt-0.5 text-xs text-zinc-500">Fashion, skincare, bakery, and electronics now preview different messaging, products, and support structure.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.accent} ${theme.primaryText}`}>
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Realer visual customization</h3>
                  <p className="mt-0.5 text-xs text-zinc-500">Color and typography shifts now change the preview in a way that feels brand-led instead of purely technical.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.accent} ${theme.primaryText}`}>
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Cleaner publish story</h3>
                  <p className="mt-0.5 text-xs text-zinc-500">The readiness panel ties together domain setup, payment choice, and content completion in one visible finish line.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Palette,
                title: "Theme packs",
                body: "Swap palettes quickly and let the preview carry the change through hero surfaces, badges, buttons, and accents.",
              },
              {
                icon: Type,
                title: "Typography moods",
                body: "Preview modern, editorial, and campaign-driven looks to show how a merchant can change personality fast.",
              },
              {
                icon: CreditCard,
                title: "Local payment setup",
                body: "Keep bKash and COD visible in the onboarding story so setup feels practical, not just cosmetic.",
              },
              {
                icon: Star,
                title: "Trust-first layout",
                body: "Sections emphasize support, policy clarity, and social proof so the storefront story ends in conversion confidence.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[1.5rem] border border-white/8 bg-slate-900/35 p-6 transition-all hover:border-white/15 hover:bg-slate-900/55">
                  <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${theme.accent} ${theme.primaryText}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/40 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-4">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${theme.chip}`}>
                <Clock3 className="h-3.5 w-3.5" />
                Day-one outcome
              </span>
              <h2 className="font-heading text-3xl font-extrabold text-white sm:text-4xl">
                The page should sell the business upgrade, not just the UI.
              </h2>
              <p className="text-sm leading-relaxed text-zinc-400 sm:text-base">
                Merchants need to understand what they actually get after signup. This section makes the outcome concrete before pricing ever appears.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {dayOneItems.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${theme.accent} ${theme.primaryText}`}>
                    <Check className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-white">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-24">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${theme.chip}`}>
              <Layout className="h-3.5 w-3.5" />
              Built for different businesses
            </span>
            <h2 className="font-heading text-3xl font-extrabold text-white sm:text-4xl">
              Show merchants that the CMS already speaks their category.
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400 sm:text-base">
              A stronger landing page helps visitors recognize themselves quickly. These use cases turn the dropdown preview into a broader sales argument.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {useCases.map((useCase) => (
            <article key={useCase.title} className="rounded-[1.6rem] border border-white/8 bg-slate-900/35 p-6 transition hover:-translate-y-1 hover:border-white/15 hover:bg-slate-900/55">
              <h3 className="font-heading text-lg font-bold text-white">{useCase.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{useCase.body}</p>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{useCase.fit}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-[1.5rem] border border-white/8 bg-slate-900/35 p-6 transition hover:border-white/15 hover:bg-slate-900/50">
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${theme.accent} ${theme.primaryText}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{item.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-24">
        <div className="mb-10 max-w-2xl space-y-3">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${theme.chip}`}>
            <MessageSquareQuote className="h-3.5 w-3.5" />
            Social proof
          </span>
          <h2 className="font-heading text-3xl font-extrabold text-white sm:text-4xl">
            A testimonial section belongs on this page.
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400 sm:text-base">
            The interactive demo proves possibility. Testimonials prove trust. Together they make the offer feel safer to buy.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.2fr_0.9fr]">
          {testimonials.map((testimonial, index) => (
            <article
              key={testimonial.name}
              className={`rounded-[1.8rem] border p-6 transition ${
                index === 1
                  ? `${theme.border} bg-white/[0.08] shadow-[0_22px_70px_rgba(0,0,0,0.24)]`
                  : "border-white/8 bg-slate-900/35 hover:border-white/15"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${index === 1 ? theme.primary : "bg-white/10"} text-white`}>
                  <Crown className="h-4.5 w-4.5" />
                </div>
                <p className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${index === 1 ? theme.chip : "bg-white/8 text-zinc-300"}`}>
                  {testimonial.result}
                </p>
              </div>
              <p className="mt-5 text-base leading-relaxed text-white">
                "{testimonial.quote}"
              </p>
              <div className="mt-6">
                <p className="text-sm font-bold text-white">{testimonial.name}</p>
                <p className="text-xs text-zinc-500">{testimonial.role}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {children}

      <section className="relative z-10 mx-auto max-w-4xl px-4 py-24">
        <div className="mb-12 space-y-3 text-center">
          <h2 className="font-heading text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
          <p className="text-sm text-zinc-400">Clear answers about setup, domains, and how the CMS experience is presented.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={faq.q} className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 transition-all duration-300">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="flex w-full items-center justify-between p-5 text-left text-sm font-bold text-white transition-all hover:bg-white/[0.02]"
              >
                <span className="flex items-center gap-3">
                  <HelpCircle className={`h-4.5 w-4.5 shrink-0 ${theme.primaryText}`} />
                  {faq.q}
                </span>
                <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform duration-300 ${openFaq === idx ? "rotate-180 text-white" : ""}`} />
              </button>

              <div className={`overflow-hidden transition-all duration-500 ${openFaq === idx ? "max-h-40 border-t border-white/5 bg-slate-950/40" : "max-h-0"}`}>
                <p className="p-5 text-xs leading-relaxed text-zinc-400 sm:text-sm">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-20">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#050810] p-12 text-center shadow-[0_28px_90px_rgba(0,0,0,0.4)]">
          <div className={`absolute -inset-8 rounded-[2rem] ${theme.glow} blur-3xl opacity-35`} />
          <div className="relative z-10 space-y-6">
            <h2 className="font-heading text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              Ready to turn this landing page into a stronger sales demo?
            </h2>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-zinc-400">
              Merchants should be able to understand the setup, feel the design flexibility, and trust the launch workflow within the first scroll. This version gets much closer.
            </p>
            <div className="flex justify-center gap-4 pt-2">
              <Link href="/signup" className={`rounded-full px-8 py-3.5 text-sm font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 ${theme.primary} ${theme.button}`}>
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 bg-slate-950 py-12 text-center text-xs text-zinc-500">
        <div className="mx-auto max-w-6xl space-y-6 px-4">
          <p className="font-heading text-sm font-extrabold tracking-[0.22em] text-white">COMMERCE ENGINE</p>
          <p className="mx-auto max-w-md text-zinc-500">
            A white-label ecommerce CMS built for launch-ready storefronts, operational clarity, and easier merchant onboarding.
          </p>
          <p className="border-t border-white/5 pt-4 text-[10px]">
            &copy; {new Date().getFullYear()} Commerce Engine. Built for modern digital commerce.
          </p>
        </div>
      </footer>
    </main>
  );
}
