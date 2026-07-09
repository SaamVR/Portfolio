import { NextResponse } from "next/server";
import { addMonths, getSupabaseAdminClient } from "@/lib/api/supabase-route";

export const billingWebhookRouteDeps = {
  getSupabaseAdminClient,
};

function isAuthorizedWebhook(req: Request) {
  const expectedSecret = process.env.BILLING_WEBHOOK_SECRET;
  const providedSecret = req.headers.get("x-commerce-webhook-secret");

  return Boolean(expectedSecret && providedSecret && providedSecret === expectedSecret);
}

export async function POST(req: Request) {
  try {
    if (!isAuthorizedWebhook(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, data } = await req.json();
    if (!type || !data?.invoice_id) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    const supabaseAdmin = billingWebhookRouteDeps.getSupabaseAdminClient();
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("store_invoices")
      .select("id, store_id, plan_id, status")
      .eq("id", data.invoice_id)
      .maybeSingle();

    if (invoiceError) throw invoiceError;
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (type === "payment.success") {
      const now = new Date();
      const periodEnd = addMonths(now, 1);

      await supabaseAdmin
        .from("store_invoices")
        .update({
          status: "paid",
          paid_at: now.toISOString(),
          payment_method: data.payment_method || "manual-webhook",
          provider_invoice_id: data.provider_invoice_id || null,
          billing_period_end: periodEnd.toISOString(),
        })
        .eq("id", invoice.id);

      await supabaseAdmin
        .from("store_subscriptions")
        .update({
          plan_id: invoice.plan_id,
          status: "active",
          current_period_ends_at: periodEnd.toISOString(),
          provider: data.provider || "manual-webhook",
          provider_subscription_id: data.provider_subscription_id || null,
        })
        .eq("store_id", invoice.store_id);

      return NextResponse.json({ success: true, message: "Subscription activated" });
    }

    if (type === "payment.failed") {
      await supabaseAdmin
        .from("store_invoices")
        .update({ status: "failed" })
        .eq("id", invoice.id);

      await supabaseAdmin
        .from("store_subscriptions")
        .update({ status: "past_due" })
        .eq("store_id", invoice.store_id);

      return NextResponse.json({ success: true, message: "Subscription marked as past due" });
    }

    return NextResponse.json({ message: "Unhandled webhook event type" }, { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
