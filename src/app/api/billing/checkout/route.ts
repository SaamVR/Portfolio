import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getPlatformSiteUrl } from "@/lib/platform/site-config";
import { getPlatformBkashCredentialsFromConnection, readPlatformBkashConnection } from "@/lib/payments/platform-connections";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";

export const billingCheckoutRouteDeps = {
  rateLimit,
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
  now: () => new Date(),
  fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
};

function getAppBaseUrl() {
  return getPlatformSiteUrl();
}

export async function POST(req: Request) {
  let createdInvoiceId: string | null = null;
  let supabaseAdmin: ReturnType<typeof getSupabaseAdminClient> | null = null;

  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const { success } = await billingCheckoutRouteDeps.rateLimit(`checkout_${ip}`, {
      limit: 5,
      windowMs: 60000,
    });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const user = await billingCheckoutRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeId, planId, billingInterval } = await req.json();
    if (!storeId || !planId) {
      return NextResponse.json({ error: "Missing storeId or planId" }, { status: 400 });
    }
    const interval = billingInterval === "annual" ? "annual" : "monthly";

    supabaseAdmin = billingCheckoutRouteDeps.getSupabaseAdminClient();
    const authorized = await billingCheckoutRouteDeps.canManageStore(supabaseAdmin, storeId, user.id, [
      "owner",
      "admin",
    ]);
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

    const amount = Number(interval === "annual" ? (plan.annual_price ?? Number(plan.monthly_price ?? 0) * 12) : plan.monthly_price ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "This plan does not require checkout" }, { status: 400 });
    }

    const platformConnection = await readPlatformBkashConnection(supabaseAdmin);
    const configuredConnection = getPlatformBkashCredentialsFromConnection(platformConnection);

    const appKey = configuredConnection?.appKey || process.env.PLATFORM_BKASH_APP_KEY;
    const appSecret = configuredConnection?.appSecret || process.env.PLATFORM_BKASH_APP_SECRET;
    const username = configuredConnection?.username || process.env.PLATFORM_BKASH_USERNAME;
    const password = configuredConnection?.password || process.env.PLATFORM_BKASH_PASSWORD;

    if (!appKey || !appSecret || !username || !password) {
      return NextResponse.json(
        { error: "Platform bKash credentials are not configured" },
        { status: 503 },
      );
    }

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("store_invoices")
      .insert({
        store_id: storeId,
        plan_id: plan.id,
        amount,
        currency: plan.currency_code || "BDT",
        status: "pending",
        provider: "bkash",
        billing_interval: interval,
        billing_period_start: billingCheckoutRouteDeps.now().toISOString(),
      })
      .select("id")
      .single();

    if (invoiceError) throw invoiceError;
    createdInvoiceId = invoice.id;

    const isLive = configuredConnection?.forceTestMode
      ? false
      : (configuredConnection?.isLive ?? (process.env.PLATFORM_BKASH_IS_LIVE === "true"));
    const defaultBkashBaseUrl = isLive
      ? "https://tokenized.pay.bka.sh/v1.2.0-beta"
      : "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
    const bkashBaseUrl = configuredConnection?.baseUrl || defaultBkashBaseUrl;

    const tokenRes = await billingCheckoutRouteDeps.fetch(
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

    const callbackUrl = new URL(`${getAppBaseUrl()}/api/billing/bkash-callback`);
    callbackUrl.searchParams.set("invoice_id", invoice.id);
    callbackUrl.searchParams.set("store_id", storeId);

    const createRes = await billingCheckoutRouteDeps.fetch(
      `${bkashBaseUrl}/tokenized/checkout/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: tokenData.id_token,
          "X-APP-Key": appKey,
        },
        body: JSON.stringify({
          mode: "0011",
          payerReference: `store_${storeId.substring(0, 10)}`,
          callbackURL: callbackUrl.toString(),
          amount: amount.toString(),
          currency: plan.currency_code || "BDT",
          intent: "sale",
          merchantInvoiceNumber: invoice.id.replace(/-/g, "").substring(0, 20),
        }),
      },
    );

    const createData = await createRes.json();
    if (createData.statusCode !== "0000" || !createData.bkashURL) {
      throw new Error(`bKash create error: ${createData.statusMessage || "unknown error"}`);
    }

    if (createData.paymentID) {
      await supabaseAdmin
        .from("store_invoices")
        .update({ provider_invoice_id: createData.paymentID })
        .eq("id", invoice.id);
    }

    return NextResponse.json({ paymentUrl: createData.bkashURL });
  } catch (error) {
    if (createdInvoiceId && supabaseAdmin) {
      await supabaseAdmin.from("store_invoices").delete().eq("id", createdInvoiceId);
    }
    console.error("Checkout initialization error:", error);
    return NextResponse.json({ error: "Failed to initialize checkout" }, { status: 500 });
  }
}

