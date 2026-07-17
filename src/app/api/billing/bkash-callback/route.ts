import { NextResponse } from "next/server";
import { addMonths, getSupabaseAdminClient, upsertStoreSubscription } from "@/lib/api/supabase-route";
import { getPlatformSiteUrl } from "@/lib/platform/site-config";

export const billingBkashCallbackRouteDeps = {
  getSupabaseAdminClient,
  upsertStoreSubscription,
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

  if (status !== "success") {
    await supabaseAdmin
      .from("store_invoices")
      .update({ status: "failed" })
      .eq("id", invoice.id);

    return NextResponse.redirect(getBillingRedirectUrl("cancelled"));
  }

  if (!paymentID) {
    await supabaseAdmin
      .from("store_invoices")
      .update({ status: "failed" })
      .eq("id", invoice.id);

    return NextResponse.redirect(getBillingRedirectUrl("error", "Missing bKash payment id."));
  }

  if (invoice.provider_invoice_id && invoice.provider_invoice_id !== paymentID) {
    await supabaseAdmin
      .from("store_invoices")
      .update({ status: "failed" })
      .eq("id", invoice.id);

    return NextResponse.redirect(getBillingRedirectUrl("error", "Payment id mismatch."));
  }

  try {
    const appKey = process.env.PLATFORM_BKASH_APP_KEY;
    const appSecret = process.env.PLATFORM_BKASH_APP_SECRET;
    const username = process.env.PLATFORM_BKASH_USERNAME;
    const password = process.env.PLATFORM_BKASH_PASSWORD;

    if (!appKey || !appSecret || !username || !password) {
      throw new Error("Platform bKash credentials are not configured");
    }

    const isLive = process.env.PLATFORM_BKASH_IS_LIVE === "true";
    const bkashBaseUrl = isLive
      ? "https://tokenized.pay.bka.sh/v1.2.0-beta"
      : "https://tokenized.sandbox.bka.sh/v1.2.0-beta";

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

    if (executeData.amount && Number(executeData.amount) !== Number(invoice.amount)) {
      throw new Error("Paid amount does not match invoice amount");
    }

    const now = billingBkashCallbackRouteDeps.now();
    const periodEnd = addMonths(now, invoice.billing_interval === "annual" ? 12 : 1);

    await supabaseAdmin
      .from("store_invoices")
      .update({
        status: "paid",
        paid_at: now.toISOString(),
        payment_method: "bkash",
        provider_invoice_id: paymentID,
        billing_period_start: now.toISOString(),
        billing_period_end: periodEnd.toISOString(),
      })
      .eq("id", invoice.id);

    await billingBkashCallbackRouteDeps.upsertStoreSubscription(supabaseAdmin, {
      storeId: invoice.store_id,
      planId: invoice.plan_id,
      status: "active",
      provider: "bkash",
      providerSubscriptionId: paymentID,
      currentPeriodEndsAt: periodEnd.toISOString(),
    });

    return NextResponse.redirect(getBillingRedirectUrl("success"));
  } catch (error) {
    console.error("bKash callback execution error:", error);

    await supabaseAdmin
      .from("store_invoices")
      .update({ status: "failed" })
      .eq("id", invoice.id);

    return NextResponse.redirect(getBillingRedirectUrl("error", "Payment execution failed."));
  }
}
