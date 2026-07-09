import { NextResponse } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";

export const billingSubscriptionRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
};

export async function PATCH(req: Request) {
  try {
    const user = await billingSubscriptionRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeId, planId, action } = await req.json();
    if (!storeId || !planId) {
      return NextResponse.json({ error: "Missing storeId or planId" }, { status: 400 });
    }

    const supabaseAdmin = billingSubscriptionRouteDeps.getSupabaseAdminClient();
    const authorized = await billingSubscriptionRouteDeps.canManageStore(
      supabaseAdmin,
      storeId,
      user.id,
      ["owner", "admin"],
    );
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from("cms_plans")
      .select("id, monthly_price, is_active")
      .eq("id", planId)
      .maybeSingle();

    if (planError) throw planError;
    if (!plan || plan.is_active === false) {
      return NextResponse.json({ error: "Plan is not available" }, { status: 400 });
    }

    const monthlyPrice = Number(plan.monthly_price ?? 0);
    if (monthlyPrice > 0 && action !== "cancel") {
      return NextResponse.json(
        { error: "Paid plan changes must go through checkout" },
        { status: 400 },
      );
    }

    const nextStatus = action === "cancel" ? "cancelled" : "active";

    const { error } = await supabaseAdmin
      .from("store_subscriptions")
      .upsert(
        {
          store_id: storeId,
          plan_id: plan.id,
          status: nextStatus,
          provider: null,
          provider_subscription_id: null,
          current_period_ends_at: null,
        },
        { onConflict: "store_id" },
      );

    if (error) throw error;

    return NextResponse.json({ success: true, status: nextStatus, planId: plan.id });
  } catch (error) {
    console.error("Subscription update error:", error);
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}
