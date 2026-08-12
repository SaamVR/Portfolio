"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, ArrowRight, Paintbrush, Rocket, ShoppingBag, Globe, Zap, Settings, CreditCard, 
  Layers, Sparkles, CheckCircle2, ShieldCheck, Cpu, Layout, Sliders, Smartphone, PackageCheck, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/site-config";

export default function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      id: 1,
      badge: "Step 01",
      title: "Select an Industry Seed Template",
      subtitle: "Never start from a blank page. Launch with pre-configured layouts and catalogs.",
      icon: <ShoppingBag className="h-6 w-6 text-emerald-500" />,
      details: [
        "Curated presets for Fashion, Beauty, Electronics, and Food/Grocery.",
        "Pre-loaded sample items, category hierarchies, and optimized hero banners.",
        "Mobile-first responsive grids tuned for high conversion."
      ],
      previewImg: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1000",
      highlight: "Launch ready in 3 minutes"
    },
    {
      id: 2,
      badge: "Step 02",
      title: "Customize in Real-Time Visual Builder",
      subtitle: "Fluid drag-and-drop block engine with zero code required.",
      icon: <Paintbrush className="h-6 w-6 text-indigo-500" />,
      details: [
        "Live side-by-side preview mode with instant desktop/tablet/mobile toggles.",
        "Global theme controls for fonts, primary colors, radius, and shadow levels.",
        "Modular blocks: Hero sliders, Bento showcases, Flash sales, Testimonial carousels."
      ],
      previewImg: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=1000",
      highlight: "100% Visual Customization"
    },
    {
      id: 3,
      badge: "Step 03",
      title: "Plug-and-Play Local Payments & Couriers",
      subtitle: "Built specifically for local Bangladeshi and global e-commerce workflows.",
      icon: <CreditCard className="h-6 w-6 text-amber-500" />,
      details: [
        "Native bKash, Nagad, and Rocket mobile banking checkout with instant verification.",
        "Automated Pathao and Steadfast courier pick-up booking directly from admin.",
        "Cash on Delivery (COD) order management with automated customer SMS tracking."
      ],
      previewImg: "https://images.unsplash.com/photo-1556742049-0a67daf4005a?q=80&w=1000",
      highlight: "Zero API Configuration"
    },
    {
      id: 4,
      badge: "Step 04",
      title: "Custom Domain & Edge Acceleration",
      subtitle: "Instant SSL, sub-300ms edge rendering, and enterprise reliability.",
      icon: <Globe className="h-6 w-6 text-rose-500" />,
      details: [
        "Map your own domain (yourbrand.com) with automated free Let's Encrypt SSL.",
        "Edge-cached content delivery ensuring instant product page load times.",
        "Zero transaction fee policy on all paid subscription tiers."
      ],
      previewImg: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000",
      highlight: "300ms Global Edge Speed"
    }
  ];

  return (
    <main className="min-h-screen bg-background text-foreground font-sans bg-grid-pattern relative overflow-hidden">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Button asChild variant="ghost" className="gap-2 -ml-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to {PLATFORM_BRAND_NAME}
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            <Link href="/plans" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3">
              Pricing
            </Link>
            <Button asChild className="rounded-full shadow-lg shadow-emerald-500/20 bg-primary text-primary-foreground font-semibold">
              <Link href="/signup">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="pt-20 pb-12 relative">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-6">
            <Zap className="h-3.5 w-3.5" />
            Complete Storefront Workflow
          </div>
          <h1 className="font-heading text-4xl md:text-6xl font-bold tracking-tight mb-6">
            How the <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500">{PLATFORM_BRAND_NAME} CMS</span> Works
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Build, brand, and scale a professional e-commerce storefront in 4 straightforward steps with zero technical debt or coding required.
          </p>
        </div>
      </section>

      {/* Interactive Step Navigator */}
      <section className="py-8 max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-card/60 p-2 rounded-2xl border border-border/80 backdrop-blur-md shadow-sm mb-12">
          {steps.map((step) => {
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`p-4 rounded-xl text-left transition-all duration-300 flex items-center gap-3 ${
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30 scale-[1.02]" 
                    : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${isActive ? "bg-white/20 text-white" : "bg-muted text-foreground"}`}>
                  {step.icon}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">{step.badge}</span>
                  <span className="text-sm font-semibold truncate block">{step.title.split(" ")[0]} {step.title.split(" ")[1]}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Step Deep Dive Card */}
        {steps.map((step) => {
          if (step.id !== activeStep) return null;
          return (
            <div key={step.id} className="rounded-3xl border border-border bg-card p-8 md:p-12 shadow-2xl transition-all duration-500 animate-fade-in">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-4 border border-emerald-500/20">
                    <Sparkles className="h-3 w-3" /> {step.highlight}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4 text-foreground">{step.title}</h2>
                  <p className="text-muted-foreground text-base leading-relaxed mb-8">{step.subtitle}</p>

                  <ul className="space-y-4 mb-8">
                    {step.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-3.5 text-sm font-medium text-foreground">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>

                  <Button asChild size="lg" className="rounded-full px-8 shadow-lg shadow-emerald-500/20 bg-primary text-primary-foreground font-semibold">
                    <Link href="/signup">Try Step {step.id} Live &rarr;</Link>
                  </Button>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-border bg-muted aspect-[4/3] shadow-xl group">
                  <img src={step.previewImg} alt={step.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 text-white">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">{step.badge} Workflow</span>
                    <p className="text-lg font-semibold">{step.title}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Grid Feature Highlights */}
      <section className="py-16 md:py-24 border-t border-border/60 bg-muted/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-heading text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Everything Built For Growth
            </h2>
            <p className="text-muted-foreground text-lg">
              EZComo eliminates the technical friction of setting up e-commerce in South Asia.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-card border border-border shadow-sm hover:border-emerald-500/30 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6">
                <Layout className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-heading">Zero-Code Page Blocks</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Add, reorder, or customize product grids, banners, testimonials, and FAQs with simple click-to-edit controls.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-card border border-border shadow-sm hover:border-indigo-500/30 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-6">
                <Smartphone className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-heading">bKash &amp; Nagad Direct</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Accept mobile banking payments with automatic merchant confirmation and zero manual screenshot checking.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-card border border-border shadow-sm hover:border-amber-500/30 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-6">
                <PackageCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 font-heading">Automatic Couriers</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Generate shipping labels and send Pathao / Steadfast tracking links directly from your admin panel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 text-center px-6 bg-gradient-to-b from-background to-card border-t border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Ready to experience the workflow?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Set up your storefront in less time than it takes to make coffee.
          </p>
          <Button asChild size="lg" className="rounded-full px-10 h-14 text-base font-semibold shadow-xl shadow-emerald-500/25 bg-primary text-primary-foreground">
            <Link href="/signup">Create Store Free Now &rarr;</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
