import { NextResponse } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";
import {
  normalizeRenewalPhone,
  supportsRenewalPreferences,
} from "@/lib/billing/renewal-preferences";

export const renewalPreferencesRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
};

async function canManageBillingRenewal(
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
  storeId: string,
  userId: string,
) {
  const ownerOrFullPlatformAdmin = await renewalPreferencesRouteDeps.canManageStore(
    supabaseAdmin,
    storeId,
    userId,
    [],
  );
  if (ownerOrFullPlatformAdmin) return true;

  const { data: roles, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) throw error;
  return Array.isArray(roles) && roles.some((row) => row.role === "billing_admin");
}

async function readPreferences(
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
  storeId: string,
) {
  const { data: subscription, error: subscriptionError } = await supabaseAdmin
    .from("store_subscriptions")
    .select("plan_id, status, auto_renew, current_period_ends_at")
    .eq("store_id", storeId)
    .maybeSingle();

  if (subscriptionError) throw subscriptionError;
  if (!subscription || !supportsRenewalPreferences(subscription.plan_id)) {
    return {
      available: false,
      planId: subscription?.plan_id ?? null,
      status: subscription?.status ?? null,
      autoRenew: true,
      renewalPhone: "",
      currentPeriodEndsAt: subscription?.current_period_ends_at ?? null,
    };
  }

  const { data: contact, error: contactError } = await supabaseAdmin
    .from("store_subscription_renewal_contacts")
    .select("renewal_phone")
    .eq("store_id", storeId)
    .maybeSingle();

  if (contactError) throw contactError;

  return {
    available: true,
    planId: subscription.plan_id,
    status: subscription.status,
    autoRenew: subscription.auto_renew !== false,
    renewalPhone: contact?.renewal_phone ?? "",
    currentPeriodEndsAt: subscription.current_period_ends_at ?? null,
  };
}

async function authenticateOwnerOrBillingOperator(req: Request, storeId: string) {
  const user = await renewalPreferencesRouteDeps.getAuthenticatedUser(req);
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const supabaseAdmin = renewalPreferencesRouteDeps.getSupabaseAdminClient();
  const authorized = await canManageBillingRenewal(supabaseAdmin, storeId, user.id);
  if (!authorized) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }

  return { supabaseAdmin, user } as const;
}

export async function GET(req: Request) {
  try {
    const storeId = new URL(req.url).searchParams.get("storeId")?.trim();
    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

    const auth = await authenticateOwnerOrBillingOperator(req, storeId);
    if ("response" in auth) return auth.response;

    return NextResponse.json(await readPreferences(auth.supabaseAdmin, storeId));
  } catch (error) {
    console.error("Renewal preference read failed:", error);
    return NextResponse.json({ error: "Failed to load renewal preferences" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => null) as {
      storeId?: unknown;
      autoRenew?: unknown;
      renewalPhone?: unknown;
    } | null;

    const storeId = typeof body?.storeId === "string" ? body.storeId.trim() : "";
    if (!storeId || typeof body?.autoRenew !== "boolean") {
      return NextResponse.json({ error: "storeId and autoRenew are required" }, { status: 400 });
    }

    const auth = await authenticateOwnerOrBillingOperator(req, storeId);
    if ("response" in auth) return auth.response;

    const before = await readPreferences(auth.supabaseAdmin, storeId);
    if (!before.available) {
      return NextResponse.json({ error: "Renewal preferences are not available for this plan" }, { status: 400 });
    }

    const renewalPhone = body.autoRenew ? null : normalizeRenewalPhone(body.renewalPhone);
    if (!body.autoRenew && !renewalPhone) {
      return NextResponse.json(
        { error: "Enter a valid billing phone with country code, or a Bangladesh mobile number" },
        { status: 400 },
      );
    }

    const { error: updateError } = await auth.supabaseAdmin.rpc(
      "set_store_subscription_renewal_preferences",
      {
        p_store_id: storeId,
        p_auto_renew: body.autoRenew,
        p_renewal_phone: renewalPhone,
      },
    );

    if (updateError) throw updateError;

    return NextResponse.json(await readPreferences(auth.supabaseAdmin, storeId));
  } catch (error) {
    console.error("Renewal preference update failed:", error);
    return NextResponse.json({ error: "Failed to update renewal preferences" }, { status: 500 });
  }
}
