"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { PlanCtaButton } from "@/components/marketing/PlanCtaButton";
import {
  formatPlanPrice,
  getPlanAnnualSavingsPercent,
  isContactOnlyPlan,
  type BillingInterval,
  type PlanCatalogRecord,
} from "@/lib/billing/plans";
import { usePublicPlanCatalog } from "@/lib/billing/use-public-plan-catalog";

function getTrialDays(plan: PlanCatalogRecord) {
  const days = Number(plan.trial_days ?? 0);
  return Number.isFinite(days) ? Math.max(0, days) : 0;
}

export function CmsPricing({ planCatalog }: { planCatalog?: PlanCatalogRecord[] }) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const plans = usePublicPlanCatalog(planCatalog);

  return (
    <section id="plans" className="relative overflow-hidden border-t border-border bg-background py-12 text-foreground md:py-16">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="relative z-10 mx-auto max-w-[90rem] px-4 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-700 shadow-sm dark:bg-emerald-500/15 dark:text-emerald-300">
            <Sparkles className="h-4 w-4" />
            Live public plan catalog
          </div>
          <h2 className="font-heading text-4xl font-medium tracking-tight text-foreground sm:text-6xl">Choose from the plans currently available.</h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Names, prices, trial duration, store limits, and contact-only status come from the billing catalog used by EZComo.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-muted p-1.5 shadow-inner">
            <button type="button" onClick={() => setBillingInterval("monthly")} className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${billingInterval === "monthly" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Monthly</button>
            <button type="button" onClick={() => setBillingInterval("annual")} className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${billingInterval === "annual" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Annual</button>
          </div>
        </div>

        <div className={`mt-14 grid items-stretch gap-6 ${plans.length <= 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
          {plans.map((plan) => {
            const contactOnly = isContactOnlyPlan(plan);
            const trialDays = getTrialDays(plan);
            const storeLimit = Number(plan.store_limit ?? 0);
            const annualSavingsPercent = getPlanAnnualSavingsPercent(plan);
            const price = contactOnly ? null : formatPlanPrice(plan, billingInterval);

            return (
              <article key={plan.id} className="flex flex-col rounded-[2rem] border border-border bg-card p-8 shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-2xl font-bold text-foreground">{plan.name}</h3>
                    <p className="mt-3 min-h-[3.5rem] text-sm leading-6 text-muted-foreground">{plan.description || "Plan details are maintained in the live billing catalog."}</p>
                  </div>
                  {contactOnly ? <span className="rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Contact</span> : null}
                </div>

                <div className="mt-8 border-y border-border py-6">
                  {price ? (
                    <>
                      <p className="font-heading text-4xl font-extrabold text-foreground">{price === "BDT 0" ? "Free" : price}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{billingInterval === "annual" ? "billed annually" : "per month"}</p>
                      {billingInterval === "annual" && annualSavingsPercent > 0 ? <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Catalog annual saving: {annualSavingsPercent}%</p> : null}
                    </>
                  ) : (
                    <p className="font-heading text-2xl font-semibold text-foreground">Contact for pricing</p>
                  )}
                </div>

                <ul className="mt-6 flex-1 space-y-3 text-sm text-foreground">
                  {storeLimit > 0 ? <li className="flex items-start gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span>{storeLimit} storefront{storeLimit === 1 ? "" : "s"} in the catalog limit</span></li> : null}
                  {!contactOnly && trialDays > 0 ? <li className="flex items-start gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span>{trialDays}-day trial configured for this plan</span></li> : null}
                  {!contactOnly && trialDays === 0 ? <li className="flex items-start gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span>No trial duration configured</span></li> : null}
                  <li className="flex items-start gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span>Feature access is enforced by the plan entitlement system</span></li>
                </ul>

                <div className="mt-8 border-t border-border pt-6">
                  <PlanCtaButton planId={plan.id} cta={contactOnly ? "Contact Us" : plan.id === "free" ? "Start Free" : `Choose ${plan.name}`} featured={false} contactOnly={contactOnly} />
                </div>
              </article>
            );
          })}
        </div>

        <p className="mx-auto mt-8 max-w-4xl text-center text-xs leading-6 text-muted-foreground">
          External payment, courier, messaging, domain, or other provider charges and availability are separate from EZComo plan pricing and depend on the relevant provider and merchant configuration.
        </p>
      </div>
    </section>
  );
}
