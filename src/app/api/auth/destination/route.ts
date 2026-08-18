import { NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdminClient } from "@/lib/api/supabase-route";
import {
  parseAuthEntryIntent,
  resolvePostAuthDestination,
  type CustomerStoreAccess,
} from "@/lib/auth/post-auth-destination";

export const dynamic = "force-dynamic";

const PLATFORM_ROLE_PRIORITY = ["super_admin", "admin", "billing_admin", "support_agent", "co_admin"] as const;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

function resolvePlatformRole(rows: Array<{ role?: unknown }> | null | undefined) {
  for (const candidate of PLATFORM_ROLE_PRIORITY) {
    if ((rows ?? []).some((row) => row?.role === candidate)) return candidate;
  }
  return null;
}

function normalizeStoreSlugHint(value?: string | null) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalized) ? normalized : null;
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const intent = parseAuthEntryIntent(url.searchParams.get("intent"));
    const requestedNext = url.searchParams.get("next");
    const storeSlugHint = normalizeStoreSlugHint(url.searchParams.get("store"));
    const supabaseAdmin = getSupabaseAdminClient();

    const [platformRoleResult, membershipResult, ownedStoreResult] = await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("store_memberships")
        .select("store_id, role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

    const accessError = platformRoleResult.error || membershipResult.error || ownedStoreResult.error;
    if (accessError) {
      console.error("Auth destination access lookup failed:", accessError);
      return noStoreJson({ error: "Failed to resolve account access" }, { status: 500 });
    }

    const platformRole = resolvePlatformRole(platformRoleResult.data as Array<{ role?: unknown }> | null);
    const hasMerchantAccess = Boolean(membershipResult.data?.length || ownedStoreResult.data?.length);

    if (platformRole || hasMerchantAccess) {
      const destination = resolvePostAuthDestination({
        identity: { platformRole, hasMerchantAccess, customerStores: [] },
        intent,
        requestedNext,
        storeSlugHint,
      });
      return noStoreJson(destination);
    }

    const customerProfileResult = await (supabaseAdmin as any)
      .from("store_customer_profiles")
      .select("store_id, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (customerProfileResult.error) {
      console.error("Auth destination customer lookup failed:", customerProfileResult.error);
      return noStoreJson({ error: "Failed to resolve customer access" }, { status: 500 });
    }

    const customerRows = Array.isArray(customerProfileResult.data) ? customerProfileResult.data : [];
    const customerStoreIds = customerRows
      .map((row: any) => (typeof row?.store_id === "string" ? row.store_id : null))
      .filter((storeId: string | null): storeId is string => Boolean(storeId));

    let customerStores: CustomerStoreAccess[] = [];
    if (customerStoreIds.length > 0) {
      const { data: storeRows, error: storeError } = await supabaseAdmin
        .from("stores")
        .select("id, slug")
        .in("id", customerStoreIds);

      if (storeError) {
        console.error("Auth destination customer store lookup failed:", storeError);
        return noStoreJson({ error: "Failed to resolve customer storefront" }, { status: 500 });
      }

      const slugByStoreId = new Map(
        (storeRows ?? [])
          .filter((row) => typeof row?.id === "string" && typeof row?.slug === "string")
          .map((row) => [row.id, row.slug] as const),
      );

      customerStores = customerRows.flatMap((row: any) => {
        const storeId = typeof row?.store_id === "string" ? row.store_id : null;
        const slug = storeId ? slugByStoreId.get(storeId) : null;
        if (!storeId || !slug) return [];
        return [{
          storeId,
          slug,
          updatedAt: typeof row?.updated_at === "string" ? row.updated_at : null,
        }];
      });
    }

    const destination = resolvePostAuthDestination({
      identity: { platformRole: null, hasMerchantAccess: false, customerStores },
      intent,
      requestedNext,
      storeSlugHint,
    });

    return noStoreJson(destination);
  } catch (error) {
    console.error("Auth destination resolver failed:", error);
    return noStoreJson({ error: "Failed to resolve login destination" }, { status: 500 });
  }
}
