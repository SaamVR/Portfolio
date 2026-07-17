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
    id: "free",
    name: "Free Forever",
    price: "BDT 0/mo",
    trial: "No credit card required",
    description: "A simple start for new stores testing the waters.",
    features: ["1 storefront", "Limited access", "No custom domains", "Community support"],
    cta: "Start Free",
    featured: false,
  },
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
      trial: plan.id === "free" ? plan.trial : `${trialDays}-day free trial`,
      cta: isContactOnlyPlan(livePlan ?? { id: plan.id }) ? "Contact Support" : plan.cta,
      description: livePlan?.description || plan.description,
      contactOnly: isContactOnlyPlan(livePlan ?? { id: plan.id }),
    };
  });

  return (
    <section id="plans" className="relative border-t border-slate-900 bg-[#060a12] py-24 text-white overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-emerald-500/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-[-10%] h-[400px] w-[400px] rounded-full bg-indigo-500/15 blur-[120px]" />
      <div className="pointer-events-none absolute right-[-10%] top-[30%] h-[400px] w-[400px] rounded-full bg-rose-500/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-[90rem] px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-1.5 text-sm font-semibold text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <Sparkles className="h-4 w-4" />
            Pricing Packages
          </div>
          <h2 className="font-heading text-3xl font-extrabold text-white sm:text-5xl tracking-tight">
            Pick the plan that fits your store.
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Start for free and upgrade when you're ready to grow.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-4 items-stretch">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`group flex flex-col rounded-[2rem] border p-8 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 ${
                plan.featured
                  ? "border-emerald-400/30 bg-[linear-gradient(180deg,rgba(16,24,39,0.95),rgba(6,78,59,0.4))] shadow-[0_25px_80px_rgba(16,185,129,0.2)] hover:shadow-[0_32px_90px_rgba(16,185,129,0.35)]"
                  : "border-white/10 bg-slate-900/50 shadow-[0_18px_60px_rgba(0,0,0,0.2)] hover:border-white/20 hover:bg-slate-900/70 hover:shadow-[0_28px_80px_rgba(0,0,0,0.35)]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <p className={`mt-2 text-sm leading-relaxed ${plan.featured ? "text-emerald-100/90" : "text-zinc-400"}`}>
                    {plan.description}
                  </p>
                </div>
                {plan.featured ? (
                  <span className="shrink-0 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">Best balance</span>
                ) : plan.eyebrow ? (
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                    {plan.eyebrow}
                  </span>
                ) : null}
              </div>
              <div className="mt-8 flex-1">
                {plan.price ? (
                  <p className="font-heading text-4xl font-extrabold">{plan.price === "BDT 0/mo" ? "Free" : plan.price}</p>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-4">
                    <p className="text-sm font-semibold text-zinc-200">Custom pricing</p>
                  </div>
                )}
                <p className={`mt-2 text-sm font-semibold ${plan.featured ? "text-emerald-300" : "text-zinc-400"}`}>
                  {plan.trial}
                </p>
                <ul className="mt-8 space-y-4 text-sm font-medium text-zinc-200">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${plan.featured ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-zinc-300"}`}>
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8">
                <PlanCtaButton planId={plan.id} cta={plan.cta} featured={plan.featured} contactOnly={plan.contactOnly} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
