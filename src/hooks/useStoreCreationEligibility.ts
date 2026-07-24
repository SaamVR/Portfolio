import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { getEffectiveSubscriptionStatus } from "@/lib/billing/plans";

type StoreCreationEligibility = {
  allowed: boolean;
  ownedStoreCount: number;
  storeLimit: number | null;
  subscriptionStatus: string | null;
  reason: string | null;
};

export function useStoreCreationEligibility() {
  const { activeStoreId, storeMemberships, user } = useAuth();

  const ownerStoreIds = useMemo(
    () =>
      Array.from(
        new Set(
          storeMemberships
            .filter((membership) => membership.role === "owner")
            .map((membership) => membership.storeId)
            .filter(Boolean),
        ),
      ),
    [storeMemberships],
  );

  return useQuery({
    queryKey: ["store-creation-eligibility", user?.id ?? "", activeStoreId, ownerStoreIds.join(",")],
    enabled: Boolean(user),
    queryFn: async (): Promise<StoreCreationEligibility> => {
      const { data: accountStatus } = await (supabase as any)
        .from("merchant_account_statuses")
        .select("can_create_store, status_note")
        .eq("user_id", user?.id as string)
        .maybeSingle();

      if (accountStatus?.can_create_store === false) {
        return {
          allowed: false,
          ownedStoreCount: ownerStoreIds.length,
          storeLimit: null,
          subscriptionStatus: null,
          reason: typeof accountStatus?.status_note === "string" && accountStatus.status_note.trim()
            ? accountStatus.status_note
            : "Your account cannot create new stores right now. Contact support for a review.",
        };
      }

      if (ownerStoreIds.length === 0) {
        return {
          allowed: true,
          ownedStoreCount: 0,
          storeLimit: 1,
          subscriptionStatus: null,
          reason: null,
        };
      }

      if (!activeStoreId) {
        return {
          allowed: false,
          ownedStoreCount: ownerStoreIds.length,
          storeLimit: null,
          subscriptionStatus: null,
          reason: "Select one of your stores first so EZComo can check your package limits.",
        };
      }

      const [{ data: subscription }, { data: plan }] = await Promise.all([
        (supabase as any)
          .from("store_subscriptions")
          .select("plan_id, status, trial_ends_at")
          .eq("store_id", activeStoreId)
          .maybeSingle(),
        (supabase as any)
          .from("store_subscriptions")
          .select("plan_id, status, trial_ends_at")
          .eq("store_id", activeStoreId)
          .maybeSingle()
          .then(async ({ data, error }) => {
            if (error || !data?.plan_id) {
              return { data: null };
            }
            return (supabase as any)
              .from("cms_plans")
              .select("id, name, store_limit")
              .eq("id", data.plan_id)
              .maybeSingle();
          }),
      ]);

      const subscriptionStatus = getEffectiveSubscriptionStatus(
        (subscription as { status?: string | null; trial_ends_at?: string | null } | null) ?? null,
      );
      const ownedStoreCount = ownerStoreIds.length;
      const storeLimit = typeof plan?.store_limit === "number" ? plan.store_limit : plan?.store_limit === null ? null : 1;
      const planName = typeof plan?.name === "string" ? plan.name : "current";

      if (subscriptionStatus === "trialing") {
        return {
          allowed: false,
          ownedStoreCount,
          storeLimit,
          subscriptionStatus,
          reason: "Trial accounts can keep one store only until payment is completed.",
        };
      }

      if (subscriptionStatus !== "active") {
        return {
          allowed: false,
          ownedStoreCount,
          storeLimit,
          subscriptionStatus: subscriptionStatus ?? null,
          reason: "Complete payment on your current package before creating another store.",
        };
      }

      if (storeLimit === null) {
        return {
          allowed: true,
          ownedStoreCount,
          storeLimit: null,
          subscriptionStatus,
          reason: null,
        };
      }

      if (ownedStoreCount >= storeLimit) {
        return {
          allowed: false,
          ownedStoreCount,
          storeLimit,
          subscriptionStatus,
          reason: `Your ${planName} package allows up to ${storeLimit} store${storeLimit === 1 ? "" : "s"}.`,
        };
      }

      return {
        allowed: true,
        ownedStoreCount,
        storeLimit,
        subscriptionStatus,
        reason: null,
      };
    },
    staleTime: 30_000,
  });
}
