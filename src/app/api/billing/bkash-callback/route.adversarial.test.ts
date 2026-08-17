import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { GET, billingBkashCallbackRouteDeps } from "./route";

const originalDeps = {
  getSupabaseAdminClient: billingBkashCallbackRouteDeps.getSupabaseAdminClient,
  fetch: billingBkashCallbackRouteDeps.fetch,
  now: billingBkashCallbackRouteDeps.now,
};

function makeAdmin(invoice: Record<string, unknown>) {
  const updates: Array<Record<string, unknown>> = [];

  return {
    updates,
    client: {
      rpc: async () => ({ data: null, error: null }),
      from(table: string) {
        if (table === "store_invoices") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({ data: { ...invoice }, error: null }),
                  };
                },
              };
            },
            update(payload: Record<string, unknown>) {
              return {
                eq() {
                  updates.push(payload);
                  Object.assign(invoice, payload);
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        }

        if (table === "platform_payment_connections_secure") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({ data: null, error: null }),
                  };
                },
              };
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    },
  };
}

function callbackUrl(paymentId = "pay_1") {
  return `https://example.com/api/billing/bkash-callback?status=success&paymentID=${paymentId}&invoice_id=invoice_1&store_id=store_1`;
}

function installCredentials() {
  process.env.PLATFORM_BKASH_APP_KEY = "app-key";
  process.env.PLATFORM_BKASH_APP_SECRET = "app-secret";
  process.env.PLATFORM_BKASH_USERNAME = "user";
  process.env.PLATFORM_BKASH_PASSWORD = "pass";
  process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
}

afterEach(() => {
  billingBkashCallbackRouteDeps.getSupabaseAdminClient = originalDeps.getSupabaseAdminClient;
  billingBkashCallbackRouteDeps.fetch = originalDeps.fetch;
  billingBkashCallbackRouteDeps.now = originalDeps.now;
  delete process.env.PLATFORM_BKASH_APP_KEY;
  delete process.env.PLATFORM_BKASH_APP_SECRET;
  delete process.env.PLATFORM_BKASH_USERNAME;
  delete process.env.PLATFORM_BKASH_PASSWORD;
  delete process.env.NEXT_PUBLIC_APP_URL;
});

test("already-paid callback is idempotent and does not execute the gateway again", async () => {
  const admin = makeAdmin({
    id: "invoice_1",
    store_id: "store_1",
    plan_id: "pro",
    amount: 999,
    currency: "BDT",
    status: "paid",
    provider_invoice_id: "pay_1",
    billing_interval: "monthly",
  });
  let fetchCalls = 0;
  billingBkashCallbackRouteDeps.getSupabaseAdminClient = () => admin.client as never;
  billingBkashCallbackRouteDeps.fetch = async () => {
    fetchCalls += 1;
    throw new Error("gateway should not be called");
  };

  const response = await GET(new Request(callbackUrl()));
  assert.equal(response.status, 307);
  assert.equal(fetchCalls, 0);
  assert.equal(admin.updates.length, 0);
  assert.match(response.headers.get("location") || "", /payment=success/);
});

test("amount mismatch fails the invoice and never grants entitlements", async () => {
  installCredentials();
  const admin = makeAdmin({
    id: "invoice_1",
    store_id: "store_1",
    plan_id: "pro",
    amount: 999,
    currency: "BDT",
    status: "pending",
    provider_invoice_id: "pay_1",
    billing_interval: "monthly",
  });
  billingBkashCallbackRouteDeps.getSupabaseAdminClient = () => admin.client as never;
  billingBkashCallbackRouteDeps.fetch = async (url: string | URL) => ({
    json: async () => String(url).includes("token/grant")
      ? { statusCode: "0000", id_token: "token" }
      : { statusCode: "0000", amount: "1", currency: "BDT" },
  }) as never;

  const response = await GET(new Request(callbackUrl()));
  assert.match(response.headers.get("location") || "", /payment=error/);
  assert.deepEqual(admin.updates, [{ status: "failed" }]);
});

test("currency mismatch fails the invoice", async () => {
  installCredentials();
  const admin = makeAdmin({
    id: "invoice_1",
    store_id: "store_1",
    plan_id: "pro",
    amount: 999,
    currency: "BDT",
    status: "pending",
    provider_invoice_id: "pay_1",
    billing_interval: "monthly",
  });
  billingBkashCallbackRouteDeps.getSupabaseAdminClient = () => admin.client as never;
  billingBkashCallbackRouteDeps.fetch = async (url: string | URL) => ({
    json: async () => String(url).includes("token/grant")
      ? { statusCode: "0000", id_token: "token" }
      : { statusCode: "0000", amount: "999", currency: "USD" },
  }) as never;

  const response = await GET(new Request(callbackUrl()));
  assert.match(response.headers.get("location") || "", /payment=error/);
  assert.deepEqual(admin.updates, [{ status: "failed" }]);
});

test("transient gateway failure leaves the invoice pending for safe retry", async () => {
  installCredentials();
  const admin = makeAdmin({
    id: "invoice_1",
    store_id: "store_1",
    plan_id: "pro",
    amount: 999,
    currency: "BDT",
    status: "pending",
    provider_invoice_id: "pay_1",
    billing_interval: "monthly",
  });
  billingBkashCallbackRouteDeps.getSupabaseAdminClient = () => admin.client as never;
  billingBkashCallbackRouteDeps.fetch = async () => {
    throw new Error("gateway timeout");
  };

  const response = await GET(new Request(callbackUrl()));
  assert.match(response.headers.get("location") || "", /payment=error/);
  assert.equal(admin.updates.length, 0);
});

test("bKash already-executed response 2062 can still settle the durable invoice", async () => {
  installCredentials();
  const admin = makeAdmin({
    id: "invoice_1",
    store_id: "store_1",
    plan_id: "pro",
    amount: 999,
    currency: "BDT",
    status: "pending",
    provider_invoice_id: "pay_1",
    billing_interval: "monthly",
  });
  billingBkashCallbackRouteDeps.getSupabaseAdminClient = () => admin.client as never;
  billingBkashCallbackRouteDeps.now = () => new Date("2026-08-18T00:00:00.000Z");
  billingBkashCallbackRouteDeps.fetch = async (url: string | URL) => ({
    json: async () => String(url).includes("token/grant")
      ? { statusCode: "0000", id_token: "token" }
      : { statusCode: "2062", amount: "999", currency: "BDT" },
  }) as never;

  const response = await GET(new Request(callbackUrl()));
  assert.match(response.headers.get("location") || "", /payment=success/);
  assert.equal(admin.updates.length, 1);
  assert.equal(admin.updates[0]?.status, "paid");
  assert.equal(admin.updates[0]?.provider_invoice_id, "pay_1");
});
