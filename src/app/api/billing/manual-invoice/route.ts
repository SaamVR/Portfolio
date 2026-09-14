import { NextResponse } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";
import {
  isDatabaseUniqueViolation,
  isValidManualBkashTransactionId,
  MANUAL_BKASH_PROVIDER,
  normalizeManualBkashTransactionId,
} from "@/lib/billing/provider-transaction-id";

export const billingManualInvoiceRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
  now: () => new Date().toISOString(),
};

type BillingAdminClient = ReturnType<typeof getSupabaseAdminClient>;

async function findManualInvoiceByTransaction(
  supabaseAdmin: BillingAdminClient,
  transactionId: string,
) {
  return supabaseAdmin
    .from("store_invoices")
    .select("id, store_id, status, plan_id, provider_invoice_id")
    .eq("provider", MANUAL_BKASH_PROVIDER)
    .eq("provider_invoice_id", transactionId)
    .maybeSingle();
}

function existingInvoiceResponse(
  existingInvoice: { id: string; store_id: string; status: string },
  requestedStoreId: string,
) {
  if (existingInvoice.store_id !== requestedStoreId) {
    return NextResponse.json(
      { error: "This bKash transaction has already been submitted." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    success: true,
    invoiceId: existingInvoice.id,
    duplicated: true,
    status: existingInvoice.status,
  });
}

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
    const rawTransactionId = typeof body?.transactionId === "string" ? body.transactionId : "";
    const transactionId = normalizeManualBkashTransactionId(rawTransactionId);

    if (!storeId || !planId || !transactionId) {
      return NextResponse.json({ error: "Missing storeId, planId, or transactionId" }, { status: 400 });
    }
    if (!isValidManualBkashTransactionId(rawTransactionId)) {
      return NextResponse.json({ error: "Invalid bKash transaction ID" }, { status: 400 });
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

    // Provider transaction identity is global, not tenant-local. Check it before
    // resolving the requested plan so a legitimate retry reuses durable truth.
    const { data: existingInvoice, error: existingInvoiceError } =
      await findManualInvoiceByTransaction(supabaseAdmin, transactionId);
    if (existingInvoiceError) throw existingInvoiceError;
    if (existingInvoice?.id) {
      return existingInvoiceResponse(existingInvoice, storeId);
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

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("store_invoices")
      .insert({
        store_id: storeId,
        plan_id: plan.id,
        amount,
        billing_interval: billingInterval,
        currency: plan.currency_code || "BDT",
        status: "pending",
        provider: MANUAL_BKASH_PROVIDER,
        payment_method: MANUAL_BKASH_PROVIDER,
        provider_invoice_id: transactionId,
        billing_period_start: billingManualInvoiceRouteDeps.now(),
      })
      .select("id, status")
      .single();

    if (invoiceError && isDatabaseUniqueViolation(invoiceError)) {
      // Another request may have won the unique provider-identity race after
      // our pre-check. Resolve the durable winner instead of granting twice.
      const { data: racedInvoice, error: racedInvoiceError } =
        await findManualInvoiceByTransaction(supabaseAdmin, transactionId);
      if (racedInvoiceError) throw racedInvoiceError;
      if (racedInvoice?.id) {
        return existingInvoiceResponse(racedInvoice, storeId);
      }
    }

    if (invoiceError) throw invoiceError;
    if (!invoice?.id) {
      throw new Error("Manual invoice insert returned no invoice");
    }

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
