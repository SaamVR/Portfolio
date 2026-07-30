import { NextResponse } from "next/server";
import { addMonths, getAuthenticatedUser, getSupabaseAdminClient, upsertStoreSubscription } from "@/lib/api/supabase-route";

export const manualBillingReviewRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  upsertStoreSubscription,
  now: () => new Date(),
};

async function isPlatformAdmin(userId: string) {
  const supabaseAdmin = manualBillingReviewRouteDeps.getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) throw error;
  return data?.role === "admin";
}

export async function POST(req: Request) {
  try {
    const user = await manualBillingReviewRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowed = await isPlatformAdmin(user.id);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const invoiceId = typeof body?.invoiceId === "string" ? body.invoiceId.trim() : "";
    const action = body?.action === "reject" ? "reject" : body?.action === "approve" ? "approve" : null;
    const reviewNote = typeof body?.reviewNote === "string" ? body.reviewNote.trim() : "";

    if (!invoiceId || !action) {
      return NextResponse.json({ error: "Missing invoiceId or action" }, { status: 400 });
    }

    if (action === "reject" && !reviewNote) {
      return NextResponse.json({ error: "A review note is required when rejecting a payment" }, { status: 400 });
    }

    const supabaseAdmin = manualBillingReviewRouteDeps.getSupabaseAdminClient();
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("store_invoices")
      .select("id, store_id, plan_id, status, billing_interval, payment_method, provider, provider_invoice_id")
      .eq("id", invoiceId)
      .maybeSingle();

    if (invoiceError) throw invoiceError;
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const isManualInvoice = invoice.payment_method === "bkash_manual" || invoice.provider === "bkash_manual";
    if (!isManualInvoice) {
      return NextResponse.json({ error: "Only manual bKash invoices can be reviewed here" }, { status: 400 });
    }
    if (invoice.status !== "pending") {
      return NextResponse.json({ error: "This invoice is no longer pending review" }, { status: 409 });
    }

    const now = manualBillingReviewRouteDeps.now();

    if (action === "approve") {
      const periodEnd = addMonths(now, invoice.billing_interval === "annual" ? 12 : 1);

      const { error: invoiceUpdateError } = await (supabaseAdmin as any)
        .from("store_invoices")
        .update({
          status: "paid",
          paid_at: now.toISOString(),
          billing_period_start: now.toISOString(),
          billing_period_end: periodEnd.toISOString(),
          reviewed_at: now.toISOString(),
          reviewed_by: user.id,
          review_note: reviewNote || null,
        })
        .eq("id", invoice.id);

      if (invoiceUpdateError) throw invoiceUpdateError;

      const { error: subscriptionError } = await manualBillingReviewRouteDeps.upsertStoreSubscription(supabaseAdmin, {
        storeId: invoice.store_id,
        planId: invoice.plan_id,
        status: "active",
        provider: "bkash_manual",
        providerSubscriptionId: invoice.provider_invoice_id,
        currentPeriodEndsAt: periodEnd.toISOString(),
        trialEndsAt: null,
      });

      if (subscriptionError) throw subscriptionError;

      return NextResponse.json({ success: true, status: "paid" });
    }

    const { error: invoiceRejectError } = await (supabaseAdmin as any)
      .from("store_invoices")
      .update({
        status: "failed",
        reviewed_at: now.toISOString(),
        reviewed_by: user.id,
        review_note: reviewNote,
      })
      .eq("id", invoice.id);

    if (invoiceRejectError) throw invoiceRejectError;

    return NextResponse.json({ success: true, status: "failed" });
  } catch (error) {
    console.error("Manual billing review error:", error);
    return NextResponse.json({ error: "Failed to review manual payment" }, { status: 500 });
  }
}
