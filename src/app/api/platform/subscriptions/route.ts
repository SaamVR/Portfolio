import { NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdminClient, upsertStoreSubscription } from "@/lib/api/supabase-route";
import { logPlatformAuditAction } from "@/lib/platform/audit-logger";

export const platformSubscriptionsRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  upsertStoreSubscription,
  now: () => new Date(),
};

async function getPlatformRole(userId: string) {
  const supabaseAdmin = platformSubscriptionsRouteDeps.getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin", "billing_admin"])
    .order("created_at", { ascending: true });

  if (error) throw error;

  return Array.isArray(data) && data.length > 0 && typeof data[0]?.role === "string"
    ? data[0].role
    : null;
}

export async function POST(req: Request) {
  try {
    const user = await platformSubscriptionsRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getPlatformRole(user.id);
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const action =
      body?.action === "extend_trial"
        ? "extend_trial"
        : body?.action === "manual_override"
          ? "manual_override"
          : null;
    const storeId = typeof body?.storeId === "string" ? body.storeId.trim() : "";

    if (!action || !storeId) {
      return NextResponse.json({ error: "Missing action or storeId" }, { status: 400 });
    }

    const supabaseAdmin = platformSubscriptionsRouteDeps.getSupabaseAdminClient();
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id, name, plan")
      .eq("id", storeId)
      .maybeSingle();

    if (storeError) throw storeError;
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const now = platformSubscriptionsRouteDeps.now();

    if (action === "extend_trial") {
      const daysToAdd = Number(body?.daysToAdd);
      const operatorNote = typeof body?.operatorNote === "string" ? body.operatorNote.trim() : "";

      if (!Number.isFinite(daysToAdd) || daysToAdd <= 0) {
        return NextResponse.json({ error: "daysToAdd must be a positive number" }, { status: 400 });
      }

      const { data: existingSub, error: existingSubError } = await supabaseAdmin
        .from("store_subscriptions")
        .select("plan_id, trial_ends_at")
        .eq("store_id", storeId)
        .maybeSingle();

      if (existingSubError) throw existingSubError;

      const currentTrialEnd = existingSub?.trial_ends_at ? new Date(existingSub.trial_ends_at) : now;
      const baseDate = currentTrialEnd > now ? currentTrialEnd : now;
      const newTrialEndsAt = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

      const { error: subscriptionError } = await platformSubscriptionsRouteDeps.upsertStoreSubscription(supabaseAdmin, {
        storeId,
        planId: existingSub?.plan_id || store.plan || "free",
        status: "trialing",
        provider: null,
        providerSubscriptionId: null,
        currentPeriodEndsAt: newTrialEndsAt,
        trialEndsAt: newTrialEndsAt,
      });

      if (subscriptionError) throw subscriptionError;

      await logPlatformAuditAction(supabaseAdmin, {
        actorId: user.id,
        actorEmail: user.email,
        actorRole: role,
        action: "extend_trial",
        targetType: "store",
        targetId: storeId,
        details: {
          store_name: store.name,
          days_added: daysToAdd,
          new_trial_ends_at: newTrialEndsAt,
          operator_note: operatorNote || null,
        },
      });

      return NextResponse.json({
        success: true,
        status: "trialing",
        trialEndsAt: newTrialEndsAt,
      });
    }

    const planId = typeof body?.planId === "string" ? body.planId.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!planId) {
      return NextResponse.json({ error: "Missing planId" }, { status: 400 });
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from("cms_plans")
      .select("id, name, currency_code, is_active")
      .eq("id", planId)
      .maybeSingle();

    if (planError) throw planError;
    if (!plan || plan.is_active === false) {
      return NextResponse.json({ error: "Plan is not available" }, { status: 400 });
    }

    const { error: subscriptionError } = await platformSubscriptionsRouteDeps.upsertStoreSubscription(supabaseAdmin, {
      storeId,
      planId: plan.id,
      status: "active",
      provider: "platform_admin",
      providerSubscriptionId: null,
      currentPeriodEndsAt: null,
      trialEndsAt: null,
    });

    if (subscriptionError) throw subscriptionError;

    const providerInvoiceId = `OVERRIDE-${(reason || "MANUAL_OVERRIDE").slice(0, 24).toUpperCase().replace(/\s+/g, "_")}`;
    const { error: invoiceError } = await (supabaseAdmin as any)
      .from("store_invoices")
      .insert({
        store_id: storeId,
        plan_id: plan.id,
        amount: 0,
        currency: plan.currency_code || "BDT",
        status: "paid",
        payment_method: "manual_override",
        provider: "platform_admin",
        billing_interval: "monthly",
        paid_at: now.toISOString(),
        billing_period_start: now.toISOString(),
        provider_invoice_id: providerInvoiceId,
        review_note: reason || null,
        reviewed_at: now.toISOString(),
        reviewed_by: user.id,
      });

    if (invoiceError) throw invoiceError;

    await logPlatformAuditAction(supabaseAdmin, {
      actorId: user.id,
      actorEmail: user.email,
      actorRole: role,
      action: "manual_plan_override",
      targetType: "store",
      targetId: storeId,
      details: {
        store_name: store.name,
        plan_id: plan.id,
        plan_name: plan.name,
        reason: reason || null,
      },
    });

    return NextResponse.json({
      success: true,
      status: "active",
      planId: plan.id,
    });
  } catch (error) {
    console.error("Platform subscription mutation error:", error);
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : "Failed to update platform subscription";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
