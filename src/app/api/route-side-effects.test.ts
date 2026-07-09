import test, { afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import {
  POST as checkoutPost,
  billingCheckoutRouteDeps,
} from "@/app/api/billing/checkout/route";
import {
  PATCH as subscriptionPatch,
  billingSubscriptionRouteDeps,
} from "@/app/api/billing/subscription/route";
import {
  POST as domainsPost,
  DELETE as domainsDelete,
  domainRouteDeps,
} from "@/app/api/domains/route";
import {
  GET as billingBkashCallbackGet,
  billingBkashCallbackRouteDeps,
} from "@/app/api/billing/bkash-callback/route";

afterEach(() => {
  mock.restoreAll();
  delete process.env.PLATFORM_BKASH_APP_KEY;
  delete process.env.PLATFORM_BKASH_APP_SECRET;
  delete process.env.PLATFORM_BKASH_USERNAME;
  delete process.env.PLATFORM_BKASH_PASSWORD;
  delete process.env.PLATFORM_BKASH_IS_LIVE;
  delete process.env.VERCEL_API_TOKEN;
  delete process.env.VERCEL_PROJECT_ID;
  delete process.env.NEXT_PUBLIC_CMS_ROOT_DOMAIN;
  delete process.env.NEXT_PUBLIC_APP_URL;
});

const FIXED_NOW = new Date("2026-07-09T00:00:00.000Z");

function jsonRequest(url: string, method: string, body: unknown, headers?: HeadersInit) {
  return new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function createCheckoutAdminMock(plan: { id: string; monthly_price: number; currency_code?: string; is_active?: boolean }) {
  const deletedInvoiceIds: string[] = [];
  const insertedInvoices: Array<Record<string, unknown>> = [];
  const updatedInvoiceProviderIds: Array<Record<string, unknown>> = [];

  return {
    deletedInvoiceIds,
    insertedInvoices,
    updatedInvoiceProviderIds,
    client: {
      from(table: string) {
        if (table === "cms_plans") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        id: plan.id,
                        monthly_price: plan.monthly_price,
                        currency_code: plan.currency_code ?? "BDT",
                        is_active: plan.is_active ?? true,
                      },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }

        if (table === "store_invoices") {
          return {
            insert(payload: Record<string, unknown>) {
              insertedInvoices.push(payload);
              return {
                select() {
                  return {
                    single: async () => ({
                      data: { id: "invoice_123" },
                      error: null,
                    }),
                  };
                },
              };
            },
            update(payload: Record<string, unknown>) {
              return {
                eq(column: string, value: string) {
                  updatedInvoiceProviderIds.push({ payload, column, value });
                  return Promise.resolve({ error: null });
                },
              };
            },
            delete() {
              return {
                eq(_column: string, value: string) {
                  deletedInvoiceIds.push(value);
                  return Promise.resolve({ error: null });
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

function createSubscriptionAdminMock(plan: { id: string; monthly_price: number; is_active?: boolean }) {
  const upserts: Array<{ payload: Record<string, unknown>; options: Record<string, unknown> }> = [];

  return {
    upserts,
    client: {
      from(table: string) {
        if (table === "cms_plans") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        id: plan.id,
                        monthly_price: plan.monthly_price,
                        is_active: plan.is_active ?? true,
                      },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }

        if (table === "store_subscriptions") {
          return {
            upsert(payload: Record<string, unknown>, options: Record<string, unknown>) {
              upserts.push({ payload, options });
              return Promise.resolve({ error: null });
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    },
  };
}

function createDomainAdminMock(options?: { existingDomainStoreId?: string | null }) {
  const storeUpdates: Array<{ payload: Record<string, unknown>; filters: Array<[string, string]> }> = [];

  return {
    storeUpdates,
    client: {
      from(table: string) {
        if (table !== "stores") {
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          select() {
            const filters: Array<[string, string]> = [];
            return {
              eq(column: string, value: string) {
                filters.push([column, value]);
                return {
                  neq(_neqColumn: string, _neqValue: string) {
                    return {
                      maybeSingle: async () => ({
                        data: options?.existingDomainStoreId
                          ? { id: options.existingDomainStoreId }
                          : null,
                        error: null,
                      }),
                    };
                  },
                };
              },
            };
          },
          update(payload: Record<string, unknown>) {
            const filters: Array<[string, string]> = [];
            return {
              eq(column: string, value: string) {
                filters.push([column, value]);
                return {
                  eq(nextColumn: string, nextValue: string) {
                    filters.push([nextColumn, nextValue]);
                    storeUpdates.push({ payload, filters: [...filters] });
                    return Promise.resolve({ error: null });
                  },
                  then(resolve: (value: { error: null }) => unknown) {
                    storeUpdates.push({ payload, filters: [...filters] });
                    return Promise.resolve(resolve({ error: null }));
                  },
                };
              },
            };
          },
        };
      },
    },
  };
}

function createBkashCallbackAdminMock(invoice: {
  id: string;
  store_id: string;
  plan_id: string;
  amount: number;
  currency?: string;
  status?: string;
  provider_invoice_id?: string | null;
} | null) {
  const invoiceUpdates: Array<{ payload: Record<string, unknown>; filters: Array<[string, string]> }> = [];
  const subscriptionUpdates: Array<{ payload: Record<string, unknown>; filters: Array<[string, string]> }> = [];

  return {
    invoiceUpdates,
    subscriptionUpdates,
    client: {
      from(table: string) {
        if (table === "store_invoices") {
          return {
            select() {
              return {
                eq(_column: string, _value: string) {
                  return {
                    maybeSingle: async () => ({
                      data: invoice
                        ? {
                            id: invoice.id,
                            store_id: invoice.store_id,
                            plan_id: invoice.plan_id,
                            amount: invoice.amount,
                            currency: invoice.currency ?? "BDT",
                            status: invoice.status ?? "pending",
                            provider_invoice_id: invoice.provider_invoice_id ?? null,
                          }
                        : null,
                      error: null,
                    }),
                  };
                },
              };
            },
            update(payload: Record<string, unknown>) {
              const filters: Array<[string, string]> = [];
              return {
                eq(column: string, value: string) {
                  filters.push([column, value]);
                  invoiceUpdates.push({ payload, filters: [...filters] });
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        }

        if (table === "store_subscriptions") {
          return {
            update(payload: Record<string, unknown>) {
              const filters: Array<[string, string]> = [];
              return {
                eq(column: string, value: string) {
                  filters.push([column, value]);
                  subscriptionUpdates.push({ payload, filters: [...filters] });
                  return Promise.resolve({ error: null });
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

describe("billing checkout side effects", () => {
  test("cleans up the created invoice when gateway token grant fails", async () => {
    mock.method(console, "error", () => {});
    process.env.PLATFORM_BKASH_APP_KEY = "app-key";
    process.env.PLATFORM_BKASH_APP_SECRET = "app-secret";
    process.env.PLATFORM_BKASH_USERNAME = "username";
    process.env.PLATFORM_BKASH_PASSWORD = "password";

    const admin = createCheckoutAdminMock({ id: "growth", monthly_price: 999 });

    mock.method(billingCheckoutRouteDeps, "rateLimit", () => ({ success: true }));
    mock.method(billingCheckoutRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(billingCheckoutRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(billingCheckoutRouteDeps, "canManageStore", async () => true);
    mock.method(billingCheckoutRouteDeps, "fetch", async () => ({
      json: async () => ({ statusCode: "9999", statusMessage: "token failed" }),
    }) as never);

    const response = await checkoutPost(
      jsonRequest("https://example.com/api/billing/checkout", "POST", {
        storeId: "store_1",
        planId: "growth",
      }),
    );

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "Failed to initialize checkout" });
    assert.equal(admin.insertedInvoices.length, 1);
    assert.deepEqual(admin.deletedInvoiceIds, ["invoice_123"]);
    assert.equal(admin.updatedInvoiceProviderIds.length, 0);
  });

  test("writes the exact pending invoice and provider payment id on successful checkout init", async () => {
    process.env.PLATFORM_BKASH_APP_KEY = "app-key";
    process.env.PLATFORM_BKASH_APP_SECRET = "app-secret";
    process.env.PLATFORM_BKASH_USERNAME = "username";
    process.env.PLATFORM_BKASH_PASSWORD = "password";
    process.env.NEXT_PUBLIC_APP_URL = "https://commerce.example.com";

    const admin = createCheckoutAdminMock({ id: "growth", monthly_price: 999, currency_code: "BDT" });

    mock.method(billingCheckoutRouteDeps, "rateLimit", () => ({ success: true }));
    mock.method(billingCheckoutRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(billingCheckoutRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(billingCheckoutRouteDeps, "canManageStore", async () => true);
    mock.method(billingCheckoutRouteDeps, "now", () => FIXED_NOW);
    mock.method(
      billingCheckoutRouteDeps,
      "fetch",
      async (url: string | URL) => {
        if (String(url).includes("/token/grant")) {
          return {
            json: async () => ({ statusCode: "0000", id_token: "token_123" }),
          } as never;
        }

        return {
          json: async () => ({
            statusCode: "0000",
            bkashURL: "https://sandbox.bkash.com/pay/123",
            paymentID: "pay_123",
          }),
        } as never;
      },
    );

    const response = await checkoutPost(
      jsonRequest("https://example.com/api/billing/checkout", "POST", {
        storeId: "store_1",
        planId: "growth",
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { paymentUrl: "https://sandbox.bkash.com/pay/123" });
    assert.deepEqual(admin.insertedInvoices, [
      {
        store_id: "store_1",
        plan_id: "growth",
        amount: 999,
        currency: "BDT",
        status: "pending",
        provider: "bkash",
        billing_period_start: FIXED_NOW.toISOString(),
      },
    ]);
    assert.deepEqual(admin.updatedInvoiceProviderIds, [
      {
        payload: { provider_invoice_id: "pay_123" },
        column: "id",
        value: "invoice_123",
      },
    ]);
    assert.deepEqual(admin.deletedInvoiceIds, []);
  });
});

describe("billing subscription side effects", () => {
  test("writes the exact active free-plan subscription payload", async () => {
    const admin = createSubscriptionAdminMock({ id: "starter", monthly_price: 0 });

    mock.method(billingSubscriptionRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(billingSubscriptionRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(billingSubscriptionRouteDeps, "canManageStore", async () => true);

    const response = await subscriptionPatch(
      jsonRequest("https://example.com/api/billing/subscription", "PATCH", {
        storeId: "store_1",
        planId: "starter",
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, status: "active", planId: "starter" });
    assert.deepEqual(admin.upserts, [
      {
        payload: {
          store_id: "store_1",
          plan_id: "starter",
          status: "active",
          provider: null,
          provider_subscription_id: null,
          current_period_ends_at: null,
        },
        options: { onConflict: "store_id" },
      },
    ]);
  });

  test("writes the exact cancelled subscription payload for cancel actions", async () => {
    const admin = createSubscriptionAdminMock({ id: "growth", monthly_price: 1499 });

    mock.method(billingSubscriptionRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(billingSubscriptionRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(billingSubscriptionRouteDeps, "canManageStore", async () => true);

    const response = await subscriptionPatch(
      jsonRequest("https://example.com/api/billing/subscription", "PATCH", {
        storeId: "store_1",
        planId: "growth",
        action: "cancel",
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, status: "cancelled", planId: "growth" });
    assert.deepEqual(admin.upserts, [
      {
        payload: {
          store_id: "store_1",
          plan_id: "growth",
          status: "cancelled",
          provider: null,
          provider_subscription_id: null,
          current_period_ends_at: null,
        },
        options: { onConflict: "store_id" },
      },
    ]);
  });
});

describe("domain route side effects", () => {
  test("blocks cross-store custom-domain claims before Vercel or store updates", async () => {
    const admin = createDomainAdminMock({ existingDomainStoreId: "other_store" });

    process.env.VERCEL_API_TOKEN = "vercel-token";
    process.env.VERCEL_PROJECT_ID = "project_123";

    mock.method(domainRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(domainRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(domainRouteDeps, "canManageStore", async () => true);
    const fetchMock = mock.method(domainRouteDeps, "fetch", async () => {
      throw new Error("should not call vercel");
    });

    const response = await domainsPost(
      jsonRequest("https://example.com/api/domains", "POST", {
        storeId: "store_1",
        domain: "shop.example.com",
      }),
    );

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      error: "Domain is already connected to another store",
    });
    assert.equal(fetchMock.mock.callCount(), 0);
    assert.equal(admin.storeUpdates.length, 0);
  });

  test("allows owner/admin domain claims and writes the normalized domain to the store", async () => {
    const admin = createDomainAdminMock();

    process.env.VERCEL_API_TOKEN = "vercel-token";
    process.env.VERCEL_PROJECT_ID = "project_123";

    mock.method(domainRouteDeps, "getAuthenticatedUser", async () => ({ id: "admin_1" }) as never);
    mock.method(domainRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(domainRouteDeps, "canManageStore", async () => true);
    const fetchMock = mock.method(domainRouteDeps, "fetch", async () => ({
      ok: true,
      status: 200,
      json: async () => ({ verified: true }),
    }) as never);

    const response = await domainsPost(
      jsonRequest("https://example.com/api/domains", "POST", {
        storeId: "store_1",
        domain: " HTTPS://Shop.Example.com/path ",
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      verified: true,
      domain: "shop.example.com",
    });
    assert.equal(fetchMock.mock.callCount(), 1);
    assert.deepEqual(admin.storeUpdates, [
      {
        payload: { custom_domain: "shop.example.com" },
        filters: [["id", "store_1"]],
      },
    ]);
  });

  test("clears only the matching custom domain on successful removal", async () => {
    const admin = createDomainAdminMock();

    process.env.VERCEL_API_TOKEN = "vercel-token";
    process.env.VERCEL_PROJECT_ID = "project_123";

    mock.method(domainRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(domainRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(domainRouteDeps, "canManageStore", async () => true);
    mock.method(domainRouteDeps, "fetch", async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
    }) as never);

    const response = await domainsDelete(
      new Request("https://example.com/api/domains?storeId=store_1&domain=Shop.Example.com", {
        method: "DELETE",
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true });
    assert.deepEqual(admin.storeUpdates, [
      {
        payload: { custom_domain: null },
        filters: [
          ["id", "store_1"],
          ["custom_domain", "shop.example.com"],
        ],
      },
    ]);
  });
});

describe("bKash callback context integrity", () => {
  test("rejects invoice/store mismatches before gateway execution", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://commerce.example.com";

    const admin = createBkashCallbackAdminMock({
      id: "invoice_1",
      store_id: "store_real",
      plan_id: "growth",
      amount: 999,
    });

    mock.method(billingBkashCallbackRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    const fetchMock = mock.method(billingBkashCallbackRouteDeps, "fetch", async () => {
      throw new Error("should not hit gateway");
    });

    const response = await billingBkashCallbackGet(
      new Request(
        "https://example.com/api/billing/bkash-callback?status=success&paymentID=pay_1&invoice_id=invoice_1&store_id=store_claimed",
      ),
    );

    assert.equal(response.status, 307);
    assert.equal(
      response.headers.get("location"),
      "https://commerce.example.com/admin/billing?payment=error&message=Invalid+payment+context.",
    );
    assert.equal(fetchMock.mock.callCount(), 0);
    assert.equal(admin.invoiceUpdates.length, 0);
    assert.equal(admin.subscriptionUpdates.length, 0);
  });

  test("marks the invoice failed and redirects on provider payment id mismatch", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://commerce.example.com";

    const admin = createBkashCallbackAdminMock({
      id: "invoice_1",
      store_id: "store_1",
      plan_id: "growth",
      amount: 999,
      provider_invoice_id: "pay_expected",
    });

    mock.method(billingBkashCallbackRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    const fetchMock = mock.method(billingBkashCallbackRouteDeps, "fetch", async () => {
      throw new Error("should not hit gateway");
    });

    const response = await billingBkashCallbackGet(
      new Request(
        "https://example.com/api/billing/bkash-callback?status=success&paymentID=pay_wrong&invoice_id=invoice_1&store_id=store_1",
      ),
    );

    assert.equal(response.status, 307);
    assert.equal(
      response.headers.get("location"),
      "https://commerce.example.com/admin/billing?payment=error&message=Payment+id+mismatch.",
    );
    assert.equal(fetchMock.mock.callCount(), 0);
    assert.deepEqual(admin.invoiceUpdates, [
      {
        payload: { status: "failed" },
        filters: [["id", "invoice_1"]],
      },
    ]);
    assert.equal(admin.subscriptionUpdates.length, 0);
  });

  test("marks the invoice failed when executed amount does not match the invoice", async () => {
    mock.method(console, "error", () => {});
    process.env.NEXT_PUBLIC_APP_URL = "https://commerce.example.com";
    process.env.PLATFORM_BKASH_APP_KEY = "app-key";
    process.env.PLATFORM_BKASH_APP_SECRET = "app-secret";
    process.env.PLATFORM_BKASH_USERNAME = "username";
    process.env.PLATFORM_BKASH_PASSWORD = "password";

    const admin = createBkashCallbackAdminMock({
      id: "invoice_1",
      store_id: "store_1",
      plan_id: "growth",
      amount: 999,
    });

    mock.method(billingBkashCallbackRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    const fetchMock = mock.method(
      billingBkashCallbackRouteDeps,
      "fetch",
      async (url: string | URL) => {
        if (String(url).includes("/token/grant")) {
          return {
            json: async () => ({ statusCode: "0000", id_token: "token_123" }),
          } as never;
        }

        return {
          json: async () => ({ statusCode: "0000", amount: "1000" }),
        } as never;
      },
    );

    const response = await billingBkashCallbackGet(
      new Request(
        "https://example.com/api/billing/bkash-callback?status=success&paymentID=pay_1&invoice_id=invoice_1&store_id=store_1",
      ),
    );

    assert.equal(response.status, 307);
    assert.equal(
      response.headers.get("location"),
      "https://commerce.example.com/admin/billing?payment=error&message=Payment+execution+failed.",
    );
    assert.equal(fetchMock.mock.callCount(), 2);
    assert.deepEqual(admin.invoiceUpdates, [
      {
        payload: { status: "failed" },
        filters: [["id", "invoice_1"]],
      },
    ]);
    assert.equal(admin.subscriptionUpdates.length, 0);
  });

  test("writes the exact paid invoice and active subscription payload on successful execution", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://commerce.example.com";
    process.env.PLATFORM_BKASH_APP_KEY = "app-key";
    process.env.PLATFORM_BKASH_APP_SECRET = "app-secret";
    process.env.PLATFORM_BKASH_USERNAME = "username";
    process.env.PLATFORM_BKASH_PASSWORD = "password";

    const admin = createBkashCallbackAdminMock({
      id: "invoice_1",
      store_id: "store_1",
      plan_id: "growth",
      amount: 999,
    });

    mock.method(billingBkashCallbackRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(billingBkashCallbackRouteDeps, "now", () => FIXED_NOW);
    const fetchMock = mock.method(
      billingBkashCallbackRouteDeps,
      "fetch",
      async (url: string | URL) => {
        if (String(url).includes("/token/grant")) {
          return {
            json: async () => ({ statusCode: "0000", id_token: "token_123" }),
          } as never;
        }

        return {
          json: async () => ({ statusCode: "0000", amount: "999" }),
        } as never;
      },
    );

    const response = await billingBkashCallbackGet(
      new Request(
        "https://example.com/api/billing/bkash-callback?status=success&paymentID=pay_1&invoice_id=invoice_1&store_id=store_1",
      ),
    );

    const expectedPeriodEnd = new Date("2026-08-09T00:00:00.000Z").toISOString();

    assert.equal(response.status, 307);
    assert.equal(
      response.headers.get("location"),
      "https://commerce.example.com/admin/billing?payment=success",
    );
    assert.equal(fetchMock.mock.callCount(), 2);
    assert.deepEqual(admin.invoiceUpdates, [
      {
        payload: {
          status: "paid",
          paid_at: FIXED_NOW.toISOString(),
          payment_method: "bkash",
          provider_invoice_id: "pay_1",
          billing_period_end: expectedPeriodEnd,
        },
        filters: [["id", "invoice_1"]],
      },
    ]);
    assert.deepEqual(admin.subscriptionUpdates, [
      {
        payload: {
          plan_id: "growth",
          status: "active",
          provider: "bkash",
          provider_subscription_id: "pay_1",
          current_period_ends_at: expectedPeriodEnd,
        },
        filters: [["store_id", "store_1"]],
      },
    ]);
  });
});
