"use client";

import Link from "next/link";
import { useState } from "react";
import { createStoreSlug } from "@/lib/slug";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  PhoneCall,
  Rocket,
  Sparkles,
  Check,
  Star,
  Settings,
  Monitor,
  Smartphone,
  Plus,
  Lock,
  ChevronDown,
  HelpCircle,
  Play,
  RotateCcw,
  Globe,
  Trash2,
  DollarSign,
  Gift,
  ArrowRightLeft,
  Layout,
  Sliders,
} from "lucide-react";

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

const colorThemes = {
  emerald: {
    name: "Emerald Grass",
    primary: "bg-emerald-500",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    accent: "bg-emerald-500/10",
    gradient: "from-emerald-950 via-slate-950 to-[#020804]",
    glow: "bg-emerald-500/20",
  },
  crimson: {
    name: "Crimson Velvet",
    primary: "bg-rose-600",
    text: "text-rose-400",
    border: "border-rose-600/30",
    accent: "bg-rose-600/10",
    gradient: "from-rose-950 via-slate-950 to-[#0c0204]",
    glow: "bg-rose-600/20",
  },
  indigo: {
    name: "Royal Indigo",
    primary: "bg-indigo-600",
    text: "text-indigo-400",
    border: "border-indigo-600/30",
    accent: "bg-indigo-600/10",
    gradient: "from-indigo-950 via-slate-950 to-[#020308]",
    glow: "bg-indigo-600/20",
  },
  amber: {
    name: "Luxury Gold",
    primary: "bg-amber-500",
    text: "text-amber-400",
    border: "border-amber-500/30",
    accent: "bg-amber-500/10",
    gradient: "from-amber-950 via-slate-950 to-[#060401]",
    glow: "bg-amber-500/20",
  },
};

const fontThemes = {
  inter: "font-sans",
  serif: "font-serif",
  outfit: "font-mono",
};

export function CmsLandingPage({ children }: { children?: React.ReactNode }) {
  const [activeTheme, setActiveTheme] = useState<keyof typeof colorThemes>("emerald");
  const [activeFont, setActiveFont] = useState<keyof typeof fontThemes>("inter");
  
  // Customizer state
  const [storeName, setStoreName] = useState("TRENDY CLOSET");
  const [announcementText, setAnnouncementText] = useState("⚡ 20% OFF WINTER LAUNCH WITH CODE: WINTER20");
  const [heroHeading, setHeroHeading] = useState("Elevate your wardrobe style");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // Merchant Sandbox states
  const [sandboxStep, setSandboxStep] = useState<1 | 2 | 3 | 4>(1);
  const [sandboxTemplate, setSandboxTemplate] = useState("fashion");
  const [sandboxProducts, setSandboxProducts] = useState<Array<{ name: string; price: number }>>([
    { name: "Premium Denim Shirt", price: 1850 },
    { name: "Urban Cargo Pants", price: 2200 },
  ]);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [sandboxPaymentEnabled, setSandboxPaymentEnabled] = useState(false);
  const [sandboxPaymentNumber, setSandboxPaymentNumber] = useState("01700-000000");
  const [sandboxDomain, setSandboxDomain] = useState("mybrand");
  const [domainConnecting, setDomainConnecting] = useState(false);
  const [domainConnected, setDomainConnected] = useState(false);
  const [sandboxError, setSandboxError] = useState("");
  
  // FAQs Objections
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const theme = colorThemes[activeTheme];
  const previewStoreUrl = absoluteStoreUrl({ slug: createStoreSlug(storeName || "my-store") });

  const handleAddProduct = () => {
    if (!newProductName.trim() || !newProductPrice) return;
    setSandboxProducts([
      ...sandboxProducts,
      { name: newProductName.trim(), price: parseFloat(newProductPrice) || 0 },
    ]);
    setNewProductName("");
    setNewProductPrice("");
    setSandboxError("");
  };

  const handleRemoveProduct = (index: number) => {
    setSandboxProducts(sandboxProducts.filter((_, i) => i !== index));
  };

  const handleConnectDomain = () => {
    if (!sandboxDomain.trim()) return;
    setDomainConnecting(true);
    setSandboxError("");
    setTimeout(() => {
      setDomainConnecting(false);
      setDomainConnected(true);
    }, 1800);
  };

  const isStepComplete = (step: number) => {
    if (step === 1) return !!sandboxTemplate;
    if (step === 2) return sandboxProducts.length > 0;
    if (step === 3) return sandboxPaymentEnabled && sandboxPaymentNumber.trim().length > 8;
    if (step === 4) return domainConnected;
    return false;
  };

  const handleNextStep = () => {
    setSandboxError("");
    if (sandboxStep === 1) {
      if (!sandboxTemplate) {
        setSandboxError("Please select a template layout layout first.");
        return;
      }
      setSandboxStep(2);
    } else if (sandboxStep === 2) {
      if (sandboxProducts.length === 0) {
        setSandboxError("Please add at least one product to the storefront catalog.");
        return;
      }
      setSandboxStep(3);
    } else if (sandboxStep === 3) {
      if (!sandboxPaymentEnabled) {
        setSandboxError("Please check manual payment to configure payments.");
        return;
      }
      if (sandboxPaymentNumber.trim().length < 8) {
        setSandboxError("Please enter a valid bKash personal receiver number.");
        return;
      }
      setSandboxStep(4);
    }
  };

  const getSandboxProgress = () => {
    let completed = 0;
    if (isStepComplete(1)) completed++;
    if (isStepComplete(2)) completed++;
    if (isStepComplete(3)) completed++;
    if (isStepComplete(4)) completed++;
    return completed * 25;
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white selection:bg-emerald-500 selection:text-slate-950 relative overflow-x-hidden">
      {/* Background Decorative Mesh Orbs */}
      <div className={`absolute left-[-10%] top-[5%] h-[500px] w-[500px] rounded-full ${theme.glow} blur-[120px] opacity-40 transition-all duration-1000 animate-float-orb-1 pointer-events-none`} />
      <div className="absolute right-[-10%] top-[25%] h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[130px] opacity-30 animate-float-orb-2 pointer-events-none" />
      <div className={`absolute left-[20%] bottom-[10%] h-[400px] w-[400px] rounded-full ${theme.glow} blur-[110px] opacity-20 transition-all duration-1000 pointer-events-none`} />

      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl transition-all">
        <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-heading text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-white font-black shadow-lg ${theme.primary} transition-all duration-500 animate-pulse-glow`}>
              C
            </div>
            <span className="font-extrabold tracking-wide">
              COMMERCE<span className={theme.text}> ENGINE</span>
            </span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-zinc-300 md:flex font-medium">
            <a href="#demo" className="nav-link-anim pb-1 text-zinc-300 hover:text-white transition-colors">Visual Customizer</a>
            <a href="#sandbox" className="nav-link-anim pb-1 text-zinc-300 hover:text-white transition-colors">Setup Sandbox</a>
            <a href="#why" className="nav-link-anim pb-1 text-zinc-300 hover:text-white transition-colors">Core Strategy</a>
            <a href="#plans" className="nav-link-anim pb-1 text-zinc-300 hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href="/admin/login" 
              className="text-zinc-300 hover:text-white px-4 py-2 text-sm font-semibold rounded-full hover:bg-white/5 transition-all"
            >
              Login
            </Link>
            <Link 
              href="/signup" 
              className={`rounded-full px-5 py-2.5 text-sm text-white font-bold shadow-lg hover:brightness-110 ${theme.primary} transition-all duration-500`}
            >
              Start Building
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero with visual editor customizer */}
      <section id="demo" className="relative pt-12 pb-24 px-4 max-w-6xl mx-auto z-10">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] items-start">
          
          {/* Headline copy */}
          <div className="space-y-6 lg:sticky lg:top-28">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400">
              <Sparkles className="h-4 w-4 animate-spin-slow" />
              Interactive Editor Playground
            </div>

            <h1 className="font-heading text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.08]">
              Build your storefront <br />
              <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">visually & instantly.</span>
            </h1>

            <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-xl">
              Type, toggle, and change styles in the visual sandbox panel on the right. See how Commerce Engine aligns content blocks, announcement notices, and design presets to guarantee a sales-ready experience.
            </p>

            {/* Live customizer controls inside hero */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                <Sliders className="h-4 w-4 text-emerald-400" />
                Live Editor Input Controls
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-300 font-medium">Store Logo Name</label>
                  <input 
                    type="text" 
                    value={storeName} 
                    onChange={(e) => setStoreName(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all font-mono" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-300 font-medium">Promo Headline</label>
                  <input 
                    type="text" 
                    value={heroHeading} 
                    onChange={(e) => setHeroHeading(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-300 font-medium">Header Announcement Notice</label>
                <input 
                  type="text" 
                  value={announcementText} 
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all" 
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-white/5">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-300 font-medium block">Color Preset</label>
                  <div className="flex gap-2.5">
                    {Object.keys(colorThemes).map((name) => (
                      <button
                        key={name}
                        onClick={() => setActiveTheme(name as keyof typeof colorThemes)}
                        className={`h-7 w-7 rounded-full border-2 transition-all ${
                          activeTheme === name ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                        } ${
                          name === "emerald" ? "bg-emerald-500" : name === "crimson" ? "bg-rose-600" : name === "indigo" ? "bg-indigo-600" : "bg-amber-500"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-300 font-medium block">Typography</label>
                  <div className="flex gap-1.5 bg-slate-950 p-1 rounded-lg border border-white/10">
                    {Object.keys(fontThemes).map((font) => (
                      <button
                        key={font}
                        onClick={() => setActiveFont(font as keyof typeof fontThemes)}
                        className={`flex-1 text-[10px] py-1 rounded font-semibold capitalize transition-all ${
                          activeFont === font 
                            ? `${theme.primary} text-white shadow` 
                            : "text-zinc-500 hover:text-white"
                        }`}
                      >
                        {font}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link 
                href="/signup" 
                className={`inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 ${theme.primary} hover:brightness-110`}
              >
                Save & Register Store
              </Link>
              <a 
                href="#sandbox" 
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold px-8 py-3.5 text-sm transition-all duration-300 hover:-translate-y-0.5"
              >
                Onboarding Sandbox
              </a>
            </div>
          </div>

          {/* Visual Storefront Preview Output Panel */}
          <div className="space-y-4">
            
            {/* Unified Devices Bar */}
            <div className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-xl border border-white/10">
              <span className="text-xs font-semibold text-zinc-400">Storefront Live Preview</span>
              <div className="flex gap-1.5 bg-slate-950 p-1 rounded-lg border border-white/5">
                <button 
                  onClick={() => setPreviewDevice("desktop")} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                    previewDevice === "desktop" ? `${theme.primary} text-white shadow` : "text-zinc-500 hover:text-white"
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" /> Desktop view
                </button>
                <button 
                  onClick={() => setPreviewDevice("mobile")} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                    previewDevice === "mobile" ? `${theme.primary} text-white shadow` : "text-zinc-500 hover:text-white"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" /> Mobile view
                </button>
              </div>
            </div>

            {/* Simulated browser container */}
            <div className={`transition-all duration-500 border-2 ${theme.border} bg-[#02050c] rounded-3xl shadow-2xl overflow-hidden relative ${
              previewDevice === "mobile" ? "max-w-[340px] mx-auto" : "w-full"
            }`}>
              
              {/* Fake Browser Top Chrome */}
              <div className="bg-slate-900/90 border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <div className="bg-slate-950/80 border border-white/5 rounded-md px-3 py-0.5 text-[10px] text-zinc-500 font-mono w-1/2 text-center truncate">
                  {previewStoreUrl}
                </div>
                <div className="w-10" />
              </div>

              {/* Storefront live updated announcement notice */}
              {announcementText.trim() && (
                <div className={`px-4 py-2 text-center text-xs font-bold text-white tracking-wide transition-all duration-500 ${theme.primary} animate-pulse-glow`}>
                  {announcementText}
                </div>
              )}

              {/* Storefront navigation */}
              <div className="px-5 py-4 flex justify-between items-center border-b border-white/5 bg-[#030712]/50">
                <span className={`text-sm font-extrabold tracking-widest text-white transition-all duration-300 ${fontThemes[activeFont]}`}>
                  {storeName || "MY STORE"}
                </span>
                <div className="flex gap-4 text-xs font-medium text-zinc-400">
                  <span className="hover:text-white cursor-pointer">Catalog</span>
                  <span className="hover:text-white cursor-pointer">New Drops</span>
                </div>
              </div>

              {/* Storefront body hero mockup */}
              <div className="p-6 space-y-6">
                <div className="text-center py-6 space-y-3">
                  <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded bg-white/5 border border-white/10 ${theme.text}`}>
                    Seasonal Showcase
                  </span>
                  <h2 className={`text-2xl font-bold tracking-tight text-white ${fontThemes[activeFont]} transition-all duration-500`}>
                    {heroHeading || "Find your premium look"}
                  </h2>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Handcrafted premium garments designed for fit, style, and absolute comfort.
                  </p>
                </div>

                {/* Product Grid Mockup */}
                <div className="grid gap-4 grid-cols-2">
                  <div className="border border-white/5 bg-slate-900/40 rounded-2xl p-3.5 space-y-3 group hover:border-white/10 transition-all">
                    <div className="aspect-[4/5] bg-white/5 rounded-xl flex items-center justify-center relative overflow-hidden">
                      <span className="text-[10px] text-zinc-600 font-mono">Product Media</span>
                      <span className={`absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded font-bold text-white uppercase ${theme.primary}`}>
                        New
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-white truncate">Premium Oversized Hoodie</p>
                      <p className={`text-[10px] font-bold ${theme.text}`}>BDT 2,890</p>
                    </div>
                    <button className={`w-full py-1.5 rounded-lg text-[10px] font-bold text-white transition-all ${theme.primary} hover:brightness-115`}>
                      Add to Cart
                    </button>
                  </div>

                  <div className="border border-white/5 bg-slate-900/40 rounded-2xl p-3.5 space-y-3 group hover:border-white/10 transition-all">
                    <div className="aspect-[4/5] bg-white/5 rounded-xl flex items-center justify-center relative overflow-hidden">
                      <span className="text-[10px] text-zinc-600 font-mono">Product Media</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-white truncate">Structured Fit Trouser</p>
                      <p className={`text-[10px] font-bold ${theme.text}`}>BDT 1,950</p>
                    </div>
                    <button className={`w-full py-1.5 rounded-lg text-[10px] font-bold text-white transition-all ${theme.primary} hover:brightness-115`}>
                      Add to Cart
                    </button>
                  </div>
                </div>

                {/* Simulated trust badges */}
                <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4 text-center">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-white">🚚 Fast Shipping</div>
                    <div className="text-[8px] text-zinc-500">Dhaka & Nationwide</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-white">💰 Cash on Delivery</div>
                    <div className="text-[8px] text-zinc-500">COD / bKash Pay</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-white">⚡ Easy Return</div>
                    <div className="text-[8px] text-zinc-500">7-Day Guarantee</div>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Setup Sandbox Sandbox Interactive Tool */}
      <section id="sandbox" className="py-24 border-t border-white/10 bg-slate-900/30 relative">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/5 border border-white/10 ${theme.text}`}>
              Merchant Walkthrough Sandbox
            </span>
            <h2 className="font-heading text-3xl font-extrabold text-white sm:text-4xl">
              Simulate your E-commerce Launch Flow
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Ticking tasks triggers setup steps. Walk through the workflow below to configure layout, products, and domains, and see how Commerce Engine automates validation.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start">
            
            {/* Simulation controls panel */}
            <div className="space-y-6">
              
              {/* Steps indicator */}
              <div className="flex justify-between items-center gap-3">
                {[1, 2, 3, 4].map((step) => (
                  <button
                    key={step}
                    onClick={() => {
                      setSandboxStep(step as any);
                      setSandboxError("");
                    }}
                    className={`flex-1 py-3 px-4 rounded-xl border text-center font-bold text-xs transition-all ${
                      sandboxStep === step
                        ? `border-emerald-500 ${theme.accent} text-white`
                        : isStepComplete(step)
                        ? "border-green-500/20 bg-green-500/5 text-green-400"
                        : "border-white/5 bg-[#03060f] text-zinc-500 hover:text-white"
                    }`}
                  >
                    Step {step}
                    <span className="block text-[10px] font-medium opacity-70">
                      {step === 1 ? "Template" : step === 2 ? "Products" : step === 3 ? "Payments" : "Custom Domain"}
                    </span>
                  </button>
                ))}
              </div>

              {/* Step content fields */}
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-6 shadow-xl space-y-6 min-h-[300px]">
                
                {/* Step 1: Layout Selection */}
                {sandboxStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-base font-bold text-white">Choose Store Industry Template</h4>
                      <p className="text-xs text-zinc-400 mt-1">Select an industry model optimized with custom section layouts.</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={() => {
                          setSandboxTemplate("fashion");
                          setSandboxError("");
                        }}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          sandboxTemplate === "fashion" ? "border-emerald-500 bg-white/5" : "border-white/5 hover:bg-white/[0.02]"
                        }`}
                      >
                        <Layout className="h-5 w-5 text-emerald-400 mb-2" />
                        <h5 className="text-xs font-bold text-white">Fashion & Apparel</h5>
                        <p className="text-[10px] text-zinc-500 mt-1">Optimized for sizing guides, reviews, and lookbooks.</p>
                      </button>

                      <button
                        onClick={() => {
                          setSandboxTemplate("food");
                          setSandboxError("");
                        }}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          sandboxTemplate === "food" ? "border-emerald-500 bg-white/5" : "border-white/5 hover:bg-white/[0.02]"
                        }`}
                      >
                        <Layout className="h-5 w-5 text-emerald-400 mb-2" />
                        <h5 className="text-xs font-bold text-white">Food & Grocery</h5>
                        <p className="text-[10px] text-zinc-500 mt-1">Optimized for quick add-to-carts and delivery timing.</p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Populate Products */}
                {sandboxStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-base font-bold text-white">Populate Store Catalog</h4>
                      <p className="text-xs text-zinc-400 mt-1">Add items to display in your storefront database catalog.</p>
                    </div>

                    {/* Add product input */}
                    <div className="grid gap-3 grid-cols-[2fr_1fr_auto] items-end bg-slate-900/60 p-3 rounded-lg border border-white/5">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-300 font-bold uppercase">Item Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Silk Scarf"
                          value={newProductName}
                          onChange={(e) => setNewProductName(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-300 font-bold uppercase">Price (BDT)</label>
                        <input
                          type="number"
                          placeholder="1200"
                          value={newProductPrice}
                          onChange={(e) => setNewProductPrice(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <button 
                        onClick={handleAddProduct} 
                        className={`h-9 px-4 rounded-lg text-xs font-bold text-white transition-all ${theme.primary} hover:brightness-110 flex items-center gap-1 shrink-0`}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </button>
                    </div>

                    {/* Current products list */}
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {sandboxProducts.map((p, i) => (
                        <div key={i} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5 text-xs text-white">
                          <div>
                            <span className="font-semibold">{p.name}</span>
                            <span className="text-[10px] text-zinc-400 ml-2">BDT {p.price}</span>
                          </div>
                          <button onClick={() => handleRemoveProduct(i)} className="text-zinc-500 hover:text-rose-500 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Linked Payments */}
                {sandboxStep === 3 && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-base font-bold text-white">Configure bKash Send Money & COD</h4>
                      <p className="text-xs text-zinc-400 mt-1">Activate bKash manual payment flows for direct merchant payout verification.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div>
                          <span className="text-xs font-bold text-white block">Manual bKash Send Money</span>
                          <span className="text-[10px] text-zinc-500">Allow customers to send money and submit TrxID</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={sandboxPaymentEnabled}
                          onChange={(e) => {
                            setSandboxPaymentEnabled(e.target.checked);
                            setSandboxError("");
                          }}
                          className="h-4 w-4 accent-emerald-500 rounded cursor-pointer"
                        />
                      </div>

                      {sandboxPaymentEnabled && (
                        <div className="space-y-1.5">
                          <label className="text-xs text-zinc-300 font-medium">Merchant bKash Receiver Number</label>
                          <input
                            type="text"
                            value={sandboxPaymentNumber}
                            onChange={(e) => {
                              setSandboxPaymentNumber(e.target.value);
                              setSandboxError("");
                            }}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 4: Map Custom Domain */}
                {sandboxStep === 4 && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-base font-bold text-white">Map Custom Domain Domain</h4>
                      <p className="text-xs text-zinc-400 mt-1">Point your custom branding domain and auto-provision TLS security.</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-2.5 text-zinc-650 text-xs font-mono">www.</span>
                          <input
                            type="text"
                            placeholder="mycoolbrand"
                            value={sandboxDomain}
                            onChange={(e) => {
                              setSandboxDomain(e.target.value.toLowerCase().replace(/\s+/g, ""));
                              setDomainConnected(false);
                              setSandboxError("");
                            }}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg pl-12 pr-12 py-2 text-xs text-white focus:outline-none font-mono"
                          />
                          <span className="absolute right-3 top-2.5 text-zinc-655 text-xs font-mono">.com</span>
                        </div>
                        <button 
                          onClick={handleConnectDomain} 
                          disabled={domainConnecting || !sandboxDomain.trim() || domainConnected}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            domainConnected 
                              ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                              : domainConnecting 
                              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                              : `${theme.primary} text-white hover:brightness-110`
                          }`}
                        >
                          {domainConnecting ? "Securing..." : domainConnected ? "Connected" : "Connect"}
                        </button>
                      </div>

                      {domainConnecting && (
                        <div className="space-y-2 bg-slate-900/40 border border-white/5 p-3 rounded-lg">
                          <div className="flex justify-between text-[10px] text-zinc-400">
                            <span>Auto-generating SSL Certificate...</span>
                            <span>In progress</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 animate-pulse w-2/3" />
                          </div>
                        </div>
                      )}

                      {domainConnected && (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-[11px] flex items-center gap-2 animate-bounce-in">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          Domain mapped successfully! SSL certified and secure.
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Progress CTA */}
              <div className="flex gap-4 items-center justify-between">
                <div className="text-xs text-zinc-400">
                  Current Step: <strong className="text-white">{sandboxStep} of 4</strong>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex gap-2">
                    <button
                      disabled={sandboxStep === 1}
                      onClick={() => {
                        setSandboxError("");
                        setSandboxStep((sandboxStep - 1) as any);
                      }}
                      className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                        sandboxStep === 1 
                          ? "text-zinc-650 cursor-not-allowed" 
                          : "text-zinc-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={handleNextStep}
                      disabled={sandboxStep === 4}
                      className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                        sandboxStep === 4 
                          ? "bg-zinc-800 text-zinc-550 cursor-not-allowed" 
                          : "bg-white hover:bg-zinc-200 text-slate-950"
                      }`}
                    >
                      Next Step
                    </button>
                  </div>
                  {sandboxError && (
                    <span className="text-[11px] font-semibold text-rose-400 mt-2 text-right animate-pulse">
                      ⚠️ {sandboxError}
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Simulated Live Launch Readiness Screen */}
            <div className="relative rounded-2xl border border-white/10 bg-[#060a12] p-6 shadow-2xl space-y-6">
              
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <div>
                  <h4 className="font-heading font-extrabold text-white text-base">Store Onboarding Setup Status</h4>
                  <p className="text-xs text-zinc-500">Interactive live analytics metric</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                  getSandboxProgress() === 100 ? "bg-green-500/10 text-green-400" : "bg-emerald-500/10 text-emerald-400"
                }`}>
                  {getSandboxProgress()}% Setup Ready
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${theme.primary}`} 
                  style={{ width: `${getSandboxProgress()}%` }}
                />
              </div>

              {/* Checklist details */}
              <div className="space-y-3 pt-2">
                
                <div className="flex items-center justify-between bg-white/[0.02] p-3 rounded-lg border border-white/5 text-xs">
                  <span className="flex items-center gap-2.5">
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isStepComplete(1) ? "bg-green-500/20 text-green-400" : "bg-white/5 text-zinc-500"
                    }`}>
                      {isStepComplete(1) ? <Check className="h-3.5 w-3.5" /> : "1"}
                    </span>
                    Theme Layout Preset Configured
                  </span>
                  <span className="text-zinc-500 capitalize">{sandboxTemplate || "None"}</span>
                </div>

                <div className="flex items-center justify-between bg-white/[0.02] p-3 rounded-lg border border-white/5 text-xs">
                  <span className="flex items-center gap-2.5">
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isStepComplete(2) ? "bg-green-500/20 text-green-400" : "bg-white/5 text-zinc-500"
                    }`}>
                      {isStepComplete(2) ? <Check className="h-3.5 w-3.5" /> : "2"}
                    </span>
                    Product Catalog Setup
                  </span>
                  <span className="text-zinc-500">{sandboxProducts.length} items added</span>
                </div>

                <div className="flex items-center justify-between bg-white/[0.02] p-3 rounded-lg border border-white/5 text-xs">
                  <span className="flex items-center gap-2.5">
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isStepComplete(3) ? "bg-green-500/20 text-green-400" : "bg-white/5 text-zinc-500"
                    }`}>
                      {isStepComplete(3) ? <Check className="h-3.5 w-3.5" /> : "3"}
                    </span>
                    Local Payments Connected
                  </span>
                  <span className="text-zinc-500">{sandboxPaymentEnabled ? "bKash Linked" : "None"}</span>
                </div>

                <div className="flex items-center justify-between bg-white/[0.02] p-3 rounded-lg border border-white/5 text-xs">
                  <span className="flex items-center gap-2.5">
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isStepComplete(4) ? "bg-green-500/20 text-green-400" : "bg-white/5 text-zinc-500"
                    }`}>
                      {isStepComplete(4) ? <Check className="h-3.5 w-3.5" /> : "4"}
                    </span>
                    Custom Domain Active
                  </span>
                  <span className="text-zinc-500">{domainConnected ? `${sandboxDomain}.com` : "None"}</span>
                </div>

              </div>

              {getSandboxProgress() === 100 ? (
                <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/10 space-y-3 animate-fade-in">
                  <p className="text-xs text-green-400 font-bold">🎉 Store onboarding complete! Your storefront is fully ready to deploy and accept orders.</p>
                  <Link 
                    href={`/signup?planId=growth&domain=${sandboxDomain}`}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg py-3 flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-green-600/20"
                  >
                    Launch Storefront to Live Server <Rocket className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="p-3 text-center border border-white/5 bg-white/5 rounded-xl text-xs text-zinc-400">
                  Complete setup requirements above to build the production build.
                </div>
              )}

            </div>

          </div>

        </div>
      </section>

      {/* Why EcomCMS Section */}
      <section id="why" className="py-24 max-w-6xl mx-auto px-4 z-10 relative">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] items-center">
          
          <div className="space-y-6">
            <span className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Growth Optimization</span>
            <h2 className="font-heading text-3xl font-extrabold text-white sm:text-4xl">
              Doubt kills checkout. We design trust.
            </h2>
            <p className="text-zinc-400 leading-relaxed text-sm sm:text-base">
              A good-looking homepage keeps visitors on the site, but transparent order information, local payment integrations, and clear refund timelines keep them checking out.
            </p>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-emerald-400 ${theme.accent}`}>
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Trust-first visual structure</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">Explicit return policy widgets, customer messaging hubs, and verified buyer reviews built natively.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-emerald-400 ${theme.accent}`}>
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Local bKash integration</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">Automated secure checkout flows along with simple Send Money TrxID verification to prevent duplicate payments.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Marketing features details grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-white/5 bg-slate-900/30 p-6 rounded-2xl space-y-3 hover:border-emerald-500/20 transition-all">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-emerald-400 ${theme.accent}`}>
                <Layout className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Section Builder</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Add, show, hide, or arrange homepage announcement notices, countdown timers, and product lists dynamically.
              </p>
            </div>

            <div className="border border-white/5 bg-slate-900/30 p-6 rounded-2xl space-y-3 hover:border-emerald-500/20 transition-all">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-emerald-400 ${theme.accent}`}>
                <Globe className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Custom Domain Settings</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Connect external domain names seamlessly. Secure with instant automatic SSL/TLS certificate updates.
              </p>
            </div>

            <div className="border border-white/5 bg-slate-900/30 p-6 rounded-2xl space-y-3 hover:border-emerald-500/20 transition-all">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-emerald-400 ${theme.accent}`}>
                <Star className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Buyer Reviews Hub</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Moderate and publish custom ratings, images, and verified badges to build storefront credibility.
              </p>
            </div>

            <div className="border border-white/5 bg-slate-900/30 p-6 rounded-2xl space-y-3 hover:border-emerald-500/20 transition-all">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-emerald-400 ${theme.accent}`}>
                <RotateCcw className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Fast Reconciliations</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Reconcile manual payments and approve pending order transactions directly in the central control plane.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Dynamic pricing plans (Server component logic included) */}
      {children}

      {/* OBJECTION FAQs ACCORDION */}
      <section className="py-24 max-w-4xl mx-auto px-4 z-10 relative">
        <div className="text-center space-y-3 mb-12">
          <h2 className="font-heading text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
          <p className="text-zinc-400 text-sm">Clear answers regarding payment integrations, domain connection, and setup rules.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-white/5 rounded-2xl bg-slate-900/40 overflow-hidden transition-all duration-300">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between p-5 text-left text-white font-bold text-sm hover:bg-white/[0.02] transition-all"
              >
                <span className="flex items-center gap-3">
                  <HelpCircle className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                  {faq.q}
                </span>
                <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform duration-300 ${
                  openFaq === idx ? "rotate-180 text-white" : ""
                }`} />
              </button>
              
              <div className={`transition-all duration-500 overflow-hidden ${
                openFaq === idx ? "max-h-40 border-t border-white/5 bg-slate-950/40" : "max-h-0"
              }`}>
                <p className="p-5 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Conversion Objections Call To Action */}
      <section className="py-20 max-w-6xl mx-auto px-4 z-10 relative">
        <div className="relative rounded-3xl border border-white/10 bg-[#050810] p-12 text-center shadow-2xl overflow-hidden">
          <div className={`absolute -inset-4 rounded-3xl ${theme.glow} blur-3xl opacity-35`} />
          <div className="relative z-10 space-y-6">
            <h2 className="font-heading text-3xl font-extrabold text-white sm:text-4xl max-w-xl mx-auto leading-tight">
              Ready to launch a storefront that drives sales?
            </h2>
            <p className="text-zinc-400 max-w-md mx-auto text-sm leading-relaxed">
              Join local brands building beautiful storefronts with Commerce Engine. Setup takes less than a minute.
            </p>
            <div className="flex justify-center gap-4 pt-2">
              <Link 
                href="/signup" 
                className={`rounded-full px-8 py-3.5 text-sm font-bold text-white shadow-xl transition-all duration-300 hover:-translate-y-0.5 ${theme.primary} hover:brightness-110`}
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-slate-950 py-12 text-center text-xs text-zinc-500 relative z-10">
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          <p className="font-heading text-sm font-extrabold text-white tracking-widest">COMMERCE ENGINE</p>
          <p className="max-w-md mx-auto text-zinc-500">
            An industry-agnostic, white-label CMS storefront builder designed for local payment recons, conversion optimization, and zero hosting friction.
          </p>
          <p className="pt-4 border-t border-white/5 text-[10px]">
            &copy; {new Date().getFullYear()} Commerce Engine. All rights reserved. Built for modern digital commerce.
          </p>
        </div>
      </footer>
    </main>
  );
}
