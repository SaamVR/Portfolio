import { NextResponse } from "next/server";
import { addMonths, getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { getPlatformBkashCredentialsFromConnection, readPlatformBkashConnection } from "@/lib/payments/platform-connections";
import { getPlatformSiteUrl } from "@/lib/platform/site-config";

export const billingBkashCallbackRouteDeps = {
  getSupabaseAdminClient,
  now: () => new Date(),
  fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
};

function getAppBaseUrl() {
  return getPlatformSiteUrl();
}

function getBillingRedirectUrl(payment: "success" | "cancelled" | "error", message?: string) {
  const billingUrl = new URL(`${getAppBaseUrl()}/admin/billing`);
  billingUrl.searchParams.set("payment", payment);
  if (message) {
    billingUrl.searchParams.set("message", message);
  }
  return billingUrl;
}

async function markInvoiceFailed(supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>, invoiceId: string) {
  const { error } = await supabaseAdmin
    .from("store_invoices")
    .update({ status: "failed" })
    .eq("id", invoiceId);

  if (error) {
    console.error("Failed to mark bKash invoice failed:", error);
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const paymentID = searchParams.get("paymentID");
  const status = searchParams.get("status");
  const invoiceId = searchParams.get("invoice_id");
  const storeId = searchParams.get("store_id");

  if (!invoiceId || !storeId) {
    return NextResponse.redirect(getBillingRedirectUrl("error", "Missing payment context."));
  }

  const supabaseAdmin = billingBkashCallbackRouteDeps.getSupabaseAdminClient();

  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from("store_invoices")
    .select("id, store_id, plan_id, amount, currency, status, provider_invoice_id, billing_interval")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invoiceError || !invoice || invoice.store_id !== storeId) {
    return NextResponse.redirect(getBillingRedirectUrl("error", "Invalid payment context."));
  }

  if (invoice.status === "paid") {
    if (paymentID && invoice.provider_invoice_id && invoice.provider_invoice_id !== paymentID) {
      return NextResponse.redirect(getBillingRedirectUrl("error", "Payment id mismatch."));
    }
    return NextResponse.redirect(getBillingRedirectUrl("success"));
  }

  if (status !== "success") {
    await markInvoiceFailed(supabaseAdmin, invoice.id);
    return NextResponse.redirect(getBillingRedirectUrl("cancelled"));
  }

  if (!paymentID) {
    await markInvoiceFailed(supabaseAdmin, invoice.id);
    return NextResponse.redirect(getBillingRedirectUrl("error", "Missing bKash payment id."));
  }

  if (invoice.provider_invoice_id && invoice.provider_invoice_id !== paymentID) {
    await markInvoiceFailed(supabaseAdmin, invoice.id);
    return NextResponse.redirect(getBillingRedirectUrl("error", "Payment id mismatch."));
  }

  try {
    const platformConnection = await readPlatformBkashConnection(supabaseAdmin);
    const configuredConnection = getPlatformBkashCredentialsFromConnection(platformConnection);

    const appKey = configuredConnection?.appKey || process.env.PLATFORM_BKASH_APP_KEY;
    const appSecret = configuredConnection?.appSecret || process.env.PLATFORM_BKASH_APP_SECRET;
    const username = configuredConnection?.username || process.env.PLATFORM_BKASH_USERNAME;
    const password = configuredConnection?.password || process.env.PLATFORM_BKASH_PASSWORD;

    if (!appKey || !appSecret || !username || !password) {
      throw new Error("Platform bKash credentials are not configured");
    }

    const isLive = configuredConnection?.forceTestMode
      ? false
      : (configuredConnection?.isLive ?? (process.env.PLATFORM_BKASH_IS_LIVE === "true"));
    const defaultBkashBaseUrl = isLive
      ? "https://tokenized.pay.bka.sh/v1.2.0-beta"
      : "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
    const bkashBaseUrl = configuredConnection?.baseUrl || defaultBkashBaseUrl;

    const tokenRes = await billingBkashCallbackRouteDeps.fetch(
      `${bkashBaseUrl}/tokenized/checkout/token/grant`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          username,
          password,
        },
        body: JSON.stringify({
          app_key: appKey,
          app_secret: appSecret,
        }),
      },
    );

    const tokenData = await tokenRes.json();
    if (tokenData.statusCode !== "0000" || !tokenData.id_token) {
      throw new Error(`bKash token error: ${tokenData.statusMessage || "unknown error"}`);
    }

    const executeRes = await billingBkashCallbackRouteDeps.fetch(
      `${bkashBaseUrl}/tokenized/checkout/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: tokenData.id_token,
          "X-APP-Key": appKey,
        },
        body: JSON.stringify({ paymentID }),
      },
    );

    const executeData = await executeRes.json();
    if (executeData.statusCode !== "0000" && executeData.statusCode !== "2062") {
      throw new Error(`bKash execute error: ${executeData.statusMessage || "unknown error"}`);
    }

    // From this point onward the gateway has confirmed the payment. Never
    // convert the invoice to "failed" because of a local/transient error.
    if (executeData.amount && Number(executeData.amount) !== Number(invoice.amount)) {
      throw new Error("Paid amount does not match invoice amount");
    }

    if (executeData.currency && String(executeData.currency).toUpperCase() !== String(invoice.currency).toUpperCase()) {
      throw new Error("Paid currency does not match invoice currency");
    }

    const now = billingBkashCallbackRouteDeps.now();
    const periodEnd = addMonths(now, invoice.billing_interval === "annual" ? 12 : 1);

    // The database trigger sync_paid_invoice_entitlements_trigger performs the
    // subscription + stores.plan writes in this same transaction. If any of
    // those writes fail, this invoice update rolls back and can be retried.
    const { error: settlementError } = await supabaseAdmin
      .from("store_invoices")
      .update({
        status: "paid",
        paid_at: now.toISOString(),
        provider: "bkash",
        payment_method: "bkash",
        provider_invoice_id: paymentID,
        billing_period_start: now.toISOString(),
        billing_period_end: periodEnd.toISOString(),
      })
      .eq("id", invoice.id)
      .eq("store_id", invoice.store_id);

    if (settlementError) {
      throw settlementError;
    }

    return NextResponse.redirect(getBillingRedirectUrl("success"));
  } catch (error) {
    console.error("bKash callback verification/settlement error:", error);

    // A callback marked success can fail locally because the gateway is
    // temporarily unavailable, credentials cannot be loaded, or settlement
    // writes fail. Leave the invoice pending/unchanged so the callback or a
    // reconciliation job can safely retry instead of recording a false failure.
    return NextResponse.redirect(
      getBillingRedirectUrl("error", "Payment verification is pending. Please refresh billing shortly or contact support."),
    );
  }
}
