"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Globe, LayoutTemplate, MessageSquare, Palette, ShieldCheck, Sparkles } from "lucide-react";
import { PLATFORM_BRAND_NAME, PLATFORM_PRIMARY_DOMAIN } from "@/lib/platform/site-config";

const businessTypes = [
  {
    key: "fashion",
    label: "Fashion",
    headline: "Launch your next drop with a store that already feels branded.",
    blurb: "New arrivals, best sellers, and fast mobile browsing in one clean setup.",
    offer: "Launch week offer: 20% off with code NEWDROP",
  },
  {
    key: "beauty",
    label: "Beauty",
    headline: "Turn product trust into a cleaner beauty buying flow.",
    blurb: "Bundles, routines, and clear payment info built for higher confidence.",
    offer: "Bundle deal: free mini cleanser on routine orders",
  },
  {
    key: "bakery",
    label: "Bakery",
    headline: "Make daily menus and gift boxes easy to order from mobile.",
    blurb: "Warm presentation, clear delivery windows, and faster checkout.",
    offer: "Same-day Dhaka delivery for early orders",
  },
] as const;

const themeOptions = [
  { key: "light", label: "Soft Light", swatch: "bg-amber-200" },
  { key: "clean", label: "Clean Slate", swatch: "bg-slate-300" },
  { key: "bold", label: "Bold Contrast", swatch: "bg-emerald-400" },
] as const;

type BusinessKey = (typeof businessTypes)[number]["key"];
type ThemeKey = (typeof themeOptions)[number]["key"];

export function NewLandLandingPage() {
  const [business, setBusiness] = useState<BusinessKey>("fashion");
  const [theme, setTheme] = useState<ThemeKey>("light");
  const [storeName, setStoreName] = useState("Luna Wear");
  const [goal, setGoal] = useState("Start selling this week");
  const [domainReady, setDomainReady] = useState(true);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("mobile");

  const activeBusiness = businessTypes.find((item) => item.key === business) ?? businessTypes[0];

  const summary = useMemo(() => {
    return [
      `${storeName || activeBusiness.label} gets a branded homepage and mobile-friendly shop.`,
      `${domainReady ? `${storeName || "your-store"}.${PLATFORM_PRIMARY_DOMAIN}` : `preview.${PLATFORM_PRIMARY_DOMAIN}`} is ready to share.`,
      `${goal || "Start selling this week"} becomes the focus of the hero and setup flow.`,
    ];
  }, [activeBusiness.label, domainReady, goal, storeName]);

  const setupSteps = [
    {
      icon: LayoutTemplate,
      title: "Pick your store type",
      body: "Start from a layout that already fits how you sell.",
    },
    {
      icon: Palette,
      title: "Set the vibe",
      body: "Choose a cleaner visual style without touching code.",
    },
    {
      icon: Globe,
      title: "Preview your launch",
      body: "See the page, message, and domain together before signup.",
    },
  ] as const;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.12),_transparent_32%),linear-gradient(180deg,#fffdf7_0%,#ffffff_45%,#f8fafc_100%)] text-slate-950">
      <section className="relative overflow-hidden border-b border-slate-200/80">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_34%)]" />
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-sm font-black text-white shadow-[0_18px_40px_rgba(16,185,129,0.25)]">
                EZ
              </div>
              <div>
                <p className="font-heading text-lg font-extrabold tracking-[0.18em]">{PLATFORM_BRAND_NAME.toUpperCase()}</p>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{PLATFORM_PRIMARY_DOMAIN}</p>
              </div>
            </Link>
            <Link href="/signup" className="inline-flex min-h-11 items-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800">
              Start building
            </Link>
          </div>

          <div className="grid gap-8 pt-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:pt-14">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" />
                New landing direction
              </span>
              <div className="space-y-4">
                <h1 className="max-w-[12ch] font-heading text-5xl font-extrabold leading-[0.95] sm:max-w-none sm:text-6xl">
                  Sell faster with a storefront people understand instantly.
                </h1>
                <p className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                  {PLATFORM_BRAND_NAME} helps small stores launch a branded site, show payment and delivery details clearly, and go live without feeling lost.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-500 px-7 py-3 text-sm font-bold text-white shadow-[0_18px_40px_rgba(16,185,129,0.25)] transition hover:-translate-y-0.5">
                  Start your 14-day trial
                </Link>
                <a href="#live-preview" className="inline-flex min-h-12 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 px-7 py-3 text-sm font-bold text-emerald-800 transition hover:-translate-y-0.5 hover:bg-emerald-100">
                  Preview the page
                </a>
                <a href="#setup-lab" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-7 py-3 text-sm font-bold text-slate-900 transition hover:-translate-y-0.5 hover:bg-slate-50">
                  See the setup flow
                </a>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  "14-day trial",
                  "No code needed",
                  "Use your own domain",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.04)]">
                    <p className="text-sm font-semibold text-slate-900">{item}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white/92 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">How it works</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {setupSteps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.title} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <span className="text-xs font-bold text-slate-400">0{index + 1}</span>
                        </div>
                        <p className="mt-3 text-sm font-bold text-slate-950">{step.title}</p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600">{step.body}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div id="live-preview" className="rounded-[2rem] border border-slate-200 bg-white/92 p-4 shadow-[0_28px_80px_rgba(15,23,42,0.10)] sm:p-6">
              <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50/90 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Live concept</p>
                    <p className="mt-1 text-sm font-bold text-slate-950">{storeName || "Your store"} preview</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setPreviewMode("desktop")}
                      className={`rounded-full px-3 py-1 text-[10px] font-bold transition ${
                        previewMode === "desktop" ? "bg-slate-950 text-white" : "text-slate-500"
                      }`}
                    >
                      Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode("mobile")}
                      className={`rounded-full px-3 py-1 text-[10px] font-bold transition ${
                        previewMode === "mobile" ? "bg-emerald-500 text-white" : "text-slate-500"
                      }`}
                    >
                      Mobile
                    </button>
                  </div>
                </div>

                <div className={`mt-4 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white transition-all ${previewMode === "mobile" ? "mx-auto max-w-[360px]" : "w-full"}`}>
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="truncate text-[11px] font-mono text-slate-500">
                      {domainReady ? `${(storeName || "your-store").toLowerCase().replace(/\s+/g, "-")}.${PLATFORM_PRIMARY_DOMAIN}` : `preview.${PLATFORM_PRIMARY_DOMAIN}`}
                    </p>
                  </div>
                  <div className="space-y-4 p-4">
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Preview mode</p>
                        <p className="mt-1 text-sm font-bold text-slate-950">{previewMode === "mobile" ? "Mobile storefront" : "Desktop storefront"}</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">Clickable concept</span>
                    </div>
                    <div className="rounded-[1.4rem] bg-[linear-gradient(135deg,#ecfdf5_0%,#f8fafc_100%)] p-4">
                      <span className="inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                        {activeBusiness.label}
                      </span>
                      <h2 className="mt-3 max-w-[14ch] text-2xl font-extrabold leading-tight text-slate-950">
                        {activeBusiness.headline}
                      </h2>
                      <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">{activeBusiness.blurb}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Main goal</p>
                        <p className="mt-2 text-sm font-bold text-slate-950">{goal}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Offer</p>
                        <p className="mt-2 text-sm font-bold text-slate-950">{activeBusiness.offer}</p>
                      </div>
                    </div>

                    <div className={`grid gap-3 ${previewMode === "mobile" ? "grid-cols-1" : "sm:grid-cols-3"}`}>
                      {["Home", "Shop", "Offers"].map((item, index) => (
                        <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{item}</p>
                          <p className="mt-2 text-sm font-bold text-slate-950">
                            {index === 0 ? activeBusiness.headline : index === 1 ? `${activeBusiness.label} products with clearer browsing` : activeBusiness.offer}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Why this feels easier</p>
                      <div className="mt-3 space-y-3">
                        {summary.map((item) => (
                          <div key={item} className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                              <Check className="h-3.5 w-3.5" />
                            </div>
                            <p className="text-sm leading-relaxed text-slate-700">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="setup-lab" className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-slate-700">
              <MessageSquare className="h-3.5 w-3.5" />
              Better setup flow
            </span>
            <h2 className="font-heading text-[2.2rem] font-extrabold leading-tight sm:text-5xl">
              Guide the merchant one clear decision at a time.
            </h2>
            <p className="max-w-xl text-base leading-relaxed text-slate-600">
              This version keeps the setup friendly by showing fewer choices at once, using plain language, and reflecting every important input in the preview summary.
            </p>

            <div className="space-y-3">
              {[
                "Shorter copy that explains value before features",
                "Stronger trust cues near the CTA",
                "A setup flow that feels like a guided wizard on mobile",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="grid gap-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">1. Choose business</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {businessTypes.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setBusiness(item.key)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        business === item.key
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <p className="text-sm font-bold text-slate-950">{item.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">2. Name your store</p>
                <input
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                  className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                  placeholder="Enter store name"
                />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">3. Choose the message</p>
                <input
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                  placeholder="What do you want the homepage to communicate?"
                />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">4. Pick a visual mood</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {themeOptions.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTheme(item.key)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition ${
                        theme === item.key
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                      }`}
                    >
                      <span className={`h-3 w-3 rounded-full ${item.swatch}`} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">5. Domain readiness</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {domainReady ? "Use your branded domain from launch day" : "Start with a preview URL first"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDomainReady((value) => !value)}
                  className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2 text-sm font-bold transition ${
                    domainReady ? "bg-emerald-500 text-white" : "border border-slate-300 bg-white text-slate-900"
                  }`}
                >
                  {domainReady ? "Branded domain on" : "Preview domain only"}
                </button>
              </div>

              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">What changes instantly</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {summary.map((item) => (
                    <div key={item} className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm leading-relaxed text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <a href="#live-preview" className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800">
                Open live preview
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_28px_80px_rgba(15,23,42,0.22)] sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                <ShieldCheck className="h-3.5 w-3.5" />
                Simple next step
              </span>
              <h2 className="font-heading text-3xl font-extrabold sm:text-4xl">
                Start with the clearer version and keep the old homepage intact.
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                This route is designed as a fresh landing-page experiment for {PLATFORM_BRAND_NAME}, focused on clarity, mobile confidence, and a setup flow that feels easier to finish.
              </p>
            </div>
            <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-full bg-emerald-500 px-7 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5">
              Launch with EZCome
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
