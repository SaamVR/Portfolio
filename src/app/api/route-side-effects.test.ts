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
import {
  POST as deleteStorePost,
  deleteStoreRouteDeps,
} from "@/app/api/stores/delete/route";

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
  const storeUpdates: Array<{ payload: Record<string, unknown>; filters: Array<[string, string]> }> = [];

  return {
    upserts,
    storeUpdates,
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

        if (table === "stores") {
          return {
            update(payload: Record<string, unknown>) {
              const filters: Array<[string, string]> = [];
              return {
                eq(column: string, value: string) {
                  filters.push([column, value]);
                  storeUpdates.push({ payload, filters: [...filters] });
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

function createDomainAdminMock(options?: { existingDomainStoreId?: string | null }) {
  const domainUpserts: Array<Record<string, unknown>> = [];
  const domainUpdates: Array<{ payload: Record<string, unknown>; filters: Array<[string, string]> }> = [];
  const storeUpdates: Array<{ payload: Record<string, unknown>; filters: Array<[string, string]> }> = [];
  const deletedDomains: Array<{ storeId: string; hostnames: string[] }> = [];
  const domains = new Map<string, Record<string, unknown>>();

  return {
    domainUpserts,
    domainUpdates,
    storeUpdates,
    deletedDomains,
    client: {
      from(table: string) {
        if (table === "store_subscriptions") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        plan_id: "pro",
                        status: "active",
                        trial_ends_at: null,
                        cms_plans: { name: "Pro", monthly_price: 3990, annual_price: null },
                      },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }

        if (table === "cms_plan_features") {
          return {
            select() {
              return {
                eq() {
                  return this;
                },
                maybeSingle: async () => ({ data: { enabled: true }, error: null }),
              };
            },
          };
        }

        if (table === "store_domains") {
          return {
            select() {
              const filters: Array<[string, string]> = [];
              return {
                eq(column: string, value: string) {
                  filters.push([column, value]);
                  return this;
                },
                neq(column: string, value: string) {
                  filters.push([`neq:${column}`, value]);
                  return this;
                },
                in(_column: string, _values: string[]) {
                  return this;
                },
                order() {
                  const storeId = filters.find(([column]) => column === "store_id")?.[1];
                  const rows = Array.from(domains.values()).filter((row) => !storeId || row.store_id === storeId);
                  return Promise.resolve({ data: rows, error: null });
                },
                limit() {
                  return this;
                },
                maybeSingle: async () => {
                  const hostname = filters.find(([column]) => column === "hostname")?.[1];
                  const storeId = filters.find(([column]) => column === "store_id")?.[1];
                  const excludedStoreId = filters.find(([column]) => column === "neq:store_id")?.[1];
                  const existing = hostname
                    ? Array.from(domains.values()).find((row) => row.hostname === hostname && row.store_id !== excludedStoreId)
                    : null;

                  if (options?.existingDomainStoreId && hostname && !existing) {
                    return { data: { store_id: options.existingDomainStoreId }, error: null };
                  }

                  const own = hostname
                    ? Array.from(domains.values()).find((row) => row.hostname === hostname && (!storeId || row.store_id === storeId))
                    : null;
                  return { data: own ?? null, error: null };
                },
              };
            },
            upsert(payload: Record<string, unknown>) {
              domainUpserts.push(payload);
              domains.set(String(payload.hostname), {
                id: `domain_${domainUpserts.length}`,
                hostname: payload.hostname,
                store_id: payload.store_id,
                status: payload.status,
                is_primary: payload.is_primary,
                is_www_domain: payload.is_www_domain,
                vercel_verified: payload.vercel_verified,
                vercel_misconfigured: payload.vercel_misconfigured,
                configured_by: payload.configured_by ?? null,
                verification_records: payload.verification_records ?? [],
                dns_records: payload.dns_records ?? [],
                last_vercel_error: payload.last_vercel_error ?? null,
                last_checked_at: payload.last_checked_at ?? null,
                activated_at: payload.activated_at ?? null,
                created_at: payload.created_at ?? FIXED_NOW.toISOString(),
                updated_at: payload.updated_at ?? FIXED_NOW.toISOString(),
              });
              return {
                select() {
                  return {
                    single: async () => ({ data: domains.get(String(payload.hostname)), error: null }),
                  };
                },
              };
            },
            update(payload: Record<string, unknown>) {
              const filters: Array<[string, string]> = [];
              return {
                eq(column: string, value: string) {
                  filters.push([column, value]);
                  return this;
                },
                neq(column: string, value: string) {
                  filters.push([`neq:${column}`, value]);
                  const storeId = filters.find(([name]) => name === "store_id")?.[1];
                  if (storeId) {
                    for (const row of domains.values()) {
                      if (row.store_id === storeId && row.hostname !== value) {
                        Object.assign(row, payload);
                      }
                    }
                  }
                  domainUpdates.push({ payload, filters: [...filters] });
                  return Promise.resolve({ error: null });
                },
                select() {
                  return {
                    single: async () => {
                      const hostname = filters.find(([name]) => name === "hostname")?.[1];
                      const row = hostname ? domains.get(hostname) : null;
                      if (row) Object.assign(row, payload);
                      domainUpdates.push({ payload, filters: [...filters] });
                      return { data: row, error: null };
                    },
                  };
                },
              };
            },
            delete() {
              const filters: Array<[string, string]> = [];
              return {
                eq(column: string, value: string) {
                  filters.push([column, value]);
                  return {
                    in(_nextColumn: string, values: string[]) {
                      deletedDomains.push({ storeId: value, hostnames: values });
                      for (const hostname of values) {
                        domains.delete(hostname);
                      }
                      return Promise.resolve({ error: null });
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "stores") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({ data: { slug: "store-1" }, error: null }),
                  };
                },
              };
            },
            update(payload: Record<string, unknown>) {
              const filters: Array<[string, string]> = [];
              return {
                eq(column: string, value: string) {
                  filters.push([column, value]);
                  return this;
                },
                in(column: string, values: string[]) {
                  filters.push([`in:${column}`, values.join(",")]);
                  storeUpdates.push({ payload, filters: [...filters] });
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
  const subscriptionUpserts: Array<{ payload: Record<string, unknown>; options: Record<string, unknown> }> = [];
  const storeUpdates: Array<{ payload: Record<string, unknown>; filters: Array<[string, string]> }> = [];

  return {
    invoiceUpdates,
    subscriptionUpserts,
    storeUpdates,
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
            upsert(payload: Record<string, unknown>, options: Record<string, unknown>) {
              subscriptionUpserts.push({ payload, options });
              return Promise.resolve({ error: null });
            },
          };
        }

        if (table === "stores") {
          return {
            update(payload: Record<string, unknown>) {
              const filters: Array<[string, string]> = [];
              return {
                eq(column: string, value: string) {
                  filters.push([column, value]);
                  storeUpdates.push({ payload, filters: [...filters] });
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

function createDeleteStoreAdminMock(options?: {
  platformRole?: "admin" | null;
  store?: { id: string; owner_id: string; name: string; slug: string } | null;
  ownerCanCreateStore?: boolean | null;
  remainingOwnedStoreCount?: number;
}) {
  const deletionRecords: Array<Record<string, unknown>> = [];
  const accountStatusUpserts: Array<{ payload: Record<string, unknown>; options: Record<string, unknown> }> = [];
  const deletedStoreIds: string[] = [];

  const store = options?.store ?? {
    id: "store_1",
    owner_id: "owner_1",
    name: "Demo Store",
    slug: "demo-store",
  };

  return {
    deletionRecords,
    accountStatusUpserts,
    deletedStoreIds,
    client: {
      from(table: string) {
        if (table === "user_roles") {
          return {
            select() {
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        maybeSingle: async () => ({
                          data: options?.platformRole ? { role: options.platformRole } : null,
                          error: null,
                        }),
                      };
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "stores") {
          return {
            select(_columns?: string, config?: { count?: "exact"; head?: boolean }) {
              if (config?.head) {
                return {
                  eq() {
                    return Promise.resolve({
                      count: options?.remainingOwnedStoreCount ?? 0,
                      error: null,
                    });
                  },
                };
              }

              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: store,
                      error: null,
                    }),
                  };
                },
              };
            },
            delete() {
              return {
                eq(_column: string, value: string) {
                  deletedStoreIds.push(value);
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        }

        if (table === "merchant_account_statuses") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data:
                        options?.ownerCanCreateStore === undefined
                          ? null
                          : { can_create_store: options.ownerCanCreateStore },
                      error: null,
                    }),
                  };
                },
              };
            },
            upsert(payload: Record<string, unknown>, optionsArg: Record<string, unknown>) {
              accountStatusUpserts.push({ payload, options: optionsArg });
              return Promise.resolve({ error: null });
            },
          };
        }

        if (table === "store_deletion_records") {
          return {
            insert(payload: Record<string, unknown>) {
              deletionRecords.push(payload);
              return Promise.resolve({ error: null });
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
        billing_interval: "monthly",
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
    const admin = createSubscriptionAdminMock({ id: "basic", monthly_price: 0 });

    mock.method(billingSubscriptionRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(billingSubscriptionRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(billingSubscriptionRouteDeps, "canManageStore", async () => true);

    const response = await subscriptionPatch(
      jsonRequest("https://example.com/api/billing/subscription", "PATCH", {
        storeId: "store_1",
        planId: "basic",
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, status: "active", planId: "basic" });
    assert.deepEqual(admin.upserts, [
      {
        payload: {
          store_id: "store_1",
          plan_id: "basic",
          status: "active",
          provider: null,
          provider_subscription_id: null,
          current_period_ends_at: null,
          trial_ends_at: null,
        },
        options: { onConflict: "store_id" },
      },
    ]);
    assert.deepEqual(admin.storeUpdates, [
      {
        payload: { plan: "basic" },
        filters: [["id", "store_1"]],
      },
    ]);
  });

  test("writes the exact cancelled subscription payload for cancel actions", async () => {
    const admin = createSubscriptionAdminMock({ id: "advanced", monthly_price: 1499 });

    mock.method(billingSubscriptionRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(billingSubscriptionRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(billingSubscriptionRouteDeps, "canManageStore", async () => true);

    const response = await subscriptionPatch(
      jsonRequest("https://example.com/api/billing/subscription", "PATCH", {
        storeId: "store_1",
        planId: "advanced",
        action: "cancel",
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, status: "cancelled", planId: "advanced" });
    assert.deepEqual(admin.upserts, [
      {
        payload: {
          store_id: "store_1",
          plan_id: "advanced",
          status: "cancelled",
          provider: null,
          provider_subscription_id: null,
          current_period_ends_at: null,
          trial_ends_at: null,
        },
        options: { onConflict: "store_id" },
      },
    ]);
    assert.deepEqual(admin.storeUpdates, [
      {
        payload: { plan: "advanced" },
        filters: [["id", "store_1"]],
      },
      {
        payload: { custom_domain: null },
        filters: [["id", "store_1"]],
      },
    ]);
  });
});

describe("domain route side effects", () => {
  test("blocks cross-store custom-domain claims before Vercel or store updates", async () => {
    const admin = createDomainAdminMock({ existingDomainStoreId: "other_store" });

    process.env.VERCEL_TOKEN = "vercel-token";
    process.env.VERCEL_PROJECT_ID = "project_123";
    process.env.VERCEL_TEAM_ID = "team_123";

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
    assert.equal(admin.domainUpserts.length, 0);
  });

  test("allows owner/admin domain claims and writes paired store domains", async () => {
    const admin = createDomainAdminMock();

    process.env.VERCEL_TOKEN = "vercel-token";
    process.env.VERCEL_PROJECT_ID = "project_123";
    process.env.VERCEL_TEAM_ID = "team_123";

    mock.method(domainRouteDeps, "getAuthenticatedUser", async () => ({ id: "admin_1" }) as never);
    mock.method(domainRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(domainRouteDeps, "canManageStore", async () => true);
    mock.method(domainRouteDeps, "addProjectDomain", async (hostname: string) => ({
      name: hostname,
      verified: true,
      verification: [],
    }) as never);
    mock.method(domainRouteDeps, "getDomainConfiguration", async () => ({
      configuredBy: "A",
      recommendedIPv4: [{ rank: 1, value: "76.76.21.21" }],
      recommendedCNAME: [{ rank: 1, value: "cname.vercel-dns.com" }],
      misconfigured: false,
    }) as never);
    mock.method(domainRouteDeps, "updateProjectDomain", async () => ({
      name: "example.com",
      verified: true,
    }) as never);

    const response = await domainsPost(
      jsonRequest("https://example.com/api/domains", "POST", {
        storeId: "store_1",
        domain: " HTTPS://Example.com/path ",
      }),
    );

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.primaryHostname, "www.example.com");
    assert.deepEqual(
      admin.domainUpserts.map((entry) => entry.hostname),
      ["example.com", "www.example.com"],
    );
  });

  test("removes both apex and www domain entries on successful removal", async () => {
    const admin = createDomainAdminMock();

    process.env.VERCEL_TOKEN = "vercel-token";
    process.env.VERCEL_PROJECT_ID = "project_123";
    process.env.VERCEL_TEAM_ID = "team_123";

    mock.method(domainRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(domainRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(domainRouteDeps, "canManageStore", async () => true);
    mock.method(domainRouteDeps, "removeProjectDomain", async () => undefined as never);

    const response = await domainsDelete(
      new Request("https://example.com/api/domains?storeId=store_1&domain=Example.com", {
        method: "DELETE",
      }),
    );

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.domainAccess.allowed, true);
    assert.deepEqual(admin.deletedDomains, [
      {
        storeId: "store_1",
        hostnames: ["example.com", "www.example.com"],
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
    assert.equal(admin.subscriptionUpserts.length, 0);
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
    assert.equal(admin.subscriptionUpserts.length, 0);
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
    assert.equal(admin.subscriptionUpserts.length, 0);
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
          billing_period_start: FIXED_NOW.toISOString(),
          billing_period_end: expectedPeriodEnd,
        },
        filters: [["id", "invoice_1"]],
      },
    ]);
    assert.deepEqual(admin.subscriptionUpserts, [
      {
        payload: {
          store_id: "store_1",
          plan_id: "growth",
          status: "active",
          provider: "bkash",
          provider_subscription_id: "pay_1",
          current_period_ends_at: expectedPeriodEnd,
          trial_ends_at: null,
        },
        options: { onConflict: "store_id" },
      },
    ]);
    assert.deepEqual(admin.storeUpdates, [
      {
        payload: { plan: "growth" },
        filters: [["id", "store_1"]],
      },
    ]);
  });
});

describe("store deletion side effects", () => {
  test("writes a merchant self-delete record and reports when the owner has no sites left", async () => {
    const admin = createDeleteStoreAdminMock({
      platformRole: null,
      ownerCanCreateStore: true,
      remainingOwnedStoreCount: 0,
    });

    mock.method(deleteStoreRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(deleteStoreRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(deleteStoreRouteDeps, "canManageStore", async () => true);
    mock.method(deleteStoreRouteDeps, "now", () => FIXED_NOW);

    const response = await deleteStorePost(
      jsonRequest("https://example.com/api/stores/delete", "POST", {
        storeId: "store_1",
        note: "Closing this project",
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      deletedAllOwnedStores: true,
      ownerUserId: "owner_1",
      banned: false,
      deletedStoreId: "store_1",
    });
    assert.deepEqual(admin.deletionRecords, [
      {
        deleted_store_id: "store_1",
        owner_user_id: "owner_1",
        store_name: "Demo Store",
        store_slug: "demo-store",
        deletion_source: "merchant_self_delete",
        merchant_visible_reason: "Closing this project",
        admin_note: "Closing this project",
        deleted_by_user_id: "owner_1",
        owner_can_create_store: true,
        created_at: FIXED_NOW.toISOString(),
      },
    ]);
    assert.deepEqual(admin.deletedStoreIds, ["store_1"]);
    assert.equal(admin.accountStatusUpserts.length, 0);
  });

  test("requires an admin note before a platform delete can proceed", async () => {
    const admin = createDeleteStoreAdminMock({
      platformRole: "admin",
    });

    mock.method(deleteStoreRouteDeps, "getAuthenticatedUser", async () => ({ id: "platform_admin_1" }) as never);
    mock.method(deleteStoreRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(deleteStoreRouteDeps, "canManageStore", async () => true);

    const response = await deleteStorePost(
      jsonRequest("https://example.com/api/stores/delete", "POST", {
        storeId: "store_1",
        note: "   ",
      }),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "Deletion note is required for platform admins",
    });
    assert.equal(admin.deletionRecords.length, 0);
    assert.equal(admin.deletedStoreIds.length, 0);
  });

  test("records a platform delete and blocks future site creation when requested", async () => {
    const admin = createDeleteStoreAdminMock({
      platformRole: "admin",
      ownerCanCreateStore: true,
      remainingOwnedStoreCount: 0,
    });

    mock.method(deleteStoreRouteDeps, "getAuthenticatedUser", async () => ({ id: "platform_admin_1" }) as never);
    mock.method(deleteStoreRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(deleteStoreRouteDeps, "canManageStore", async () => true);
    mock.method(deleteStoreRouteDeps, "now", () => FIXED_NOW);

    const response = await deleteStorePost(
      jsonRequest("https://example.com/api/stores/delete", "POST", {
        storeId: "store_1",
        note: "Repeated policy violations",
        banMerchant: true,
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      deletedAllOwnedStores: true,
      ownerUserId: "owner_1",
      banned: true,
      deletedStoreId: "store_1",
    });
    assert.deepEqual(admin.deletionRecords, [
      {
        deleted_store_id: "store_1",
        owner_user_id: "owner_1",
        store_name: "Demo Store",
        store_slug: "demo-store",
        deletion_source: "platform_admin_delete",
        merchant_visible_reason: "Repeated policy violations",
        admin_note: "Repeated policy violations",
        deleted_by_user_id: "platform_admin_1",
        owner_can_create_store: false,
        created_at: FIXED_NOW.toISOString(),
      },
    ]);
    assert.deepEqual(admin.accountStatusUpserts, [
      {
        payload: {
          user_id: "owner_1",
          can_create_store: false,
          status_note: "Repeated policy violations",
          banned_at: FIXED_NOW.toISOString(),
          restored_at: null,
          updated_by: "platform_admin_1",
        },
        options: { onConflict: "user_id" },
      },
    ]);
    assert.deepEqual(admin.deletedStoreIds, ["store_1"]);
  });
});
