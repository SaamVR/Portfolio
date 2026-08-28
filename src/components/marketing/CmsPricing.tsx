"use client";

import React, { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { PlanCtaButton } from "@/components/marketing/PlanCtaButton";
import { formatPlanPrice, getPlanAnnualSavingsPercent, getPlanTrialDays, isContactOnlyPlan, type PlanCatalogRecord, type BillingInterval } from "@/lib/billing/plans";
import { usePublicPlanCatalog } from "@/lib/billing/use-public-plan-catalog";

type PlanCard = {
  id: string;
  name: string;
  price?: string;
  trial?: string;
  eyebrow?: string;
  description: string;
  features: string[];
  cta: string;
  featured: boolean;
  contactOnly?: boolean;
};

const marketingPlans: PlanCard[] = [
  {
    id: "free",
    name: "Free Forever",
    trial: "No credit card required",
    description: "A simple start for new stores testing the waters.",
    features: ["1 storefront", "Limited access", "No custom domains", "Community support"],
    cta: "Start Free",
    featured: false,
  },
  {
    id: "basic",
    name: "Basic",
    description: "A simple start for new stores that want to launch fast.",
    features: ["1 storefront", "Mobile onboarding", "Page builder", "COD and manual payments"],
    cta: "Start Basic",
    featured: false,
  },
  {
    id: "advanced",
    name: "Advanced",
    description: "Best for growing brands that want stronger campaigns and more control.",
    features: ["3 storefronts", "Launch templates", "Staff roles", "Coupons, reviews, analytics"],
    cta: "Start Advanced",
    featured: true,
  },
  {
    id: "pro",
    name: "Pro",
    eyebrow: "Guided rollout",
    description: "For teams that need more stores, deeper support, and a guided launch plan.",
    features: ["Unlimited storefronts", "Custom domains", "Priority support", "Migration help"],
    cta: "Contact Us",
    featured: false,
    contactOnly: true,
  },
];

export function CmsPricing({ planCatalog }: { planCatalog?: PlanCatalogRecord[] }) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const liveCatalog = usePublicPlanCatalog(planCatalog);

  const plans = liveCatalog.map((livePlan) => {
    const presentation = marketingPlans.find((item) => item.id === livePlan.id) ?? {
      id: livePlan.id,
      name: livePlan.name,
      trial: "",
      description: livePlan.description || "",
      features: [],
      cta: "Choose Plan",
      featured: false,
    };
    const trialDays = getPlanTrialDays(livePlan);
    const isContact = isContactOnlyPlan(livePlan);
    return {
      ...presentation,
      name: livePlan.name,
      price: isContact ? undefined : formatPlanPrice(livePlan, billingInterval),
      trial: livePlan.id === "free" ? presentation.trial : trialDays > 0 ? `${trialDays}-day free trial` : "",
      cta: isContact ? "Contact Support" : presentation.cta,
      description: livePlan.description || presentation.description,
      contactOnly: isContact,
      annualSavingsPercent: getPlanAnnualSavingsPercent(livePlan),
    };
  });

  return (
    <section id="plans" className="relative border-t border-border bg-background py-12 md:py-16 text-foreground overflow-hidden transition-colors duration-300">
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-emerald-500/10 dark:bg-emerald-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-[-10%] h-[400px] w-[400px] rounded-full bg-indigo-500/10 dark:bg-indigo-500/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-[90rem] px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 shadow-sm">
            <Sparkles className="h-4 w-4" />
            Pricing Packages
          </div>
          <h2 className="font-heading text-4xl sm:text-6xl font-medium tracking-tight text-foreground">
            Pick the plan that fits your store.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start for free and upgrade when you&apos;re ready to grow.
          </p>

          {/* Billing Interval Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 p-1.5 rounded-full bg-muted border border-border shadow-inner">
            <button
              type="button"
              onClick={() => setBillingInterval("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                billingInterval === "monthly"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval("annual")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                billingInterval === "annual"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Yearly Billing</span>
            </button>
          </div>
        </div>

        <div className={`mt-16 grid gap-6 items-stretch ${plans.length <= 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
          {plans.map((plan, index) => (
            <article
              key={plan.name}
              style={{ transitionDelay: `${index * 100}ms` }}
              className={`group flex flex-col rounded-[2rem] border p-8 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 ${
                plan.featured
                  ? "border-emerald-500/40 bg-card shadow-xl ring-2 ring-emerald-500/30 dark:shadow-[0_25px_80px_rgba(16,185,129,0.2)] animated-gradient-border"
                  : "border-border bg-card shadow-md hover:shadow-xl dark:shadow-[0_18px_60px_rgba(0,0,0,0.2)] hover:border-border/80"
              }`}
            >
              <div className="flex flex-col h-full">
                {/* Header Row */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h3 className="text-2xl font-bold font-heading text-foreground">{plan.name}</h3>
                  {plan.featured ? (
                    <span className="shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Best balance</span>
                  ) : plan.eyebrow ? (
                    <span className="shrink-0 rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {plan.eyebrow}
                    </span>
                  ) : null}
                </div>
                
                {/* Description */}
                <p className={`text-sm leading-relaxed min-h-[40px] ${plan.featured ? "text-foreground/90" : "text-muted-foreground"}`}>
                  {plan.description}
                </p>

                {/* Price Section */}
                <div className="mt-8 mb-6">
                  {plan.price && !plan.contactOnly ? (
                    <div>
                      <p className="font-heading text-4xl font-extrabold text-foreground">{plan.price === "BDT 0" ? "Free" : plan.price}</p>
                      <p className="text-xs text-muted-foreground mt-1">{billingInterval === "annual" ? "billed annually" : "per month"}</p>
                      {billingInterval === "annual" && plan.annualSavingsPercent > 0 ? (
                        <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Save {plan.annualSavingsPercent}% vs monthly</p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/50 px-4 py-4 w-full">
                      <p className="text-sm font-semibold text-foreground text-center">Custom pricing</p>
                    </div>
                  )}
                  {!plan.contactOnly && (
                    <p className={`mt-2 text-sm font-semibold ${plan.featured ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                      {plan.trial}
                    </p>
                  )}
                </div>

                {/* Features List */}
                <ul className="space-y-4 text-sm font-medium text-foreground flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${plan.featured ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <div className="mt-8 pt-6 border-t border-border">
                  <PlanCtaButton planId={plan.id} cta={plan.cta} featured={plan.featured} contactOnly={plan.contactOnly} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

