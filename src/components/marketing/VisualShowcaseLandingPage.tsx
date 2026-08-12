import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Layout, Zap, MonitorSmartphone, Palette, CheckCircle2 } from "lucide-react";
import { CmsPricing } from "./CmsPricing";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/site-config";
import { storefrontTemplateSeedRegistry, type StorefrontTemplateId } from "@/lib/cms/storefront-templates";

const featuredTemplates: StorefrontTemplateId[] = ["fashion", "beauty", "electronics", "food"];

export function VisualShowcaseLandingPage() {
  const [activeTab, setActiveTab] = useState<StorefrontTemplateId>("fashion");

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
              <Zap className="h-5 w-5" />
            </div>
            <span className="font-heading font-bold text-xl tracking-tight">{PLATFORM_BRAND_NAME}</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#showcase" className="text-muted-foreground hover:text-foreground transition-colors">Showcase</a>
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/old" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Classic View
            </Link>
            <Link
              href="/login"
              className="group relative inline-flex h-9 items-center justify-center overflow-hidden rounded-full bg-primary px-6 font-medium text-primary-foreground transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            >
              <span className="mr-2">Start Free Trial</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(var(--primary-rgb),0.15),transparent_50%)]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="h-4 w-4" />
            <span>Next-Generation E-Commerce Design</span>
          </div>
          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-[1.1] animate-fade-in" style={{ animationDelay: '100ms' }}>
            Build stunning stores.<br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Convert more sales.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-muted-foreground mb-12 animate-fade-in" style={{ animationDelay: '200ms' }}>
            Elevate your brand with world-class design capabilities. Create, customize, and launch breathtaking storefronts that captivate customers and drive revenue.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-full bg-foreground px-8 font-medium text-background transition-colors hover:bg-foreground/90"
            >
              Start designing now
            </Link>
            <a
              href="#showcase"
              className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-full border border-input bg-background px-8 font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Explore templates
            </a>
          </div>
        </div>

        {/* Abstract UI Preview */}
        <div className="mt-20 max-w-6xl mx-auto px-6 relative animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="rounded-2xl border border-white/10 bg-black/50 p-2 shadow-2xl backdrop-blur-3xl overflow-hidden ring-1 ring-white/10">
            <div className="rounded-xl overflow-hidden bg-background aspect-video relative flex items-center justify-center border border-border/50">
               {/* Simplified mock UI for hero */}
               <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
               <div className="w-full max-w-4xl bg-card rounded-lg shadow-2xl overflow-hidden border border-border flex flex-col h-[80%]">
                 <div className="h-12 border-b flex items-center px-4 gap-4 bg-muted/30">
                   <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/80"/><div className="w-3 h-3 rounded-full bg-yellow-500/80"/><div className="w-3 h-3 rounded-full bg-green-500/80"/></div>
                   <div className="flex-1 bg-background rounded-md h-7 border flex items-center px-3 text-xs text-muted-foreground">ezcomo.shop/preview</div>
                 </div>
                 <div className="flex-1 flex items-center justify-center p-8 bg-[url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center relative">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div className="relative text-center text-white space-y-4">
                      <h3 className="text-4xl font-heading font-bold tracking-tight">Autumn Collection</h3>
                      <button className="bg-white text-black px-6 py-2 rounded-full text-sm font-medium">Shop Now</button>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Design Showcase Section */}
      <section id="showcase" className="py-24 bg-muted/30 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-5xl font-bold tracking-tight mb-4">Masterfully crafted templates</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Start with industry-researched layouts designed to maximize conversions, then customize every pixel.</p>
          </div>

          {/* Template Selector */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {featuredTemplates.map((id) => {
              const template = storefrontTemplateSeedRegistry[id];
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                    isActive 
                      ? "bg-foreground text-background shadow-md scale-105" 
                      : "bg-background border border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {template.shortName}
                </button>
              );
            })}
          </div>

          {/* Active Template Preview */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
             <div className="order-2 md:order-1 space-y-8">
               <div className="space-y-4">
                 <h3 className="text-3xl font-heading font-bold">{storefrontTemplateSeedRegistry[activeTab].name}</h3>
                 <p className="text-lg text-muted-foreground leading-relaxed">
                   {storefrontTemplateSeedRegistry[activeTab].description}
                 </p>
               </div>
               <ul className="space-y-4">
                 {["Optimized checkout flow", "Mobile-first responsive design", "High-performance image delivery"].map((feature, i) => (
                   <li key={i} className="flex items-center gap-3">
                     <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                       <CheckCircle2 className="h-4 w-4" />
                     </div>
                     <span className="font-medium">{feature}</span>
                   </li>
                 ))}
               </ul>
               <Link href="/login" className="inline-flex items-center gap-2 text-primary font-medium hover:underline">
                 Start with {storefrontTemplateSeedRegistry[activeTab].shortName} <ArrowRight className="h-4 w-4" />
               </Link>
             </div>
             <div className="order-1 md:order-2">
               <div className="aspect-[4/5] rounded-2xl overflow-hidden border bg-card shadow-2xl relative">
                  {/* Dynamic mock visual based on activeTab */}
                  {activeTab === 'fashion' && <img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80" alt="Fashion" className="w-full h-full object-cover" />}
                  {activeTab === 'beauty' && <img src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80" alt="Beauty" className="w-full h-full object-cover" />}
                  {activeTab === 'electronics' && <img src="https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80" alt="Electronics" className="w-full h-full object-cover" />}
                  {activeTab === 'food' && <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80" alt="Food" className="w-full h-full object-cover" />}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 inset-x-0 p-8 text-white">
                    <h4 className="text-2xl font-bold font-heading mb-2">{storefrontTemplateSeedRegistry[activeTab].hero.title} {storefrontTemplateSeedRegistry[activeTab].hero.highlight}</h4>
                    <p className="text-white/80 text-sm line-clamp-2">{storefrontTemplateSeedRegistry[activeTab].hero.subtitle}</p>
                  </div>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-5xl font-bold tracking-tight mb-4">Design without limits</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Every tool you need to create a unique, high-converting digital storefront.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Layout, title: "Visual Page Builder", desc: "Drag and drop beautiful sections. See changes in real-time as you build." },
              { icon: Palette, title: "Design System", desc: "Global color tokens, typography scales, and unified branding elements." },
              { icon: MonitorSmartphone, title: "Pixel-Perfect Mobile", desc: "Storefronts that look and perform flawlessly on every screen size." }
            ].map((feature, i) => (
              <div key={i} className="rounded-2xl border bg-card p-8 hover:border-primary/50 transition-colors group">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold font-heading mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <CmsPricing />

      {/* Footer CTA */}
      <section className="py-24 bg-foreground text-background text-center px-6">
        <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight mb-6">Ready to elevate your brand?</h2>
        <p className="text-xl text-background/70 mb-10 max-w-2xl mx-auto">Join thousands of merchants building beautiful, high-converting stores on {PLATFORM_BRAND_NAME}.</p>
        <Link
          href="/login"
          className="inline-flex h-14 items-center justify-center rounded-full bg-primary px-8 text-lg font-bold text-primary-foreground transition-transform hover:scale-105 hover:bg-primary/90"
        >
          Start Your Free Trial
        </Link>
        <div className="mt-8">
          <Link href="/old" className="text-sm text-background/50 hover:text-background/80 transition-colors">
            Looking for the classic landing page?
          </Link>
        </div>
      </section>
    </div>
  );
}
