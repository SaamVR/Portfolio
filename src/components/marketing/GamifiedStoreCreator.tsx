"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Palette,
  CreditCard,
  Truck,
  Layout,
  Store,
  Eye,
  Rocket,
  Zap,
  RotateCcw,
  ShoppingBag,
} from "lucide-react";
import { themePresets } from "@/lib/themePresets";

export interface GamifiedTemplateOption {
  id: string;
  name: string;
  category: string;
  presetId: string;
  heroTagline: string;
  heroTitle: string;
  heroHighlight: string;
  bgGradient: string;
  accentColor: string;
  previewImage: string;
  sampleProduct: { name: string; price: string; tag: string };
  defaultPayment: string;
  defaultCourier: string;
}

const TEMPLATES: GamifiedTemplateOption[] = [
  {
    id: "fashion",
    name: "Fashion Catalog",
    category: "Apparel & Lifestyle",
    presetId: "default",
    heroTagline: "New Season Drop '26",
    heroTitle: "Wear Your",
    heroHighlight: "Identity",
    bgGradient: "from-emerald-900/40 via-slate-900 to-slate-950",
    accentColor: "#10b981",
    previewImage: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80",
    sampleProduct: { name: "Oversized Minimalist Hoodie", price: "৳ 2,490", tag: "Best Seller" },
    defaultPayment: "bKash / Nagad + COD",
    defaultCourier: "SteadFast Courier",
  },
  {
    id: "beauty",
    name: "Beauty Storefront",
    category: "Skincare & Cosmetics",
    presetId: "rose-gold",
    heroTagline: "Clean & Organic Formulas",
    heroTitle: "Radiant Skin",
    heroHighlight: "Everyday",
    bgGradient: "from-rose-950/40 via-slate-900 to-slate-950",
    accentColor: "#f472b6",
    previewImage: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80",
    sampleProduct: { name: "Hyaluronic Glow Serum (30ml)", price: "৳ 1,850", tag: "Organic" },
    defaultPayment: "bKash / Card Prepayment",
    defaultCourier: "Pathao Parcel",
  },
  {
    id: "electronics",
    name: "Tech & Gadgets",
    category: "Consumer Tech",
    presetId: "midnight-blue",
    heroTagline: "Next-Gen Gear",
    heroTitle: "Power Up Your",
    heroHighlight: "Workflow",
    bgGradient: "from-blue-950/50 via-slate-900 to-slate-950",
    accentColor: "#3b82f6",
    previewImage: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
    sampleProduct: { name: "Pro Wireless ANC Headphones", price: "৳ 5,990", tag: "Tech Choice" },
    defaultPayment: "Visa/Mastercard + bKash",
    defaultCourier: "SteadFast Courier",
  },
  {
    id: "food",
    name: "Gourmet & Cafe",
    category: "Food & Bakery",
    presetId: "warm-earth",
    heroTagline: "Freshly Baked Daily",
    heroTitle: "Artisanal",
    heroHighlight: "Delights",
    bgGradient: "from-amber-950/40 via-slate-900 to-slate-950",
    accentColor: "#f59e0b",
    previewImage: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80",
    sampleProduct: { name: "Handcrafted Sourdough Bread", price: "৳ 420", tag: "Daily Fresh" },
    defaultPayment: "bKash + Cash on Delivery",
    defaultCourier: "Express Local Delivery",
  },
];

export function GamifiedStoreCreator({ lang = "en" }: { lang?: "en" | "bn" }) {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<GamifiedTemplateOption>(TEMPLATES[0]);
  const [storeName, setStoreName] = useState<string>("Urban Thread");
  const [selectedThemeId, setSelectedThemeId] = useState<string>(TEMPLATES[0].presetId);
  const [paymentBkash, setPaymentBkash] = useState<boolean>(true);
  const [paymentCod, setPaymentCod] = useState<boolean>(true);
  const [courierProvider, setCourierProvider] = useState<string>("SteadFast");

  const currentTheme = themePresets.find((t) => t.id === selectedThemeId) || themePresets[0];

  const handleTemplateSelect = (t: GamifiedTemplateOption) => {
    setSelectedTemplate(t);
    setSelectedThemeId(t.presetId);
    if (storeName === "Urban Thread" || storeName === "Glow Beauty" || storeName === "TechZone BD" || storeName === "Artisan Bakery") {
      if (t.id === "fashion") setStoreName("Urban Thread");
      else if (t.id === "beauty") setStoreName("Glow Beauty");
      else if (t.id === "electronics") setStoreName("TechZone BD");
      else if (t.id === "food") setStoreName("Artisan Bakery");
    }
  };

  const calculateScore = () => {
    let score = 25; // Step 1 completed
    if (activeStep >= 2) score += 25;
    if (activeStep >= 3) score += 25;
    if (activeStep >= 4) score += 25;
    return score;
  };

  const buildSignupUrl = () => {
    const params = new URLSearchParams();
    params.set("template", selectedTemplate.id);
    params.set("store_name", storeName);
    params.set("theme", selectedThemeId);
    return `/signup?${params.toString()}`;
  };

  return (
    <div className="w-full rounded-3xl border border-border/70 bg-gradient-to-b from-card/90 via-card to-background p-5 shadow-2xl backdrop-blur-xl md:p-8">
      {/* Top Bar: Progress & Live XP Bar */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-bold tracking-tight md:text-xl">
              {lang === "bn" ? "লাইভ স্টোর সিমুলেটর (১ মিনিটে চালু করুন)" : "Interactive Store Creation Simulator"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {lang === "bn" ? "টেমপ্লেট ও ব্র্যান্ড সাজিয়ে আপনার লাইভ স্টোরফ্রন্ট প্রিভিউ দেখুন" : "Test drive our template seed engine & customization setup in real-time"}
            </p>
          </div>
        </div>

        {/* Gamified XP Indicator */}
        <div className="flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold">
          <Zap className="h-4 w-4 text-emerald-400" />
          <span className="text-foreground">Store Readiness:</span>
          <span className="text-primary">{calculateScore()}%</span>
          <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${calculateScore()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step Navigation Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-border/50 pb-4">
        {[
          { num: 1, label: lang === "bn" ? "১. টেমপ্লেট নির্বাচন" : "1. Pick Template", icon: Layout },
          { num: 2, label: lang === "bn" ? "২. ব্র্যান্ড ও ডোমেইন" : "2. Brand & Name", icon: Store },
          { num: 3, label: lang === "bn" ? "৩. ভিজ্যুয়াল থিম" : "3. Visual Theme", icon: Palette },
          { num: 4, label: lang === "bn" ? "৪. পেমেন্ট ও কুরিয়ার" : "4. Checkout & Courier", icon: CreditCard },
        ].map(({ num, label, icon: Icon }) => (
          <button
            key={num}
            type="button"
            onClick={() => setActiveStep(num)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeStep === num
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary/40"
                : activeStep > num
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {activeStep > num && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
          </button>
        ))}
      </div>

      {/* Interactive Main Stage: Controls Left, Live Phone/Tablet Simulator Right */}
      <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Controls Column (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {activeStep === 1 && (
            <div className="space-y-4">
              <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {lang === "bn" ? "ব্যবসার ধরন অনুযায়ী টেমপ্লেট বেছে নিন" : "Select Your Business Seed Template"}
              </h3>
              <div className="grid gap-3">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTemplateSelect(t)}
                    className={`group flex items-center justify-between rounded-2xl border p-3.5 text-left transition-all ${
                      selectedTemplate.id === t.id
                        ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/50"
                        : "border-border/60 bg-card/60 hover:border-border hover:bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 shrink-0 rounded-xl bg-cover bg-center shadow-inner"
                        style={{ backgroundImage: `url(${t.previewImage})` }}
                      />
                      <div>
                        <p className="font-heading text-sm font-bold text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.category}</p>
                      </div>
                    </div>
                    <span
                      className="h-4 w-4 rounded-full border border-border"
                      style={{ backgroundColor: t.accentColor }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-4">
              <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {lang === "bn" ? "আপনার স্টোরের নাম দিন" : "Brand Identity & Subdomain"}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Store Name</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g. Urban Thread BD"
                  />
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <p className="text-xs font-semibold text-muted-foreground">Generated Free Subdomain:</p>
                  <p className="mt-1 font-mono text-sm font-bold text-primary">
                    https://{storeName.toLowerCase().replace(/[^a-z0-9]/g, "") || "my-store"}.ezcomo.shop
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    ✓ Custom domain (e.g. www.yourbrand.com) can be mapped in 1-click later.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {lang === "bn" ? "কালার প্যালেট ও থিম সিলেক্ট করুন" : "Visual Theme Palette"}
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {themePresets.slice(0, 6).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedThemeId(preset.id)}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-xs font-semibold transition-all ${
                      selectedThemeId === preset.id
                        ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40 text-foreground"
                        : "border-border/60 bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground"
                    }`}
                  >
                    <div className="flex shrink-0 gap-1">
                      <span className="h-4 w-4 rounded-full border border-border/40" style={{ backgroundColor: preset.preview.bg }} />
                      <span className="h-4 w-4 rounded-full border border-border/40" style={{ backgroundColor: preset.preview.primary }} />
                    </div>
                    <span className="truncate">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeStep === 4 && (
            <div className="space-y-4">
              <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {lang === "bn" ? "পেমেন্ট গেটওয়ে ও কুরিয়ার কানেকশন" : "Instant Operational Connections"}
              </h3>
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/60 bg-card/60 p-3.5 space-y-2.5">
                  <p className="text-xs font-bold text-foreground">Payment Gateways</p>
                  <label className="flex items-center gap-3 text-xs font-semibold text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentBkash}
                      onChange={(e) => setPaymentBkash(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    bKash / Nagad Instant Merchant Pay
                  </label>
                  <label className="flex items-center gap-3 text-xs font-semibold text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentCod}
                      onChange={(e) => setPaymentCod(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Cash on Delivery (COD)
                  </label>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/60 p-3.5 space-y-2">
                  <p className="text-xs font-bold text-foreground">Integrated Courier Partner</p>
                  <select
                    value={courierProvider}
                    onChange={(e) => setCourierProvider(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="SteadFast">SteadFast Courier (Automated Parcel Booking)</option>
                    <option value="Pathao">Pathao Courier</option>
                    <option value="Paperfly">Paperfly Logistics</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {activeStep < 4 ? (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => Math.min(prev + 1, 4))}
                className="inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 font-heading font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all"
              >
                {lang === "bn" ? "পরবর্তী ধাপ (থিম ও কনফিগ)" : "Continue to Next Step"}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href={buildSignupUrl()}
                className="inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 font-heading font-extrabold text-white shadow-xl shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] transition-all"
              >
                <Rocket className="h-5 w-5 animate-bounce" />
                {lang === "bn" ? "এই কনফিগারেশনে স্টোর তৈরি করুন" : "Launch Store With This Setup"}
              </Link>
            )}
            {activeStep > 1 && (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => Math.max(prev - 1, 1))}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground hover:text-foreground"
                title="Previous step"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Live Preview Device Frame (7 cols) */}
        <div className="lg:col-span-7">
          <div className="relative mx-auto max-w-md overflow-hidden rounded-[2.5rem] border-[6px] border-slate-800 bg-slate-950 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]">
            {/* Phone Notch & Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-5 py-3 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="font-mono text-[11px] font-semibold text-slate-300">
                  {storeName.toLowerCase().replace(/[^a-z0-9]/g, "") || "store"}.ezcomo.shop
                </span>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-400">
                LIVE PREVIEW
              </span>
            </div>

            {/* Dynamic Storefront View inside Frame */}
            <div
              className="relative min-h-[460px] p-5 transition-all duration-500"
              style={{
                backgroundColor: currentTheme.preview.bg,
                color: currentTheme.id === "monochrome" ? "#ffffff" : "#f8fafc",
              }}
            >
              {/* Store Navbar */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2 font-heading font-black tracking-wider text-white">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black"
                    style={{ backgroundColor: selectedTemplate.accentColor, color: "#000" }}
                  >
                    {storeName.slice(0, 2).toUpperCase() || "EC"}
                  </span>
                  <span className="text-sm">{storeName || "Your Store"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <ShoppingBag className="h-4 w-4" />
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-950"
                    style={{ backgroundColor: selectedTemplate.accentColor }}
                  >
                    Cart (0)
                  </span>
                </div>
              </div>

              {/* Dynamic Hero Banner */}
              <div
                className={`mt-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${selectedTemplate.bgGradient} p-5 shadow-lg`}
              >
                <span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  {selectedTemplate.heroTagline}
                </span>
                <h4 className="mt-2 font-heading text-xl font-black leading-tight text-white">
                  {selectedTemplate.heroTitle}{" "}
                  <span style={{ color: selectedTemplate.accentColor }}>{selectedTemplate.heroHighlight}</span>
                </h4>
                <p className="mt-2 text-xs text-slate-300">
                  {selectedTemplate.category} • Mobile optimized checkout ready.
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition-transform hover:scale-105"
                  style={{ backgroundColor: selectedTemplate.accentColor }}
                >
                  Shop Now <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Sample Merchandising Card */}
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Featured Catalog</p>
                  <span className="text-[11px] font-semibold text-emerald-400">View All</span>
                </div>
                <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3 flex gap-3.5 items-center">
                  <div
                    className="h-16 w-16 shrink-0 rounded-xl bg-cover bg-center shadow-md"
                    style={{ backgroundImage: `url(${selectedTemplate.previewImage})` }}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                      {selectedTemplate.sampleProduct.tag}
                    </span>
                    <h5 className="mt-1 truncate text-xs font-bold text-white">
                      {selectedTemplate.sampleProduct.name}
                    </h5>
                    <p className="mt-0.5 text-xs font-extrabold text-emerald-400">
                      {selectedTemplate.sampleProduct.price}
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Connections Footer Badges */}
              <div className="mt-5 border-t border-white/10 pt-3 flex flex-wrap gap-2 text-[10px] font-bold text-slate-400">
                {paymentBkash && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-pink-500/10 px-2 py-1 text-pink-400 border border-pink-500/20">
                    <CheckCircle2 className="h-3 w-3" /> bKash Ready
                  </span>
                )}
                {paymentCod && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" /> COD Active
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-1 text-blue-400 border border-blue-500/20">
                  <Truck className="h-3 w-3" /> {courierProvider}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
