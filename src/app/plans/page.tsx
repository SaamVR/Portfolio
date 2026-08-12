"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, HelpCircle, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CmsPricing } from "@/components/marketing/CmsPricing";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/site-config";

export default function PlansPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "Can I use custom domains for my store?",
      a: "Yes! On our Advanced and Pro plans, you can connect your custom domain (e.g., yourbrand.com) with automated free SSL certificates provisioned instantly."
    },
    {
      q: "Do you support local Bangladeshi payment gateways?",
      a: "Absolutely. We support bKash, Nagad, Rocket, SSLCommerz, Cash on Delivery (COD), and international payments via Stripe out of the box."
    },
    {
      q: "How does local shipping & courier integration work?",
      a: "EZComo integrates directly with Pathao, Steadfast, and Paperfly. Book pick-ups, generate shipping labels, and send SMS tracking updates automatically from your admin dashboard."
    },
    {
      q: "Do I need coding skills to build or edit pages?",
      a: "Zero coding required! Our fluid drag-and-drop block builder lets you customize typography, color palettes, product layouts, and banners in real time."
    },
    {
      q: "Can I try EZComo before committing?",
      a: "Yes, we offer a 14-day free trial on paid plans with no credit card required to start, plus a Free Forever plan for early-stage stores."
    },
    {
      q: "Are there any hidden transaction fees?",
      a: "No hidden charges. We take 0% transaction fees on all paid plans so you keep 100% of your store's profits."
    }
  ];

  return (
    <main className="min-h-screen bg-background text-foreground font-sans">
      {/* Top Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Button asChild variant="ghost" className="gap-2 -ml-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to {PLATFORM_BRAND_NAME}
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            <Link href="/admin/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
              Log in
            </Link>
            <Button asChild className="rounded-full shadow-lg shadow-emerald-500/20 bg-primary text-primary-foreground font-semibold">
              <Link href="/signup">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Pricing Table Component */}
      <CmsPricing />

      {/* Embedded FAQ Accordion Section */}
      <section id="faq" className="py-16 md:py-24 border-t border-border/60 bg-muted/20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-4">
              <HelpCircle className="h-3.5 w-3.5" />
              Frequently Asked Questions
            </div>
            <h2 className="font-heading text-4xl md:text-5xl font-semibold tracking-tight mb-4 text-foreground">
              Everything you need to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300">know</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Got questions about pricing, payment setup, or custom domains? We've got answers.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 shadow-sm hover:border-emerald-500/30">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-7 py-6 flex items-center justify-between text-left font-heading font-semibold text-lg text-foreground hover:text-primary transition-colors"
                  >
                    <span className="pr-4">{faq.q}</span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180 text-primary" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-7 pb-7 text-muted-foreground leading-relaxed text-sm border-t border-border/50 pt-5 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Link href="/platform-faq" className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group">
              View extended platform documentation &amp; FAQ <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 bg-gradient-to-br from-emerald-950/40 via-background to-indigo-950/40 border-t border-border text-center px-6">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-6 border border-emerald-500/20">
            <Sparkles className="h-3.5 w-3.5" /> Ready to get started?
          </div>
          <h3 className="font-heading text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Build your high-converting storefront today
          </h3>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            14-day free trial. No credit card required. Cancel anytime.
          </p>
          <Button asChild size="lg" className="rounded-full px-10 h-14 text-base font-semibold shadow-xl shadow-emerald-500/20 bg-primary text-primary-foreground">
            <Link href="/signup">Start Your Free Trial</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
