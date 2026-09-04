import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/site-config";

export type PlatformRuntimeIdentity = {
  siteName: string;
  legalOperatorName: string | null;
};

async function loadPlatformRuntimeIdentity(): Promise<PlatformRuntimeIdentity> {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from("platform_identity_config")
      .select("site_name, legal_operator_name")
      .eq("singleton", true)
      .maybeSingle();
    if (error) throw error;
    const siteName = typeof data?.site_name === "string" ? data.site_name.trim() : "";
    const legalOperatorName = typeof data?.legal_operator_name === "string" ? data.legal_operator_name.trim() : "";
    return {
      siteName: siteName || PLATFORM_BRAND_NAME,
      legalOperatorName: legalOperatorName || null,
    };
  } catch (error) {
    console.error("Platform runtime identity fallback:", error);
    return { siteName: PLATFORM_BRAND_NAME, legalOperatorName: null };
  }
}

export const getPlatformRuntimeIdentity = unstable_cache(
  loadPlatformRuntimeIdentity,
  ["platform-runtime-identity"],
  { revalidate: 60, tags: ["platform-runtime-identity"] },
);
