"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { createStoreSlug } from "@/lib/slug";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { PLATFORM_BRAND_NAME, PLATFORM_PRIMARY_DOMAIN } from "@/lib/platform/site-config";
import {
  ArrowRight,
  ArrowRightLeft,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Crown,
  CreditCard,
  Globe,
  Home,
  HelpCircle,
  Layout,
  MessageSquareQuote,
  Monitor,
  Moon,
  PackageCheck,
  Palette,
  PanelTop,
  Rocket,
  Settings2,
  ShieldCheck,
  Sliders,
  Sparkles,
  Smartphone,
  Star,
  Store,
  Sun,
  ShoppingBag,
  Tag,
  Type,
  WandSparkles,
} from "lucide-react";

const faqs = [
  {
    q: "How do manual bKash payments work?",
    a: "Customers see your payment number and instructions at checkout. They submit a TrxID, and you confirm the order from the dashboard.",
  },
  {
    q: "Can I connect my own custom domain?",
    a: "Yes. Add your domain in store settings and the platform handles SSL and routing.",
  },
  {
    q: "Do I need coding skills to design pages?",
    a: "No. You can update sections, colors, and fonts without writing code.",
  },
  {
    q: "How fast can a store go live?",
    a: "Pick a template, add your brand, connect payments, and publish in a simple guided flow.",
  },
];

const testimonials = [
  {
    quote: "We moved from inbox orders to a store that people trusted right away.",
    name: "Nadia Rahman",
    role: "Founder, Luna Skin Lab",
    result: "Launched in one evening",
  },
  {
    quote: "We can update a campaign page in minutes. New drop, new look, done.",
    name: "Mahin Islam",
    role: "Operator, Trendy Closet",
    result: "Campaign pages update in minutes",
  },
  {
    quote: "The payment flow made our business feel much more professional.",
    name: "Tanzim Hasan",
    role: "Owner, Volt Cart",
    result: "Clearer checkout, fewer support messages",
  },
] as const;

const useCases = [
  {
    title: "Fashion drops",
    body: "Show new arrivals, best sellers, and campaign banners in one clean storefront.",
    fit: "Ideal for apparel, accessories, and lifestyle labels",
  },
  {
    title: "Skincare routines",
    body: "Guide shoppers from skin concern to product bundle with clear trust-first content.",
    fit: "Ideal for skincare, beauty, and wellness brands",
  },
  {
    title: "Bakery menus",
    body: "Highlight daily items, pre-orders, and gift boxes with a warm storefront.",
    fit: "Ideal for bakeries, gift shops, and food brands",
  },
  {
    title: "Electronics stores",
    body: "Show specs, warranty, and support details so buyers feel safe before checkout.",
    fit: "Ideal for gadgets, accessories, and home tech",
  },
] as const;

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Trust-ready storefronts",
    body: "Support, policy, and payment details are visible from day one.",
  },
  {
    icon: CreditCard,
    title: "Local payment fit",
    body: "Show bKash, Nagad, and cash on delivery early in the setup.",
  },
  {
    icon: Globe,
    title: "Real domain presence",
    body: "Show the branded store URL before the merchant signs up.",
  },
  {
    icon: PackageCheck,
    title: "Operational confidence",
    body: "The flow previews the real result: products, orders, and launch controls.",
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

const beforeAfterItems = [
  {
    before: "Inbox orders, manual replies, and repeated payment questions.",
    after: "A real store with clear pages, payment steps, and easier checkout.",
  },
  {
    before: "Every campaign starts from scratch.",
    after: "One CMS setup makes every new campaign faster to launch.",
  },
] as const;

const comparisonRows = [
  {
    label: "Looks like a real brand",
    inbox: "Depends on posts and chat screenshots",
    generic: "Possible, but setup is broad and slower",
    commerce: "Designed for launch-ready storefront presentation",
  },
  {
    label: "Local payment communication",
    inbox: "Manual replies every time",
    generic: "Usually needs custom setup",
    commerce: "Visible in the sales flow from day one",
  },
  {
    label: "Campaign page updates",
    inbox: "Repost and explain again",
    generic: "Flexible, but not merchant-guided",
    commerce: "Switch content and themes in a guided flow",
  },
  {
    label: "Order and store operations",
    inbox: "Scattered across chat and notes",
    generic: "Requires more assembly",
    commerce: "Connected to the admin workspace and onboarding",
  },
] as const;

const checklistItems = [
  "Choose your business type",
  "Pick a ready-made style",
  "Add your store name and hero text",
  "Show payment and support details",
  "Preview your branded URL",
  "Continue with editable setup data",
] as const;

const objectionItems = [
  {
    title: "Not technical?",
    body: "The setup is guided, so merchants can move fast without feeling lost.",
  },
  {
    title: "Already selling on Facebook?",
    body: "This feels like an upgrade, not a full reset of how you sell.",
  },
  {
    title: "Need manual payments?",
    body: "Manual payments and COD are part of the flow from the start.",
  },
  {
    title: "Need a custom domain later?",
    body: "You can start with a preview URL and connect your own domain later.",
  },
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
    hero: "Launch a fashion store that already feels ready to shop.",
    description: "Show new drops, featured pieces, and a cleaner product grid.",
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
    hero: "Turn product trust into a simple skincare buying flow.",
    description: "Show ingredients, routines, and bundles in a clear way.",
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
    hero: "Turn daily menus and gift boxes into a store people can order from fast.",
    description: "Show delivery windows, popular picks, and celebration bundles.",
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
    hero: "Sell gadgets with clearer specs, support, and trust.",
    description: "Show warranty, support, and key product details in one place.",
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
    description: "Pick a layout that matches the business.",
    icon: Store,
  },
  {
    id: 2,
    title: "Add your brand",
    description: "Add the store name, hero text, and announcement.",
    icon: WandSparkles,
  },
  {
    id: 3,
    title: "Tune colors and fonts",
    description: "Try a different palette and font style.",
    icon: Palette,
  },
  {
    id: 4,
    title: "Connect and publish",
    description: "Check payments, domain, and launch status.",
    icon: Rocket,
  },
] as const;

const refinementHighlights = [
  "Pick a business with ready demo content",
  "Change the look in one tap",
  "Preview desktop and mobile before signup",
] as const;

const mobileExperiencePoints = [
  "Thumb-friendly controls",
  "Readable stacked preview",
  "Always-visible CTA",
] as const;

type ThemeKey = keyof typeof colorThemes;
type FontKey = keyof typeof fontThemes;
type SiteKey = keyof typeof siteProfiles;
type PreviewPageKey = "home" | "shop" | "offers" | "account";

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
        : PLATFORM_PRIMARY_DOMAIN;

  if (directUrl.includes("localhost") || directUrl.includes("127.0.0.1") || directUrl.includes("/stores/")) {
    return `https://${encodeURIComponent(slug)}.${previewBaseDomain}`;
  }

  return directUrl;
}

export function CmsLandingPage({ children }: { children?: React.ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [isThemeMounted, setIsThemeMounted] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("emerald");
  const [activeFont, setActiveFont] = useState<FontKey>("modern");
  const [siteType, setSiteType] = useState<SiteKey>("fashion");
  const [storeName, setStoreName] = useState("Trendy Closet");
  const [announcementText, setAnnouncementText] = useState("20% off launch week with code NEWDROP");
  const [heroHeading, setHeroHeading] = useState("Launch a store that feels ready to shop.");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("mobile");
  const [previewPage, setPreviewPage] = useState<PreviewPageKey>("home");
  const [currentStep, setCurrentStep] = useState<(typeof onboardingSteps)[number]["id"]>(1);
  const [paymentMode, setPaymentMode] = useState<"manual" | "hybrid">("manual");
  const [domainConnected, setDomainConnected] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [cartCount, setCartCount] = useState(1);

  useEffect(() => {
    setIsThemeMounted(true);
  }, []);

  const theme = colorThemes[activeTheme];
  const fontTheme = fontThemes[activeFont];
  const siteProfile = siteProfiles[siteType];
  const previewSlug = createStoreSlug(storeName || siteProfile.storeName);
  const previewStoreUrl = getMarketingPreviewStoreUrl(previewSlug);
  const isLightTheme = isThemeMounted ? resolvedTheme === "light" : false;
  const previewNavItems = [
    { key: "home", label: "Home", icon: Home },
    { key: "shop", label: "Shop", icon: ShoppingBag },
    { key: "offers", label: "Offers", icon: Tag },
    { key: "account", label: "Account", icon: Store },
  ] as const;
  const offerHighlights = [
    announcementText.trim() || siteProfile.announcement,
    `${paymentMode === "hybrid" ? "COD + manual payment" : "Manual payment"} ready for launch`,
    domainConnected ? `${previewSlug}.${PLATFORM_PRIMARY_DOMAIN} looks branded from day one` : "Start with the preview link and connect your domain later",
  ];
  const customerProfile = {
    name: siteType === "fashion" ? "Nadia Rahman" : siteType === "skincare" ? "Sadia Karim" : siteType === "bakery" ? "Mehedi Hasan" : "Tanzim Ahmed",
    email: siteType === "fashion" ? "nadia@example.com" : siteType === "skincare" ? "sadia@example.com" : siteType === "bakery" ? "mehedi@example.com" : "tanzim@example.com",
    location: siteType === "electronics" ? "Dhaka Cantonment" : "Dhanmondi, Dhaka",
  };
  const accountHighlights = [
    { label: "Customer", value: customerProfile.name },
    { label: "Email", value: customerProfile.email },
    { label: "Delivery area", value: customerProfile.location },
    { label: "Payment", value: paymentMode === "hybrid" ? "Cash on delivery + bKash" : "Manual payment after order" },
  ];
  const cartItems = siteProfile.products.slice(0, Math.min(cartCount, siteProfile.products.length));
  const pageShell = isLightTheme
    ? "bg-stone-100 text-slate-950 selection:bg-emerald-500 selection:text-white"
    : "bg-slate-950 text-white selection:bg-emerald-400 selection:text-slate-950";
  const headerShell = isLightTheme
    ? "border-white/50 bg-white/45 shadow-[0_22px_55px_rgba(15,23,42,0.10)]"
    : "border-white/10 bg-slate-950/38 shadow-[0_22px_55px_rgba(0,0,0,0.28)]";
  const panelShell = isLightTheme
    ? "border-slate-300/70 bg-white/88 text-slate-950"
    : "border-white/8 bg-slate-900/45 text-white";
  const mutedText = isLightTheme ? "text-slate-600" : "text-zinc-400";
  const subtleText = isLightTheme ? "text-slate-500" : "text-zinc-500";
  const sectionBadge = isLightTheme
    ? "border border-slate-300 bg-white text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
    : "border border-white/10 bg-slate-900/75 text-white";
  const fieldLabelText = isLightTheme ? "text-slate-700" : "text-zinc-500";
  const previewShell = isLightTheme
    ? "bg-white border-slate-300/80 shadow-[0_20px_60px_rgba(15,23,42,0.12)]"
    : "bg-[#030610] border-white/8 shadow-[0_24px_70px_rgba(0,0,0,0.45)]";
  const sandboxShell = isLightTheme
    ? "border-slate-200 bg-white/92 shadow-[0_28px_80px_rgba(15,23,42,0.10)]"
    : "border-white/8 bg-slate-900/45 shadow-[0_28px_80px_rgba(0,0,0,0.28)]";
  const sandboxCard = isLightTheme
    ? "border-slate-200 bg-slate-50/95 text-slate-950"
    : "border-white/10 bg-slate-950/50 text-white";
  const sandboxSoftCard = isLightTheme
    ? "border-slate-200 bg-white text-slate-950"
    : "border-white/8 bg-[#060a12] text-white";

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
    <main className={`relative min-h-screen overflow-x-hidden ${pageShell}`}>
      <div className={`pointer-events-none absolute left-[-8%] top-[4%] h-[480px] w-[480px] rounded-full ${theme.glow} blur-[110px] ${isLightTheme ? "opacity-25" : "opacity-40"} transition-all duration-700 animate-float-orb-1`} />
      <div className={`pointer-events-none absolute right-[-10%] top-[18%] h-[560px] w-[560px] rounded-full blur-[130px] animate-float-orb-2 ${isLightTheme ? "bg-indigo-500/8 opacity-20" : "bg-indigo-500/12 opacity-30"}`} />
      <div className={`pointer-events-none absolute bottom-[8%] left-[20%] h-[380px] w-[380px] rounded-full blur-[120px] ${isLightTheme ? "bg-slate-300/30 opacity-30" : "bg-white/5 opacity-20"}`} />
      <div className={`pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] ${isLightTheme ? "opacity-[0.08]" : "opacity-30"} [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,#000_65%,transparent_100%)]`} />

      <header className={`sticky top-0 z-50 border-b backdrop-blur-3xl supports-[backdrop-filter]:bg-opacity-60 ${headerShell}`}>
        <nav className={`mx-auto mt-3 flex h-[4.6rem] max-w-6xl items-center justify-between gap-3 rounded-[1.7rem] border px-4 sm:px-5 ${
          isLightTheme
            ? "border-white/60 bg-white/40"
            : "border-white/10 bg-white/[0.04]"
        }`}>
          <Link href="/" className={`flex items-center gap-3 ${isLightTheme ? "text-slate-950" : "text-white"}`}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black shadow-lg ${theme.primary}`}>
              EZ
            </div>
            <div>
              <p className="font-heading text-lg font-extrabold tracking-[0.18em]">{PLATFORM_BRAND_NAME.toUpperCase()}</p>
              <p className={`text-[11px] uppercase tracking-[0.28em] ${subtleText}`}>{PLATFORM_PRIMARY_DOMAIN}</p>
            </div>
          </Link>

          <div className={`hidden items-center gap-8 text-sm font-medium md:flex ${isLightTheme ? "text-slate-600" : "text-zinc-300"}`}>
            <a href="#builder" className="nav-link-anim pb-1 hover:text-current">Guided Demo</a>
            <a href="#templates" className="nav-link-anim pb-1 hover:text-current">Use Cases</a>
            <a href="#why" className="nav-link-anim pb-1 hover:text-current">Why it converts</a>
            <Link href="/stories" className="nav-link-anim pb-1 hover:text-current">Stories</Link>
            <a href="#plans" className="nav-link-anim pb-1 hover:text-current">Pricing</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setTheme(isLightTheme ? "dark" : "light")}
              aria-label="Toggle color mode"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                isLightTheme
                  ? "border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-100"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {isLightTheme ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
            </button>
            <Link href="/admin/login" className={`hidden rounded-full px-4 py-2 text-sm font-semibold transition sm:inline-flex ${
              isLightTheme ? "border border-slate-300 bg-white/90 text-slate-800 hover:bg-slate-100" : "text-zinc-300 hover:bg-white/5 hover:text-white"
            }`}>
              Login
            </Link>
            <Link href="/signup" className={`inline-flex min-h-11 items-center rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 sm:px-5 ${theme.primary} ${theme.button}`}>
              Start building
            </Link>
          </div>
        </nav>
      </header>

      <section id="builder" className="relative z-10 mx-auto max-w-6xl px-4 pb-14 pt-8 sm:pt-12">
        <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
          <div className="order-2 space-y-5 sm:space-y-6 lg:order-1">
            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold ${theme.border} ${theme.accent} ${theme.primaryText}`}>
              <Sparkles className="h-4 w-4" />
              Interactive preview
            </div>

            <div className="space-y-3 sm:space-y-4">
              <h1 className={`max-w-[12ch] font-heading text-[2.5rem] font-extrabold leading-[0.98] sm:max-w-none sm:text-5xl lg:text-6xl ${isLightTheme ? "text-slate-950" : "text-white"}`}>
                Build a storefront that
                <span className={`block bg-clip-text text-transparent ${isLightTheme ? "bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500" : "bg-gradient-to-r from-white via-zinc-200 to-zinc-500"}`}>
                  feels easy to launch.
                </span>
              </h1>
              <p className={`max-w-xl text-[15px] leading-relaxed sm:text-lg ${mutedText}`}>
                Pick a business type, try the style, and see how your store can look before you sign up.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className={`rounded-2xl border p-4 ${panelShell}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${subtleText}`}>Pick a style</p>
                <p className={`mt-2 text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{siteProfile.name}</p>
              </div>
              <div className={`rounded-2xl border p-4 ${panelShell}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${subtleText}`}>Preview mood</p>
                <p className={`mt-2 text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{theme.name} + {fontTheme.name}</p>
              </div>
              <div className={`rounded-2xl border p-4 ${panelShell}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${subtleText}`}>Ready state</p>
                <p className={`mt-2 text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{setupProgress}% launch-ready</p>
              </div>
            </div>

            <div className={`overflow-hidden rounded-[1.75rem] border ${panelShell}`}>
              <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${isLightTheme ? "border-slate-200/80" : "border-white/8"}`}>
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${subtleText}`}>Studio controls</p>
                  <p className={`text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>Quick ways to shape the page</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${theme.accent} ${theme.primaryText}`}>
                  <PanelTop className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="grid gap-4 p-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <div>
                    <label className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${subtleText}`}>Site type</label>
                    <div className="mt-3 grid gap-2">
                      {Object.entries(siteProfiles).map(([key, profile]) => {
                        const active = siteType === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => applySiteProfile(key as SiteKey)}
                            className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                              active
                                ? `${theme.border} ${theme.accent} shadow-[0_14px_30px_rgba(15,23,42,0.08)]`
                                : isLightTheme
                                  ? "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                  : "border-white/10 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className={`text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{profile.name}</p>
                                <p className={`mt-1 text-xs leading-relaxed ${mutedText}`}>{profile.tagline}</p>
                              </div>
                              <span
                                className={`mt-0.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                  active
                                    ? `${theme.primary} text-white`
                                    : isLightTheme
                                      ? "bg-slate-100 text-slate-600"
                                      : "bg-white/5 text-zinc-400"
                                }`}
                              >
                                {active ? "Selected" : "Preview"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${subtleText}`}>Quick style</label>
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(colorThemes).map(([name, palette]) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setActiveTheme(name as ThemeKey)}
                            className={`h-9 w-9 rounded-full border-2 transition ${palette.primary} ${activeTheme === name ? isLightTheme ? "border-slate-950 scale-105" : "border-white scale-105" : "border-transparent opacity-75"}`}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(fontThemes).map(([name, font]) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setActiveFont(name as FontKey)}
                            className={`rounded-full border px-3 py-2 text-[11px] font-semibold ${
                              activeFont === name
                                ? `${theme.border} ${isLightTheme ? "bg-slate-900 text-white" : "bg-white/10 text-white"}`
                                : isLightTheme
                                  ? "border-slate-300 text-slate-600"
                                  : "border-white/10 text-zinc-400"
                            }`}
                          >
                            {font.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`rounded-[1.4rem] border p-4 ${isLightTheme ? "border-slate-200 bg-slate-50/90" : "border-white/8 bg-white/[0.03]"}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${subtleText}`}>What changes instantly</p>
                  <div className="mt-3 space-y-3">
                    {refinementHighlights.map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${theme.accent} ${theme.primaryText}`}>
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <p className={`text-sm leading-relaxed ${isLightTheme ? "text-slate-800" : "text-zinc-200"}`}>{item}</p>
                      </div>
                    ))}
                  </div>
                  <div className={`mt-4 rounded-2xl border px-3 py-3 ${isLightTheme ? "border-slate-200 bg-white" : "border-white/8 bg-slate-950/40"}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${subtleText}`}>Mobile experience</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {mobileExperiencePoints.map((item) => (
                        <span key={item} className={`rounded-full px-3 py-1 text-[10px] font-semibold ${theme.chip}`}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:gap-4 sm:pt-2">
              <a href="#sandbox" className={`inline-flex min-h-12 w-full items-center justify-center rounded-full px-8 py-3.5 text-sm font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 sm:w-auto ${theme.primary} ${theme.button}`}>
                Try the walkthrough
              </a>
              <a
                href="#plans"
                className={`inline-flex min-h-12 w-full items-center justify-center rounded-full border px-8 py-3.5 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 sm:w-auto ${
                  isLightTheme
                    ? "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                    : "border-white/15 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                See pricing
              </a>
            </div>
          </div>

          <div className="order-1 space-y-4 lg:order-2">
            <div className={`flex flex-col gap-3 rounded-[1.5rem] border p-3 sm:flex-row sm:items-center sm:justify-between ${panelShell}`}>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${subtleText}`}>Live storefront preview</p>
                <p className={`text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{siteProfile.name}</p>
              </div>
              <div className={`grid w-full grid-cols-2 gap-1.5 self-start rounded-xl border p-1 sm:flex sm:w-auto sm:self-auto ${isLightTheme ? "border-slate-300 bg-slate-100" : "border-white/5 bg-black/20"}`}>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                    previewDevice === "desktop" ? `${theme.primary} text-white` : isLightTheme ? "text-slate-500 hover:text-slate-900" : "text-zinc-500 hover:text-white"
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                    previewDevice === "mobile" ? `${theme.primary} text-white` : isLightTheme ? "text-slate-500 hover:text-slate-900" : "text-zinc-500 hover:text-white"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Mobile
                </button>
              </div>
            </div>

            <div
              className={`overflow-hidden rounded-[2rem] border transition-all duration-500 ${previewShell} ${
                previewDevice === "mobile"
                  ? "mx-auto w-full max-w-[356px] sm:max-w-[320px]"
                  : "w-full"
              }`}
            >
              <div className={`border-b px-3 py-2.5 sm:px-4 sm:py-3 ${isLightTheme ? "border-slate-200 bg-slate-50" : "border-white/5 bg-slate-900/90"}`}>
                {previewDevice === "mobile" ? (
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                      isLightTheme ? "bg-white text-slate-700 shadow-sm" : "bg-white/10 text-zinc-100"
                    }`}>
                      <Store className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-xs font-bold ${isLightTheme ? "text-slate-900" : "text-white"}`}>{storeName || siteProfile.storeName}</p>
                      <p className={`truncate text-[10px] ${subtleText}`}>{previewStoreUrl.replace(/^https?:\/\//, "")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewPage("shop")}
                      className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${
                        isLightTheme ? "bg-slate-900 text-white" : "bg-white/10 text-white"
                      }`}
                    >
                      Cart {cartCount}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className={`truncate rounded-md border px-2 py-0.5 text-center font-mono text-[9px] sm:px-3 sm:text-[10px] ${previewDevice === "mobile" ? "w-[58%]" : "w-[45%] sm:w-1/2"} ${isLightTheme ? "border-slate-200 bg-white text-slate-500" : "border-white/5 bg-slate-950/80 text-zinc-500"}`}>
                      {previewStoreUrl}
                    </div>
                    <div className="w-6 sm:w-10" />
                  </div>
                )}
              </div>

              {announcementText.trim() ? (
                <div className={`px-3 py-2 text-center text-[10px] font-bold text-white sm:px-4 sm:text-xs ${theme.primary}`}>
                  {announcementText}
                </div>
              ) : null}

              <div className={`border-b px-3 py-3 sm:px-5 sm:py-4 ${isLightTheme ? "border-slate-200 bg-slate-50/90" : "border-white/5 bg-[#040915]/70"}`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"} ${fontTheme.brand} ${fontTheme.accentClass}`}>
                        {storeName || siteProfile.storeName}
                      </p>
                      <p className={`pt-1 text-[10px] uppercase tracking-[0.18em] ${subtleText}`}>{siteProfile.sectionLabel}</p>
                    </div>
                    <div className={`hidden gap-2 text-[10px] font-medium sm:flex ${mutedText}`}>
                      {previewNavItems.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setPreviewPage(item.key)}
                          className={`rounded-full px-3 py-1.5 transition ${
                            previewPage === item.key
                              ? `${theme.accent} ${theme.primaryText}`
                              : isLightTheme
                                ? "hover:bg-white hover:text-slate-900"
                                : "hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {previewDevice === "mobile" ? (
                    <>
                      <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 ${
                        isLightTheme ? "border-slate-200 bg-white shadow-[0_10px_25px_rgba(15,23,42,0.05)]" : "border-white/8 bg-white/[0.04]"
                      }`}>
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${theme.accent} ${theme.primaryText}`}>
                          <Sparkles className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-xs font-semibold ${isLightTheme ? "text-slate-900" : "text-white"}`}>Search drops, bundles, or gifts</p>
                          <p className={`text-[10px] ${subtleText}`}>Curated for fast checkout</p>
                        </div>
                        <div className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${theme.chip}`}>
                          {cartCount} in cart
                        </div>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {[siteProfile.badge, "Bundles", paymentMode === "hybrid" ? "COD ready" : "Pay manually"].map((item, index) => (
                          <span
                            key={item}
                            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                              index === 0
                                ? `${theme.accent} ${theme.primaryText}`
                                : isLightTheme
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-white/[0.05] text-zinc-300"
                            }`}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Orders", value: "24h dispatch" },
                          { label: "Support", value: siteProfile.support },
                        ].map((item) => (
                          <div key={item.label} className={`rounded-2xl border px-3 py-3 ${
                            isLightTheme ? "border-slate-200 bg-white" : "border-white/8 bg-white/[0.04]"
                          }`}>
                            <p className={`text-[9px] uppercase tracking-[0.18em] ${subtleText}`}>{item.label}</p>
                            <p className={`mt-1 text-[11px] font-semibold leading-relaxed ${isLightTheme ? "text-slate-900" : "text-white"}`}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              <div
                className={`${
                  previewDevice === "mobile"
                    ? "relative h-[34rem]"
                    : ""
                } ${isLightTheme ? "bg-white" : "bg-[#020611]"}`}
              >
                <div className={`space-y-4 p-3 sm:space-y-6 sm:p-5 ${
                  previewDevice === "mobile" ? "h-full overflow-y-auto overscroll-contain pb-28" : ""
                }`}>
                  {previewPage === "home" ? (
                  <div className={`relative overflow-hidden rounded-[1.5rem] border ${isLightTheme ? "border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]" : "border-white/8 bg-gradient-to-br shadow-[0_24px_70px_rgba(2,6,23,0.45)]"} ${theme.heroSurface}`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_35%)]" />
                    <div className={`absolute inset-x-0 top-0 h-24 ${isLightTheme ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.36),transparent)]" : "bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]"}`} />
                    <div className={`relative grid gap-4 px-3 py-4 sm:px-6 sm:py-5 ${previewDevice === "mobile" ? "grid-cols-1" : "lg:grid-cols-[1.05fr_0.95fr]"}`}>
                      <div className={`absolute right-3 top-3 flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold backdrop-blur sm:right-5 sm:top-5 ${isLightTheme ? "border-slate-200/80 bg-white/90 text-slate-600" : "border-white/10 bg-slate-950/40 text-zinc-300"}`}>
                        <span className={`h-2 w-2 rounded-full ${theme.primary}`} />
                        Live theme
                      </div>
                      <div className={`space-y-3 ${previewDevice === "mobile" ? "pr-0" : ""}`}>
                        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${theme.chip}`}>
                          <Sparkles className="h-3 w-3" />
                          {siteProfile.badge}
                        </div>
                        <div className="space-y-2">
                          <h3 className={`max-w-md font-bold leading-tight transition-all duration-500 ${
                            previewDevice === "mobile" ? "text-[1.2rem]" : "text-[1.45rem] sm:text-[2rem]"
                          } ${isLightTheme ? "text-slate-950" : "text-white"} ${fontTheme.hero}`}>
                            {heroHeading || siteProfile.hero}
                          </h3>
                          <p className={`max-w-md leading-relaxed ${
                            previewDevice === "mobile" ? "text-[11px]" : "text-xs sm:text-sm"
                          } ${isLightTheme ? "text-slate-600" : "text-zinc-300"}`}>
                            {siteProfile.description}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${theme.chip}`}>Theme: {theme.name}</span>
                          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${isLightTheme ? "bg-slate-900 text-white" : "bg-white/10 text-zinc-200"}`}>{fontTheme.name}</span>
                          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${isLightTheme ? "bg-white/80 text-slate-700 ring-1 ring-slate-200" : "bg-white/5 text-zinc-300 ring-1 ring-white/10"}`}>
                            Ready in minutes
                          </span>
                        </div>
                        <div className={`grid gap-2 pt-1 ${previewDevice === "mobile" ? "grid-cols-1 max-w-full" : "grid-cols-3 max-w-md"}`}>
                          {[
                            { label: "Products", value: `${siteProfile.products.length}+` },
                            { label: "Checkout", value: paymentMode === "hybrid" ? "Hybrid" : "Manual" },
                            { label: "Setup", value: `${setupProgress}%` },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className={`rounded-2xl border px-3 py-2 ${isLightTheme ? "border-slate-200/90 bg-white/85" : "border-white/10 bg-black/20"}`}
                            >
                              <p className={`text-[9px] uppercase tracking-[0.18em] ${subtleText}`}>{item.label}</p>
                              <p className={`mt-1 text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className={`grid gap-3 ${previewDevice === "mobile" ? "grid-cols-1" : ""}`}>
                        <div className={`rounded-2xl border p-3 sm:p-4 ${isLightTheme ? "border-slate-200 bg-white/88 shadow-[0_14px_34px_rgba(15,23,42,0.06)]" : "border-white/10 bg-black/20"}`}>
                          <p className={`text-[10px] uppercase tracking-[0.18em] ${subtleText}`}>Section focus</p>
                          <p className={`mt-2 text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{siteProfile.sectionLabel}</p>
                          <p className={`mt-2 text-xs leading-relaxed ${mutedText}`}>{siteProfile.support}</p>
                        </div>
                        <div className={`rounded-2xl border p-3 sm:p-4 ${isLightTheme ? "border-slate-200 bg-white/88 shadow-[0_14px_34px_rgba(15,23,42,0.06)]" : "border-white/10 bg-black/20"}`}>
                          <p className={`text-[10px] uppercase tracking-[0.18em] ${subtleText}`}>Launch URL</p>
                          <p className={`mt-2 break-all text-xs font-bold sm:text-sm ${isLightTheme ? "text-slate-950" : "text-white"}`}>{previewStoreUrl.replace(/^https?:\/\//, "")}</p>
                          <p className={`mt-2 text-xs ${mutedText}`}>{paymentMode === "hybrid" ? "COD and manual payment enabled" : "Manual payment verification ready"}</p>
                        </div>
                        <div className={`rounded-2xl border p-3 ${isLightTheme ? "border-slate-200 bg-slate-50/95" : "border-white/10 bg-slate-950/35"}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className={`text-[10px] uppercase tracking-[0.18em] ${subtleText}`}>Featured drop</p>
                              <p className={`mt-1 text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{siteProfile.products[0]?.name}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${theme.chip}`}>{siteProfile.products[0]?.price}</span>
                          </div>
                          <div className={`mt-3 h-20 rounded-[1.25rem] bg-gradient-to-br ${theme.heroSurface}`} />
                        </div>
                        {previewDevice === "mobile" ? (
                          <div className={`rounded-2xl border p-3 ${
                            isLightTheme ? "border-slate-200 bg-white/90" : "border-white/10 bg-black/20"
                          }`}>
                            <p className={`text-[10px] uppercase tracking-[0.18em] ${subtleText}`}>Fast actions</p>
                            <div className="mt-3 flex gap-2">
                              <button className={`flex-1 rounded-xl px-3 py-2 text-[11px] font-bold text-white ${theme.primary}`}>Buy now</button>
                              <button className={`flex-1 rounded-xl border px-3 py-2 text-[11px] font-bold ${
                                isLightTheme ? "border-slate-300 bg-white text-slate-900" : "border-white/10 bg-white/5 text-white"
                              }`}>Save item</button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  ) : null}

                  <div className={`grid gap-3 ${
                    previewPage === "home"
                      ? previewDevice === "mobile"
                        ? "grid-cols-1"
                        : "sm:grid-cols-2 lg:grid-cols-3"
                      : previewPage === "shop"
                        ? previewDevice === "mobile"
                          ? "grid-cols-1"
                          : "sm:grid-cols-2 xl:grid-cols-3"
                        : "grid-cols-1"
                  }`}>
                    {siteProfile.products.map((product, index) => (
                      <article
                        key={product.name}
                        className={`group rounded-2xl border p-3 transition ${
                          isLightTheme ? "border-slate-200 bg-slate-50 hover:border-slate-300 hover:shadow-[0_18px_35px_rgba(15,23,42,0.07)]" : "border-white/6 bg-slate-900/60 hover:border-white/12 hover:bg-slate-900/80"
                        } ${
                          previewPage === "offers" || previewPage === "account" ? "hidden" : ""
                        }`}
                      >
                        <div className={`relative mb-3 flex aspect-[4/5] items-end overflow-hidden rounded-xl bg-gradient-to-br ${theme.heroSurface} p-3`}>
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_42%)]" />
                          <div className="absolute right-3 top-3 h-12 w-12 rounded-full border border-white/20 bg-white/10 blur-[1px]" />
                          <div className="relative flex w-full items-end justify-between gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${theme.chip}`}>{product.tag}</span>
                            <span className={`text-[10px] font-semibold ${isLightTheme ? "text-slate-700" : "text-zinc-200"}`}>0{index + 1}</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <p className={`text-sm font-semibold ${isLightTheme ? "text-slate-950" : "text-white"} ${fontTheme.brand}`}>{product.name}</p>
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs font-bold ${theme.primaryText}`}>{product.price}</p>
                            <span className={`text-[10px] ${mutedText}`}>Ready to ship</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCartCount((count) => Math.min(count + 1, 9))}
                            className={`mt-1.5 w-full rounded-lg px-3 py-2 text-[11px] font-bold text-white transition ${theme.primary}`}
                          >
                            Add to cart
                          </button>
                        </div>
                      </article>
                    ))}

                    {previewPage === "shop" ? (
                      <div className={`rounded-[1.5rem] border p-4 ${previewDevice === "mobile" ? "" : "sm:col-span-2 xl:col-span-3"} ${isLightTheme ? "border-slate-200 bg-slate-50/85" : "border-white/8 bg-white/[0.03]"}`}>
                        <div className={`grid gap-4 ${previewDevice === "mobile" ? "grid-cols-1" : "lg:grid-cols-[1fr_0.9fr]"}`}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${subtleText}`}>Shop filters</p>
                              <p className={`mt-1 text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{siteProfile.tagline}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {[siteProfile.badge, "Ready to ship", paymentMode === "hybrid" ? "COD" : "Manual payment"].map((item) => (
                                <span key={item} className={`rounded-full px-3 py-1 text-[10px] font-semibold ${theme.chip}`}>
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className={`min-w-0 rounded-2xl border p-3 ${isLightTheme ? "border-slate-200 bg-white" : "border-white/8 bg-slate-950/35"}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className={`text-[10px] uppercase tracking-[0.18em] ${subtleText}`}>Cart preview</p>
                                <p className={`mt-1 text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{cartCount} item{cartCount > 1 ? "s" : ""} ready</p>
                              </div>
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${theme.chip}`}>Demo cart</span>
                            </div>
                            <div className="mt-3 space-y-2">
                              {cartItems.map((item) => (
                                <div key={item.name} className="flex items-center justify-between gap-3">
                                  <p className={`min-w-0 flex-1 text-xs font-semibold ${isLightTheme ? "text-slate-900" : "text-white"}`}>{item.name}</p>
                                  <span className={`text-[11px] font-bold ${theme.primaryText}`}>{item.price}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {previewPage === "offers" ? (
                      <>
                        {offerHighlights.map((offer, index) => (
                          <article
                            key={offer}
                            className={`rounded-[1.45rem] border p-4 sm:p-5 ${
                              index === 0
                                ? `${theme.accent} ${isLightTheme ? "border-slate-200 text-slate-900" : "border-white/10 text-white"}`
                                : isLightTheme
                                  ? "border-slate-200 bg-slate-50/90"
                                  : "border-white/8 bg-white/[0.03]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${fieldLabelText}`}>Offer {index + 1}</p>
                                <p className={`mt-2 text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{offer}</p>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${theme.chip}`}>Live</span>
                            </div>
                          </article>
                        ))}
                      </>
                    ) : null}

                    {previewPage === "account" ? (
                      <>
                        <article className={`rounded-[1.5rem] border p-4 sm:p-5 ${isLightTheme ? "border-slate-200 bg-slate-50/90" : "border-white/8 bg-white/[0.03]"}`}>
                          <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${fieldLabelText}`}>Account snapshot</p>
                          <h3 className={`mt-2 text-base font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>A customer account that feels familiar</h3>
                          <p className={`mt-2 text-sm leading-relaxed ${mutedText}`}>Show order status, saved profile info, and delivery details instead of store setup data.</p>
                        </article>
                        {accountHighlights.map((item) => (
                          <article key={item.label} className={`rounded-2xl border px-4 py-3 ${isLightTheme ? "border-slate-200 bg-white" : "border-white/8 bg-slate-950/35"}`}>
                            <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${fieldLabelText}`}>{item.label}</p>
                            <p className={`mt-2 break-words text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{item.value}</p>
                          </article>
                        ))}
                        <article className={`rounded-2xl border px-4 py-3 ${isLightTheme ? "border-slate-200 bg-white" : "border-white/8 bg-slate-950/35"}`}>
                          <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${fieldLabelText}`}>Recent order</p>
                          <p className={`mt-2 text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>#{previewSlug.slice(0, 4).toUpperCase()}-1024 • Packed and ready</p>
                          <p className={`mt-1 text-xs ${mutedText}`}>ETA: July 19, 2026</p>
                        </article>
                      </>
                    ) : null}
                  </div>

                  {previewDevice === "mobile" ? (
                    <div className={`absolute inset-x-0 bottom-0 z-20 border-t px-3 pb-3 pt-2 backdrop-blur-xl ${
                      isLightTheme ? "border-slate-200 bg-white/92" : "border-white/8 bg-slate-950/88"
                    }`}>
                      <div className={`mb-2 flex min-h-[52px] items-center justify-between rounded-2xl border px-3 py-2 ${
                        isLightTheme ? "border-slate-200 bg-slate-50/95" : "border-white/8 bg-white/[0.04]"
                      }`}>
                        <div className="min-w-0">
                          <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${subtleText}`}>Quick actions</p>
                          <p className={`truncate text-xs font-semibold ${isLightTheme ? "text-slate-900" : "text-white"}`}>Browse products or jump to checkout</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewPage("shop")}
                          className={`rounded-full px-3 py-1.5 text-[10px] font-bold text-white ${theme.primary}`}
                        >
                          Cart {cartCount}
                        </button>
                      </div>

                      <div
                        className={`grid grid-cols-4 gap-2 rounded-[1.65rem] border p-2 shadow-lg ${
                          isLightTheme ? "border-slate-200 bg-white" : "border-white/8 bg-[#0b1220]"
                        }`}
                      >
                        {previewNavItems.map((item) => {
                          const Icon = item.icon;
                          const active = previewPage === item.key;
                          return (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => setPreviewPage(item.key)}
                              className={`flex flex-col items-center gap-1 rounded-[1rem] px-2 py-2.5 text-[10px] font-semibold transition ${
                                active
                                  ? `${theme.accent} ${theme.primaryText} shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]`
                                  : isLightTheme
                                    ? "text-slate-500 hover:bg-slate-50"
                                    : "text-zinc-400 hover:bg-white/[0.03]"
                              }`}
                            >
                              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                active
                                  ? isLightTheme
                                    ? "bg-white shadow-sm"
                                    : "bg-white/10"
                                  : isLightTheme
                                    ? "bg-slate-100"
                                    : "bg-white/[0.04]"
                              }`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="sandbox" className="relative z-10 mx-auto max-w-6xl px-4 pb-24">
        <div className={`rounded-[2rem] border p-4 shadow-[0_28px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6 lg:p-7 ${sandboxShell}`}>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${sectionBadge}`}>
                <Settings2 className="h-3.5 w-3.5" />
                Launch setup planner
              </div>
              <h2 className={`font-heading text-[1.9rem] font-extrabold leading-tight sm:text-4xl ${isLightTheme ? "text-slate-950" : "text-white"}`}>
                Show the setup in simple steps.
              </h2>
              <p className={`max-w-2xl text-sm leading-relaxed sm:text-base ${mutedText}`}>
                Help merchants see what happens next before they create an account.
              </p>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-extrabold ${setupProgress === 100 ? "bg-green-500/10 text-green-300" : theme.chip}`}>
              {setupProgress}% ready
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:gap-6">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                          ? `${theme.border} ${isLightTheme ? "bg-white shadow-[0_18px_36px_rgba(15,23,42,0.08)]" : "bg-white/10"}`
                          : isLightTheme
                            ? "border-slate-200 bg-slate-50/80 hover:border-slate-300"
                            : "border-white/6 bg-slate-950/40 hover:border-white/12"
                      }`}
                    >
                      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${
                        active
                          ? `${theme.accent} ${theme.primaryText}`
                          : isLightTheme
                            ? "bg-slate-200 text-slate-500"
                            : "bg-white/5 text-zinc-400"
                      }`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <p className={`text-xs font-bold uppercase tracking-[0.18em] ${fieldLabelText}`}>Step {step.id}</p>
                      <p className={`mt-2 text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{step.title}</p>
                    </button>
                  );
                })}
              </div>

              {currentStep === 2 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className={`text-xs font-semibold uppercase tracking-[0.18em] ${fieldLabelText}`}>Store name</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => {
                      setStoreName(e.target.value);
                      setCurrentStep(2);
                    }}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-2 ${theme.ring} ${
                      isLightTheme ? "border-slate-300 bg-white text-slate-950" : "border-white/10 bg-slate-950 text-white"
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-xs font-semibold uppercase tracking-[0.18em] ${fieldLabelText}`}>Announcement</label>
                  <input
                    type="text"
                    value={announcementText}
                    onChange={(e) => {
                      setAnnouncementText(e.target.value);
                      setCurrentStep(2);
                    }}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-2 ${theme.ring} ${
                      isLightTheme ? "border-slate-300 bg-white text-slate-950" : "border-white/10 bg-slate-950 text-white"
                    }`}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className={`text-xs font-semibold uppercase tracking-[0.18em] ${fieldLabelText}`}>Hero message</label>
                  <textarea
                    rows={3}
                    value={heroHeading}
                    onChange={(e) => {
                      setHeroHeading(e.target.value);
                      setCurrentStep(2);
                    }}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:ring-2 ${theme.ring} ${
                      isLightTheme ? "border-slate-300 bg-white text-slate-950" : "border-white/10 bg-slate-950 text-white"
                    }`}
                  />
                </div>
              </div>
              ) : null}

              {currentStep === 3 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className={`rounded-2xl border p-4 ${sandboxCard}`}>
                  <label className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] ${fieldLabelText}`}>
                    <Palette className="h-3.5 w-3.5" />
                    Color system
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(colorThemes).map(([name, palette]) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setActiveTheme(name as ThemeKey);
                          setCurrentStep(3);
                        }}
                        className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${
                          activeTheme === name
                            ? `${palette.border} ${isLightTheme ? "bg-slate-900 text-white" : "bg-white/10 text-white"}`
                            : isLightTheme
                              ? "border-slate-300 bg-white text-slate-600"
                              : "border-white/10 bg-white/5 text-zinc-400"
                        }`}
                      >
                        <span className={`h-3 w-3 rounded-full ${palette.primary}`} />
                        {palette.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`rounded-2xl border p-4 ${sandboxCard}`}>
                  <label className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] ${fieldLabelText}`}>
                    <Type className="h-3.5 w-3.5" />
                    Typography mood
                  </label>
                  <div className="mt-3 grid gap-2">
                    {Object.entries(fontThemes).map(([name, font]) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setActiveFont(name as FontKey);
                          setCurrentStep(3);
                        }}
                        className={`rounded-xl border px-3 py-2.5 text-left text-xs ${
                          activeFont === name
                            ? `${theme.border} ${isLightTheme ? "bg-slate-900 text-white" : "bg-white/10 text-white"}`
                            : isLightTheme
                              ? "border-slate-300 bg-white text-slate-600"
                              : "border-white/10 bg-white/5 text-zinc-400"
                        }`}
                      >
                        <span className={`block text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"} ${font.hero}`}>{font.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              ) : null}

              {currentStep === 4 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className={`rounded-2xl border p-4 ${sandboxCard}`}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${fieldLabelText}`}>Payments</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
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
                        className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                          paymentMode === option.value
                            ? `${theme.border} ${isLightTheme ? "bg-slate-900 text-white" : "bg-white/10 text-white"}`
                            : isLightTheme
                              ? "border-slate-300 bg-white text-slate-600"
                              : "border-white/10 bg-white/5 text-zinc-400"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`rounded-2xl border p-4 ${sandboxCard}`}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${fieldLabelText}`}>Custom domain</p>
                  <button
                    type="button"
                    onClick={() => {
                      setDomainConnected((value) => !value);
                      setCurrentStep(4);
                    }}
                    className={`mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-3 text-sm ${
                      domainConnected
                        ? "border-green-500/30 bg-green-500/10 text-green-300"
                        : isLightTheme
                          ? "border-slate-300 bg-white text-slate-700"
                          : "border-white/10 bg-white/5 text-zinc-300"
                    }`}
                  >
                    <span>{domainConnected ? `${previewStoreUrl.replace(/^https?:\/\//, "")} connected` : "Preview domain only"}</span>
                    <CheckCircle2 className={`h-4 w-4 ${domainConnected ? "text-green-300" : "text-zinc-500"}`} />
                  </button>
                </div>
              </div>
              ) : null}

              {currentStep === 1 ? (
                <div className={`rounded-2xl border p-5 ${sandboxCard}`}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${fieldLabelText}`}>Selected template</p>
                  <h3 className={`mt-2 text-lg font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{siteProfile.name}</h3>
                  <p className={`mt-2 text-sm leading-relaxed ${mutedText}`}>{siteProfile.description}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {siteProfile.products.map((product) => (
                      <div key={product.name} className={`rounded-2xl border p-3 ${isLightTheme ? "border-slate-200 bg-white" : "border-white/8 bg-white/[0.03]"}`}>
                        <p className={`text-sm font-semibold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{product.name}</p>
                        <p className={`mt-1 text-xs ${theme.primaryText}`}>{product.price}</p>
                        <p className={`mt-2 text-[10px] ${subtleText}`}>{product.tag}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className={`rounded-[1.75rem] border p-4 shadow-2xl sm:p-5 ${sandboxSoftCard}`}>
                <div className={`flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between ${isLightTheme ? "border-slate-200" : "border-white/5"}`}>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${fieldLabelText}`}>Launch readiness</p>
                    <h3 className={`font-heading text-lg font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>Simple setup, clear finish line</h3>
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
                    <div key={item.label} className={`flex flex-col gap-2 rounded-2xl border px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between ${
                      isLightTheme ? "border-slate-200 bg-slate-50/95" : "border-white/5 bg-white/[0.03]"
                    }`}>
                      <span className="flex items-center gap-3">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${item.done ? "bg-green-500/15 text-green-300" : isLightTheme ? "bg-slate-200 text-slate-500" : "bg-white/5 text-zinc-500"}`}>
                          {item.done ? <Check className="h-3.5 w-3.5" /> : "•"}
                        </span>
                        <span className={`font-semibold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{item.label}</span>
                      </span>
                      <span className={`break-words pl-9 text-left sm:max-w-[48%] sm:pl-0 sm:text-right ${subtleText}`}>{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className={`mt-5 rounded-2xl border p-4 ${isLightTheme ? "border-slate-200 bg-slate-50/95" : "border-white/8 bg-white/[0.04]"}`}>
                  <p className={`text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>What happens next</p>
                  <p className={`mt-1 text-xs leading-relaxed ${mutedText}`}>
                    This is where the selected demo data can move into signup and onboarding.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                <Link href="/signup" className={`inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 py-3 text-sm font-bold text-white shadow-xl transition-all hover:-translate-y-0.5 sm:w-auto ${theme.primary} ${theme.button}`}>
                  Continue to signup
                </Link>
                <Link href="/admin/login" className={`inline-flex min-h-12 w-full items-center justify-center rounded-full border px-6 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 sm:w-auto ${
                  isLightTheme
                    ? "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                    : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}>
                  Already have admin access?
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className={`pointer-events-none absolute inset-x-8 top-10 h-40 rounded-full blur-3xl ${theme.glow} opacity-20`} />
        <div className="grid items-center gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
          <div className="space-y-5 sm:space-y-6">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${sectionBadge}`}>
              <BadgeCheck className="h-3.5 w-3.5" />
              Why it works
            </span>
            <h2 className={`font-heading text-[1.9rem] font-extrabold leading-tight sm:text-4xl ${isLightTheme ? "text-slate-950" : "text-white"}`}>
              Show the workflow and the result on one page.
            </h2>
            <p className={`text-sm leading-relaxed sm:text-base ${mutedText}`}>
              Visitors can see the business fit, style options, and launch path without reading too much.
            </p>

            <div className="space-y-4">
              <div className={`flex items-start gap-4 rounded-[1.35rem] border p-4 sm:border-0 sm:p-0 ${panelShell}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.accent} ${theme.primaryText}`}>
                  <Layout className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>Demo sites by category</h3>
                  <p className={`mt-0.5 text-xs ${subtleText}`}>Different business types show different products, copy, and support details.</p>
                </div>
              </div>

              <div className={`flex items-start gap-4 rounded-[1.35rem] border p-4 sm:border-0 sm:p-0 ${panelShell}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.accent} ${theme.primaryText}`}>
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>Simple style changes</h3>
                  <p className={`mt-0.5 text-xs ${subtleText}`}>Color and font changes update the preview right away.</p>
                </div>
              </div>

              <div className={`flex items-start gap-4 rounded-[1.35rem] border p-4 sm:border-0 sm:p-0 ${panelShell}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.accent} ${theme.primaryText}`}>
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>Clear launch path</h3>
                  <p className={`mt-0.5 text-xs ${subtleText}`}>The readiness panel shows domain, payment, and content status in one place.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2 sm:gap-4">
            {[
              {
                icon: Palette,
                title: "Theme packs",
                body: "Change the palette and see it flow through the full page.",
              },
              {
                icon: Type,
                title: "Typography moods",
                body: "Try different font moods to match the brand faster.",
              },
              {
                icon: CreditCard,
                title: "Local payment setup",
                body: "Keep bKash and COD visible so setup feels practical.",
              },
              {
                icon: Star,
                title: "Trust-first layout",
                body: "Support, trust, and proof help the page feel safer to buy from.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className={`rounded-[1.5rem] border p-6 transition-all ${
                  isLightTheme
                    ? "border-slate-200 bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.05)] hover:border-slate-300 hover:shadow-[0_22px_48px_rgba(15,23,42,0.08)]"
                    : "border-white/6 bg-slate-900/35 hover:border-white/12 hover:bg-slate-900/55"
                }`}>
                  <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${theme.accent} ${theme.primaryText}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className={`text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{item.title}</h3>
                  <p className={`mt-2 text-[11px] leading-relaxed ${subtleText}`}>{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className={`rounded-[2rem] border p-8 shadow-[0_24px_70px_rgba(0,0,0,0.12)] ${
          isLightTheme ? "border-slate-200 bg-white/92" : "border-white/10 bg-slate-900/40"
        }`}>
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-8">
            <div className="space-y-4">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${sectionBadge}`}>
                <Clock3 className="h-3.5 w-3.5" />
              Day-one outcome
            </span>
            <h2 className={`font-heading text-[1.9rem] font-extrabold leading-tight sm:text-4xl ${isLightTheme ? "text-slate-950" : "text-white"}`}>
              Show what merchants get on day one.
            </h2>
            <p className={`text-sm leading-relaxed sm:text-base ${mutedText}`}>
              Make the result clear before the visitor reaches pricing.
            </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {dayOneItems.map((item) => (
                <div key={item} className={`flex items-start gap-3 rounded-2xl border p-4 ${
                  isLightTheme ? "border-slate-200 bg-slate-50/95" : "border-white/8 bg-white/[0.03]"
                }`}>
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${theme.accent} ${theme.primaryText}`}>
                    <Check className="h-4 w-4" />
                  </div>
                  <p className={`text-sm font-medium leading-relaxed ${isLightTheme ? "text-slate-900" : "text-white"}`}>{item}</p>
                </div>
              ))}
            </div>
            <div className={`rounded-[1.6rem] border p-5 md:hidden ${
              isLightTheme ? "border-slate-200 bg-slate-50/95" : "border-white/8 bg-white/[0.03]"
            }`}>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${subtleText}`}>Why merchants switch</p>
              <div className="mt-3 space-y-3">
                {beforeAfterItems.map((item, index) => (
                  <div key={index} className={`rounded-2xl p-3 ${isLightTheme ? "bg-white" : "bg-slate-950/40"}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-400">Before</p>
                    <p className={`mt-1 text-xs leading-relaxed ${mutedText}`}>{item.before}</p>
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">After</p>
                    <p className={`mt-1 text-xs leading-relaxed ${isLightTheme ? "text-slate-800" : "text-zinc-200"}`}>{item.after}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto hidden max-w-6xl px-4 py-16 sm:py-24 md:block">
        <div className="grid gap-6 lg:grid-cols-2">
          {beforeAfterItems.map((item, index) => (
            <div key={index} className={`rounded-[1.8rem] border p-6 ${
              isLightTheme ? "border-slate-200 bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.05)]" : "border-white/8 bg-slate-900/35"
            }`}>
              <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="rounded-2xl border border-rose-500/15 bg-rose-500/8 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-300">Before</p>
                  <p className={`mt-2 text-sm leading-relaxed ${isLightTheme ? "text-slate-700" : "text-zinc-300"}`}>{item.before}</p>
                </div>
                <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${theme.accent} ${theme.primaryText}`}>
                  <ArrowRightLeft className="h-4.5 w-4.5" />
                </div>
                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/8 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">After</p>
                  <p className={`mt-2 text-sm leading-relaxed ${isLightTheme ? "text-slate-800" : "text-zinc-200"}`}>{item.after}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="templates" className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="mb-8 flex items-end justify-between gap-6 sm:mb-10">
          <div className="max-w-2xl space-y-3">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${sectionBadge}`}>
              <Layout className="h-3.5 w-3.5" />
              Built for different businesses
            </span>
            <h2 className={`font-heading text-[1.9rem] font-extrabold leading-tight sm:text-4xl ${isLightTheme ? "text-slate-950" : "text-white"}`}>
              Show that the CMS fits their business.
            </h2>
            <p className={`text-sm leading-relaxed sm:text-base ${mutedText}`}>
              Help visitors recognize themselves quickly with category-based examples.
            </p>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {useCases.map((useCase) => (
            <article key={useCase.title} className={`rounded-[1.6rem] border p-6 transition hover:-translate-y-1 ${
              isLightTheme
                ? "border-slate-200 bg-white/90 hover:border-slate-300 hover:shadow-[0_20px_48px_rgba(15,23,42,0.07)]"
                : "border-white/8 bg-slate-900/35 hover:border-white/15 hover:bg-slate-900/55"
            }`}>
              <h3 className={`font-heading text-lg font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{useCase.title}</h3>
              <p className={`mt-3 text-sm leading-relaxed ${mutedText}`}>{useCase.body}</p>
              <p className={`mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] ${subtleText}`}>{useCase.fit}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto hidden max-w-6xl px-4 py-6 sm:py-8 md:block">
        <div className="grid gap-3 lg:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className={`rounded-[1.5rem] border p-6 transition ${
                isLightTheme
                  ? "border-slate-200 bg-white/88 hover:border-slate-300 hover:shadow-[0_18px_36px_rgba(15,23,42,0.06)]"
                  : "border-white/8 bg-slate-900/35 hover:border-white/15 hover:bg-slate-900/50"
              }`}>
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${theme.accent} ${theme.primaryText}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className={`text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{item.title}</h3>
                <p className={`mt-2 text-[11px] leading-relaxed ${subtleText}`}>{item.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
          <div className="space-y-4">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${sectionBadge}`}>
              <Rocket className="h-3.5 w-3.5" />
              Launch checklist
            </span>
            <h2 className={`font-heading text-[1.9rem] font-extrabold leading-tight sm:text-4xl ${isLightTheme ? "text-slate-950" : "text-white"}`}>
              Make the launch path feel easy.
            </h2>
            <p className={`text-sm leading-relaxed sm:text-base ${mutedText}`}>
              A short checklist helps merchants see what happens next.
            </p>
          </div>
          <div className="grid gap-3 sm:gap-4">
            {checklistItems.map((item, index) => (
              <div key={item} className={`flex items-start gap-4 rounded-2xl border p-4 ${
                isLightTheme ? "border-slate-200 bg-white/90" : "border-white/8 bg-white/[0.03]"
              }`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${theme.accent} ${theme.primaryText}`}>
                  <span className="text-xs font-bold">{index + 1}</span>
                </div>
                <p className={`text-sm leading-relaxed ${isLightTheme ? "text-slate-900" : "text-white"}`}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className={`overflow-hidden rounded-[2rem] border shadow-[0_24px_70px_rgba(0,0,0,0.14)] ${
          isLightTheme ? "border-slate-200 bg-white/92" : "border-white/10 bg-slate-900/40"
        }`}>
          <div className={`border-b px-6 py-5 ${isLightTheme ? "border-slate-200" : "border-white/8"}`}>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${sectionBadge}`}>
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Comparison
            </span>
            <h2 className={`mt-4 font-heading text-[1.9rem] font-extrabold leading-tight sm:text-4xl ${isLightTheme ? "text-slate-950" : "text-white"}`}>
              Show why this is better than selling by inbox.
            </h2>
          </div>
          <div className="space-y-3 md:hidden">
            {comparisonRows.map((row) => (
              <article
                key={row.label}
                className={`rounded-2xl border p-4 ${
                  isLightTheme ? "border-slate-200 bg-slate-50/80" : "border-white/8 bg-white/[0.03]"
                }`}
              >
                <h3 className={`text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{row.label}</h3>
                <div className="mt-3 space-y-2 text-xs">
                  <div className={`rounded-xl px-3 py-2 ${isLightTheme ? "bg-white text-slate-600" : "bg-slate-950/50 text-zinc-400"}`}>
                    <span className="block font-semibold">Inbox selling</span>
                    <span className="mt-1 block">{row.inbox}</span>
                  </div>
                  <div className={`rounded-xl px-3 py-2 ${isLightTheme ? "bg-white text-slate-600" : "bg-slate-950/50 text-zinc-400"}`}>
                    <span className="block font-semibold">Generic builder</span>
                    <span className="mt-1 block">{row.generic}</span>
                  </div>
                  <div className={`rounded-xl px-3 py-2 ${theme.accent} ${isLightTheme ? "text-slate-900" : "text-white"}`}>
                    <span className="block font-semibold">{PLATFORM_BRAND_NAME}</span>
                    <span className="mt-1 block">{row.commerce}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className={isLightTheme ? "bg-slate-50 text-slate-600" : "bg-white/[0.03] text-zinc-300"}>
                <tr>
                  <th className="px-6 py-4 font-semibold">What merchants need</th>
                  <th className="px-6 py-4 font-semibold">Inbox selling</th>
                  <th className="px-6 py-4 font-semibold">Generic website builder</th>
                  <th className={`px-6 py-4 font-semibold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{PLATFORM_BRAND_NAME}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label} className={`align-top ${isLightTheme ? "border-t border-slate-200" : "border-t border-white/6"}`}>
                    <td className={`px-6 py-4 font-semibold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{row.label}</td>
                    <td className={`px-6 py-4 ${mutedText}`}>{row.inbox}</td>
                    <td className={`px-6 py-4 ${mutedText}`}>{row.generic}</td>
                    <td className={`px-6 py-4 ${isLightTheme ? "text-slate-800" : "text-zinc-200"}`}>{row.commerce}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="mb-8 max-w-2xl space-y-3 sm:mb-10">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${sectionBadge}`}>
            <ShieldCheck className="h-3.5 w-3.5" />
            Common concerns
          </span>
          <h2 className={`font-heading text-[1.9rem] font-extrabold leading-tight sm:text-4xl ${isLightTheme ? "text-slate-950" : "text-white"}`}>
            Answer the big questions early.
          </h2>
          <p className={`text-sm leading-relaxed sm:text-base ${mutedText}`}>
            Clear answers reduce doubt before the visitor reaches pricing.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {objectionItems.map((item) => (
            <div key={item.title} className={`rounded-[1.5rem] border p-6 transition ${
              isLightTheme
                ? "border-slate-200 bg-white/90 hover:border-slate-300 hover:shadow-[0_18px_36px_rgba(15,23,42,0.06)]"
                : "border-white/8 bg-slate-900/35 hover:border-white/15 hover:bg-slate-900/55"
            }`}>
              <h3 className={`text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{item.title}</h3>
              <p className={`mt-3 text-[11px] leading-relaxed ${subtleText}`}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="mb-8 max-w-2xl space-y-3 sm:mb-10">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${sectionBadge}`}>
            <MessageSquareQuote className="h-3.5 w-3.5" />
            Social proof
          </span>
          <h2 className={`font-heading text-[1.9rem] font-extrabold leading-tight sm:text-4xl ${isLightTheme ? "text-slate-950" : "text-white"}`}>
            Show proof that the flow works.
          </h2>
          <p className={`text-sm leading-relaxed sm:text-base ${mutedText}`}>
            The demo shows what is possible. Testimonials add trust.
          </p>
        </div>
        <div className="mb-6 flex justify-start sm:justify-end">
          <Link href="/stories" className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
            isLightTheme ? "border-slate-300 bg-white text-slate-900 hover:bg-slate-100" : "border-white/10 bg-white/5 text-white hover:bg-white/10"
          }`}>
            More stories
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[0.9fr_1.2fr_0.9fr]">
          {testimonials.map((testimonial, index) => (
            <article
              key={testimonial.name}
              className={`rounded-[1.8rem] border p-6 transition ${
                index === 1
                  ? `${theme.border} ${isLightTheme ? "bg-white shadow-[0_22px_60px_rgba(15,23,42,0.12)]" : "bg-white/[0.08] shadow-[0_22px_70px_rgba(0,0,0,0.24)]"}`
                  : isLightTheme
                    ? "border-slate-200 bg-white/90 hover:border-slate-300"
                    : "border-white/8 bg-slate-900/35 hover:border-white/15"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${index === 1 ? theme.primary : isLightTheme ? "bg-slate-200" : "bg-white/10"} ${index === 1 ? "text-white" : isLightTheme ? "text-slate-700" : "text-white"}`}>
                  <Crown className="h-4.5 w-4.5" />
                </div>
                <p className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${index === 1 ? theme.chip : isLightTheme ? "bg-slate-100 text-slate-700" : "bg-white/8 text-zinc-300"}`}>
                  {testimonial.result}
                </p>
              </div>
              <p className={`mt-5 text-base leading-relaxed ${isLightTheme ? "text-slate-900" : "text-white"}`}>
                "{testimonial.quote}"
              </p>
              <div className="mt-6">
                <p className={`text-sm font-bold ${isLightTheme ? "text-slate-950" : "text-white"}`}>{testimonial.name}</p>
                <p className={`text-xs ${subtleText}`}>{testimonial.role}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {children}

      <section className="relative z-10 mx-auto max-w-4xl px-4 py-16 sm:py-24">
        <div className="mb-8 space-y-3 text-center sm:mb-12">
          <h2 className={`font-heading text-3xl font-extrabold ${isLightTheme ? "text-slate-950" : "text-white"}`}>Frequently Asked Questions</h2>
          <p className={`text-sm ${mutedText}`}>Quick answers about setup, domains, and launch.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={faq.q} className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
              isLightTheme ? "border-slate-200 bg-white/92" : "border-white/5 bg-slate-900/40"
            }`}>
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className={`flex w-full items-center justify-between p-5 text-left text-sm font-bold transition-all ${
                  isLightTheme ? "text-slate-950 hover:bg-slate-50" : "text-white hover:bg-white/[0.02]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <HelpCircle className={`h-4.5 w-4.5 shrink-0 ${theme.primaryText}`} />
                  {faq.q}
                </span>
                <ChevronDown className={`h-4 w-4 ${subtleText} transition-transform duration-300 ${openFaq === idx ? `rotate-180 ${isLightTheme ? "text-slate-900" : "text-white"}` : ""}`} />
              </button>

              <div className={`overflow-hidden transition-all duration-500 ${openFaq === idx ? `max-h-40 border-t ${isLightTheme ? "border-slate-200 bg-slate-50/70" : "border-white/5 bg-slate-950/40"}` : "max-h-0"}`}>
                <p className={`p-5 text-xs leading-relaxed sm:text-sm ${mutedText}`}>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className={`relative overflow-hidden rounded-[2rem] border p-8 text-center shadow-[0_28px_90px_rgba(0,0,0,0.18)] sm:p-12 ${
          isLightTheme ? "border-slate-200 bg-white" : "border-white/10 bg-[#050810]"
        }`}>
          <div className={`absolute -inset-8 rounded-[2rem] ${theme.glow} blur-3xl opacity-35`} />
          <div className={`absolute inset-0 ${
            isLightTheme
              ? "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72),transparent_45%)]"
              : "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]"
          }`} />
          <div className="relative z-10 space-y-6">
            <h2 className={`font-heading text-[1.9rem] font-extrabold leading-tight sm:text-4xl ${isLightTheme ? "text-slate-950" : "text-white"}`}>
              Ready to launch your store faster?
            </h2>
            <p className={`mx-auto max-w-xl text-sm leading-relaxed ${mutedText}`}>
              Show the setup, show the style, and help visitors feel ready to start.
            </p>
            <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row sm:gap-4">
              <Link href="/signup" className={`rounded-full px-8 py-3.5 text-sm font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 ${theme.primary} ${theme.button}`}>
                Start free
              </Link>
              <Link href="/templates" className={`rounded-full border px-8 py-3.5 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 ${
                isLightTheme ? "border-slate-300 bg-white text-slate-900 hover:bg-slate-100" : "border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}>
                View templates
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className={`relative z-10 border-t py-12 text-center text-xs ${
        isLightTheme ? "border-slate-200 bg-stone-100 text-slate-500" : "border-white/5 bg-slate-950 text-zinc-500"
      }`}>
        <div className="mx-auto max-w-6xl space-y-6 px-4">
          <p className={`font-heading text-sm font-extrabold tracking-[0.22em] ${isLightTheme ? "text-slate-950" : "text-white"}`}>{PLATFORM_BRAND_NAME.toUpperCase()}</p>
          <p className={`mx-auto max-w-md ${subtleText}`}>
            A white-label ecommerce CMS for stores that want to launch fast and look professional.
          </p>
          <div className={`flex justify-center gap-4 text-[11px] ${mutedText}`}>
            <Link href="/templates" className={isLightTheme ? "hover:text-slate-950" : "hover:text-white"}>Templates</Link>
            <Link href="/stories" className={isLightTheme ? "hover:text-slate-950" : "hover:text-white"}>Stories</Link>
            <Link href="/plans" className={isLightTheme ? "hover:text-slate-950" : "hover:text-white"}>Pricing</Link>
          </div>
          <p className={`border-t pt-4 text-[10px] ${isLightTheme ? "border-slate-200" : "border-white/5"}`}>
            &copy; {new Date().getFullYear()} {PLATFORM_BRAND_NAME}. Built for modern digital commerce.
          </p>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 pt-2 sm:hidden">
        <div className={`mx-auto flex max-w-md items-center gap-2 rounded-[1.35rem] border p-2 shadow-[0_20px_50px_rgba(15,23,42,0.22)] backdrop-blur-xl ${
          isLightTheme ? "border-slate-200 bg-white/95" : "border-white/10 bg-slate-950/92"
        }`}>
          <a
            href="#builder"
            className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-[1rem] px-3 text-[11px] font-bold ${
              isLightTheme ? "bg-slate-100 text-slate-700" : "bg-white/[0.05] text-zinc-200"
            }`}
          >
            Preview
          </a>
          <Link
            href="/signup"
            className={`inline-flex min-h-11 flex-[1.25] items-center justify-center rounded-[1rem] px-3 text-[11px] font-bold text-white ${theme.primary}`}
          >
            Start building
          </Link>
        </div>
      </div>
    </main>
  );
}
