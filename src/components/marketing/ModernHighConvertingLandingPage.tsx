"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Flame,
  Gift,
  Globe,
  Heart,
  HelpCircle,
  Layout,
  Lock,
  MessageSquare,
  Monitor,
  Moon,
  Package,
  Percent,
  Play,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Sun,
  TrendingUp,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { PLATFORM_BRAND_NAME, PLATFORM_PRIMARY_DOMAIN } from "@/lib/platform/site-config";
import { CmsPricing } from "./CmsPricing";

// Store Templates Data
const STORE_TEMPLATES = [
  {
    id: "fashion",
    category: "Fashion & Apparel",
    title: "Urban Aura Apparel",
    badge: "🔥 Best Seller",
    convRate: "+42% Conversion",
    rating: 4.9,
    reviews: 184,
    description: "Sleek lookbook layout designed for fashion drops, size guides, and instant bKash checkout.",
    heroHeadline: "New Autumn Collection Drop '26",
    heroSub: "Premium street fashion crafted for everyday style.",
    gradient: "from-purple-600/30 via-indigo-600/20 to-slate-900",
    accentColor: "bg-purple-500",
    accentText: "text-purple-400",
    borderAccent: "border-purple-500/30",
    products: [
      { name: "Oversized Heavyweight Hoodie", price: 2450, origPrice: 3200, tag: "Top Pick" },
      { name: "Minimalist Cargo Pants", price: 1950, origPrice: 2400, tag: "New Drop" },
      { name: "Structured Unisex Tee", price: 950, origPrice: 1200, tag: "Popular" },
    ],
  },
  {
    id: "beauty",
    category: "Skincare & Beauty",
    title: "Glow & Co. Botanicals",
    badge: "✨ Trending",
    convRate: "+38% Order Value",
    rating: 5.0,
    reviews: 210,
    description: "Clinical yet elegant storefront with ingredient trust badges and routine bundle upsells.",
    heroHeadline: "Glass Skin Routine Bundle",
    heroSub: "Dermatologist-approved organic formulas for glowing skin.",
    gradient: "from-rose-600/30 via-pink-600/20 to-slate-900",
    accentColor: "bg-rose-500",
    accentText: "text-rose-400",
    borderAccent: "border-rose-500/30",
    products: [
      { name: "Barrier Repair Niacinamide Serum", price: 1650, origPrice: 2100, tag: "Best Seller" },
      { name: "Hydrating Cloud Foam Cleanser", price: 1100, origPrice: 1400, tag: "Routine Essential" },
      { name: "De-Puffing Peptide Eye Cream", price: 1350, origPrice: 1700, tag: "Hot Pick" },
    ],
  },
  {
    id: "bakery",
    category: "Food & Bakery",
    title: "Oven Crafted Artisan",
    badge: "🎂 High Converting",
    convRate: "3.5x More Orders",
    rating: 4.95,
    reviews: 142,
    description: "Pre-order calendar, custom cake notes, and same-day courier dispatch integrations.",
    heroHeadline: "Artisanal Bakes & Bento Cakes",
    heroSub: "Freshly baked daily with premium French butter and love.",
    gradient: "from-amber-600/30 via-orange-600/20 to-slate-900",
    accentColor: "bg-amber-500",
    accentText: "text-amber-400",
    borderAccent: "border-amber-500/30",
    products: [
      { name: "Customized Signature Bento Cake", price: 1250, origPrice: 1500, tag: "Pre-Order" },
      { name: "French Croissant Box (Set of 4)", price: 850, origPrice: 1000, tag: "Daily Special" },
      { name: "Dark Chocolate Truffle Tart", price: 990, origPrice: 1200, tag: "Chef Special" },
    ],
  },
  {
    id: "gadgets",
    category: "Electronics & Tech",
    title: "VoltPulse Tech Gear",
    badge: "⚡ High Trust",
    convRate: "99.2% Checkout Complete",
    rating: 4.88,
    reviews: 319,
    description: "Detailed specification tables, warranty trust seals, and fast Cash-on-Delivery confirmation.",
    heroHeadline: "Next-Gen ANC Wireless Headphones",
    heroSub: "Immersive sound, 40hr battery life & 1-year official warranty.",
    gradient: "from-cyan-600/30 via-blue-600/20 to-slate-900",
    accentColor: "bg-cyan-500",
    accentText: "text-cyan-400",
    borderAccent: "border-cyan-500/30",
    products: [
      { name: "Active Noise Cancelling Earbuds", price: 3490, origPrice: 4500, tag: "1-Yr Warranty" },
      { name: "10,000mAh Magnetic Power Bank", price: 2250, origPrice: 2800, tag: "Fast Charge" },
      { name: "RGB Mechanical Keyboard", price: 4100, origPrice: 5200, tag: "Pro Pick" },
    ],
  },
];

// Pain vs Solution comparison
const PAIN_VS_SOLUTION = [
  {
    feature: "Order Taking Process",
    pain: "Manual back-and-forth in Messenger/WhatsApp taking 15+ minutes per customer",
    solution: "Instant self-serve 1-click storefront checkout taking under 30 seconds",
    icon: MessageSquare,
  },
  {
    feature: "bKash / Nagad Payments",
    pain: "Asking customers to send screenshots of TrxID and manually checking your SMS history",
    solution: "Automated TrxID validation input field with instant order confirmation & receipt SMS",
    icon: CreditCard,
  },
  {
    feature: "Courier & Delivery Setup",
    pain: "Copy-pasting customer names and addresses manually into courier apps every night",
    solution: "1-Click automated sync with Steadfast, Pathao & RedX with automatic tracking link",
    icon: Truck,
  },
  {
    feature: "Branding & Trust",
    pain: "Looking like an unverified page where buyers hesitate before sending advance payment",
    solution: "Custom branded domain (yourname.com), SSL security badge, and professional store design",
    icon: ShieldCheck,
  },
  {
    feature: "Abandoned Orders",
    pain: "Customers ask 'Price details' and vanish into chat void with zero follow-up capability",
    solution: "Automated abandoned checkout reminders & real-time visitor analytics",
    icon: TrendingUp,
  },
];

// Verified Testimonials
const TESTIMONIALS = [
  {
    name: "Nadia Rahman",
    role: "Founder, Luna Skin Lab",
    location: "Dhaka, Bangladesh",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    metric: "3.8x Sales Increase",
    metricSub: "Processed 1,400+ bKash orders in Month 1",
    quote: "We used to spend 4 hours every night matching bKash transaction IDs from Messenger screenshots. Commerce Engine automated our entire checkout and courier booking. Our sales literally quadrupled in 30 days!",
    stars: 5,
  },
  {
    name: "Tanzim Hasan",
    role: "Managing Director, Volt Cart Tech",
    location: "Chittagong, Bangladesh",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    metric: "18 Hours Saved / Wk",
    metricSub: "Automated Steadfast courier booking",
    quote: "Before this, 30% of our orders were lost because customers got tired of waiting for Messenger replies. Now, buyers browse our mobile store, pay via Nagad or COD, and we print shipping labels in 1 click.",
    stars: 5,
  },
  {
    name: "Mahin & Sadia Islam",
    role: "Co-founders, Trendy Closet BD",
    location: "Sylhet, Bangladesh",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    metric: "0% Order Errors",
    metricSub: "Over 8,500+ happy customers served",
    quote: "The ability to change store banners, run flash sales, and manage inventory without touching a line of code is game-changing. It feels as smooth as Shopify, but built specifically for local Bangladeshi commerce!",
    stars: 5,
  },
];

// FAQs
const FAQS = [
  {
    q: "How does the manual bKash and Nagad payment confirmation work?",
    a: "During checkout, customers select bKash, Nagad, or Rocket. They are presented with your personal or merchant account number and simple instructions. They submit their Transaction ID (TrxID) directly on the order page. Your dashboard automatically flags the order for instant verification.",
  },
  {
    q: "Can I connect my own custom domain (e.g. www.mystore.com)?",
    a: "Absolutely! You can use your custom domain (e.g., .com, .com.bd, .store) or start instantly with a free sub-domain (yourstore.ezcome.app). Custom domain setup takes under 2 minutes with automated SSL security included.",
  },
  {
    q: "Do I need any technical or coding skills to build my storefront?",
    a: "Zero coding needed. Commerce Engine features a visual, merchant-friendly store editor. You can update colors, fonts, hero banners, product lists, and navigation menus with live real-time previews.",
  },
  {
    q: "How does courier integration (Steadfast, Pathao, RedX) work?",
    a: "You can connect your existing courier API keys in your settings. Once an order is confirmed, click 'Book Courier' in your dashboard to generate consignment IDs, print shipping labels, and auto-send tracking SMS to your buyers.",
  },
  {
    q: "Is there a transaction commission fee on my sales?",
    a: "No! Unlike other platforms that take 2% - 5% of your hard-earned revenue, Commerce Engine charges 0% transaction fees on all plans. You keep 100% of your profits.",
  },
  {
    q: "How long does it take to get my online store live?",
    a: "You can go live in less than 60 seconds! Select a pre-designed template for your niche, upload your store logo & products, add your bKash number, and share your live link immediately.",
  },
];

export function ModernHighConvertingLandingPage() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // ROI Calculator State
  const [dailyOrders, setDailyOrders] = useState<number>(25);
  const [avgOrderValue, setAvgOrderValue] = useState<number>(1500);

  // Live Sandbox Preview State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("fashion");
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");
  const [simulatedCart, setSimulatedCart] = useState<number>(1);
  const [simulatedTrxId, setSimulatedTrxId] = useState<string>("");
  const [trxVerified, setTrxVerified] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const isLight = mounted ? (currentTheme ? currentTheme === "light" : resolvedTheme === "light") : false;
  const currentTemplate = STORE_TEMPLATES.find((t) => t.id === selectedTemplateId) || STORE_TEMPLATES[0];

  // ROI Calculations
  const monthlyOrders = dailyOrders * 30;
  const monthlyRevenue = monthlyOrders * avgOrderValue;
  // Estimated 24% boost from 1-click checkout vs DM dropoffs
  const extraRevenue = Math.round(monthlyRevenue * 0.24);
  // Estimated hours saved: 10 mins per DM order * orders / 60
  const hoursSaved = Math.round((monthlyOrders * 10) / 60);

  // Simulate bKash TrxID verification
  const handleVerifyTrx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatedTrxId.trim()) return;
    setTrxVerified(true);
    setTimeout(() => {
      setTrxVerified(false);
      setSimulatedTrxId("");
    }, 4000);
  };

  return (
    <div className={`relative min-h-screen overflow-hidden font-body ${isLight ? "bg-slate-50 text-slate-900" : "bg-[#050814] text-white"}`}>
      {/* Background Lighting & Glow Orbs */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-full max-w-7xl -translate-x-1/2 overflow-hidden opacity-50 blur-[130px]">
        <div className="absolute -left-20 -top-20 h-[450px] w-[450px] rounded-full bg-emerald-500/25 animate-float-orb-1" />
        <div className="absolute right-0 top-32 h-[500px] w-[500px] rounded-full bg-indigo-600/20 animate-float-orb-2" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-purple-600/15" />
      </div>

      {/* Grid Pattern Overlay */}
      <div
        className={`pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:32px_32px] ${
          isLight ? "opacity-[0.06]" : "opacity-[0.08]"
        }`}
      />

      {/* 1. TOP URGENT ANNOUNCEMENT BAR */}
      <div className="relative z-50 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 px-4 py-2.5 text-center text-xs sm:text-sm font-semibold text-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-white">
            <Flame className="h-3.5 w-3.5 fill-amber-300 text-amber-300 animate-pulse" />
            Limited Offer
          </span>
          <span>Start your store in 60s with <strong>0% Transaction Fees</strong> + 14-Day Free Trial</span>
          <Link
            href="/signup"
            className="hidden sm:inline-flex items-center gap-1 underline underline-offset-4 hover:text-emerald-100 transition-colors font-bold ml-1"
          >
            Claim Offer <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. NAVIGATION BAR */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl border-b transition-all duration-300 border-white/10 bg-slate-950/40">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="group flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-lg font-black text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-transform group-hover:scale-105">
                EZ
              </div>
              <div>
                <span className="font-heading text-xl font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  {PLATFORM_BRAND_NAME}
                </span>
                <span className="block text-[10px] uppercase tracking-[0.25em] font-semibold text-emerald-400">
                  Ecommerce Engine
                </span>
              </div>
            </Link>

            {/* Live Operational Status */}
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>1,420+ Stores Live Today</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-300">
            <a href="#demo-sandbox" className="hover:text-emerald-400 transition-colors">
              Live Demo
            </a>
            <a href="#roi-calculator" className="hover:text-emerald-400 transition-colors">
              ROI Calculator
            </a>
            <a href="#pain-vs-solution" className="hover:text-emerald-400 transition-colors">
              Why Us
            </a>
            <a href="#templates" className="hover:text-emerald-400 transition-colors">
              Templates
            </a>
            <a href="#reviews" className="hover:text-emerald-400 transition-colors">
              Stories
            </a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/old"
              className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-900/60 px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:border-slate-500 hover:text-white transition-all"
              title="View original classic landing page"
            >
              <RotateCcwIcon className="h-3.5 w-3.5" />
              Classic View
            </Link>

            <button
              type="button"
              onClick={() => setTheme(isLight ? "dark" : "light")}
              className="rounded-full p-2.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Toggle theme"
            >
              {isLight ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
            </button>

            <Link
              href="/admin/login"
              className="hidden sm:inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
            >
              Log In
            </Link>

            <Link
              href="/signup"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 p-[2px] font-bold text-white shadow-[0_0_30px_rgba(16,185,129,0.35)] transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(16,185,129,0.5)]"
            >
              <span className="flex items-center gap-2 rounded-full bg-slate-950/80 px-5 py-2.5 text-sm transition-all group-hover:bg-transparent">
                <span>Start Free Trial</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-emerald-400 shadow-inner">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>Next-Gen E-Commerce Engine for Growing Brands</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tight">
              Turn Social Media Followers Into a{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                24/7 Automated Sales Machine
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Stop losing buyers in endless Messenger & WhatsApp chats. Launch a high-converting storefront with{" "}
              <strong className="text-white">bKash/Nagad automated TrxID verification</strong>, 1-click courier shipping (Steadfast, Pathao), and zero transaction fees.
            </p>

            {/* Dual CTAs */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-9 py-4 text-base font-extrabold text-slate-950 shadow-[0_0_40px_rgba(16,185,129,0.45)] hover:shadow-[0_0_50px_rgba(16,185,129,0.6)] hover:scale-105 transition-all duration-300"
              >
                <span>Launch Your Store Free</span>
                <ArrowRight className="h-5 w-5" />
              </Link>

              <a
                href="#demo-sandbox"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-8 py-4 text-base font-bold text-slate-200 hover:border-slate-500 hover:bg-slate-800 hover:text-white transition-all"
              >
                <Play className="h-4 w-4 fill-emerald-400 text-emerald-400" />
                <span>Test Live Interactive Demo</span>
              </a>
            </div>

            {/* Trust Micro Cues */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs sm:text-sm font-medium text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> No Credit Card Required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> 14-Day Unlimited Free Trial
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> 0% Transaction Fees
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Setup in Under 60 Seconds
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. LIVE INTERACTIVE STORE DEMO SANDBOX */}
      <section id="demo-sandbox" className="relative py-16 bg-slate-950/60 border-y border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold text-emerald-400 uppercase tracking-widest">
              <Monitor className="h-3.5 w-3.5" /> Interactive Sandbox
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold">
              Experience How Your Store Looks & Functions Right Now
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Select your business niche below, toggle desktop/mobile view, and test the 1-click bKash TrxID checkout!
            </p>

            {/* Niche & Device Controls */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex rounded-2xl bg-slate-900 p-1.5 border border-white/10">
                {STORE_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                      selectedTemplateId === tmpl.id
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tmpl.category.split(" ")[0]}
                  </button>
                ))}
              </div>

              <div className="inline-flex rounded-2xl bg-slate-900 p-1.5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                    previewDevice === "desktop" ? "bg-white text-slate-950 shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" /> Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                    previewDevice === "mobile" ? "bg-emerald-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" /> Mobile View
                </button>
              </div>
            </div>
          </div>

          {/* Showcase Device Canvas */}
          <div className="relative mx-auto transition-all duration-500 max-w-5xl">
            <div
              className={`mx-auto rounded-3xl border border-white/15 bg-[#090d1c] shadow-[0_25px_80px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-500 ${
                previewDevice === "mobile" ? "max-w-[380px]" : "w-full"
              }`}
            >
              {/* Browser Header */}
              <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-950/80 px-4 py-1 text-xs font-mono text-slate-400 border border-white/5 truncate max-w-[220px]">
                  <Lock className="h-3 w-3 text-emerald-400" />
                  <span>https://{currentTemplate.title.toLowerCase().replace(/[^a-z0-9]/g, "")}.ezcome.app</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                  <ShoppingBag className="h-4 w-4 text-emerald-400" />
                  <span>Cart ({simulatedCart})</span>
                </div>
              </div>

              {/* Storefront Header Banner */}
              <div className={`p-4 bg-gradient-to-r ${currentTemplate.gradient} border-b border-white/10 text-white space-y-2`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-300">
                    {currentTemplate.badge}
                  </span>
                  <span className="text-[11px] bg-white/10 rounded-full px-2.5 py-0.5 text-white/90">
                    {currentTemplate.convRate}
                  </span>
                </div>
                <h3 className="font-heading text-xl sm:text-2xl font-bold">{currentTemplate.heroHeadline}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{currentTemplate.heroSub}</p>
              </div>

              {/* Store Products Grid */}
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Featured Products</h4>
                  <span className="text-xs text-emerald-400 font-semibold cursor-pointer">View All →</span>
                </div>

                <div className={`grid gap-3 ${previewDevice === "mobile" ? "grid-cols-1" : "grid-cols-3"}`}>
                  {currentTemplate.products.map((p, idx) => (
                    <div
                      key={p.name}
                      className="rounded-2xl border border-white/10 bg-slate-900/90 p-3.5 space-y-2.5 transition-all hover:border-emerald-500/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          {p.tag}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                          <Star className="h-3 w-3 fill-amber-400" /> 4.9
                        </div>
                      </div>
                      <p className="text-sm font-bold text-white line-clamp-1">{p.name}</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-extrabold text-emerald-400">BDT {p.price}</span>
                          <span className="ml-1.5 text-xs text-slate-500 line-through">BDT {p.origPrice}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSimulatedCart((c) => c + 1)}
                          className="rounded-lg bg-emerald-500 p-1.5 text-slate-950 hover:bg-emerald-400 transition"
                          title="Add to Cart"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* bKash Payment Interactive Test Widget */}
                <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-rose-600 flex items-center justify-center text-[10px] font-black text-white">
                        bK
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">bKash / Nagad Instant Checkout</p>
                        <p className="text-[10px] text-slate-400">Send Payment to 01700-000000 & enter TrxID</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                      Automated
                    </span>
                  </div>

                  <form onSubmit={handleVerifyTrx} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter TrxID (e.g. B8A9X2M1)"
                      value={simulatedTrxId}
                      onChange={(e) => setSimulatedTrxId(e.target.value)}
                      className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                    >
                      Verify
                    </button>
                  </form>

                  {trxVerified && (
                    <div className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-2.5 text-center text-xs font-bold text-emerald-300 animate-fade-in flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      TrxID Verified! Order #1042 Confirmed & SMS Sent!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE REVENUE & TIME SAVINGS CALCULATOR */}
      <section id="roi-calculator" className="py-20 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950 p-6 sm:p-10 lg:p-12 shadow-2xl">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div className="space-y-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3.5 py-1 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                  <BarChart3 className="h-3.5 w-3.5" /> ROI Growth Simulator
                </span>
                <h2 className="font-heading text-3xl sm:text-4xl font-extrabold leading-tight">
                  Calculate How Much Extra Revenue You Will Unlock
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  Managing orders manually via DMs costs you up to 30% of lost sales due to slow responses and abandoned carts. Slide the controls below to see your potential growth with Commerce Engine:
                </p>

                {/* Slider Controls */}
                <div className="space-y-5 pt-2">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-slate-300">Daily Customer Enquiries / Orders</span>
                      <span className="text-emerald-400 font-extrabold text-base">{dailyOrders} Orders / Day</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="150"
                      value={dailyOrders}
                      onChange={(e) => setDailyOrders(Number(e.target.value))}
                      className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-slate-300">Average Order Value (BDT)</span>
                      <span className="text-emerald-400 font-extrabold text-base">BDT {avgOrderValue.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min="300"
                      max="6000"
                      step="100"
                      value={avgOrderValue}
                      onChange={(e) => setAvgOrderValue(Number(e.target.value))}
                      className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Growth Stats Card */}
              <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/90 p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="space-y-1 border-b border-white/10 pb-4">
                  <p className="text-xs uppercase tracking-widest font-bold text-slate-400">Estimated Monthly Store Sales</p>
                  <p className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
                    BDT {monthlyRevenue.toLocaleString()}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 space-y-1">
                    <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Extra Sales Recovered</p>
                    <p className="text-2xl font-black text-emerald-300">+BDT {extraRevenue.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">+24% from 1-Click Store Checkout</p>
                  </div>

                  <div className="rounded-xl bg-indigo-950/40 border border-indigo-500/30 p-4 space-y-1">
                    <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Time Saved / Month</p>
                    <p className="text-2xl font-black text-indigo-300">{hoursSaved} Hours</p>
                    <p className="text-[10px] text-slate-400">Zero manual bKash checking</p>
                  </div>
                </div>

                <Link
                  href="/signup"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-sm font-extrabold text-slate-950 hover:bg-emerald-400 transition"
                >
                  Unlock Your BDT {extraRevenue.toLocaleString()} Growth Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BEFORE VS AFTER PAIN POINT COMPARISON */}
      <section id="pain-vs-solution" className="py-20 bg-slate-950/80 border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 px-3.5 py-1 text-xs font-bold text-rose-400 uppercase tracking-widest">
              <Zap className="h-3.5 w-3.5" /> Market Transformation
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-extrabold">
              Stop Selling Like It’s 2015. Upgrade to Automated E-Commerce.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              See why leading Bangladeshi social commerce brands are switching from DM inbox chaos to Commerce Engine:
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-1">
            {PAIN_VS_SOLUTION.map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={item.feature}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 grid gap-6 lg:grid-cols-[220px_1fr_1fr] items-center hover:border-white/20 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <span className="font-heading text-base font-bold text-white">{item.feature}</span>
                  </div>

                  {/* Pain */}
                  <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-1">
                    <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      Old Way: Inbox Chaos
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{item.pain}</p>
                  </div>

                  {/* Solution */}
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 space-y-1">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      New Way: Commerce Engine
                    </div>
                    <p className="text-xs sm:text-sm text-white font-medium leading-relaxed">{item.solution}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. CORE FEATURE PILLARS */}
      <section className="py-20 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 px-3.5 py-1 text-xs font-bold text-teal-400 uppercase tracking-widest">
              <Award className="h-3.5 w-3.5" /> Platform Superpowers
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-extrabold">
              Everything You Need to Scale Your Store to 7 Figures
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Built from the ground up for speed, local payment ease, and maximum buyer conversion.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 space-y-4 hover:border-emerald-500/40 transition group">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                <Layout className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-xl font-bold">1-Click Storefront Builder</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Choose from conversion-tested templates for apparel, skincare, electronics, or bakery. Customize colors, fonts, and banners without writing a line of code.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-slate-400">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Mobile-first responsive layout</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Instant custom domain connection</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 space-y-4 hover:border-emerald-500/40 transition group">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-400 group-hover:scale-110 transition-transform">
                <CreditCard className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-xl font-bold">bKash, Nagad & COD Ready</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Empower your customers to pay advance via bKash/Nagad TrxID or Cash on Delivery. Automated verification reduces payment fraud to zero.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-slate-400">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Manual & automated TrxID matching</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Automated order confirmation SMS</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 space-y-4 hover:border-emerald-500/40 transition group">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-xl font-bold">Steadfast & Pathao Courier Sync</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Connect your courier accounts in seconds. Dispatch parcels with a single click, print shipping labels, and auto-update tracking status for customers.
              </p>
              <ul className="space-y-2 pt-2 text-xs text-slate-400">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> 1-Click order dispatch API</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Automatic customer parcel tracking</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 8. TESTIMONIALS & PROOF WALL */}
      <section id="reviews" className="py-20 bg-slate-950/90 border-y border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3.5 py-1 text-xs font-bold text-amber-400 uppercase tracking-widest">
              <Star className="h-3.5 w-3.5 fill-amber-400" /> Merchant Success Stories
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-extrabold">
              Loved by Over 1,200+ Bangladeshi Entrepreneurs
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Real results from merchants who replaced Messenger chaos with Commerce Engine:
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 space-y-6 flex flex-col justify-between hover:border-emerald-500/40 transition"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(t.stars)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400" />
                    ))}
                  </div>

                  <p className="text-sm sm:text-base text-slate-200 leading-relaxed italic">
                    "{t.quote}"
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <p className="font-heading text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs text-emerald-400 font-semibold">{t.role}</p>
                    <p className="text-[11px] text-slate-500">{t.location}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 text-xs font-extrabold text-emerald-400">
                      {t.metric}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. PRICING SECTION (INTEGRATED) */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold text-emerald-400 uppercase tracking-widest">
              <Percent className="h-3.5 w-3.5" /> Fair & Transparent Pricing
            </span>
            <h2 className="font-heading text-3xl sm:text-5xl font-extrabold">
              Start Free, Scale Without Limits & 0% Commissions
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Choose the plan that fits your current store size. Upgrade or cancel anytime.
            </p>
          </div>

          <CmsPricing />
        </div>
      </section>

      {/* 10. FAQ ACCORDION */}
      <section id="faq" className="py-20 bg-slate-950/80 border-t border-white/10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3.5 py-1 text-xs font-bold text-indigo-400 uppercase tracking-widest">
              <HelpCircle className="h-3.5 w-3.5" /> Frequently Asked Questions
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold">
              Everything You Need to Know Before Launching
            </h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left font-heading text-base font-bold text-white hover:text-emerald-400 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-emerald-400" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 11. FINAL HIGH-CONVERTING CTA BANNER */}
      <section className="py-20 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-8 sm:p-14 text-center text-white shadow-[0_20px_70px_rgba(16,185,129,0.3)]">
            <div className="max-w-3xl mx-auto space-y-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-white backdrop-blur-md">
                <RocketIcon className="h-4 w-4" /> Ready to Launch Your Store?
              </span>
              <h2 className="font-heading text-3xl sm:text-5xl font-extrabold leading-tight">
                Join 1,200+ Merchants Who Scaled Their Revenue Today
              </h2>
              <p className="text-emerald-100 text-sm sm:text-base max-w-2xl mx-auto">
                No credit card required. Setup takes under 60 seconds. Start your 14-day risk-free trial right now.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-9 py-4 text-base font-extrabold text-white shadow-xl hover:bg-slate-900 hover:scale-105 transition-all"
                >
                  Create Your Store Now Free
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/old"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 backdrop-blur-md px-8 py-4 text-base font-bold text-white hover:bg-white/20 transition-all"
                >
                  Explore Classic View
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 12. FOOTER */}
      <footer className="border-t border-white/10 bg-slate-950 py-12 text-slate-400 text-xs sm:text-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 font-extrabold text-slate-950">
              EZ
            </div>
            <div>
              <span className="font-heading font-extrabold text-white">{PLATFORM_BRAND_NAME}</span>
              <span className="block text-[10px] text-slate-500">© 2026 {PLATFORM_PRIMARY_DOMAIN}. All rights reserved.</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-slate-400">
            <Link href="/old" className="hover:text-emerald-400 transition-colors">
              Classic Landing Page
            </Link>
            <Link href="/about" className="hover:text-emerald-400 transition-colors">
              About
            </Link>
            <Link href="/faq" className="hover:text-emerald-400 transition-colors">
              FAQ
            </Link>
            <Link href="/contact" className="hover:text-emerald-400 transition-colors">
              Contact
            </Link>
            <Link href="/admin/login" className="hover:text-emerald-400 transition-colors">
              Merchant Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Simple Helper Icon Components
function RotateCcwIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function RocketIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.71.79-1.81.79-1.81" />
      <path d="M12 10l-4 4" />
      <path d="M15 13l-4 4" />
      <path d="M9 18l-4 4" />
      <path d="M14.5 9.5a5.5 5.5 0 0 0-7.78-7.78L2 6l5 5 1.5 1.5 5 5 4.28-4.72a5.5 5.5 0 0 0-3.28-9.28z" />
    </svg>
  );
}
