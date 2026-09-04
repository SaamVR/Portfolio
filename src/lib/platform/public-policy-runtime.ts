import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { getPlatformRuntimeIdentity } from "@/lib/platform/runtime-identity";
import {
  PAID_BETA_POLICY_VERSION,
  PUBLIC_POLICY_EFFECTIVE_DATE,
  PUBLIC_POLICY_REVIEW_NOTICE,
  PUBLIC_POLICY_REVIEW_STATUS,
  PUBLIC_POLICY_VERSION,
} from "@/lib/platform/public-policy";

export type PublicPolicyRuntime = {
  binding: boolean;
  version: string;
  effectiveDate: string;
  status: string;
  notice: string | null;
  siteName: string;
  legalOperatorName: string | null;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(date);
}

async function loadPolicyRuntime(): Promise<PublicPolicyRuntime> {
  const identity = await getPlatformRuntimeIdentity();
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from("platform_policy_config")
      .select("policy_version, binding, effective_at, site_name_snapshot, legal_operator_name_snapshot")
      .eq("singleton", true)
      .maybeSingle();
    if (error) throw error;

    const effectiveAt = typeof data?.effective_at === "string" ? data.effective_at : null;
    const active =
      data?.binding === true &&
      data?.policy_version === PAID_BETA_POLICY_VERSION &&
      Boolean(effectiveAt) &&
      new Date(effectiveAt!).getTime() <= Date.now() &&
      typeof data?.site_name_snapshot === "string" &&
      Boolean(data.site_name_snapshot.trim()) &&
      typeof data?.legal_operator_name_snapshot === "string" &&
      Boolean(data.legal_operator_name_snapshot.trim());

    if (active) {
      return {
        binding: true,
        version: PAID_BETA_POLICY_VERSION,
        effectiveDate: formatDate(effectiveAt!),
        status: "Binding paid-beta policy",
        notice: null,
        siteName: data.site_name_snapshot.trim(),
        legalOperatorName: data.legal_operator_name_snapshot.trim(),
      };
    }
  } catch (error) {
    console.error("Public policy runtime fallback:", error);
  }

  return {
    binding: false,
    version: PUBLIC_POLICY_VERSION,
    effectiveDate: PUBLIC_POLICY_EFFECTIVE_DATE,
    status: PUBLIC_POLICY_REVIEW_STATUS,
    notice: PUBLIC_POLICY_REVIEW_NOTICE,
    siteName: identity.siteName,
    legalOperatorName: null,
  };
}

export const getPublicPolicyRuntime = unstable_cache(
  loadPolicyRuntime,
  ["public-policy-runtime"],
  { revalidate: 60, tags: ["public-policy-runtime", "platform-runtime-identity"] },
);
