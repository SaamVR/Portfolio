"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_FALLBACKS, type PlanCatalogRecord } from "@/lib/billing/plans";

function normalizeCatalog(plans: PlanCatalogRecord[]) {
  return plans
    .filter((plan) => plan.is_active !== false)
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function usePublicPlanCatalog(initialCatalog?: PlanCatalogRecord[]) {
  const initial = useMemo(
    () => normalizeCatalog(initialCatalog?.length ? initialCatalog : PLAN_FALLBACKS),
    [initialCatalog],
  );
  const [plans, setPlans] = useState<PlanCatalogRecord[]>(initial);

  useEffect(() => {
    let active = true;
    setPlans(initial);

    void supabase
      .from("cms_plans")
      .select("id, name, description, monthly_price, annual_price, annual_discount_percentage, currency_code, store_limit, is_active, sort_order, trial_days, contact_only")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data, error }) => {
        if (!active || error || !data?.length) return;
        setPlans(normalizeCatalog(data as unknown as PlanCatalogRecord[]));
      });

    return () => {
      active = false;
    };
  }, [initial]);

  return plans;
}
