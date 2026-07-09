import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCmsSupabaseServerClient } from "@/lib/cms/server-client";

type PlanCard = {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  featured: boolean;
};

const fallbackPlans: PlanCard[] = [
  {
    id: "starter",
    name: "Starter",
    price: "Free",
    description: "Launch one store with core CMS blocks and manual payments.",
    features: ["1 storefront", "Mobile onboarding", "CMS page builder", "Cash on delivery and manual payments"],
    cta: "Start Free",
    featured: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: "৳1,490/mo",
    description: "For merchants ready to run campaigns, teams, and richer storefronts.",
    features: ["3 storefronts", "Launch templates", "Staff roles", "Coupons, reviews, and analytics"],
    cta: "Choose Growth",
    featured: true,
  },
  {
    id: "scale",
    name: "Scale",
    price: "Custom",
    description: "For agencies and larger sellers managing multiple brands.",
    features: ["Unlimited storefronts", "Custom domains", "Priority support", "Migration and setup help"],
    cta: "Talk to Sales",
    featured: false,
  },
];

function formatPlanPrice(monthlyPrice: number | null | undefined) {
  if (monthlyPrice == null) return "Custom";
  if (monthlyPrice <= 0) return "Free";
  return `৳${monthlyPrice.toLocaleString("en-BD")}/mo`;
}

async function loadPlanCards(): Promise<PlanCard[]> {
  const supabase = getCmsSupabaseServerClient();
  if (!supabase) {
    return fallbackPlans;
  }

  const [{ data: plans }, { data: features }, { data: mappings }] = await Promise.all([
    supabase
      .from("cms_plans")
      .select("id, name, description, monthly_price, store_limit, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("cms_features")
      .select("key, name, default_visible, is_active, category")
      .eq("is_active", true)
      .eq("default_visible", true)
      .order("category")
      .order("name"),
    supabase.from("cms_plan_features").select("plan_id, feature_key, enabled"),
  ]);

  if (!plans?.length || !features?.length) {
    return fallbackPlans;
  }

  const visibleFeatureMap = new Map(features.map((feature) => [feature.key, feature.name]));

  const cards = plans.map((plan) => {
    const enabledFeatureNames =
      mappings
        ?.filter((mapping) => mapping.plan_id === plan.id && mapping.enabled)
        .map((mapping) => visibleFeatureMap.get(mapping.feature_key))
        .filter((value): value is string => Boolean(value)) ?? [];

    const limitLabel =
      plan.store_limit == null
        ? "Unlimited storefronts"
        : plan.store_limit === 1
          ? "1 storefront"
          : `${plan.store_limit} storefronts`;

    return {
      name: plan.name,
      id: plan.id,
      price: formatPlanPrice(plan.monthly_price),
      description: plan.description,
      features: [limitLabel, ...enabledFeatureNames].slice(0, 6),
      cta: plan.id === "starter" ? "Start Free" : plan.id === "scale" ? "Talk to Sales" : `Choose ${plan.name}`,
      featured: plan.id === "growth",
    } satisfies PlanCard;
  });

  return cards.length > 0 ? cards : fallbackPlans;
}

export async function CmsPricing() {
  const plans = await loadPlanCards();

  return (
    <section id="plans" className="border-t border-border bg-background py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Packages
          </div>
          <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
            Start lean, upgrade when the engine is paying for itself.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Plans are shaped for Bangladesh-first commerce teams: quick launch, practical payments, and room to grow into multi-store operations.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-lg border p-6 ${
                plan.featured
                  ? "border-primary bg-primary text-primary-foreground shadow-xl"
                  : "border-border bg-card text-card-foreground"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className={`mt-2 text-sm ${plan.featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {plan.description}
                  </p>
                </div>
                {plan.featured ? (
                  <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground">Popular</span>
                ) : null}
              </div>
              <p className="mt-6 font-heading text-3xl font-bold">{plan.price}</p>
              <ul className="mt-6 space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-7 w-full" variant={plan.featured ? "secondary" : "default"}>
                <Link href={`/signup?planId=${encodeURIComponent(plan.id)}`}>{plan.cta}</Link>
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
