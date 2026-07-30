import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";
import {
  POST as checkoutPost,
  billingCheckoutRouteDeps,
} from "../src/app/api/billing/checkout/route.ts";
import {
  GET as billingBkashCallbackGet,
  billingBkashCallbackRouteDeps,
} from "../src/app/api/billing/bkash-callback/route.ts";
import {
  canManageStore as realCanManageStore,
  getRequiredEnv,
} from "../src/lib/api/supabase-route.ts";

const { loadEnvConfig } = nextEnv;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvConfig(repoRoot);

function requireSupabaseAdmin() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

function ensureGatewayEnv() {
  process.env.PLATFORM_BKASH_APP_KEY ||= "billing-smoke-app-key";
  process.env.PLATFORM_BKASH_APP_SECRET ||= "billing-smoke-app-secret";
  process.env.PLATFORM_BKASH_USERNAME ||= "billing-smoke-user";
  process.env.PLATFORM_BKASH_PASSWORD ||= "billing-smoke-password";
  process.env.NEXT_PUBLIC_APP_URL ||= "http://localhost:8080";
}

function getExpectedBillingBaseUrl() {
  if (process.env.NEXT_PUBLIC_CMS_ROOT_DOMAIN) {
    return `https://${process.env.NEXT_PUBLIC_CMS_ROOT_DOMAIN}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8080";
}

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function main() {
  ensureGatewayEnv();
  const expectedBillingBaseUrl = getExpectedBillingBaseUrl();

  const supabaseAdmin = requireSupabaseAdmin();
  const suffix = randomUUID().slice(0, 8);
  const planId = `billing-smoke-plan-${suffix}`;
  const storeId = randomUUID();
  const storeSlug = `billing-smoke-${suffix}`;
  const paymentId = `pay_${suffix}`;
  const userEmail = `billing-smoke-${suffix}@example.com`;

  const originalCheckoutDeps = {
    getAuthenticatedUser: billingCheckoutRouteDeps.getAuthenticatedUser,
    getSupabaseAdminClient: billingCheckoutRouteDeps.getSupabaseAdminClient,
    canManageStore: billingCheckoutRouteDeps.canManageStore,
    fetch: billingCheckoutRouteDeps.fetch,
  };

  const originalCallbackDeps = {
    getSupabaseAdminClient: billingBkashCallbackRouteDeps.getSupabaseAdminClient,
    fetch: billingBkashCallbackRouteDeps.fetch,
  };

  let createdUserId: string | null = null;

  try {
    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: `Smoke-${suffix}-Pass123!`,
      email_confirm: true,
    });

    if (createUserError || !createdUser.user) {
      throw createUserError ?? new Error("Failed to create billing smoke user");
    }

    createdUserId = createdUser.user.id;

    const { error: planError } = await supabaseAdmin.from("cms_plans").upsert(
      {
        id: planId,
        name: `Billing Smoke ${suffix}`,
        description: "Temporary plan for billing smoke test",
        monthly_price: 999,
        currency_code: "BDT",
        is_active: true,
        sort_order: 999,
      },
      { onConflict: "id" },
    );
    if (planError) throw planError;

    const { error: storeError } = await supabaseAdmin.from("stores").insert({
      id: storeId,
      owner_id: createdUserId,
      name: `Billing Smoke ${suffix}`,
      slug: storeSlug,
      description: "Temporary store for billing smoke test",
      currency_code: "BDT",
      locale: "en-BD",
      plan: "basic",
      store_type: "general",
      is_published: false,
    });
    if (storeError) throw storeError;

    const { error: subscriptionError } = await supabaseAdmin.from("store_subscriptions").upsert(
      {
        store_id: storeId,
        plan_id: planId,
        status: "trialing",
      },
      { onConflict: "store_id" },
    );
    if (subscriptionError) throw subscriptionError;

    billingCheckoutRouteDeps.getAuthenticatedUser = async () => ({ id: createdUserId } as never);
    billingCheckoutRouteDeps.getSupabaseAdminClient = () => supabaseAdmin as never;
    billingCheckoutRouteDeps.canManageStore = async (client, candidateStoreId, userId, roles) =>
      realCanManageStore(client, candidateStoreId, userId, roles);
    billingCheckoutRouteDeps.fetch = async (url: string | URL) => {
      if (String(url).includes("/token/grant")) {
        return {
          json: async () => ({ statusCode: "0000", id_token: "billing-smoke-token" }),
        } as never;
      }

      return {
        json: async () => ({
          statusCode: "0000",
          bkashURL: `https://sandbox.bkash.com/pay/${paymentId}`,
          paymentID: paymentId,
        }),
      } as never;
    };

    billingBkashCallbackRouteDeps.getSupabaseAdminClient = () => supabaseAdmin as never;
    billingBkashCallbackRouteDeps.fetch = async (url: string | URL) => {
      if (String(url).includes("/token/grant")) {
        return {
          json: async () => ({ statusCode: "0000", id_token: "billing-smoke-token" }),
        } as never;
      }

      return {
        json: async () => ({
          statusCode: "0000",
          amount: "999",
        }),
      } as never;
    };

    const checkoutResponse = await checkoutPost(
      jsonRequest("https://example.com/api/billing/checkout", "POST", {
        storeId,
        planId,
      }),
    );

    assert.equal(checkoutResponse.status, 200, "checkout should succeed");
    assert.deepEqual(await checkoutResponse.json(), {
      paymentUrl: `https://sandbox.bkash.com/pay/${paymentId}`,
    });

    const { data: checkoutInvoice, error: checkoutInvoiceError } = await supabaseAdmin
      .from("store_invoices")
      .select("id, store_id, plan_id, status, amount, provider_invoice_id")
      .eq("store_id", storeId)
      .eq("provider_invoice_id", paymentId)
      .maybeSingle();

    if (checkoutInvoiceError) throw checkoutInvoiceError;
    assert.ok(checkoutInvoice, "checkout should create an invoice");
    assert.equal(checkoutInvoice.store_id, storeId);
    assert.equal(checkoutInvoice.plan_id, planId);
    assert.equal(Number(checkoutInvoice.amount), 999);
    assert.equal(checkoutInvoice.status, "pending");

    const callbackResponse = await billingBkashCallbackGet(
      new Request(
        `https://example.com/api/billing/bkash-callback?status=success&paymentID=${paymentId}&invoice_id=${checkoutInvoice.id}&store_id=${storeId}`,
      ),
    );

    assert.equal(callbackResponse.status, 307, "callback should redirect back to billing");
    assert.equal(
      callbackResponse.headers.get("location"),
      `${expectedBillingBaseUrl}/admin/billing?payment=success`,
    );

    const { data: finalInvoice, error: finalInvoiceError } = await supabaseAdmin
      .from("store_invoices")
      .select("status, payment_method, provider_invoice_id, paid_at, billing_period_end")
      .eq("id", checkoutInvoice.id)
      .maybeSingle();
    if (finalInvoiceError) throw finalInvoiceError;

    const { data: finalSubscription, error: finalSubscriptionError } = await supabaseAdmin
      .from("store_subscriptions")
      .select("plan_id, status, provider, provider_subscription_id, current_period_ends_at")
      .eq("store_id", storeId)
      .maybeSingle();
    if (finalSubscriptionError) throw finalSubscriptionError;

    assert.equal(finalInvoice?.status, "paid");
    assert.equal(finalInvoice?.payment_method, "bkash");
    assert.equal(finalInvoice?.provider_invoice_id, paymentId);
    assert.ok(finalInvoice?.paid_at, "paid invoice should have paid_at");
    assert.ok(finalInvoice?.billing_period_end, "paid invoice should have billing_period_end");

    assert.equal(finalSubscription?.plan_id, planId);
    assert.equal(finalSubscription?.status, "active");
    assert.equal(finalSubscription?.provider, "bkash");
    assert.equal(finalSubscription?.provider_subscription_id, paymentId);
    assert.ok(
      finalSubscription?.current_period_ends_at,
      "subscription should have a billing period end after callback",
    );

    console.log("Billing route smoke passed.");
    console.log(`Store: ${storeSlug}`);
    console.log(`Invoice: ${checkoutInvoice.id}`);
  } finally {
    billingCheckoutRouteDeps.getAuthenticatedUser = originalCheckoutDeps.getAuthenticatedUser;
    billingCheckoutRouteDeps.getSupabaseAdminClient = originalCheckoutDeps.getSupabaseAdminClient;
    billingCheckoutRouteDeps.canManageStore = originalCheckoutDeps.canManageStore;
    billingCheckoutRouteDeps.fetch = originalCheckoutDeps.fetch;

    billingBkashCallbackRouteDeps.getSupabaseAdminClient =
      originalCallbackDeps.getSupabaseAdminClient;
    billingBkashCallbackRouteDeps.fetch = originalCallbackDeps.fetch;

    await supabaseAdmin.from("stores").delete().eq("id", storeId);
    await supabaseAdmin.from("cms_plans").delete().eq("id", planId);

    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
    }
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Billing route smoke failed with an unknown error.",
  );
  process.exit(1);
});
