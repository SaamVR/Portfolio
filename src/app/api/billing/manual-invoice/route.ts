import { NextResponse } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";

export const billingManualInvoiceRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
  now: () => new Date().toISOString(),
};

export async function POST(req: Request) {
  try {
    const user = await billingManualInvoiceRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const storeId = typeof body?.storeId === "string" ? body.storeId.trim() : "";
    const planId = typeof body?.planId === "string" ? body.planId.trim() : "";
    const billingInterval = body?.billingInterval === "annual" ? "annual" : "monthly";
    const transactionId = typeof body?.transactionId === "string" ? body.transactionId.trim() : "";

    if (!storeId || !planId || !transactionId) {
      return NextResponse.json({ error: "Missing storeId, planId, or transactionId" }, { status: 400 });
    }

    const supabaseAdmin = billingManualInvoiceRouteDeps.getSupabaseAdminClient();
    const authorized = await billingManualInvoiceRouteDeps.canManageStore(
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
      .select("id, monthly_price, annual_price, currency_code, is_active, contact_only")
      .eq("id", planId)
      .maybeSingle();

    if (planError) throw planError;
    if (!plan || plan.is_active === false) {
      return NextResponse.json({ error: "Plan is not available" }, { status: 400 });
    }
    if (plan.contact_only) {
      return NextResponse.json({ error: "This plan must be activated through support" }, { status: 400 });
    }

    const amount = Number(
      billingInterval === "annual"
        ? (plan.annual_price ?? Number(plan.monthly_price ?? 0) * 12)
        : plan.monthly_price ?? 0,
    );
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "This plan does not require manual payment submission" }, { status: 400 });
    }

    const { data: existingInvoice, error: existingInvoiceError } = await supabaseAdmin
      .from("store_invoices")
      .select("id, status, plan_id, provider_invoice_id")
      .eq("store_id", storeId)
      .eq("provider", "bkash_manual")
      .eq("provider_invoice_id", transactionId)
      .maybeSingle();

    if (existingInvoiceError) throw existingInvoiceError;

    if (existingInvoice?.id) {
      return NextResponse.json({
        success: true,
        invoiceId: existingInvoice.id,
        duplicated: true,
        status: existingInvoice.status,
      });
    }

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("store_invoices")
      .insert({
        store_id: storeId,
        plan_id: plan.id,
        amount,
        billing_interval: billingInterval,
        currency: plan.currency_code || "BDT",
        status: "pending",
        provider: "bkash_manual",
        payment_method: "bkash_manual",
        provider_invoice_id: transactionId,
        billing_period_start: billingManualInvoiceRouteDeps.now(),
      })
      .select("id, status")
      .single();

    if (invoiceError) throw invoiceError;

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      duplicated: false,
      status: invoice.status,
    });
  } catch (error) {
    console.error("Manual invoice submission error:", error);
    return NextResponse.json({ error: "Failed to submit manual payment" }, { status: 500 });
  }
}
