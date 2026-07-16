import { Check, Sparkles } from "lucide-react";
import { PlanCtaButton } from "@/components/marketing/PlanCtaButton";
import { formatPlanPrice, getPlanTrialDays, isContactOnlyPlan, loadPublicPlanCatalog } from "@/lib/billing/plans";

type PlanCard = {
  id: string;
  name: string;
  price?: string;
  trial: string;
  eyebrow?: string;
  description: string;
  features: string[];
  cta: string;
  featured: boolean;
  contactOnly?: boolean;
};

const marketingPlans: PlanCard[] = [
  {
    id: "basic",
    name: "Basic",
    price: "BDT 990/mo",
    trial: "14-day free trial",
    description: "A simple start for new stores that want to launch fast.",
    features: ["1 storefront", "Mobile onboarding", "Page builder", "COD and manual payments"],
    cta: "Start Basic",
    featured: false,
  },
  {
    id: "advanced",
    name: "Advanced",
    price: "BDT 1,490/mo",
    trial: "14-day free trial",
    description: "Best for growing brands that want stronger campaigns and more control.",
    features: ["3 storefronts", "Launch templates", "Staff roles", "Coupons, reviews, analytics"],
    cta: "Start Advanced",
    featured: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "BDT 3,990/mo",
    trial: "14-day free trial",
    eyebrow: "Guided rollout",
    description: "For teams that need more stores, deeper support, and a guided launch plan.",
    features: ["Unlimited storefronts", "Custom domains", "Priority support", "Migration help"],
    cta: "Contact Us",
    featured: false,
  },
];

export async function CmsPricing() {
  const planCatalog = await loadPublicPlanCatalog();
  const plans = marketingPlans.map((plan) => {
    const livePlan = planCatalog.find((item) => item.id === plan.id);
    const trialDays = getPlanTrialDays(livePlan);
    return {
      ...plan,
      price: isContactOnlyPlan(livePlan ?? { id: plan.id }) ? formatPlanPrice(livePlan) : formatPlanPrice(livePlan),
      trial: `${trialDays}-day free trial`,
      cta: isContactOnlyPlan(livePlan ?? { id: plan.id }) ? "Contact Support" : plan.cta,
      description: livePlan?.description || plan.description,
      contactOnly: isContactOnlyPlan(livePlan ?? { id: plan.id }),
    };
  });

  return (
    <section id="plans" className="border-t border-slate-200 bg-stone-100 py-20 text-slate-950 dark:border-white/8 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <Sparkles className="h-4 w-4" />
            Packages
          </div>
          <h2 className="font-heading text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">
            Pick the plan that fits your store.
          </h2>
          <p className="mt-3 text-slate-600 dark:text-zinc-400">
            Every plan starts with a 14-day trial, so merchants can explore before they commit.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`group rounded-[1.75rem] border p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 ${
                plan.featured
                  ? "border-emerald-500/35 bg-emerald-50/90 text-slate-950 shadow-[0_25px_80px_rgba(16,185,129,0.12)] hover:shadow-[0_32px_90px_rgba(16,185,129,0.18)] dark:border-emerald-400/25 dark:bg-[linear-gradient(180deg,rgba(16,24,39,0.96),rgba(6,78,59,0.35))] dark:text-white dark:shadow-[0_25px_80px_rgba(16,185,129,0.2)] dark:hover:shadow-[0_32px_90px_rgba(16,185,129,0.28)]"
                  : "border-slate-200 bg-white text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.06)] hover:border-slate-300 hover:shadow-[0_24px_70px_rgba(15,23,42,0.1)] dark:border-white/8 dark:bg-slate-900/55 dark:text-white dark:shadow-[0_18px_60px_rgba(0,0,0,0.16)] dark:hover:border-white/14 dark:hover:bg-slate-900/70 dark:hover:shadow-[0_28px_80px_rgba(0,0,0,0.24)]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className={`mt-2 text-sm ${plan.featured ? "text-slate-600 dark:text-emerald-50/85" : "text-slate-600 dark:text-zinc-400"}`}>
                    {plan.description}
                  </p>
                </div>
                {plan.featured ? (
                  <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-white/10 dark:text-white">Best balance</span>
                ) : plan.eyebrow ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
                    {plan.eyebrow}
                  </span>
                ) : null}
              </div>
              {plan.price ? (
                <p className="mt-6 font-heading text-3xl font-bold">{plan.price}</p>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-sm font-semibold text-slate-700 dark:text-zinc-100">Custom pricing</p>
                </div>
              )}
              <p className={`mt-2 text-sm font-medium ${plan.featured ? "text-emerald-700 dark:text-emerald-100" : "text-slate-600 dark:text-zinc-300"}`}>
                {plan.trial}
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-zinc-200">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <PlanCtaButton planId={plan.id} cta={plan.cta} featured={plan.featured} contactOnly={plan.contactOnly} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
