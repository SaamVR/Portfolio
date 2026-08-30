"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  CreditCard,
  Globe2,
  LayoutTemplate,
  PackageCheck,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { CmsPricing } from "@/components/marketing/CmsPricing";
import type { PlanCatalogRecord } from "@/lib/billing/plans";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/site-config";

type Language = "en" | "bn";

const copy = {
  en: {
    nav: { workflow: "How it works", templates: "Templates", pricing: "Pricing", login: "Merchant login", start: "Create a store" },
    badge: "Commerce tools with explicit connection state",
    title: "Build your storefront, manage orders, and keep operations in one place.",
    subtitle: "EZComo gives merchants a storefront editor, catalog and order tools, and configuration workflows for payments, delivery, domains, and store operations. Provider connections are shown according to their real configuration and verification state.",
    primary: "Create a store",
    secondary: "View live pricing",
    trust: ["Live plan catalog", "Store-scoped administration", "Connection status is explicit"],
    capabilitiesBadge: "What is available today",
    capabilitiesTitle: "A practical operating layer for an online store",
    capabilitiesSubtitle: "These are product capabilities, not promises that an external provider is already connected for every merchant.",
    templatesTitle: "Start from a storefront structure, then make it yours.",
    templatesBody: "Choose from business-oriented storefront templates and continue editing content, catalog, theme, and navigation from the merchant dashboard.",
    templatesCta: "Browse templates",
    workflowTitle: "External services stay explicit",
    workflowBody: "Payment and courier workflows distinguish not configured, configured, verified, and attention-needed states. A brand is never presented as connected merely because a setting exists.",
    workflowCta: "See the workflow",
    scenariosTitle: "See example store scenarios",
    scenariosBody: "Our examples demonstrate possible storefront setups. They are illustrations, not customer testimonials or reported merchant results.",
    scenariosCta: "View example scenarios",
    pricingEyebrow: "Authoritative pricing",
    pricingIntro: "The plan cards below start from the live public billing catalog used by the product. Prices, trial duration, store limits, and contact-only status are not hardcoded marketing claims.",
    footer: "Product availability can depend on plan entitlement, merchant configuration, provider verification, and external-provider terms.",
  },
  bn: {
    nav: { workflow: "কীভাবে কাজ করে", templates: "টেমপ্লেট", pricing: "মূল্য", login: "মার্চেন্ট লগইন", start: "স্টোর তৈরি করুন" },
    badge: "স্পষ্ট কানেকশন স্টেটসহ কমার্স টুলস",
    title: "স্টোরফ্রন্ট তৈরি করুন, অর্ডার সামলান এবং অপারেশন এক জায়গায় রাখুন।",
    subtitle: "EZComo মার্চেন্টদের স্টোরফ্রন্ট এডিটর, ক্যাটালগ ও অর্ডার টুল এবং পেমেন্ট, ডেলিভারি, ডোমেইন ও স্টোর অপারেশন কনফিগার করার ওয়ার্কফ্লো দেয়। কোনো প্রোভাইডার কানেকশন বাস্তব কনফিগারেশন ও ভেরিফিকেশন স্টেট অনুযায়ী দেখানো হয়।",
    primary: "স্টোর তৈরি করুন",
    secondary: "লাইভ মূল্য দেখুন",
    trust: ["লাইভ প্ল্যান ক্যাটালগ", "স্টোর-স্কোপড অ্যাডমিন", "কানেকশন স্টেট স্পষ্ট"],
    capabilitiesBadge: "এখন যা পাওয়া যায়",
    capabilitiesTitle: "অনলাইন স্টোর চালানোর জন্য ব্যবহারিক অপারেটিং লেয়ার",
    capabilitiesSubtitle: "এগুলো প্রোডাক্ট ক্যাপাবিলিটি—প্রতিটি মার্চেন্টের জন্য কোনো বাইরের প্রোভাইডার আগে থেকেই কানেক্টেড আছে, এমন দাবি নয়।",
    templatesTitle: "স্টোরফ্রন্ট স্ট্রাকচার দিয়ে শুরু করুন, তারপর নিজের মতো সাজান।",
    templatesBody: "ব্যবসাভিত্তিক স্টোরফ্রন্ট টেমপ্লেট বেছে নিয়ে মার্চেন্ট ড্যাশবোর্ড থেকে কনটেন্ট, ক্যাটালগ, থিম ও নেভিগেশন সম্পাদনা করুন।",
    templatesCta: "টেমপ্লেট দেখুন",
    workflowTitle: "বাইরের সার্ভিসের অবস্থা স্পষ্ট থাকে",
    workflowBody: "পেমেন্ট ও কুরিয়ার ওয়ার্কফ্লোতে not configured, configured, verified এবং needs attention স্টেট আলাদা থাকে। শুধু কোনো সেটিং আছে বলে কোনো ব্র্যান্ডকে connected দেখানো হয় না।",
    workflowCta: "ওয়ার্কফ্লো দেখুন",
    scenariosTitle: "উদাহরণ স্টোর সিনারিও দেখুন",
    scenariosBody: "আমাদের উদাহরণগুলো সম্ভাব্য স্টোরফ্রন্ট সেটআপ দেখায়। এগুলো কাস্টমার টেস্টিমোনিয়াল বা প্রকাশিত মার্চেন্ট ফলাফল নয়।",
    scenariosCta: "উদাহরণ দেখুন",
    pricingEyebrow: "অথরিটেটিভ মূল্য",
    pricingIntro: "নিচের প্ল্যান কার্ডগুলো প্রোডাক্টে ব্যবহৃত লাইভ পাবলিক বিলিং ক্যাটালগ থেকে শুরু হয়। মূল্য, ট্রায়ালের সময়, স্টোর লিমিট ও contact-only স্টেট হার্ডকোডেড মার্কেটিং দাবি নয়।",
    footer: "ফিচার পাওয়া যাবে কি না তা প্ল্যান entitlement, মার্চেন্ট কনফিগারেশন, provider verification এবং বাইরের provider-এর শর্তের উপর নির্ভর করতে পারে।",
  },
} as const;

const capabilityCards = [
  { icon: LayoutTemplate, title: "Storefront & editor", body: "Create pages, choose a storefront structure, edit theme settings, and preview the customer experience." },
  { icon: Boxes, title: "Catalog & orders", body: "Manage products, inventory-facing fields, orders, returns-related workflows, and merchant inbox operations." },
  { icon: CreditCard, title: "Payment configuration", body: "Configure available payment connections and see whether a connection is configured, verified, or needs attention." },
  { icon: Truck, title: "Delivery configuration", body: "Manage courier connection workflows where a provider and the required credentials or capabilities are available." },
  { icon: Globe2, title: "Domain workflow", body: "Eligible stores can use the domain workflow; activation still depends on plan entitlement, DNS, and verification." },
  { icon: ShieldCheck, title: "Tenant-aware controls", body: "Merchant administration and sensitive integration state are kept behind store and platform authority boundaries." },
] as const;

export function CommercialTruthLandingPage({ planCatalog }: { planCatalog: PlanCatalogRecord[] }) {
  const [lang, setLang] = useState<Language>("en");
  const t = copy[lang];

  return (
    <div lang={lang} className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3 font-heading text-lg font-extrabold tracking-[0.14em]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-xs font-black text-primary-foreground">EZ</span>
            {PLATFORM_BRAND_NAME.toUpperCase()}
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link href="/how-it-works" className="hover:text-foreground">{t.nav.workflow}</Link>
            <Link href="/templates" className="hover:text-foreground">{t.nav.templates}</Link>
            <Link href="/plans" className="hover:text-foreground">{t.nav.pricing}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full border border-border bg-muted/50 p-1 text-xs font-semibold">
              <button type="button" onClick={() => setLang("en")} className={`rounded-full px-2.5 py-1 ${lang === "en" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>EN</button>
              <button type="button" onClick={() => setLang("bn")} className={`rounded-full px-2.5 py-1 ${lang === "bn" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>বাংলা</button>
            </div>
            <Link href="/admin/login" className="hidden px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground sm:inline-flex">{t.nav.login}</Link>
            <Link href="/signup" className="inline-flex min-h-10 items-center rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">{t.nav.start}</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-5 py-20 md:py-28 lg:px-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_58%)]" />
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <BadgeCheck className="h-4 w-4" /> {t.badge}
              </div>
              <h1 className={`mt-6 max-w-4xl font-heading font-semibold tracking-tight ${lang === "bn" ? "text-4xl leading-[1.25] md:text-6xl" : "text-5xl leading-[1.02] md:text-7xl"}`}>{t.title}</h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground md:text-xl">{t.subtitle}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 font-semibold text-primary-foreground">{t.primary}<ArrowRight className="h-4 w-4" /></Link>
                <Link href="#pricing" className="inline-flex min-h-13 items-center justify-center rounded-full border border-border bg-card px-7 py-3 font-semibold">{t.secondary}</Link>
              </div>
              <div className="mt-7 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {t.trust.map((item) => <span key={item} className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-2"><PackageCheck className="h-4 w-4 text-emerald-500" />{item}</span>)}
              </div>
            </div>

            <div className="rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.75)]">
              <div className="grid gap-4 sm:grid-cols-2">
                {capabilityCards.slice(0, 4).map(({ icon: Icon, title, body }) => (
                  <article key={title} className="rounded-3xl border border-border/70 bg-background/70 p-5">
                    <Icon className="h-5 w-5 text-primary" />
                    <h2 className="mt-4 font-heading text-lg font-semibold">{title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-muted/20 px-5 py-16 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{t.capabilitiesBadge}</p>
              <h2 className="mt-4 font-heading text-3xl font-semibold tracking-tight md:text-5xl">{t.capabilitiesTitle}</h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">{t.capabilitiesSubtitle}</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {capabilityCards.map(({ icon: Icon, title, body }) => (
                <article key={title} className="rounded-[1.7rem] border border-border/70 bg-card p-6">
                  <Icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-4 font-heading text-xl font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 md:py-24 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
            <article className="rounded-[2rem] border border-border/70 bg-card p-7">
              <LayoutTemplate className="h-6 w-6 text-emerald-500" />
              <h2 className="mt-5 font-heading text-2xl font-semibold">{t.templatesTitle}</h2>
              <p className="mt-4 leading-7 text-muted-foreground">{t.templatesBody}</p>
              <Link href="/templates" className="mt-6 inline-flex items-center gap-2 font-semibold text-primary">{t.templatesCta}<ArrowRight className="h-4 w-4" /></Link>
            </article>
            <article className="rounded-[2rem] border border-border/70 bg-card p-7">
              <Settings2 className="h-6 w-6 text-indigo-500" />
              <h2 className="mt-5 font-heading text-2xl font-semibold">{t.workflowTitle}</h2>
              <p className="mt-4 leading-7 text-muted-foreground">{t.workflowBody}</p>
              <Link href="/how-it-works" className="mt-6 inline-flex items-center gap-2 font-semibold text-primary">{t.workflowCta}<ArrowRight className="h-4 w-4" /></Link>
            </article>
            <article className="rounded-[2rem] border border-border/70 bg-card p-7">
              <ShoppingBag className="h-6 w-6 text-amber-500" />
              <h2 className="mt-5 font-heading text-2xl font-semibold">{t.scenariosTitle}</h2>
              <p className="mt-4 leading-7 text-muted-foreground">{t.scenariosBody}</p>
              <Link href="/stories" className="mt-6 inline-flex items-center gap-2 font-semibold text-primary">{t.scenariosCta}<ArrowRight className="h-4 w-4" /></Link>
            </article>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-20">
          <div className="mx-auto max-w-4xl px-5 pt-10 text-center lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{t.pricingEyebrow}</p>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{t.pricingIntro}</p>
          </div>
          <CmsPricing planCatalog={planCatalog} />
        </section>
      </main>

      <footer className="border-t border-border/70 px-5 py-10 text-sm text-muted-foreground lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {PLATFORM_BRAND_NAME}</p>
          <p className="max-w-3xl leading-6 md:text-right">{t.footer}</p>
        </div>
      </footer>
    </div>
  );
}
