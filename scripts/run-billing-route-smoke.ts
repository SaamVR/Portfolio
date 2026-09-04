import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
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

const PAID_BETA_POLICY_VERSION = "2026-09-04-paid-beta-1";
const REVIEW_POLICY_VERSION = "2026-08-31-review-1";

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

function resetLocalPaidBetaTrustState() {
  const databaseUrl = process.env.SUPABASE_DB_URL;
  if (!databaseUrl) {
    throw new Error("SUPABASE_DB_URL is required to restore the local billing smoke trust state");
  }

  const sql = `
    update public.platform_policy_config
    set policy_version='${REVIEW_POLICY_VERSION}', binding=false,
        acceptance_text='', effective_at=null,
        site_name_snapshot=null, legal_operator_name_snapshot=null,
        updated_at=now()
    where singleton=true;

    update public.platform_jurisdiction_enforcement_config
    set country_enforcement_enabled=false, updated_at=now(), updated_by=null
    where singleton=true;

    update public.platform_identity_config
    set site_name='EZComo', legal_operator_name=null, updated_at=now(), updated_by=null
    where singleton=true;

    delete from public.platform_policy_versions
    where policy_version='${PAID_BETA_POLICY_VERSION}';
  `;

  const result = spawnSync(
    process.platform === "win32" ? "psql.exe" : "psql",
    ["-v", "ON_ERROR_STOP=1", databaseUrl, "-c", sql],
    { cwd: repoRoot, encoding: "utf8" },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Failed to restore local billing smoke trust state");
  }
}

async function activateLocalPaidBetaTrustState(
  supabaseAdmin: ReturnType<typeof requireSupabaseAdmin>,
  userId: string,
) {
  const { error: enforcementError } = await supabaseAdmin
    .from("platform_jurisdiction_enforcement_config")
    .update({ country_enforcement_enabled: true })
    .eq("singleton", true);
  if (enforcementError) throw new Error(`Failed to enable local jurisdiction gate: ${enforcementError.message}`);

  const { error: identityError } = await supabaseAdmin.rpc("set_platform_identity", {
    p_site_name: "EZComo Billing Smoke",
    p_legal_operator_name: "EZComo Billing Smoke Operator",
    p_updated_by: null,
  });
  if (identityError) throw new Error(`Failed to set local platform identity: ${identityError.message}`);

  const effectiveAt = new Date(Date.now() - 60_000).toISOString();
  const { data: activation, error: activationError } = await supabaseAdmin.rpc(
    "activate_platform_policy_version",
    {
      p_policy_version: PAID_BETA_POLICY_VERSION,
      p_effective_at: effectiveAt,
      p_approved_by: null,
    },
  );
  if (activationError) throw new Error(`Failed to activate local paid-beta policy: ${activationError.message}`);

  const acceptanceText =
    activation && typeof activation === "object" && "acceptance_text" in activation
      ? String(activation.acceptance_text ?? "")
      : "";
  if (!acceptanceText) {
    throw new Error("Local paid-beta policy activation did not return acceptance text");
  }

  const { data: legalRegime, error: regimeError } = await supabaseAdmin.rpc(
    "resolve_platform_legal_regime",
    { p_country_code: "BD" },
  );
  if (regimeError) throw new Error(`Failed to resolve local legal regime: ${regimeError.message}`);
  const regime = typeof legalRegime === "string" && legalRegime.trim() ? legalRegime.trim() : "BD";

  const { error: profileError } = await supabaseAdmin.rpc("set_merchant_legal_profile", {
    p_user_id: userId,
    p_business_country_code: "BD",
    p_geo_hint_country_code: null,
    p_geo_hint_region_code: null,
  });
  if (profileError) throw new Error(`Failed to set local merchant legal profile: ${profileError.message}`);

  const { error: acceptanceError } = await supabaseAdmin
    .from("platform_policy_acceptances")
    .insert({
      user_id: userId,
      policy_version: PAID_BETA_POLICY_VERSION,
      acceptance_text: acceptanceText,
      acceptance_context: "billing",
      business_country_code: "BD",
      legal_regime: regime,
    });
  if (acceptanceError) throw new Error(`Failed to record local policy acceptance: ${acceptanceError.message}`);
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
  let localTrustActivated = false;

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

    const blockedCheckoutResponse = await checkoutPost(
      jsonRequest("https://example.com/api/billing/checkout", "POST", {
        storeId,
        planId,
      }),
    );
    assert.equal(
      blockedCheckoutResponse.status,
      500,
      "checkout must stay blocked while paid-beta trust controls are dormant",
    );

    const { count: blockedInvoiceCount, error: blockedInvoiceError } = await supabaseAdmin
      .from("store_invoices")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId);
    if (blockedInvoiceError) throw blockedInvoiceError;
    assert.equal(blockedInvoiceCount, 0, "blocked checkout must not leave a payable invoice");

    await activateLocalPaidBetaTrustState(supabaseAdmin, createdUserId);
    localTrustActivated = true;

    const checkoutResponse = await checkoutPost(
      jsonRequest("https://example.com/api/billing/checkout", "POST", {
        storeId,
        planId,
      }),
    );

    assert.equal(checkoutResponse.status, 200, "checkout should succeed after local trust activation");
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

    if (localTrustActivated) {
      resetLocalPaidBetaTrustState();
    }
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Billing route smoke failed with an unknown error.",
  );
  process.exit(1);
});
