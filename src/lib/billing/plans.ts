import { getCmsSupabaseServerClient } from "@/lib/cms/server-client";

export type PlanCatalogRecord = {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number | null;
  currency_code?: string | null;
  store_limit?: number | null;
  is_active?: boolean | null;
  sort_order?: number | null;
  trial_days?: number | null;
  contact_only?: boolean | null;
};

export type SubscriptionRecordLike = {
  plan_id?: string | null;
  status?: string | null;
  trial_ends_at?: string | null;
  current_period_ends_at?: string | null;
};

export const PLAN_FALLBACKS: PlanCatalogRecord[] = [
  {
    id: "basic",
    name: "Basic",
    description: "A simple start for new stores that want to launch fast.",
    monthly_price: 990,
    currency_code: "BDT",
    store_limit: 1,
    is_active: true,
    sort_order: 10,
    trial_days: 14,
    contact_only: false,
  },
  {
    id: "advanced",
    name: "Advanced",
    description: "Best for growing brands that want stronger campaigns and more control.",
    monthly_price: 1490,
    currency_code: "BDT",
    store_limit: 3,
    is_active: true,
    sort_order: 20,
    trial_days: 14,
    contact_only: false,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For teams that need more stores, deeper support, and a guided launch plan.",
    monthly_price: 3990,
    currency_code: "BDT",
    store_limit: null,
    is_active: true,
    sort_order: 30,
    trial_days: 14,
    contact_only: true,
  },
];

export function getPlanTrialDays(plan?: Pick<PlanCatalogRecord, "trial_days"> | null) {
  return Math.max(0, Number(plan?.trial_days ?? 14) || 14);
}

export function isContactOnlyPlan(plan?: Pick<PlanCatalogRecord, "contact_only" | "id"> | null) {
  if (!plan) return false;
  return Boolean(plan.contact_only) || plan.id === "pro";
}

export function getSelectablePlans(plans: PlanCatalogRecord[]) {
  return plans.filter((plan) => plan.is_active !== false && !isContactOnlyPlan(plan));
}

export function resolveSignupPlanId(plans: PlanCatalogRecord[], requestedPlanId?: string | null) {
  const selectable = getSelectablePlans(plans);
  const requested = selectable.find((plan) => plan.id === requestedPlanId);
  return requested?.id ?? selectable[0]?.id ?? PLAN_FALLBACKS[0].id;
}

export function getRemainingTrialDays(trialEndsAt?: string | null, now = new Date()) {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  if (Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function getEffectiveSubscriptionStatus(
  subscription?: SubscriptionRecordLike | null,
  now = new Date(),
) {
  const status = subscription?.status ?? null;
  if (subscription?.trial_ends_at) {
    const trialEnd = new Date(subscription.trial_ends_at);
    if (!Number.isNaN(trialEnd.getTime())) {
      if (trialEnd.getTime() >= now.getTime() && status !== "active" && status !== "cancelled") {
        return "trialing";
      }
      if (status === "trialing" && trialEnd.getTime() < now.getTime()) {
        return "past_due";
      }
    }
  }
  return status;
}

export function isSubscriptionLive(
  subscription?: SubscriptionRecordLike | null,
  now = new Date(),
) {
  const status = getEffectiveSubscriptionStatus(subscription, now);
  return status === "active" || status === "trialing";
}

export function formatPlanPrice(plan?: Pick<PlanCatalogRecord, "monthly_price" | "currency_code"> | null) {
  const amount = Number(plan?.monthly_price ?? 0);
  const currency = plan?.currency_code || "BDT";
  return `${currency} ${Math.round(amount).toLocaleString()}`;
}

export async function loadPublicPlanCatalog() {
  const supabase = getCmsSupabaseServerClient();
  if (!supabase) {
    return PLAN_FALLBACKS;
  }

  const { data } = await supabase
    .from("cms_plans")
    .select("id, name, description, monthly_price, currency_code, store_limit, is_active, sort_order, trial_days, contact_only")
    .eq("is_active", true)
    .order("sort_order");

  return (data as PlanCatalogRecord[] | null)?.length ? (data as PlanCatalogRecord[]) : PLAN_FALLBACKS;
}
