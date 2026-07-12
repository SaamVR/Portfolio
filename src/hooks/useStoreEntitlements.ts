import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { defaultStore } from "@/lib/cms/default-store";
import { normalizeEmail, resolveEffectiveFeatures } from "@/lib/platform/control-plane";

export function useStoreEntitlements(storeId?: string | null) {
  const { platformRole, user } = useAuth();

  return useQuery({
    queryKey: ["store-entitlements", storeId, user?.email ?? ""],
    queryFn: async () => {
      if (!storeId) return { planId: null, effectivePlanId: null, subscriptionStatus: null, features: [], featureMap: {} as any };
      const normalizedEmail = normalizeEmail(user?.email);
      const [{ data: subscription }, { data: features }, { data: storeOverrides }, { data: emailOverrides }, { data: allPlans }] = await Promise.all([
        (supabase as any).from("store_subscriptions").select("plan_id, status").eq("store_id", storeId).maybeSingle(),
        (supabase as any).from("cms_features").select("key, name, description, category, default_visible, is_active").order("category").order("name"),
        (supabase as any).from("store_feature_overrides").select("feature_key, enabled").eq("store_id", storeId),
        normalizedEmail
          ? (supabase as any)
              .from("user_email_feature_overrides")
              .select("feature_key, enabled, store_id")
              .eq("normalized_email", normalizedEmail)
              .or(`store_id.is.null,store_id.eq.${storeId}`)
          : Promise.resolve({ data: [] }),
        (supabase as any).from("cms_plans").select("id, monthly_price").order("sort_order"),
      ]);

      const planId = subscription?.plan_id as string | undefined;
      const subscriptionStatus = subscription?.status as string | undefined;
      const paidPlanReady = subscriptionStatus === "active" || subscriptionStatus === "trialing";
      const defaultPlan = (allPlans ?? []).find((p: any) => p.monthly_price === 0 || p.monthly_price === null) ?? (allPlans ?? [])[0] ?? { id: "starter" };
      const effectivePlanId = planId && paidPlanReady ? planId : defaultPlan.id;
      const { data: planMappings } = effectivePlanId
        ? await (supabase as any).from("cms_plan_features").select("feature_key, enabled").eq("plan_id", effectivePlanId)
        : { data: [] };

      const featureMap = resolveEffectiveFeatures({
        features: (features ?? []) as any[],
        planMappings: (planMappings ?? []) as any[],
        storeOverrides: (storeOverrides ?? []) as any[],
        emailOverrides: (emailOverrides ?? []) as any[],
        isPlatformAdmin: platformRole === "admin",
      });

      return {
        planId: planId ?? null,
        effectivePlanId,
        subscriptionStatus: subscriptionStatus ?? null,
        features: (features ?? []) as any[],
        featureMap,
      };
    },
    staleTime: 60_000,
    enabled: !!storeId,
  });
}

