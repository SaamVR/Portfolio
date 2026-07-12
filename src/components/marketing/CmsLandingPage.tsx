"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  MessageCircleMore,
  Palette,
  PhoneCall,
  Rocket,
  ShieldCheck,
  Store,
  Truck,
  Sparkles,
  Check,
  Star,
  Settings,
  Monitor,
  Smartphone,
  Eye,
  Plus,
  ArrowRightLeft,
  Lock,
  ChevronDown,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CmsPricing } from "@/components/marketing/CmsPricing";

// Interactive theme color configs
const colorThemes = {
  emerald: {
    primary: "bg-emerald-500",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
    accent: "bg-emerald-500/10",
    gradient: "from-emerald-950 to-[#020804]",
    glow: "bg-emerald-500/10",
  },
  coral: {
    primary: "bg-rose-500",
    text: "text-rose-500",
    border: "border-rose-500/20",
    accent: "bg-rose-500/10",
    gradient: "from-rose-950 to-[#0c0204]",
    glow: "bg-rose-500/10",
  },
  indigo: {
    primary: "bg-indigo-500",
    text: "text-indigo-500",
    border: "border-indigo-500/20",
    accent: "bg-indigo-500/10",
    gradient: "from-indigo-950 to-[#020308]",
    glow: "bg-indigo-500/10",
  },
  luxury: {
    primary: "bg-amber-500",
    text: "text-amber-500",
    border: "border-amber-500/20",
    accent: "bg-amber-500/10",
    gradient: "from-amber-950 to-[#060401]",
    glow: "bg-amber-500/10",
  },
};

const fontThemes = {
  inter: "font-sans",
  serif: "font-serif",
  outfit: "font-mono",
};

const testimonials = [
  {
    quote: "We switched our checkout to Commerce Engine's bKash setup and sales jumped 42% in the first week. The trust cues and local support look extremely clean.",
    author: "Zarif Rahman",
    role: "Founder, Dhaka Thread Co.",
    rating: 5,
    avatarColor: "bg-emerald-500/20 text-emerald-300",
  },
  {
    quote: "Managing my catalog and campaign banners is incredibly fast now. I don't need a developer every time I run a weekend sale.",
    author: "Nabila H.",
    role: "Merchandiser, Bloom & Petals",
    rating: 5,
    avatarColor: "bg-amber-500/20 text-amber-300",
  },
];

const faqs = [
  {
    q: "How do manual bKash payments work?",
    a: "When customers choose manual payment at checkout, they see your bKash/Nagad personal number and instructions. They enter their Transaction ID (TrxID), and the order is created as pending. You verify the payment in your admin dashboard and activate the order with a single click.",
  },
  {
    q: "Can I connect my own custom domain?",
    a: "Absolutely! You can map your own domain (e.g. yourbrand.com) in your store settings. We auto-provision secure SSL certificates and routing to your store instantly.",
  },
  {
    q: "Do I need coding skills to design pages?",
    a: "None at all. Commerce Engine features an elegant page builder designed specifically for retail. You can configure layouts, reorder announcement bars, toggle trust badges, and upload media without typing code.",
  },
  {
    q: "How fast do storefront pages load?",
    a: "Every page is built on optimized edge templates, with pre-rendered product catalogs and optimized imagery. Your storefront loads in less than 600ms, ensuring you never lose a customer to slow load times.",
  },
];

export function CmsLandingPage() {
  const [activeTheme, setActiveTheme] = useState<keyof typeof colorThemes>("emerald");
  const [activeFont, setActiveFont] = useState<keyof typeof fontThemes>("inter");
  const [activeTab, setActiveTab] = useState<"checkout" | "builder" | "growth">("checkout");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [checklist, setChecklist] = useState({
    theme: true,
    products: false,
    payments: false,
    domain: false,
  });

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const theme = colorThemes[activeTheme];

  const toggleChecklist = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getReadinessScore = () => {
    const activeCount = Object.values(checklist).filter(Boolean).length;
    return activeCount * 25;
  };

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Dynamic Background Glows */}
      <div className={`fixed inset-0 pointer-events-none transition-all duration-1000 bg-gradient-to-b ${theme.gradient} opacity-40 z-0`} />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_120%,rgba(0,0,0,0.8),#030712)] z-[-1]" />

      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-[-1]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#030712]/60 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-heading text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-white font-black shadow-lg ${theme.primary} transition-colors duration-500`}>
              C
            </div>
            <span>COMMERCE<span className="text-primary"> Engine</span></span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            <a href="#why" className="transition-colors hover:text-white">Why it sells</a>
            <a href="#demo" className="transition-colors hover:text-white">Interactive Demo</a>
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#plans" className="transition-colors hover:text-white">Pricing</a>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/5">
              <Link href="/admin/login">Login</Link>
            </Button>
            <Button asChild size="sm" className={`rounded-full px-4 text-white hover:opacity-90 shadow-md ${theme.primary} transition-all duration-500`}>
              <Link href="/signup">Start Free</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-24 overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/80">
              <Sparkles className="h-4 w-4 text-primary" />
              White-label SaaS Website & E-commerce Builder
            </div>
            
            <h1 className="font-heading text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.1]">
              Scale your brand with a <span className="text-primary bg-clip-text">persuasive storefront</span> that drives sales.
            </h1>

            <p className="max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground">
              Don&apos;t just build another catalog. Commerce Engine helps you launch beautiful storefronts equipped with trust cues, local payment processing (bKash & Nagad), dynamic templates, and conversion tools built for growth.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Button asChild size="lg" className={`rounded-full px-8 text-white font-medium hover:opacity-90 shadow-xl ${theme.primary} transition-all duration-500`}>
                <Link href="/signup">
                  Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full border-white/10 text-white bg-white/5 backdrop-blur hover:bg-white/10">
                <a href="#demo">Try the Customizer</a>
              </Button>
            </div>

            {/* Quick Proof Grid */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/5">
              <div>
                <p className="text-2xl font-bold text-white">99.9%</p>
                <p className="text-xs text-muted-foreground mt-0.5">Uptime SLA guaranteed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">&lt; 1 min</p>
                <p className="text-xs text-muted-foreground mt-0.5">Live store generation</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">0%</p>
                <p className="text-xs text-muted-foreground mt-0.5">Hidden transaction fees</p>
              </div>
            </div>
          </div>

          {/* Mini Interactive Preview Sidebar */}
          <div className="relative">
            <div className={`absolute -inset-4 rounded-3xl ${theme.glow} blur-3xl opacity-50 transition-colors duration-1000`} />
            <div className="relative rounded-2xl border border-white/10 bg-[#090d16] p-5 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h3 className="font-heading font-bold text-white text-sm">Design Customizer Preview</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Simulate store styles instantly</p>
                </div>
                <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
                  <button 
                    onClick={() => setPreviewDevice("desktop")} 
                    className={`p-1.5 rounded ${previewDevice === "desktop" ? "bg-white/10 text-white" : "text-muted-foreground"}`}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={() => setPreviewDevice("mobile")} 
                    className={`p-1.5 rounded ${previewDevice === "mobile" ? "bg-white/10 text-white" : "text-muted-foreground"}`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Theme selectors */}
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Store Brand Palette</label>
                  <div className="flex gap-2.5 mt-2">
                    {Object.keys(colorThemes).map((name) => (
                      <button
                        key={name}
                        onClick={() => setActiveTheme(name as keyof typeof colorThemes)}
                        className={`h-7 w-7 rounded-full border-2 transition-transform duration-300 ${
                          activeTheme === name ? "border-white scale-110" : "border-transparent"
                        } ${
                          name === "emerald" ? "bg-emerald-500" : name === "coral" ? "bg-rose-500" : name === "indigo" ? "bg-indigo-500" : "bg-amber-500"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Store Typography</label>
                  <div className="flex gap-2 mt-2">
                    {Object.keys(fontThemes).map((f) => (
                      <button
                        key={f}
                        onClick={() => setActiveFont(f as keyof typeof fontThemes)}
                        className={`px-3 py-1 text-xs border rounded-md capitalize transition-colors ${
                          activeFont === f 
                            ? "border-primary bg-primary/10 text-primary" 
                            : "border-white/10 bg-white/5 text-muted-foreground hover:text-white"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* The Live Interactive Storefront Preview Card */}
              <div className={`transition-all duration-300 border ${theme.border} bg-[#040810] rounded-xl overflow-hidden shadow-inner ${
                previewDevice === "mobile" ? "max-w-[280px] mx-auto" : "w-full"
              }`}>
                {/* Header preview */}
                <div className="border-b border-white/5 px-4 py-2 flex items-center justify-between text-[11px] text-white">
                  <span className={`font-black ${fontThemes[activeFont]}`}>DHAKA STYLE</span>
                  <div className="flex gap-2 text-white/60">
                    <span>Shop</span>
                    <span>Story</span>
                  </div>
                </div>

                {/* Promo banner */}
                <div className={`px-4 py-1.5 text-center text-[10px] text-white font-medium ${theme.primary} transition-colors duration-500`}>
                  Free shipping on orders above BDT 2,000!
                </div>

                {/* Hero / Product card preview */}
                <div className="p-4 space-y-3">
                  <div className="relative aspect-[4/3] rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                    <span className="text-[11px] text-muted-foreground font-mono">Product Image</span>
                    <span className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-bold text-white ${theme.primary}`}>
                      Hot Item
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h4 className={`text-white text-xs font-semibold ${fontThemes[activeFont]}`}>Premium Denim Jacket</h4>
                    <p className="text-[11px] text-muted-foreground">BDT 2,450</p>
                  </div>
                  <button className={`w-full py-1.5 rounded text-white text-[11px] font-bold ${theme.primary} hover:opacity-95 transition-opacity`}>
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why it Converts Section */}
      <section id="why" className="py-24 border-t border-white/5 bg-[#040710]/40 relative">
        <div className="mx-auto max-w-6xl px-4 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Why Commerce Engine converts traffic into revenue
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              Generic builders give you a blank canvas. We give you a conversions system optimized for building trust and completing checkouts.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4 hover:border-primary/20 transition-all">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-primary ${theme.accent}`}>
                <PhoneCall className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Trust-First Architecture</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We make policies, delivery times, store contacts, and reviews extremely visible. When customers feel secure, they place orders.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4 hover:border-primary/20 transition-all">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-primary ${theme.accent}`}>
                <CreditCard className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Local Payments Ready</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Supports automated bKash Payment Gateway alongside manual &quot;Send Money&quot; (TrxID) and Cash on Delivery flows out-of-the-box.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4 hover:border-primary/20 transition-all">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-primary ${theme.accent}`}>
                <Boxes className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Clean Multi-Tenant Control</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Add multiple stores, manage layouts, track orders, configure coupons, and view operational analytics under one dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive Section */}
      <section id="features" className="py-24 border-t border-white/5">
        <div className="mx-auto max-w-6xl px-4 space-y-12">
          <div className="max-w-2xl space-y-3">
            <span className="text-primary font-bold text-xs uppercase tracking-widest">Platform capabilities</span>
            <h2 className="font-heading text-3xl font-extrabold text-white sm:text-4xl">
              Equipped with every conversion tool you need
            </h2>
          </div>

          {/* Tabs header */}
          <div className="flex border-b border-white/10 gap-6">
            <button
              onClick={() => setActiveTab("checkout")}
              className={`pb-3 text-sm font-semibold relative transition-colors ${
                activeTab === "checkout" ? "text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              Local Checkout Flow
              {activeTab === "checkout" && <span className={`absolute bottom-0 inset-x-0 h-0.5 ${theme.primary}`} />}
            </button>
            <button
              onClick={() => setActiveTab("builder")}
              className={`pb-3 text-sm font-semibold relative transition-colors ${
                activeTab === "builder" ? "text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              CMS Page Builder
              {activeTab === "builder" && <span className={`absolute bottom-0 inset-x-0 h-0.5 ${theme.primary}`} />}
            </button>
            <button
              onClick={() => setActiveTab("growth")}
              className={`pb-3 text-sm font-semibold relative transition-colors ${
                activeTab === "growth" ? "text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              Growth Toolkit
              {activeTab === "growth" && <span className={`absolute bottom-0 inset-x-0 h-0.5 ${theme.primary}`} />}
            </button>
          </div>

          {/* Tabs Content */}
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] items-center">
            <div className="space-y-6">
              {activeTab === "checkout" && (
                <>
                  <h3 className="text-2xl font-bold text-white">Optimized Local Payment Processing</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Local customers have distinct payment expectations. Commerce Engine natively integrates with bKash and Nagad checkout options.
                  </p>
                  <ul className="space-y-3 text-sm text-white/80">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Automated tokenized bKash PGW (instant billing)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Manual bKash &quot;Send Money&quot; verification via TrxID input
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Custom delivery fees & Cash on Delivery (COD) settings
                    </li>
                  </ul>
                </>
              )}

              {activeTab === "builder" && (
                <>
                  <h3 className="text-2xl font-bold text-white">E-commerce Oriented Page Builder</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Build persuasive homepage and custom layouts by arranging conversion-optimized blocks. Reorder elements in real-time.
                  </p>
                  <ul className="space-y-3 text-sm text-white/80">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Promo banners, announcements, countdown timer sections
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Trust badges, category showcases, reviews carousel
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Multi-theme custom CSS panel with live previewing
                    </li>
                  </ul>
                </>
              )}

              {activeTab === "growth" && (
                <>
                  <h3 className="text-2xl font-bold text-white">Marketing & Sales Automations</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Promote your products and manage customer interactions. Keep customers coming back with dynamic discount rules.
                  </p>
                  <ul className="space-y-3 text-sm text-white/80">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Target promotional coupons and cart discount thresholds
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Moderate product reviews before publishing to storefront
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Clear customer contact inbox in admin dashboard
                    </li>
                  </ul>
                </>
              )}

              <Button asChild size="lg" className="rounded-full">
                <Link href="/signup">Try this Feature</Link>
              </Button>
            </div>

            {/* Visual Tab Mockups */}
            <div className="relative rounded-xl border border-white/5 bg-slate-950/60 p-5 shadow-2xl min-h-[300px] flex items-center justify-center">
              {activeTab === "checkout" && (
                <div className="w-full space-y-4 max-w-sm">
                  <div className="border border-white/10 rounded-lg p-4 bg-[#050914] space-y-3 text-white">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Payment Option</p>
                    <div className="border border-primary bg-primary/5 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-full border-4 border-primary" />
                        <span className="text-sm font-semibold">bKash (Send Money)</span>
                      </div>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">Popular</span>
                    </div>
                    <div className="border border-white/5 rounded-lg p-3 flex items-center gap-3 opacity-60">
                      <div className="h-4 w-4 rounded-full border" />
                      <span className="text-sm">Cash on Delivery</span>
                    </div>

                    <div className="bg-white/5 rounded-md p-3 space-y-2 text-[11px] text-muted-foreground">
                      <p>1. Send BDT 2,450 to: <strong className="text-white">01700-000000</strong></p>
                      <p>2. Enter Transaction ID (TrxID) below:</p>
                      <input 
                        disabled 
                        placeholder="e.g. 9J29X4L90B" 
                        className="w-full bg-[#030712] border border-white/10 rounded px-2 py-1 text-white font-mono text-xs" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "builder" && (
                <div className="w-full space-y-3 max-w-sm">
                  <div className="border border-white/10 rounded-lg p-3 bg-[#050914] space-y-2 text-white text-xs">
                    <div className="flex justify-between items-center text-muted-foreground pb-2 border-b border-white/5">
                      <span>Homepage Block List</span>
                      <span className="text-[10px] text-primary">Live layout</span>
                    </div>
                    <div className="border border-white/10 bg-white/5 rounded p-2.5 flex items-center justify-between">
                      <span>1. Announcement Bar</span>
                      <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded">Visible</span>
                    </div>
                    <div className="border border-white/10 bg-white/5 rounded p-2.5 flex items-center justify-between">
                      <span>2. Product Showcase Hero</span>
                      <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded">Visible</span>
                    </div>
                    <div className="border border-white/10 bg-white/5 rounded p-2.5 flex items-center justify-between opacity-50">
                      <span>3. Countdown Promo Timer</span>
                      <span className="text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded">Hidden</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "growth" && (
                <div className="w-full space-y-4 max-w-sm">
                  <div className="border border-white/10 rounded-lg p-4 bg-[#050914] text-white space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs text-muted-foreground">Store Performance</p>
                        <p className="text-lg font-bold text-white">BDT 145,200</p>
                      </div>
                      <span className="text-[10px] text-green-400 font-semibold bg-green-400/10 px-2 py-0.5 rounded">
                        +24% vs last week
                      </span>
                    </div>
                    <div className="h-16 flex items-end gap-2.5 pt-2 border-t border-white/5">
                      <div className="h-6 flex-1 bg-white/10 rounded-t" />
                      <div className="h-10 flex-1 bg-white/10 rounded-t" />
                      <div className="h-8 flex-1 bg-white/10 rounded-t" />
                      <div className="h-14 flex-1 bg-primary rounded-t" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Launch Readiness Checklist */}
      <section className="py-24 border-y border-white/5 bg-[#040710]/40 relative">
        <div className="mx-auto max-w-6xl px-4 grid gap-12 lg:grid-cols-[1fr_1fr] items-center">
          <div className="space-y-6">
            <span className="text-primary font-bold text-xs uppercase tracking-widest">Merchant Workspace Simulation</span>
            <h2 className="font-heading text-3xl font-extrabold text-white sm:text-4xl">
              Zero friction to publish.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We&apos;ve mapped out a simple, interactive onboarding sequence. Tick the items below to see your store readiness score increase!
            </p>

            <div className="space-y-3 max-w-md pt-2">
              <button 
                onClick={() => toggleChecklist("theme")} 
                className="w-full flex items-center justify-between border border-white/5 bg-[#050914] rounded-xl p-3.5 hover:bg-white/[0.02]"
              >
                <span className="text-sm font-medium text-white flex items-center gap-3">
                  <span className={`h-5 w-5 rounded border flex items-center justify-center text-xs ${checklist.theme ? "border-primary bg-primary text-white" : "border-white/20"}`}>
                    {checklist.theme && <Check className="h-3 w-3" />}
                  </span>
                  Choose Layout & Theme
                </span>
                <span className="text-xs text-muted-foreground">Step 1</span>
              </button>

              <button 
                onClick={() => toggleChecklist("products")} 
                className="w-full flex items-center justify-between border border-white/5 bg-[#050914] rounded-xl p-3.5 hover:bg-white/[0.02]"
              >
                <span className="text-sm font-medium text-white flex items-center gap-3">
                  <span className={`h-5 w-5 rounded border flex items-center justify-center text-xs ${checklist.products ? "border-primary bg-primary text-white" : "border-white/20"}`}>
                    {checklist.products && <Check className="h-3 w-3" />}
                  </span>
                  Add Products & Pricing
                </span>
                <span className="text-xs text-muted-foreground">Step 2</span>
              </button>

              <button 
                onClick={() => toggleChecklist("payments")} 
                className="w-full flex items-center justify-between border border-white/5 bg-[#050914] rounded-xl p-3.5 hover:bg-white/[0.02]"
              >
                <span className="text-sm font-medium text-white flex items-center gap-3">
                  <span className={`h-5 w-5 rounded border flex items-center justify-center text-xs ${checklist.payments ? "border-primary bg-primary text-white" : "border-white/20"}`}>
                    {checklist.payments && <Check className="h-3 w-3" />}
                  </span>
                  Link bKash or COD
                </span>
                <span className="text-xs text-muted-foreground">Step 3</span>
              </button>

              <button 
                onClick={() => toggleChecklist("domain")} 
                className="w-full flex items-center justify-between border border-white/5 bg-[#050914] rounded-xl p-3.5 hover:bg-white/[0.02]"
              >
                <span className="text-sm font-medium text-white flex items-center gap-3">
                  <span className={`h-5 w-5 rounded border flex items-center justify-center text-xs ${checklist.domain ? "border-primary bg-primary text-white" : "border-white/20"}`}>
                    {checklist.domain && <Check className="h-3 w-3" />}
                  </span>
                  Connect Custom Domain
                </span>
                <span className="text-xs text-muted-foreground">Step 4</span>
              </button>
            </div>
          </div>

          {/* Score preview card */}
          <div className="relative rounded-2xl border border-white/10 bg-[#090d16] p-6 shadow-2xl flex flex-col justify-between min-h-[320px]">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <div>
                  <h4 className="font-heading font-bold text-white text-base">Store Readiness Score</h4>
                  <p className="text-xs text-muted-foreground">Calculated launch requirements status</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  getReadinessScore() === 100 ? "bg-green-500/10 text-green-400" : "bg-primary/10 text-primary"
                }`}>
                  {getReadinessScore()}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-6 h-3 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${theme.primary}`} 
                  style={{ width: `${getReadinessScore()}%` }}
                />
              </div>

              <div className="mt-8 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ready Launch Actions</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${checklist.theme ? "bg-green-400" : "bg-red-400"}`} />
                    <span className={checklist.theme ? "text-white" : "text-muted-foreground"}>Theme customization configured</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${checklist.products ? "bg-green-400" : "bg-red-400"}`} />
                    <span className={checklist.products ? "text-white" : "text-muted-foreground"}>Product database listings added</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${checklist.payments ? "bg-green-400" : "bg-red-400"}`} />
                    <span className={checklist.payments ? "text-white" : "text-muted-foreground"}>bKash static number linked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${checklist.domain ? "bg-green-400" : "bg-red-400"}`} />
                    <span className={checklist.domain ? "text-white" : "text-muted-foreground"}>Custom domain records verified</span>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              disabled={getReadinessScore() < 100}
              className={`w-full mt-6 rounded-full font-bold ${theme.primary} text-white hover:opacity-90 disabled:opacity-50`}
            >
              {getReadinessScore() === 100 ? "Publish Live Storefront" : "Complete checklist to launch"}
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section (Server Component) */}
      <CmsPricing />

      {/* Dynamic Testimonials */}
      <section className="py-24 border-t border-white/5 bg-[#03060f]/60 relative">
        <div className="mx-auto max-w-6xl px-4 space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="font-heading text-3xl font-extrabold text-white">
              Loved by serious store owners
            </h2>
            <p className="text-muted-foreground">
              See how local brands are transforming their online customer experience.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {testimonials.map((test, index) => (
              <div key={index} className="rounded-2xl border border-white/5 bg-[#070b14]/80 p-6 space-y-4">
                <div className="flex gap-1">
                  {[...Array(test.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-white/90 text-sm leading-relaxed italic">&quot;{test.quote}&quot;</p>
                <div className="flex items-center gap-3 pt-2">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ${test.avatarColor}`}>
                    {test.author[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{test.author}</p>
                    <p className="text-xs text-muted-foreground">{test.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Objection Handling FAQs */}
      <section className="py-24 border-t border-white/5 relative">
        <div className="mx-auto max-w-4xl px-4 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="font-heading text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Clear answers to your platform and launch questions.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="border border-white/5 rounded-xl bg-white/[0.01] overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left text-white font-semibold text-sm hover:bg-white/[0.02]"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                    {faq.q}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${
                    openFaq === index ? "rotate-180" : ""
                  }`} />
                </button>
                <div className={`transition-all duration-300 overflow-hidden ${
                  openFaq === index ? "max-h-40 border-t border-white/5" : "max-h-0"
                }`}>
                  <p className="p-5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* High-Converting CTA Banner */}
      <section className="py-20 border-t border-white/5">
        <div className="mx-auto max-w-6xl px-4">
          <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#090d16] px-6 py-12 text-center shadow-2xl space-y-6">
            <div className={`absolute -inset-4 rounded-3xl ${theme.glow} blur-3xl opacity-30`} />
            <h2 className="font-heading text-3xl font-extrabold text-white sm:text-4xl relative z-10 max-w-2xl mx-auto">
              Ready to launch a storefront that actually converts?
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto relative z-10">
              Create your account in 30 seconds and experience the most convincing retail website builder.
            </p>
            <div className="flex justify-center gap-4 pt-2 relative z-10">
              <Button asChild size="lg" className={`rounded-full px-8 text-white font-semibold ${theme.primary} hover:opacity-90`}>
                <Link href="/signup">Start Free Trial</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#03060d] py-12 text-center text-xs text-muted-foreground relative z-10">
        <div className="mx-auto max-w-6xl px-4 space-y-6">
          <p className="font-heading text-sm font-bold text-white">COMMERCE ENGINE</p>
          <p className="max-w-md mx-auto">
            An industry-agnostic, white-label storefront and conversion CMS builder enabling merchants to launch beautiful online stores instantly.
          </p>
          <p className="pt-4 border-t border-white/5">
            &copy; {new Date().getFullYear()} Commerce Engine. All rights reserved. Built for modern local commerce.
          </p>
        </div>
      </footer>
    </main>
  );
}
