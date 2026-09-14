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
  POST as billingManualInvoicePost,
  billingManualInvoiceRouteDeps,
} from "@/app/api/billing/manual-invoice/route";
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
  POST as manualBillingReviewPost,
  manualBillingReviewRouteDeps,
} from "@/app/api/platform/billing/manual-review/route";
import {
  POST as platformSubscriptionsPost,
  platformSubscriptionsRouteDeps,
} from "@/app/api/platform/subscriptions/route";
import {
  GET as platformAccessGet,
  platformAccessRouteDeps,
} from "@/app/api/platform/access/route";
import {
  POST as deleteStorePost,
  deleteStoreRouteDeps,
} from "@/app/api/stores/delete/route";
import {
  POST as courierConnectionsPost,
  courierConnectionsRouteDeps,
} from "@/app/api/couriers/connections/route";
import {
  POST as courierBookPost,
  courierBookingRouteDeps,
} from "@/app/api/couriers/book/route";
import {
  GET as courierShipmentsGet,
  courierShipmentsRouteDeps,
} from "@/app/api/couriers/shipments/route";
import {
  GET as bkashConnectionGet,
  PUT as bkashConnectionPut,
  DELETE as bkashConnectionDelete,
  bkashPaymentConnectionRouteDeps,
} from "@/app/api/payment-connections/bkash/route";
import {
  GET as platformBkashConnectionGet,
  PUT as platformBkashConnectionPut,
  DELETE as platformBkashConnectionDelete,
  platformBkashPaymentConnectionRouteDeps,
} from "@/app/api/platform/payment-connections/bkash/route";
import {
  GET as publicPaymentSettingsGet,
  storePaymentSettingsRouteDeps,
} from "@/app/api/store-payment-settings/route";
import {
  POST as analyticsTrackPost,
  analyticsTrackRouteDeps,
} from "@/app/api/analytics/track/route";
import {
  GET as notificationPreviewGet,
  POST as notificationTestPost,
  notificationTestRouteDeps,
} from "@/app/api/notifications/test/route";
import {
  POST as notificationRetryPost,
  notificationRetryRouteDeps,
} from "@/app/api/notifications/retry/route";
import {
  POST as notificationProcessQueuePost,
  notificationProcessQueueRouteDeps,
} from "@/app/api/notifications/process-queue/route";
import { notificationDeliveryQueueDeps } from "@/lib/notifications/notification-delivery-queue";
import {
  POST as cartRecoveryProcessQueuePost,
  cartRecoveryProcessQueueRouteDeps,
} from "@/app/api/cart-recovery/process-queue/route";
import { recoveryMessageProcessorDeps } from "@/lib/cart-recovery/recovery-message-processor";
import { logPlatformAuditAction } from "@/lib/platform/audit-logger";

afterEach(() => {
  mock.restoreAll();
  delete process.env.PLATFORM_BKASH_APP_KEY;
  delete process.env.PLATFORM_BKASH_APP_SECRET;
  delete process.env.PLATFORM_BKASH_USERNAME;
  delete process.env.PLATFORM_BKASH_PASSWORD;
  delete process.env.PLATFORM_BKASH_IS_LIVE;
  delete process.env.VERCEL_API_TOKEN;
  delete process.env.VERCEL_PROJECT_ID;
  delete process.env.CLOUDFLARE_ZONE_ID;
  delete process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CUSTOM_DOMAIN_CNAME_TARGET;
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

function createCheckoutAdminMock(
  plan: { id: string; monthly_price: number; currency_code?: string; is_active?: boolean },
  options?: {
    platformConnection?: Record<string, unknown> | null;
  },
) {
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

        if (table === "platform_payment_connections_secure") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: options?.platformConnection ?? null,
                      error: null,
                    }),
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

function createManualInvoiceAdminMock(options: {
  plan: {
    id: string;
    monthly_price: number;
    annual_price?: number | null;
    currency_code?: string | null;
    is_active?: boolean;
    contact_only?: boolean;
  };
  existingInvoice?: {
    id: string;
    store_id?: string;
    status: string;
    provider_invoice_id: string;
  } | null;
  raceInvoice?: {
    id: string;
    store_id?: string;
    status: string;
    provider_invoice_id: string;
  } | null;
  insertError?: { code?: string; message?: string } | null;
}) {
  const insertedInvoices: Array<Record<string, unknown>> = [];
  const invoiceLookups: Array<Array<[string, string]>> = [];
  let lookupCount = 0;

  return {
    insertedInvoices,
    invoiceLookups,
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
                        id: options.plan.id,
                        monthly_price: options.plan.monthly_price,
                        annual_price: options.plan.annual_price ?? null,
                        currency_code: options.plan.currency_code ?? "BDT",
                        is_active: options.plan.is_active ?? true,
                        contact_only: options.plan.contact_only ?? false,
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
            select() {
              const filters: Array<[string, string]> = [];
              const chain = {
                eq(column: string, value: string) {
                  filters.push([column, value]);
                  return chain;
                },
                maybeSingle: async () => {
                  invoiceLookups.push([...filters]);
                  const candidate = lookupCount++ === 0 ? options.existingInvoice : options.raceInvoice;
                  return {
                    data: candidate
                      ? {
                          id: candidate.id,
                          store_id: candidate.store_id ?? "store_1",
                          status: candidate.status,
                          plan_id: options.plan.id,
                          provider_invoice_id: candidate.provider_invoice_id,
                        }
                      : null,
                    error: null,
                  };
                },
              };
              return chain;
            },
            insert(payload: Record<string, unknown>) {
              insertedInvoices.push(payload);
              return {
                select() {
                  return {
                    single: async () => ({
                      data: options.insertError ? null : { id: "invoice_manual_1", status: "pending" },
                      error: options.insertError ?? null,
                    }),
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

function createManualReviewAdminMock(invoice: {
  id: string;
  store_id: string;
  plan_id: string;
  status: string;
  billing_interval?: string;
  payment_method?: string | null;
  provider?: string | null;
  provider_invoice_id?: string | null;
  platformRoles?: string[];
}, options?: {
  transactionCollision?: { id: string; store_id: string; status: string } | null;
  updateWinner?: boolean;
}) {
  const invoiceUpdates: Array<{ payload: Record<string, unknown>; filters: Array<[string, string]> }> = [];
  const subscriptionUpserts: Array<Record<string, unknown>> = [];

  return {
    invoiceUpdates,
    subscriptionUpserts,
    client: {
      from(table: string) {
        if (table === "user_roles") {
          return {
            select() {
              return {
                eq(_column: string, _value: string) {
                  return {
                    in(_column2: string, allowedRoles: string[]) {
                      return {
                        order: async () => ({
                          data: (invoice.platformRoles ?? ["admin"])
                            .filter((role) => allowedRoles.includes(role))
                            .map((role) => ({ role })),
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

        if (table === "store_invoices") {
          return {
            select() {
              const filters: Array<[string, string]> = [];
              const chain = {
                eq(column: string, value: string) {
                  filters.push([column, value]);
                  return chain;
                },
                neq(column: string, value: string) {
                  filters.push([`neq:${column}`, value]);
                  return chain;
                },
                limit(_value: number) {
                  return chain;
                },
                maybeSingle: async () => {
                  const idFilter = filters.find(([column]) => column === "id");
                  if (idFilter?.[1] === invoice.id) {
                    return {
                      data: {
                        id: invoice.id,
                        store_id: invoice.store_id,
                        plan_id: invoice.plan_id,
                        status: invoice.status,
                        billing_interval: invoice.billing_interval ?? "monthly",
                        payment_method: invoice.payment_method ?? "bkash_manual",
                        provider: invoice.provider ?? "bkash_manual",
                        provider_invoice_id: invoice.provider_invoice_id ?? "trx_1",
                      },
                      error: null,
                    };
                  }
                  return { data: options?.transactionCollision ?? null, error: null };
                },
              };
              return chain;
            },
            update(payload: Record<string, unknown>) {
              const filters: Array<[string, string]> = [];
              const chain = {
                eq(column: string, value: string) {
                  filters.push([column, value]);
                  return chain;
                },
                select(_columns: string) {
                  return {
                    maybeSingle: async () => {
                      invoiceUpdates.push({ payload, filters: [...filters] });
                      return {
                        data: options?.updateWinner === false ? null : { id: invoice.id },
                        error: null,
                      };
                    },
                  };
                },
              };
              return chain;
            },
          };
        }

        if (table === "platform_audit_logs") {
          return {
            insert() {
              return Promise.resolve({ error: null });
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    },
  };
}

function createPlatformSubscriptionsAdminMock(options?: {
  store?: { id: string; name: string; plan?: string | null } | null;
  plan?: { id: string; name: string; currency_code?: string | null; is_active?: boolean | null } | null;
  existingSubscription?: { plan_id?: string | null; trial_ends_at?: string | null } | null;
  platformRoles?: string[];
}) {
  const insertedInvoices: Array<Record<string, unknown>> = [];
  const subscriptionUpserts: Array<Record<string, unknown>> = [];
  const auditLogs: Array<Record<string, unknown>> = [];

  return {
    insertedInvoices,
    subscriptionUpserts,
    auditLogs,
    client: {
      from(table: string) {
        if (table === "user_roles") {
          return {
            select() {
              return {
                eq(_column: string, _value: string) {
                  return {
                    in(_column2: string, _value2: string[]) {
                      return {
                        order: async () => ({
                          data: (options?.platformRoles ?? ["admin"]).map((role) => ({ role })),
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
            select() {
              return {
                eq(_column: string, _value: string) {
                  return {
                    maybeSingle: async () => ({
                      data: options?.store ?? { id: "store_1", name: "Demo Store", plan: "basic" },
                      error: null,
                    }),
                  };
                },
              };
            },
            update() {
              return {
                eq() {
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        }

        if (table === "store_subscriptions") {
          return {
            select() {
              return {
                eq(_column: string, _value: string) {
                  return {
                    maybeSingle: async () => ({
                      data: options?.existingSubscription ?? { plan_id: "basic", trial_ends_at: null },
                      error: null,
                    }),
                  };
                },
              };
            },
            upsert(payload: Record<string, unknown>) {
              subscriptionUpserts.push(payload);
              return Promise.resolve({ error: null });
            },
          };
        }

        if (table === "cms_plans") {
          return {
            select() {
              return {
                eq(_column: string, _value: string) {
                  return {
                    maybeSingle: async () => ({
                      data: options?.plan ?? { id: "pro", name: "Pro", currency_code: "BDT", is_active: true },
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
              return Promise.resolve({ error: null });
            },
          };
        }

        if (table === "platform_audit_logs") {
          return {
            insert(payload: Record<string, unknown>) {
              auditLogs.push(payload);
              return Promise.resolve({ error: null });
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    },
  };
}

function createPlatformAccessAdminMock(platformRoles?: string[]) {
  return {
    client: {
      from(table: string) {
        if (table === "user_roles") {
          return {
            select() {
              return {
                eq(_column: string, _value: string) {
                  return {
                    order: async () => ({
                      data: (platformRoles ?? ["admin"]).map((role) => ({ role })),
                      error: null,
                    }),
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

function createCourierConnectionsAdminMock() {
  type MockCourierConnectionRow = Record<string, unknown> & { id: string; store_id: string };
  const publicInserts: Array<Record<string, unknown>> = [];
  const privateUpserts: Array<Record<string, unknown>> = [];
  const connections = new Map<string, MockCourierConnectionRow>();
  let nextConnectionIndex = 1;

  return {
    publicInserts,
    privateUpserts,
    client: {
      from(table: string) {
        if (table === "store_courier_connections") {
          return {
            insert(payload: Record<string, unknown>) {
              publicInserts.push(payload);
              const connectionId = `connection_${nextConnectionIndex++}`;
              const row: MockCourierConnectionRow = {
                id: connectionId,
                store_id: "store_1",
                provider: "pathao",
                connection_key: payload.connection_key,
                zone_label: payload.zone_label ?? null,
                service_area_name: payload.service_area_name ?? null,
                status: payload.status ?? "draft",
                verification_status: payload.verification_status ?? "not_checked",
                last_verification_at: payload.last_verification_at ?? null,
                last_verified_at: payload.last_verified_at ?? null,
                verification_error: payload.verification_error ?? null,
                display_name: payload.display_name ?? null,
                supports_cod: payload.supports_cod ?? true,
                supports_city_delivery: payload.supports_city_delivery ?? true,
                settings: payload.settings ?? {},
                last_sync_at: null,
                last_error: null,
                created_at: FIXED_NOW.toISOString(),
                updated_at: FIXED_NOW.toISOString(),
              };
              connections.set(connectionId, row);
              return {
                select() {
                  return {
                    single: async () => ({ data: { ...row }, error: null }),
                  };
                },
              };
            },
            update(payload: Record<string, unknown>) {
              const filters = new Map<string, string>();
              const chain = {
                eq(column: string, value: string) {
                  filters.set(column, value);
                  return chain;
                },
                select() {
                  return {
                    single: async () => {
                      const row = connections.get(filters.get("id") ?? "");
                      if (!row || row.store_id !== filters.get("store_id")) {
                        return { data: null, error: new Error("Courier connection not found in mock") };
                      }
                      Object.assign(row, payload);
                      return { data: { ...row }, error: null };
                    },
                  };
                },
              };
              return chain;
            },
          };
        }

        if (table === "store_courier_credentials_secure") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: null,
                      error: null,
                    }),
                  };
                },
              };
            },
            upsert(payload: Record<string, unknown>) {
              privateUpserts.push(payload);
              return Promise.resolve({ error: null });
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    },
  };
}

function createBkashConnectionAdminMock() {
  const upserts: Array<Record<string, unknown>> = [];
  const updates: Array<{ payload: Record<string, unknown>; filters: Array<[string, string]> }> = [];
  let stored: Record<string, unknown> | null = null;

  return {
    upserts,
    updates,
    client: {
      from(table: string) {
        if (table !== "store_payment_connections_secure") {
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      maybeSingle: async () => ({ data: stored, error: null }),
                    };
                  },
                };
              },
            };
          },
          upsert(payload: Record<string, unknown>) {
            upserts.push(payload);
            stored = {
              id: "payment_connection_1",
              provider: "bkash",
              created_at: FIXED_NOW.toISOString(),
              updated_at: FIXED_NOW.toISOString(),
              revoked_at: null,
              ...payload,
            };
            return {
              select() {
                return {
                  single: async () => ({ data: stored, error: null }),
                };
              },
            };
          },
          update(payload: Record<string, unknown>) {
            const filters: Array<[string, string]> = [];
            stored = stored ? { ...stored, ...payload } : null;
            return {
              eq(column: string, value: string) {
                filters.push([column, value]);
                return {
                  eq(column2: string, value2: string) {
                    filters.push([column2, value2]);
                    updates.push({ payload, filters: [...filters] });
                    return {
                      select() {
                        return {
                          maybeSingle: async () => ({ data: stored, error: null }),
                        };
                      },
                    };
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

function createPlatformBkashConnectionAdminMock() {
  const upserts: Array<Record<string, unknown>> = [];
  const updates: Array<{ payload: Record<string, unknown>; filters: Array<[string, string]> }> = [];
  let stored: Record<string, unknown> | null = null;

  return {
    upserts,
    updates,
    client: {
      from(table: string) {
        if (table === "user_roles") {
          return {
            select() {
              return {
                eq() {
                  return {
                    in() {
                      return {
                        order: async () => ({
                          data: [{ role: "super_admin" }],
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

        if (table !== "platform_payment_connections_secure") {
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({ data: stored, error: null }),
                };
              },
            };
          },
          upsert(payload: Record<string, unknown>) {
            upserts.push(payload);
            stored = {
              id: "platform_payment_connection_1",
              provider: "bkash",
              created_at: FIXED_NOW.toISOString(),
              updated_at: FIXED_NOW.toISOString(),
              revoked_at: null,
              ...payload,
            };
            return {
              select() {
                return {
                  single: async () => ({ data: stored, error: null }),
                };
              },
            };
          },
          update(payload: Record<string, unknown>) {
            const filters: Array<[string, string]> = [];
            stored = stored ? { ...stored, ...payload } : null;
            return {
              eq(column: string, value: string) {
                filters.push([column, value]);
                updates.push({ payload, filters: [...filters] });
                return {
                  select() {
                    return {
                      maybeSingle: async () => ({ data: stored, error: null }),
                    };
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

function createAnalyticsAdminMock(options?: {
  productBelongsToStore?: boolean;
  orderBelongsToStore?: boolean;
}) {
  const insertedEvents: Array<Record<string, unknown>> = [];
  const limits = new Map<string, number>();
  let storeSelectCount = 0;

  return {
    insertedEvents,
    get storeSelectCount() {
      return storeSelectCount;
    },
    client: {
      from(table: string) {
        if (table === "store_analytics_ingestion_limits") {
          return {
            select() {
              return {
                eq(_column: string, value: string) {
                  return {
                    maybeSingle: async () => ({
                      data: limits.has(value)
                        ? { identifier: value, count: limits.get(value), window_start: FIXED_NOW.toISOString() }
                        : null,
                      error: null,
                    }),
                  };
                },
              };
            },
            insert(payload: Record<string, unknown>) {
              limits.set(String(payload.identifier), Number(payload.count));
              return Promise.resolve({ error: null });
            },
            update(payload: Record<string, unknown>) {
              return {
                eq(_column: string, value: string) {
                  limits.set(value, Number(payload.count));
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        }

        if (table === "stores") {
          return {
            select() {
              storeSelectCount += 1;
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: { id: "store_1", is_published: true },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }

        if (table === "products" || table === "orders") {
          return {
            select() {
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        maybeSingle: async () => ({
                          data: table === "products" && options?.productBelongsToStore === false
                            ? null
                            : table === "orders" && options?.orderBelongsToStore === false
                              ? null
                              : { id: `${table}_1` },
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

        if (table === "store_analytics_events") {
          return {
            insert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
              if (Array.isArray(payload)) {
                insertedEvents.push(...payload);
              } else {
                insertedEvents.push(payload);
              }
              return Promise.resolve({ error: null });
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    },
  };
}

function createCourierBookingAdminMock() {
  const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const connectionUpdates: Array<{ payload: Record<string, unknown>; filters: Array<[string, string]> }> = [];
  const orderUpdates: Array<{ payload: Record<string, unknown>; filters: Array<[string, string]> }> = [];

  return {
    rpcCalls,
    connectionUpdates,
    orderUpdates,
    client: {
      rpc(fn: string, args: Record<string, unknown>) {
        rpcCalls.push({ fn, args });
        if (fn === "claim_courier_booking") {
          return Promise.resolve({
            data: [{
              shipment_id: "shipment_1",
              status: "booking",
              claimed: true,
              attempt_token: "attempt_1",
              tracking_number: null,
              consignment_id: null,
            }],
            error: null,
          });
        }
        if (fn === "finalize_courier_booking") {
          return Promise.resolve({
            data: {
              id: "shipment_1",
              status: "booked",
              provider: "pathao",
              tracking_number: args.p_tracking_number ?? null,
              consignment_id: args.p_consignment_id ?? null,
            },
            error: null,
          });
        }
        if (fn === "fail_courier_booking") {
          return Promise.resolve({ data: null, error: null });
        }
        throw new Error(`Unexpected rpc ${fn}`);
      },
      from(table: string) {
        if (table === "orders") {
          return {
            select() {
              const filters: Array<[string, string]> = [];
              return {
                eq(column: string, value: string) {
                  filters.push([column, value]);
                  return {
                    eq(column2: string, value2: string) {
                      filters.push([column2, value2]);
                      return {
                        maybeSingle: async () => ({
                          data: {
                            id: "order_1",
                            store_id: "store_1",
                            order_number: "ORD-1001",
                            status: "confirmed",
                            items: [{ name: "Blue Panjabi", quantity: 2 }],
                            customer_name: "Demo Customer",
                            customer_phone: "01700000000",
                            shipping_address: "House 1, Road 2",
                            shipping_city: "Dhaka",
                            payment_method: "cod",
                            total: 1200,
                            delivery_fee: 80,
                            notes: "Call first",
                          },
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
                    eq(column2: string, value2: string) {
                      filters.push([column2, value2]);
                      orderUpdates.push({ payload, filters: [...filters] });
                      return Promise.resolve({ error: null });
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "store_courier_connections") {
          return {
            select() {
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        maybeSingle: async () => ({
                          data: {
                            id: "connection_1",
                            store_id: "store_1",
                            provider: "pathao",
                            connection_key: "dhaka-cod",
                            zone_label: "Dhaka COD",
                            service_area_name: "Dhaka metro",
                            status: "configured",
                            display_name: "Pathao Live",
                            supports_cod: true,
                            supports_city_delivery: true,
                            settings: {
                              base_url: "https://merchant.pathao.test/aladdin/api/v1",
                              merchant_store_id: 4321,
                              merchant_order_prefix: "ECM",
                              delivery_type: 48,
                              item_type: 2,
                              default_item_weight_kg: 0.5,
                              special_instruction: "Call before pickup",
                            },
                            last_sync_at: null,
                            last_error: null,
                            created_at: FIXED_NOW.toISOString(),
                            updated_at: FIXED_NOW.toISOString(),
                          },
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
                    eq(column2: string, value2: string) {
                      filters.push([column2, value2]);
                      connectionUpdates.push({ payload, filters: [...filters] });
                      return Promise.resolve({ error: null });
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "store_courier_credentials_secure") {
          return {
            select() {
              const chain = {
                eq() {
                  return chain;
                },
                maybeSingle: async () => ({
                  data: {
                    connection_id: "connection_1",
                    store_id: "store_1",
                    provider: "pathao",
                    secret_payload: {
                      access_token: "pathao-token",
                    },
                  },
                  error: null,
                }),
              };
              return chain;
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    },
  };
}

function createCourierShipmentsAdminMock() {
  return {
    client: {
      from(table: string) {
        if (table === "order_shipments") {
          return {
            select() {
              return {
                eq() {
                  return {
                    order() {
                      return Promise.resolve({
                        data: [
                          {
                            id: "shipment_1",
                            order_id: "order_1",
                            provider: "pathao",
                            courier_connection_id: "connection_2",
                            status: "booked",
                            tracking_number: "TRK-88",
                            consignment_id: "CN-88",
                            created_at: FIXED_NOW.toISOString(),
                            delivered_at: null,
                          },
                        ],
                        error: null,
                      });
                    },
                  };
                },
              };
            },
          };
        }

        if (table === "store_courier_connections") {
          return {
            select() {
              return {
                eq() {
                  return {
                    in() {
                      return Promise.resolve({
                        data: [
                          {
                            id: "connection_2",
                            provider: "pathao",
                            display_name: "Pathao Zone 2",
                            zone_label: "Outside Dhaka prepaid",
                            service_area_name: "North zone",
                          },
                        ],
                        error: null,
                      });
                    },
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
                domain_type: payload.domain_type ?? "custom",
                cloudflare_hostname_id: payload.cloudflare_hostname_id ?? null,
                cloudflare_hostname_status: payload.cloudflare_hostname_status ?? null,
                cloudflare_ssl_status: payload.cloudflare_ssl_status ?? null,
                last_cloudflare_error: payload.last_cloudflare_error ?? null,
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
} | null, options?: { platformConnection?: Record<string, unknown> | null }) {
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

        if (table === "platform_payment_connections_secure") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: options?.platformConnection ?? null,
                      error: null,
                    }),
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
                  return Promise.resolve({
                    data: options?.platformRole ? [{ role: options.platformRole }] : [],
                    error: null,
                  });
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

function createNotificationAdminMock() {
  const escalations: Array<{ payload: Record<string, unknown>; filters: Array<[string, string]> }> = [];
  const processingFailures: Array<{ payload: Record<string, unknown>; filters: Array<[string, string]> }> = [];
  const recoveryMessageUpdates: Array<{ payload: Record<string, unknown>; filters: Array<[string, string]> }> = [];

  return {
    escalations,
    processingFailures,
    recoveryMessageUpdates,
    client: {
      rpc(fn: string, args: Record<string, unknown>) {
        if (fn === "claim_due_email_events") {
          void args;
          return Promise.resolve({
            data: [
              {
                id: "event_retry_1",
                store_id: "store_1",
                order_id: "order_1",
                template_name: "merchant-order-alert",
                recipient: "ops@example.com",
                channel: "email",
                metadata: {
                  retry_payload: {
                    store_id: "store_1",
                    order_id: "order_1",
                    templateName: "merchant-order-alert",
                    to: "ops@example.com",
                  },
                },
                retry_count: 1,
                status: "processing",
              },
            ],
            error: null,
          });
        }

        if (fn === "claim_due_cart_recovery_messages") {
          void args;
          return Promise.resolve({
            data: [
              {
                id: "recovery_msg_1",
                store_id: "store_1",
                lead_id: "lead_1",
                channel: "email",
                template_key: "recovery-sequence",
                status: "processing",
                retry_count: 0,
                contact_email: "buyer@example.com",
                contact_phone: null,
                contact_name: "Amina",
                store_name: "Demo Store",
                store_slug: "demo-store",
                coupon_code: "RECOVER-123",
                cart_value: 1290,
                item_count: 2,
                metadata: {
                  item_summary: "Dress x1, Scarf x1",
                },
              },
            ],
            error: null,
          });
        }

        {
          throw new Error(`Unexpected rpc ${fn}`);
        }
      },
      from(table: string) {
        if (table === "stores") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        id: "store_1",
                        name: "Demo Store",
                        slug: "demo-store",
                        owner_id: "owner_1",
                      },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }

        if (table === "email_events") {
          return {
            select() {
              return {
                eq() {
                  return {
                    in() {
                      return {
                        or() {
                          return {
                            order() {
                              return {
                                limit: async () => ({
                                  data: [
                                    {
                                      id: "event_retry_1",
                                      store_id: "store_1",
                                      template_name: "merchant-order-alert",
                                      recipient: "ops@example.com",
                                      channel: "email",
                                      metadata: {
                                        retry_payload: {
                                          store_id: "store_1",
                                          templateName: "merchant-order-alert",
                                          to: "ops@example.com",
                                        },
                                      },
                                      retry_count: 1,
                                      status: "retrying",
                                    },
                                  ],
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
                          escalations.push({ payload, filters: [...filters] });
                          return Promise.resolve({ error: null });
                        },
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
                  if ("operator_escalated_at" in payload || "operator_escalation_reason" in payload) {
                    return {
                      eq(column2: string, value2: string) {
                        filters.push([column2, value2]);
                        escalations.push({ payload, filters: [...filters] });
                        return Promise.resolve({ error: null });
                      },
                    };
                  }

                  if (column === "id") {
                    processingFailures.push({ payload, filters: [...filters] });
                    return Promise.resolve({ error: null });
                  }
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        }

        if (table === "store_cart_recovery_messages") {
          return {
            update(payload: Record<string, unknown>) {
              return {
                eq(column: string, value: string) {
                  recoveryMessageUpdates.push({
                    payload,
                    filters: [[column, value]],
                  });
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

describe("manual billing invoice side effects", () => {
  test("creates a pending manual invoice from server-side plan pricing instead of trusting the browser payload", async () => {
    const admin = createManualInvoiceAdminMock({
      plan: {
        id: "advanced",
        monthly_price: 1499,
        annual_price: 14990,
        currency_code: "BDT",
      },
    });

    mock.method(billingManualInvoiceRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(billingManualInvoiceRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(billingManualInvoiceRouteDeps, "canManageStore", async () => true);
    mock.method(billingManualInvoiceRouteDeps, "now", () => FIXED_NOW.toISOString());

    const response = await billingManualInvoicePost(
      jsonRequest("https://example.com/api/billing/manual-invoice", "POST", {
        storeId: "store_1",
        planId: "advanced",
        billingInterval: "annual",
        transactionId: "trxlive123",
        amount: 1,
        currency: "USD",
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      invoiceId: "invoice_manual_1",
      duplicated: false,
      status: "pending",
    });
    assert.deepEqual(admin.insertedInvoices, [
      {
        store_id: "store_1",
        plan_id: "advanced",
        amount: 14990,
        billing_interval: "annual",
        currency: "BDT",
        status: "pending",
        provider: "bkash_manual",
        payment_method: "bkash_manual",
        provider_invoice_id: "TRXLIVE123",
        billing_period_start: FIXED_NOW.toISOString(),
      },
    ]);
  });

  test("rejects non-provider-shaped manual transaction IDs before billing lookup", async () => {
    mock.method(billingManualInvoiceRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    const adminClientMock = mock.method(billingManualInvoiceRouteDeps, "getSupabaseAdminClient", () => {
      throw new Error("billing client should not be created for an invalid transaction id");
    });

    const response = await billingManualInvoicePost(
      jsonRequest("https://example.com/api/billing/manual-invoice", "POST", {
        storeId: "store_1", planId: "basic", transactionId: "trx-123",
      }),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid bKash transaction ID" });
    assert.equal(adminClientMock.mock.callCount(), 0);
  });

  test("returns the existing invoice for duplicate manual transaction submissions without writing a second row", async () => {
    const admin = createManualInvoiceAdminMock({
      plan: {
        id: "basic",
        monthly_price: 499,
      },
      existingInvoice: {
        id: "invoice_existing_1",
        status: "pending",
        provider_invoice_id: "trxdup1",
      },
    });

    mock.method(billingManualInvoiceRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(billingManualInvoiceRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(billingManualInvoiceRouteDeps, "canManageStore", async () => true);

    const response = await billingManualInvoicePost(
      jsonRequest("https://example.com/api/billing/manual-invoice", "POST", {
        storeId: "store_1",
        planId: "basic",
        billingInterval: "monthly",
        transactionId: "trxdup1",
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      invoiceId: "invoice_existing_1",
      duplicated: true,
      status: "pending",
    });
    assert.deepEqual(admin.insertedInvoices, []);
  });

  test("rejects cross-store reuse of a normalized manual bKash transaction identity", async () => {
    const admin = createManualInvoiceAdminMock({
      plan: { id: "basic", monthly_price: 499 },
      existingInvoice: {
        id: "invoice_other_store",
        store_id: "store_2",
        status: "pending",
        provider_invoice_id: "TRXCROSS1",
      },
    });

    mock.method(billingManualInvoiceRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(billingManualInvoiceRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(billingManualInvoiceRouteDeps, "canManageStore", async () => true);

    const response = await billingManualInvoicePost(
      jsonRequest("https://example.com/api/billing/manual-invoice", "POST", {
        storeId: "store_1",
        planId: "basic",
        transactionId: "  trxcross1  ",
      }),
    );

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "This bKash transaction has already been submitted." });
    assert.deepEqual(admin.insertedInvoices, []);
    assert.deepEqual(admin.invoiceLookups[0], [
      ["provider", "bkash_manual"],
      ["provider_invoice_id", "TRXCROSS1"],
    ]);
  });

  test("reuses the durable same-store winner after a concurrent unique-index race", async () => {
    const admin = createManualInvoiceAdminMock({
      plan: { id: "advanced", monthly_price: 1499 },
      existingInvoice: null,
      raceInvoice: {
        id: "invoice_race_winner",
        store_id: "store_1",
        status: "pending",
        provider_invoice_id: "TRXRACE1",
      },
      insertError: { code: "23505", message: "duplicate key value violates unique constraint" },
    });

    mock.method(billingManualInvoiceRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(billingManualInvoiceRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(billingManualInvoiceRouteDeps, "canManageStore", async () => true);

    const response = await billingManualInvoicePost(
      jsonRequest("https://example.com/api/billing/manual-invoice", "POST", {
        storeId: "store_1", planId: "advanced", transactionId: "trxrace1",
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true, invoiceId: "invoice_race_winner", duplicated: true, status: "pending",
    });
    assert.equal(admin.insertedInvoices.length, 1);
    assert.equal(admin.invoiceLookups.length, 2);
  });

  test("legitimate retry returns the existing invoice before revalidating a changed plan request", async () => {
    const admin = createManualInvoiceAdminMock({
      plan: { id: "retired", monthly_price: 499, is_active: false },
      existingInvoice: {
        id: "invoice_retry", store_id: "store_1", status: "pending", provider_invoice_id: "TRXRETRY1",
      },
    });

    mock.method(billingManualInvoiceRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(billingManualInvoiceRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(billingManualInvoiceRouteDeps, "canManageStore", async () => true);

    const response = await billingManualInvoicePost(
      jsonRequest("https://example.com/api/billing/manual-invoice", "POST", {
        storeId: "store_1", planId: "retired", transactionId: "trxretry1",
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true, invoiceId: "invoice_retry", duplicated: true, status: "pending",
    });
    assert.deepEqual(admin.insertedInvoices, []);
  });
});

describe("manual billing review side effects", () => {
  test("approves a pending manual invoice and writes review metadata plus active subscription payload", async () => {
    const admin = createManualReviewAdminMock({
      id: "invoice_1",
      store_id: "store_1",
      plan_id: "advanced",
      status: "pending",
      billing_interval: "annual",
      provider_invoice_id: "trx123",
    });

    mock.method(manualBillingReviewRouteDeps, "getAuthenticatedUser", async () => ({ id: "admin_1" }) as never);
    mock.method(manualBillingReviewRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(manualBillingReviewRouteDeps, "now", () => FIXED_NOW);
    mock.method(manualBillingReviewRouteDeps, "upsertStoreSubscription", async (_client, payload) => {
      admin.subscriptionUpserts.push(payload as Record<string, unknown>);
      return { error: null } as never;
    });

    const response = await manualBillingReviewPost(
      jsonRequest(
        "https://example.com/api/platform/billing/manual-review",
        "POST",
        { invoiceId: "invoice_1", action: "approve", reviewNote: "Matched bank log" },
        { Authorization: "Bearer token_123" },
      ),
    );

    const expectedPeriodEnd = new Date("2027-07-09T00:00:00.000Z").toISOString();

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, status: "paid" });
    assert.deepEqual(admin.invoiceUpdates, [
      {
        payload: {
          status: "paid",
          paid_at: FIXED_NOW.toISOString(),
          billing_period_start: FIXED_NOW.toISOString(),
          billing_period_end: expectedPeriodEnd,
          reviewed_at: FIXED_NOW.toISOString(),
          reviewed_by: "admin_1",
          review_note: "Matched bank log",
        },
        filters: [["id", "invoice_1"], ["status", "pending"]],
      },
    ]);
    assert.deepEqual(admin.subscriptionUpserts, [
      {
        storeId: "store_1",
        planId: "advanced",
        status: "active",
        provider: "bkash_manual",
        providerSubscriptionId: "TRX123",
        currentPeriodEndsAt: expectedPeriodEnd,
        trialEndsAt: null,
      },
    ]);
  });

  test("rejects a pending manual invoice and stores the operator review note", async () => {
    const admin = createManualReviewAdminMock({
      id: "invoice_2",
      store_id: "store_2",
      plan_id: "basic",
      status: "pending",
      billing_interval: "monthly",
      provider_invoice_id: "trx456",
    });

    mock.method(manualBillingReviewRouteDeps, "getAuthenticatedUser", async () => ({ id: "admin_2" }) as never);
    mock.method(manualBillingReviewRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(manualBillingReviewRouteDeps, "now", () => FIXED_NOW);
    const upsertMock = mock.method(manualBillingReviewRouteDeps, "upsertStoreSubscription", async () => ({ error: null }) as never);

    const response = await manualBillingReviewPost(
      jsonRequest(
        "https://example.com/api/platform/billing/manual-review",
        "POST",
        { invoiceId: "invoice_2", action: "reject", reviewNote: "Transaction could not be verified." },
        { Authorization: "Bearer token_456" },
      ),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, status: "failed" });
    assert.deepEqual(admin.invoiceUpdates, [
      {
        payload: {
          status: "failed",
          reviewed_at: FIXED_NOW.toISOString(),
          reviewed_by: "admin_2",
          review_note: "Transaction could not be verified.",
        },
        filters: [["id", "invoice_2"], ["status", "pending"]],
      },
    ]);
    assert.equal(upsertMock.mock.callCount(), 0);
  });

  test("rejects manual-review rows whose provider and payment method disagree", async () => {
    const admin = createManualReviewAdminMock({
      id: "invoice_method_provider_mismatch",
      store_id: "store_2",
      plan_id: "basic",
      status: "pending",
      payment_method: "bkash_manual",
      provider: "bkash",
      provider_invoice_id: "trxmismatch1",
    });

    mock.method(manualBillingReviewRouteDeps, "getAuthenticatedUser", async () => ({ id: "admin_mismatch" }) as never);
    mock.method(manualBillingReviewRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    const upsertMock = mock.method(manualBillingReviewRouteDeps, "upsertStoreSubscription", async () => ({ error: null }) as never);

    const response = await manualBillingReviewPost(
      jsonRequest(
        "https://example.com/api/platform/billing/manual-review",
        "POST",
        { invoiceId: "invoice_method_provider_mismatch", action: "approve" },
        { Authorization: "Bearer token_mismatch" },
      ),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Only manual bKash invoices can be reviewed here" });
    assert.equal(admin.invoiceUpdates.length, 0);
    assert.equal(upsertMock.mock.callCount(), 0);
  });

  for (const platformRole of ["billing_admin", "super_admin"] as const) {
    test(`accepts ${platformRole}-only operators for manual billing review`, async () => {
      const admin = createManualReviewAdminMock({
        id: `invoice_${platformRole}`,
        store_id: "store_role_test",
        plan_id: "advanced",
        status: "pending",
        billing_interval: "monthly",
        provider_invoice_id: `trx${platformRole.replace("_", "")}`,
        platformRoles: [platformRole],
      });

      mock.method(manualBillingReviewRouteDeps, "getAuthenticatedUser", async () => ({ id: `${platformRole}_1` }) as never);
      mock.method(manualBillingReviewRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
      mock.method(manualBillingReviewRouteDeps, "now", () => FIXED_NOW);
      mock.method(manualBillingReviewRouteDeps, "upsertStoreSubscription", async () => ({ error: null }) as never);

      const response = await manualBillingReviewPost(
        jsonRequest(
          "https://example.com/api/platform/billing/manual-review",
          "POST",
          { invoiceId: `invoice_${platformRole}`, action: "approve" },
          { Authorization: "Bearer token_role_test" },
        ),
      );

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { success: true, status: "paid" });
      assert.equal(admin.invoiceUpdates.length, 1);
    });
  }

  test("rejects support-agent-only operators from manual billing review", async () => {
    const admin = createManualReviewAdminMock({
      id: "invoice_support_agent",
      store_id: "store_role_test",
      plan_id: "advanced",
      status: "pending",
      provider_invoice_id: "trxsupportagent",
      platformRoles: ["support_agent"],
    });

    mock.method(manualBillingReviewRouteDeps, "getAuthenticatedUser", async () => ({ id: "support_agent_1" }) as never);
    mock.method(manualBillingReviewRouteDeps, "getSupabaseAdminClient", () => admin.client as never);

    const response = await manualBillingReviewPost(
      jsonRequest(
        "https://example.com/api/platform/billing/manual-review",
        "POST",
        { invoiceId: "invoice_support_agent", action: "approve" },
        { Authorization: "Bearer token_support" },
      ),
    );

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
    assert.equal(admin.invoiceUpdates.length, 0);
  });

  test("accepts admins that have multiple allowed platform role rows", async () => {
    const admin = createManualReviewAdminMock({
      id: "invoice_3",
      store_id: "store_3",
      plan_id: "pro",
      status: "pending",
      billing_interval: "monthly",
      provider_invoice_id: "trx789",
      platformRoles: ["admin", "billing_admin"],
    });

    mock.method(manualBillingReviewRouteDeps, "getAuthenticatedUser", async () => ({ id: "admin_3" }) as never);
    mock.method(manualBillingReviewRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(manualBillingReviewRouteDeps, "now", () => FIXED_NOW);
    mock.method(manualBillingReviewRouteDeps, "upsertStoreSubscription", async (_client, payload) => {
      admin.subscriptionUpserts.push(payload as Record<string, unknown>);
      return { error: null } as never;
    });

    const response = await manualBillingReviewPost(
      jsonRequest(
        "https://example.com/api/platform/billing/manual-review",
        "POST",
        { invoiceId: "invoice_3", action: "approve" },
        { Authorization: "Bearer token_789" },
      ),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true, status: "paid" });
    assert.equal(admin.invoiceUpdates.length, 1);
    assert.equal(admin.subscriptionUpserts.length, 1);
  });

  test("returns structured Supabase error details instead of the generic fallback", async () => {
    const admin = createManualReviewAdminMock({
      id: "invoice_4",
      store_id: "store_4",
      plan_id: "pro",
      status: "pending",
      provider_invoice_id: "trx999",
    });

    mock.method(manualBillingReviewRouteDeps, "getAuthenticatedUser", async () => ({ id: "admin_4" }) as never);
    mock.method(manualBillingReviewRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(manualBillingReviewRouteDeps, "upsertStoreSubscription", async () => ({
      error: {
        code: "23503",
        message: "insert or update on table \"store_subscriptions\" violates foreign key constraint",
        details: "Key (plan_id)=(pro) is not present in table \"cms_plans\".",
      },
    }) as never);

    const response = await manualBillingReviewPost(
      jsonRequest(
        "https://example.com/api/platform/billing/manual-review",
        "POST",
        { invoiceId: "invoice_4", action: "approve" },
        { Authorization: "Bearer token_999" },
      ),
    );

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error:
        "insert or update on table \"store_subscriptions\" violates foreign key constraint Key (plan_id)=(pro) is not present in table \"cms_plans\". (code: 23503)",
    });
  });

  test("blocks manual approval when another invoice owns the provider transaction identity", async () => {
    const admin = createManualReviewAdminMock(
      {
        id: "invoice_collision", store_id: "store_1", plan_id: "advanced", status: "pending",
        provider_invoice_id: "trxcollision1",
      },
      { transactionCollision: { id: "invoice_paid_elsewhere", store_id: "store_2", status: "paid" } },
    );

    mock.method(manualBillingReviewRouteDeps, "getAuthenticatedUser", async () => ({ id: "admin_5" }) as never);
    mock.method(manualBillingReviewRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    const incidentMock = mock.method(manualBillingReviewRouteDeps, "recordPlatformIncident", async () => true);
    const upsertMock = mock.method(manualBillingReviewRouteDeps, "upsertStoreSubscription", async () => ({ error: null }) as never);

    const response = await manualBillingReviewPost(
      jsonRequest(
        "https://example.com/api/platform/billing/manual-review",
        "POST",
        { invoiceId: "invoice_collision", action: "approve" },
        { Authorization: "Bearer token_collision" },
      ),
    );

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      error: "This bKash transaction is already attached to another invoice.",
    });
    assert.equal(admin.invoiceUpdates.length, 0);
    assert.equal(upsertMock.mock.callCount(), 0);
    assert.equal(incidentMock.mock.callCount(), 1);
  });

  test("does not grant entitlement when a concurrent reviewer already consumed pending state", async () => {
    const admin = createManualReviewAdminMock(
      {
        id: "invoice_review_race", store_id: "store_1", plan_id: "advanced", status: "pending",
        provider_invoice_id: "trxreviewrace",
      },
      { updateWinner: false },
    );

    mock.method(manualBillingReviewRouteDeps, "getAuthenticatedUser", async () => ({ id: "admin_6" }) as never);
    mock.method(manualBillingReviewRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    const upsertMock = mock.method(manualBillingReviewRouteDeps, "upsertStoreSubscription", async () => ({ error: null }) as never);

    const response = await manualBillingReviewPost(
      jsonRequest(
        "https://example.com/api/platform/billing/manual-review",
        "POST",
        { invoiceId: "invoice_review_race", action: "approve" },
        { Authorization: "Bearer token_review_race" },
      ),
    );

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "This invoice is no longer pending review" });
    assert.equal(admin.invoiceUpdates.length, 1);
    assert.equal(upsertMock.mock.callCount(), 0);
  });
});

describe("platform subscription side effects", () => {
  test("extends a trial through the server-side subscription path", async () => {
    const admin = createPlatformSubscriptionsAdminMock({
      store: { id: "store_trial_1", name: "Trial Store", plan: "basic" },
      existingSubscription: {
        plan_id: "advanced",
        trial_ends_at: "2026-07-20T00:00:00.000Z",
      },
    });

    mock.method(platformSubscriptionsRouteDeps, "getAuthenticatedUser", async () => ({ id: "admin_trial_1", email: "ops@example.com" }) as never);
    mock.method(platformSubscriptionsRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(platformSubscriptionsRouteDeps, "now", () => FIXED_NOW);
    mock.method(platformSubscriptionsRouteDeps, "upsertStoreSubscription", async (_client, payload) => {
      admin.subscriptionUpserts.push(payload as Record<string, unknown>);
      return { error: null } as never;
    });

    const response = await platformSubscriptionsPost(
      jsonRequest(
        "https://example.com/api/platform/subscriptions",
        "POST",
        {
          action: "extend_trial",
          storeId: "store_trial_1",
          daysToAdd: 14,
          operatorNote: "Recovery extension",
        },
        { Authorization: "Bearer token_trial_1" },
      ),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      status: "trialing",
      trialEndsAt: "2026-08-03T00:00:00.000Z",
    });
    assert.deepEqual(admin.subscriptionUpserts, [
      {
        storeId: "store_trial_1",
        planId: "advanced",
        status: "trialing",
        provider: null,
        providerSubscriptionId: null,
        currentPeriodEndsAt: "2026-08-03T00:00:00.000Z",
        trialEndsAt: "2026-08-03T00:00:00.000Z",
      },
    ]);
  });

  test("applies a manual override through the server-side subscription path", async () => {
    const admin = createPlatformSubscriptionsAdminMock({
      store: { id: "store_override_1", name: "Override Store", plan: "basic" },
      plan: { id: "pro", name: "Pro", currency_code: "BDT", is_active: true },
    });

    mock.method(platformSubscriptionsRouteDeps, "getAuthenticatedUser", async () => ({ id: "admin_override_1", email: "billing@example.com" }) as never);
    mock.method(platformSubscriptionsRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(platformSubscriptionsRouteDeps, "now", () => FIXED_NOW);
    mock.method(platformSubscriptionsRouteDeps, "upsertStoreSubscription", async (_client, payload) => {
      admin.subscriptionUpserts.push(payload as Record<string, unknown>);
      return { error: null } as never;
    });

    const response = await platformSubscriptionsPost(
      jsonRequest(
        "https://example.com/api/platform/subscriptions",
        "POST",
        {
          action: "manual_override",
          storeId: "store_override_1",
          planId: "pro",
          reason: "VIP exception",
        },
        { Authorization: "Bearer token_override_1" },
      ),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      status: "active",
      planId: "pro",
    });
    assert.deepEqual(admin.subscriptionUpserts, [
      {
        storeId: "store_override_1",
        planId: "pro",
        status: "active",
        provider: "platform_admin",
        providerSubscriptionId: null,
        currentPeriodEndsAt: null,
        trialEndsAt: null,
      },
    ]);
    assert.equal(admin.insertedInvoices.length, 1);
    assert.equal(admin.insertedInvoices[0]?.store_id, "store_override_1");
    assert.equal(admin.insertedInvoices[0]?.plan_id, "pro");
    assert.equal(admin.insertedInvoices[0]?.status, "paid");
    assert.equal(admin.insertedInvoices[0]?.payment_method, "manual_override");
  });
});

describe("platform access side effects", () => {
  test("returns the first resolved platform role for the authenticated user", async () => {
    const admin = createPlatformAccessAdminMock(["admin"]);

    mock.method(platformAccessRouteDeps, "getAuthenticatedUser", async () => ({ id: "admin_access_1" }) as never);
    mock.method(platformAccessRouteDeps, "getSupabaseAdminClient", () => admin.client as never);

    const response = await platformAccessGet(
      new Request("https://example.com/api/platform/access", {
        headers: {
          Authorization: "Bearer token_access_1",
        },
      }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      role: "admin",
      isPlatformUser: true,
    });
  });
});

describe("courier connection side effects", () => {
  test("stores public Pathao settings separately from secret credential payloads", async () => {
    const admin = createCourierConnectionsAdminMock();

    mock.method(courierConnectionsRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(courierConnectionsRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(courierConnectionsRouteDeps, "canManageStore", async () => true);

    const response = (await courierConnectionsPost(
      jsonRequest("https://example.com/api/couriers/connections", "POST", {
        storeId: "store_1",
        provider: "pathao",
        displayName: "Pathao Live",
        supportsCod: true,
        supportsCityDelivery: true,
        settings: {
          zoneLabel: "Dhaka COD",
          serviceAreaName: "Dhaka metro",
          pickupContactName: "Warehouse A",
          pickupContactPhone: "01700000001",
          pickupAddress: "12 Commerce Road, Dhaka",
          returnContactName: "Returns Desk",
          returnContactPhone: "01700000002",
          returnAddress: "12 Commerce Road, Dhaka",
          baseUrl: "https://merchant.pathao.test/aladdin/api/v1",
          merchantStoreId: 4321,
          merchantOrderPrefix: "ECM",
          accessToken: "secret-token",
          deliveryType: 48,
          itemType: 2,
          defaultItemWeightKg: 0.75,
          specialInstruction: "Call before pickup",
        },
      }),
    ))!;

    assert.equal(response.status, 200);
    assert.equal(admin.publicInserts.length, 1);
    assert.equal(admin.publicInserts[0]?.provider, "pathao");
    assert.equal(typeof admin.publicInserts[0]?.connection_key, "string");
    assert.deepEqual({ ...admin.publicInserts[0], connection_key: "generated" }, {
      store_id: "store_1",
      provider: "pathao",
      connection_key: "generated",
      zone_label: "Dhaka COD",
      service_area_name: "Dhaka metro",
      status: "draft",
      verification_status: "not_checked",
      last_verification_at: null,
      last_verified_at: null,
      verification_error: null,
      display_name: "Pathao Live",
      supports_cod: true,
      supports_city_delivery: true,
      settings: {
        zone_label: "Dhaka COD",
        service_area_name: "Dhaka metro",
        pickup_contact_name: "Warehouse A",
        pickup_contact_phone: "01700000001",
        pickup_address: "12 Commerce Road, Dhaka",
        return_contact_name: "Returns Desk",
        return_contact_phone: "01700000002",
        return_address: "12 Commerce Road, Dhaka",
        note: null,
        sandbox_mode: false,
        base_url: "https://merchant.pathao.test/aladdin/api/v1",
        merchant_store_id: 4321,
        merchant_order_prefix: "ECM",
        delivery_type: 48,
        item_type: 2,
        default_item_weight_kg: 0.75,
        special_instruction: "Call before pickup",
      },
      created_by: "owner_1",
    });
    assert.deepEqual(admin.privateUpserts, [
      {
        connection_id: "connection_1",
        store_id: "store_1",
        provider: "pathao",
        secret_payload: {
          access_token: "secret-token",
        },
        created_by: "owner_1",
        updated_by: "owner_1",
      },
    ]);
    assert.deepEqual(await response.json(), {
      success: true,
      connection: {
        id: "connection_1",
        storeId: "store_1",
        provider: "pathao",
        connectionKey: admin.publicInserts[0]?.connection_key,
        zoneLabel: "Dhaka COD",
        serviceAreaName: "Dhaka metro",
        status: "configured",
        verificationStatus: "not_checked",
        verificationAvailable: false,
        verificationError: null,
        lastVerificationAt: null,
        lastVerifiedAt: null,
        displayName: "Pathao Live",
        supportsCod: true,
        supportsCityDelivery: true,
        settingsSummary: {
          zoneLabel: "Dhaka COD",
          serviceAreaName: "Dhaka metro",
          pickupContactName: "Warehouse A",
          pickupContactPhone: "01700000001",
          pickupAddress: "12 Commerce Road, Dhaka",
          returnContactName: "Returns Desk",
          returnContactPhone: "01700000002",
          returnAddress: "12 Commerce Road, Dhaka",
          baseUrl: "https://merchant.pathao.test/aladdin/api/v1",
          merchantStoreId: 4321,
          merchantOrderPrefix: "ECM",
          deliveryType: 48,
          itemType: 2,
          defaultItemWeightKg: 0.75,
          specialInstruction: "Call before pickup",
          note: null,
          sandboxMode: false,
          hasAccessToken: true,
        },
        lastSyncAt: null,
        lastError: null,
        createdAt: FIXED_NOW.toISOString(),
        updatedAt: FIXED_NOW.toISOString(),
      },
    });
  });

  test("creates independent same-provider courier zones instead of overwriting by provider", async () => {
    const admin = createCourierConnectionsAdminMock();

    mock.method(courierConnectionsRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(courierConnectionsRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(courierConnectionsRouteDeps, "canManageStore", async () => true);

    for (const zone of ["Dhaka COD", "Outside Dhaka prepaid"]) {
      const response = (await courierConnectionsPost(
        jsonRequest("https://example.com/api/couriers/connections", "POST", {
          storeId: "store_1",
          provider: "pathao",
          displayName: zone,
          settings: {
            zoneLabel: zone,
            serviceAreaName: zone,
            pickupContactName: "Warehouse A",
            pickupContactPhone: "01700000001",
            pickupAddress: "12 Commerce Road, Dhaka",
            returnContactName: "Returns Desk",
            returnContactPhone: "01700000002",
            returnAddress: "12 Commerce Road, Dhaka",
            baseUrl: "https://merchant.pathao.test/aladdin/api/v1",
            merchantStoreId: 4321,
            accessToken: `secret-${zone}`,
          },
        }),
      ))!;
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.connection.status, "configured");
      assert.equal(body.connection.verificationStatus, "not_checked");
    }

    assert.equal(admin.publicInserts.length, 2);
    assert.equal(admin.privateUpserts.length, 2);
    assert.notEqual(admin.privateUpserts[0]?.connection_id, admin.privateUpserts[1]?.connection_id);
    assert.deepEqual(admin.publicInserts.map((row) => row.zone_label), ["Dhaka COD", "Outside Dhaka prepaid"]);
  });
});

describe("courier booking side effects", () => {
  test("claims and finalizes one Pathao shipment, updates sync metadata, and moves the order into processing", async () => {
    const admin = createCourierBookingAdminMock();

    mock.method(courierBookingRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(courierBookingRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(courierBookingRouteDeps, "canManageStore", async () => true);
    mock.method(courierBookingRouteDeps, "now", () => FIXED_NOW.toISOString());
    const fetchMock = mock.method(courierBookingRouteDeps, "fetch", async (_url: string, init?: RequestInit) => ({
      ok: true,
      json: async () => ({
        data: {
          consignment_id: "CN-9001",
          tracking_number: "TRK-5001",
        },
        echoedRequest: init?.body ? JSON.parse(String(init.body)) : null,
      }),
    }) as never);

    const response = (await courierBookPost(
      jsonRequest("https://example.com/api/couriers/book", "POST", {
        storeId: "store_1",
        orderId: "order_1",
        connectionId: "connection_1",
        booking: {
          itemWeightKg: 1,
          itemQuantity: 2,
          itemDescription: "Blue Panjabi",
          specialInstruction: "Handle with care",
          amountToCollect: 1200,
          shippingFee: 80,
        },
      }),
    ))!;

    assert.equal(response.status, 200);
    assert.equal(fetchMock.mock.callCount(), 1);
    assert.deepEqual(admin.rpcCalls.map((entry) => entry.fn), [
      "claim_courier_booking",
      "finalize_courier_booking",
    ]);
    assert.deepEqual(admin.rpcCalls[0]?.args, {
      p_store_id: "store_1",
      p_order_id: "order_1",
      p_connection_id: "connection_1",
      p_provider: "pathao",
      p_booking_request_id: "order:order_1:connection:connection_1",
      p_actor_id: "owner_1",
      p_now: FIXED_NOW.toISOString(),
    });
    const bookingPayload = {
      store_id: 4321,
      merchant_order_id: "ECM-ORD-1001",
      recipient_name: "Demo Customer",
      recipient_phone: "01700000000",
      recipient_address: "House 1, Road 2, Dhaka",
      delivery_type: 48,
      item_type: 2,
      special_instruction: "Handle with care",
      item_quantity: 2,
      item_weight: "1",
      item_description: "Blue Panjabi",
      amount_to_collect: 1200,
    };
    assert.deepEqual(admin.rpcCalls[1]?.args, {
      p_shipment_id: "shipment_1",
      p_attempt_token: "attempt_1",
      p_tracking_number: "TRK-5001",
      p_consignment_id: "CN-9001",
      p_recipient_name: "Demo Customer",
      p_recipient_phone: "01700000000",
      p_destination_city: "Dhaka",
      p_destination_address: "House 1, Road 2",
      p_cash_collection_amount: 1200,
      p_shipping_fee: 80,
      p_booking_payload: bookingPayload,
      p_provider_payload: {
        data: {
          consignment_id: "CN-9001",
          tracking_number: "TRK-5001",
        },
        echoedRequest: bookingPayload,
      },
      p_now: FIXED_NOW.toISOString(),
    });
    assert.deepEqual(admin.connectionUpdates, [
      {
        payload: {
          last_sync_at: FIXED_NOW.toISOString(),
          last_error: null,
        },
        filters: [["id", "connection_1"], ["store_id", "store_1"]],
      },
    ]);
    assert.deepEqual(admin.orderUpdates, [
      {
        payload: { status: "processing" },
        filters: [["id", "order_1"], ["store_id", "store_1"]],
      },
    ]);
    assert.deepEqual(await response.json(), {
      success: true,
      shipment: {
        id: "shipment_1",
        status: "booked",
        provider: "pathao",
        tracking_number: "TRK-5001",
        consignment_id: "CN-9001",
      },
      orderStatus: "processing",
    });
  });
});

describe("courier shipment side effects", () => {
  test("returns shipment rows enriched with the selected courier connection label", async () => {
    const admin = createCourierShipmentsAdminMock();

    mock.method(courierShipmentsRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(courierShipmentsRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(courierShipmentsRouteDeps, "canManageStore", async () => true);

    const response = (await courierShipmentsGet(
      new Request("https://example.com/api/couriers/shipments?storeId=store_1"),
    ))!;

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      shipments: [
        {
          id: "shipment_1",
          order_id: "order_1",
          provider: "pathao",
          courier_connection_id: "connection_2",
          courier_connection_label: "Pathao Zone 2 - Outside Dhaka prepaid / North zone",
          zone_label: "Outside Dhaka prepaid",
          service_area_name: "North zone",
          status: "booked",
          tracking_number: "TRK-88",
          consignment_id: "CN-88",
          created_at: FIXED_NOW.toISOString(),
          delivered_at: null,
        },
      ],
    });
  });
});

describe("merchant bKash payment connection side effects", () => {
  test("stores bKash secrets server-side and returns only masked connection status", async () => {
    const admin = createBkashConnectionAdminMock();

    mock.method(bkashPaymentConnectionRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(bkashPaymentConnectionRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(bkashPaymentConnectionRouteDeps, "canManageStore", async () => true);

    const response = (await bkashConnectionPut(
      jsonRequest("https://example.com/api/payment-connections/bkash", "PUT", {
        storeId: "store_1",
        settings: {
          appKey: "app-key-123",
          appSecret: "app-secret-456",
          username: "merchant-user",
          password: "merchant-password",
          isLive: true,
        },
      }),
    ))!;

    assert.equal(response.status, 200);
    assert.deepEqual(admin.upserts[0]?.secret_payload, {
      app_key: "app-key-123",
      app_secret: "app-secret-456",
      username: "merchant-user",
      password: "merchant-password",
    });

    const body = await response.json();
    assert.equal(body.connection.configured, true);
    assert.equal(body.connection.metadata.environment, "live");
    assert.equal(JSON.stringify(body).includes("app-secret-456"), false);
    assert.equal(JSON.stringify(body).includes("merchant-password"), false);

    const readResponse = (await bkashConnectionGet(
      new Request("https://example.com/api/payment-connections/bkash?storeId=store_1", {
        headers: { authorization: "Bearer token" },
      }),
    ))!;
    assert.equal(readResponse.status, 200);
    const readBody = await readResponse.json();
    assert.equal(JSON.stringify(readBody).includes("app-secret-456"), false);
    assert.equal(JSON.stringify(readBody).includes("merchant-password"), false);

    const revokeResponse = (await bkashConnectionDelete(
      new Request("https://example.com/api/payment-connections/bkash?storeId=store_1", {
        method: "DELETE",
        headers: { authorization: "Bearer token" },
      }),
    ))!;
    assert.equal(revokeResponse.status, 200);
    assert.deepEqual(admin.updates[0]?.payload.secret_payload, {});
  });
});

describe("platform CMS bKash payment connection side effects", () => {
  test("stores CMS subscription bKash secrets server-side and returns only masked connection status", async () => {
    const admin = createPlatformBkashConnectionAdminMock();

    mock.method(platformBkashPaymentConnectionRouteDeps, "getAuthenticatedUser", async () => ({
      id: "super_admin_1",
      email: "cms@example.com",
    }) as never);
    mock.method(platformBkashPaymentConnectionRouteDeps, "getSupabaseAdminClient", () => admin.client as never);

    const response = (await platformBkashConnectionPut(
      jsonRequest("https://example.com/api/platform/payment-connections/bkash", "PUT", {
        settings: {
          appKey: "platform-app-key",
          appSecret: "platform-app-secret",
          username: "platform-user",
          password: "platform-password",
          isLive: false,
        },
      }),
    ))!;

    assert.equal(response.status, 200);
    assert.deepEqual(admin.upserts[0]?.secret_payload, {
      app_key: "platform-app-key",
      app_secret: "platform-app-secret",
      username: "platform-user",
      password: "platform-password",
    });

    const body = await response.json();
    assert.equal(body.connection.configured, true);
    assert.equal(body.connection.metadata.environment, "sandbox");
    assert.equal(body.connection.metadata.forceTestMode, false);
    assert.equal(body.connection.metadata.baseUrl, null);
    assert.equal(JSON.stringify(body).includes("platform-app-secret"), false);
    assert.equal(JSON.stringify(body).includes("platform-password"), false);

    const readResponse = (await platformBkashConnectionGet(
      new Request("https://example.com/api/platform/payment-connections/bkash", {
        headers: { authorization: "Bearer token" },
      }),
    ))!;
    assert.equal(readResponse.status, 200);
    const readBody = await readResponse.json();
    assert.equal(JSON.stringify(readBody).includes("platform-app-secret"), false);
    assert.equal(JSON.stringify(readBody).includes("platform-password"), false);

    const revokeResponse = (await platformBkashConnectionDelete(
      new Request("https://example.com/api/platform/payment-connections/bkash", {
        method: "DELETE",
        headers: { authorization: "Bearer token" },
      }),
    ))!;
    assert.equal(revokeResponse.status, 200);
    assert.deepEqual(admin.updates[0]?.payload.secret_payload, {});
  });

  test("stores global CMS subscription test-mode metadata without exposing secrets", async () => {
    const admin = createPlatformBkashConnectionAdminMock();

    mock.method(platformBkashPaymentConnectionRouteDeps, "getAuthenticatedUser", async () => ({
      id: "super_admin_1",
      email: "cms@example.com",
    }) as never);
    mock.method(platformBkashPaymentConnectionRouteDeps, "getSupabaseAdminClient", () => admin.client as never);

    const response = (await platformBkashConnectionPut(
      jsonRequest("https://example.com/api/platform/payment-connections/bkash", "PUT", {
        settings: {
          appKey: "platform-app-key",
          appSecret: "platform-app-secret",
          username: "platform-user",
          password: "platform-password",
          isLive: true,
          forceTestMode: true,
          baseUrl: "https://sandbox.example.test/v1.2.0-beta",
        },
      }),
    ))!;

    assert.equal(response.status, 200);
    assert.deepEqual(admin.upserts[0]?.public_metadata, {
      is_live: true,
      environment: "live",
      force_test_mode: true,
      base_url: "https://sandbox.example.test/v1.2.0-beta",
      label: "bKash PGW",
      app_key_hint: "pl****ey",
      username_hint: "pl****er",
    });

    const body = await response.json();
    assert.equal(body.connection.metadata.forceTestMode, true);
    assert.equal(body.connection.metadata.baseUrl, "https://sandbox.example.test/v1.2.0-beta");
    assert.equal(JSON.stringify(body).includes("platform-app-secret"), false);
    assert.equal(JSON.stringify(body).includes("platform-password"), false);
  });
});

describe("public payment settings secret isolation", () => {
  test("returns storefront-safe payment settings while deriving gateway availability from the secure connection table", async () => {
    const admin = {
      client: {
        from(table: string) {
          if (table === "stores") {
            return {
              select() {
                return {
                  eq() {
                    return {
                      maybeSingle: async () => ({
                        data: { id: "10000000-0000-4000-8000-000000000001", is_published: true },
                        error: null,
                      }),
                    };
                  },
                };
              },
            };
          }

          if (table === "site_settings") {
            return {
              select() {
                return {
                  eq() {
                    return {
                      eq() {
                        return {
                          maybeSingle: async () => ({
                            data: {
                              value: {
                                bkash_enabled: true,
                                nagad_enabled: false,
                                cod_enabled: true,
                                bkash_number: "01700000000",
                                prepaid_badge_text: "Pay first, ship first",
                                prepayment_discount_type: "percentage",
                                prepayment_discount_value: 10,
                                bkash_app_key: "should-never-leak",
                                bkash_app_secret: "should-never-leak",
                                bkash_username: "should-never-leak",
                                bkash_password: "should-never-leak",
                              },
                            },
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

          if (table === "store_payment_connections_secure") {
            return {
              select() {
                return {
                  eq() {
                    return {
                      eq() {
                        return {
                          maybeSingle: async () => ({
                            data: {
                              status: "connected",
                              secret_payload: {
                                app_key: "secure-app-key",
                                app_secret: "secure-app-secret",
                                username: "secure-user",
                                password: "secure-password",
                              },
                            },
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

          throw new Error(`Unexpected table ${table}`);
        },
      },
    };

    mock.method(storePaymentSettingsRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(storePaymentSettingsRouteDeps, "loadStorePlanState", async () => ({
      data: { isPublished: true, subscription: null, resolved: { live: true } },
      error: null,
    }) as never);

    const response = await publicPaymentSettingsGet(
      new Request("https://example.com/api/store-payment-settings?storeId=10000000-0000-4000-8000-000000000001"),
    );

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.bkash_enabled, true);
    assert.equal(body.bkash_gateway_enabled, true);
    assert.equal(JSON.stringify(body).includes("should-never-leak"), false);
    assert.equal(JSON.stringify(body).includes("secure-app-secret"), false);
    assert.equal(JSON.stringify(body).includes("secure-password"), false);
  });
});

describe("analytics ingestion hardening", () => {
  const storeId = "10000000-0000-4000-8000-000000000001";
  const productId = "10000000-0000-4000-8000-000000000002";

  test("rejects unsupported analytics events before service-role insert", async () => {
    const admin = createAnalyticsAdminMock();
    mock.method(analyticsTrackRouteDeps, "rateLimit", () => ({ success: true }));
    mock.method(analyticsTrackRouteDeps, "getSupabaseAdminClient", () => admin.client as never);

    const response = await analyticsTrackPost(
      jsonRequest("https://example.com/api/analytics/track", "POST", {
        storeId,
        eventName: "merchant_poison",
      }),
    );

    assert.equal(response.status, 400);
    assert.equal(admin.insertedEvents.length, 0);
  });

  test("rejects cross-store product references before insert", async () => {
    mock.method(analyticsTrackRouteDeps, "rateLimit", () => ({ success: true }));
    const admin = createAnalyticsAdminMock({ productBelongsToStore: false });
    mock.method(analyticsTrackRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    const crossStoreResponse = await analyticsTrackPost(
      jsonRequest("https://example.com/api/analytics/track", "POST", {
        storeId,
        productId,
        eventName: "view_item",
      }),
    );
    assert.equal(crossStoreResponse.status, 400);
    assert.equal(admin.insertedEvents.length, 0);
  });

  test("rejects oversized metadata and hashes visitor identifiers on valid events", async () => {
    const oversized = "x".repeat(5_000);
    mock.method(analyticsTrackRouteDeps, "rateLimit", () => ({ success: true }));
    mock.method(analyticsTrackRouteDeps, "getSupabaseAdminClient", () => createAnalyticsAdminMock().client as never);

    const oversizedResponse = await analyticsTrackPost(
      jsonRequest("https://example.com/api/analytics/track", "POST", {
        storeId,
        eventName: "page_view",
        metadata: { oversized },
      }),
    );
    assert.equal(oversizedResponse.status, 413);

    const admin = createAnalyticsAdminMock();
    mock.method(analyticsTrackRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    const validResponse = await analyticsTrackPost(
      jsonRequest("https://example.com/api/analytics/track", "POST", {
        storeId,
        eventName: "page_view",
        visitorId: "visitor-clear",
        sessionId: "session-clear",
        pagePath: "/shop?utm_source=facebook",
      }),
    );

    assert.equal(validResponse.status, 200);
    assert.equal(admin.insertedEvents.length, 1);
    assert.notEqual(admin.insertedEvents[0]?.visitor_id, "visitor-clear");
    assert.notEqual(admin.insertedEvents[0]?.session_id, "session-clear");
    assert.equal(admin.insertedEvents[0]?.traffic_source, "facebook");
    assert.equal(admin.storeSelectCount, 0);
  });

  test("accepts batched analytics payloads in one insert", async () => {
    const admin = createAnalyticsAdminMock();
    mock.method(analyticsTrackRouteDeps, "rateLimit", () => ({ success: true }));
    mock.method(analyticsTrackRouteDeps, "getSupabaseAdminClient", () => admin.client as never);

    const response = await analyticsTrackPost(
      jsonRequest("https://example.com/api/analytics/track", "POST", {
        events: [
          {
            storeId,
            eventName: "page_view",
            visitorId: "visitor-1",
            sessionId: "session-1",
            pagePath: "/shop",
          },
          {
            storeId,
            eventName: "view_item",
            visitorId: "visitor-1",
            sessionId: "session-1",
            productId,
            pagePath: "/product/demo",
          },
        ],
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(admin.insertedEvents.length, 2);
    assert.equal(admin.storeSelectCount, 0);
  });
});

describe("domain route side effects", () => {
  test("blocks cross-store custom-domain claims before Cloudflare or store updates", async () => {
    const admin = createDomainAdminMock({ existingDomainStoreId: "other_store" });

    process.env.CLOUDFLARE_ZONE_ID = "zone_123";
    process.env.CLOUDFLARE_API_TOKEN = "cloudflare-token";

    mock.method(domainRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(domainRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(domainRouteDeps, "canManageStore", async () => true);
    const cloudflareMock = mock.method(domainRouteDeps, "createCloudflareCustomHostname", async () => {
      throw new Error("should not call cloudflare");
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
    assert.equal(cloudflareMock.mock.callCount(), 0);
    assert.equal(admin.domainUpserts.length, 0);
  });

  test("allows owner/admin domain claims and writes one Cloudflare-backed store domain", async () => {
    const admin = createDomainAdminMock();

    process.env.CLOUDFLARE_ZONE_ID = "zone_123";
    process.env.CLOUDFLARE_API_TOKEN = "cloudflare-token";
    process.env.CUSTOM_DOMAIN_CNAME_TARGET = "customers.ezcomo.shop";

    mock.method(domainRouteDeps, "getAuthenticatedUser", async () => ({ id: "admin_1" }) as never);
    mock.method(domainRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(domainRouteDeps, "canManageStore", async () => true);
    mock.method(domainRouteDeps, "createCloudflareCustomHostname", async (hostname: string) => ({
      id: "cfh_123",
      hostname,
      status: "pending",
      ssl: { status: "pending" },
    }) as never);

    const response = await domainsPost(
      jsonRequest("https://example.com/api/domains", "POST", {
        storeId: "store_1",
        domain: " HTTPS://www.Example.com/path ",
      }),
    );

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.primaryHostname, "www.example.com");
    assert.deepEqual(
      admin.domainUpserts.map((entry) => entry.hostname),
      ["www.example.com"],
    );
    assert.equal(admin.domainUpserts[0].cloudflare_hostname_id, "cfh_123");
    assert.deepEqual(admin.domainUpserts[0].dns_records, [
      {
        type: "CNAME",
        name: "www",
        value: "customers.ezcomo.shop",
        purpose: "routing",
      },
    ]);
  });

  test("rejects apex custom domains before Cloudflare provisioning", async () => {
    const admin = createDomainAdminMock();

    mock.method(domainRouteDeps, "getAuthenticatedUser", async () => ({ id: "admin_1" }) as never);
    mock.method(domainRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(domainRouteDeps, "canManageStore", async () => true);
    const cloudflareMock = mock.method(domainRouteDeps, "createCloudflareCustomHostname", async () => {
      throw new Error("should not call cloudflare");
    });

    const response = await domainsPost(
      jsonRequest("https://example.com/api/domains", "POST", {
        storeId: "store_1",
        domain: "example.com",
      }),
    );

    assert.equal(response.status, 500);
    const body = await response.json();
    assert.match(body.error, /Apex domains/);
    assert.equal(cloudflareMock.mock.callCount(), 0);
  });

  test("removes the exact Cloudflare custom hostname on successful removal", async () => {
    const admin = createDomainAdminMock();

    mock.method(domainRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(domainRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(domainRouteDeps, "canManageStore", async () => true);
    mock.method(domainRouteDeps, "createCloudflareCustomHostname", async (hostname: string) => ({
      id: "cfh_123",
      hostname,
      status: "pending",
      ssl: { status: "pending" },
    }) as never);
    const deleteMock = mock.method(domainRouteDeps, "deleteCloudflareCustomHostname", async () => undefined as never);

    await domainsPost(
      jsonRequest("https://example.com/api/domains", "POST", {
        storeId: "store_1",
        domain: "www.example.com",
      }),
    );

    const response = await domainsDelete(
      new Request("https://example.com/api/domains?storeId=store_1&domain=www.example.com", {
        method: "DELETE",
      }),
    );

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.success, true);
    assert.equal(body.domainAccess.allowed, true);
    assert.equal(deleteMock.mock.callCount(), 1);
    assert.equal(deleteMock.mock.calls[0].arguments[0], "cfh_123");
    assert.deepEqual(admin.deletedDomains, [
      {
        storeId: "store_1",
        hostnames: ["www.example.com"],
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

  test("uses the secure platform CMS bKash connection before env fallback", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://commerce.example.com";

    const admin = createBkashCallbackAdminMock(
      {
        id: "invoice_1",
        store_id: "store_1",
        plan_id: "growth",
        amount: 999,
      },
      {
        platformConnection: {
          id: "platform_connection_1",
          provider: "bkash",
          status: "connected",
          public_metadata: { environment: "live", is_live: true },
          secret_payload: {
            app_key: "secure-app-key",
            app_secret: "secure-app-secret",
            username: "secure-user",
            password: "secure-password",
          },
          created_at: FIXED_NOW.toISOString(),
          updated_at: FIXED_NOW.toISOString(),
          revoked_at: null,
        },
      },
    );

    mock.method(billingBkashCallbackRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(billingBkashCallbackRouteDeps, "now", () => FIXED_NOW);
    const fetchMock = mock.method(
      billingBkashCallbackRouteDeps,
      "fetch",
      async (_url: string | URL, init?: RequestInit) => {
        const headers = init?.headers as Record<string, string>;
        if (String(_url).includes("/token/grant")) {
          assert.equal(headers.username, "secure-user");
          assert.equal(headers.password, "secure-password");
          return {
            json: async () => ({ statusCode: "0000", id_token: "token_123" }),
          } as never;
        }

        assert.equal(headers["X-APP-Key"], "secure-app-key");
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

    assert.equal(response.status, 307);
    assert.equal(
      response.headers.get("location"),
      "https://commerce.example.com/admin/billing?payment=success",
    );
    assert.equal(fetchMock.mock.callCount(), 2);
  });

  test("forces CMS billing onto the saved global test-mode base URL when enabled", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://commerce.example.com";

    const admin = createBkashCallbackAdminMock(
      {
        id: "invoice_1",
        store_id: "store_1",
        plan_id: "growth",
        amount: 999,
      },
      {
        platformConnection: {
          id: "platform_connection_1",
          provider: "bkash",
          status: "connected",
          public_metadata: {
            environment: "live",
            is_live: true,
            force_test_mode: true,
            base_url: "https://sandbox.example.test/v1.2.0-beta",
          },
          secret_payload: {
            app_key: "secure-app-key",
            app_secret: "secure-app-secret",
            username: "secure-user",
            password: "secure-password",
          },
          created_at: FIXED_NOW.toISOString(),
          updated_at: FIXED_NOW.toISOString(),
          revoked_at: null,
        },
      },
    );

    mock.method(billingBkashCallbackRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(billingBkashCallbackRouteDeps, "now", () => FIXED_NOW);
    const urls: string[] = [];
    const fetchMock = mock.method(
      billingBkashCallbackRouteDeps,
      "fetch",
      async (url: string | URL, init?: RequestInit) => {
        urls.push(String(url));
        const headers = init?.headers as Record<string, string>;
        if (String(url).includes("/token/grant")) {
          assert.equal(headers.username, "secure-user");
          assert.equal(headers.password, "secure-password");
          return {
            json: async () => ({ statusCode: "0000", id_token: "token_123" }),
          } as never;
        }

        assert.equal(headers["X-APP-Key"], "secure-app-key");
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

    assert.equal(response.status, 307);
    assert.equal(
      response.headers.get("location"),
      "https://commerce.example.com/admin/billing?payment=success",
    );
    assert.equal(fetchMock.mock.callCount(), 2);
    assert.deepEqual(urls, [
      "https://sandbox.example.test/v1.2.0-beta/tokenized/checkout/token/grant",
      "https://sandbox.example.test/v1.2.0-beta/tokenized/checkout/execute",
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

describe("notification test send side effects", () => {
  test("sends a customer receipt test through the server-side notification path", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    const admin = createNotificationAdminMock();

    mock.method(notificationTestRouteDeps, "getAuthenticatedUser", async () => ({
      id: "owner_1",
      email: "merchant@example.com",
    }) as never);
    mock.method(notificationTestRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(notificationTestRouteDeps, "canManageStore", async () => true);
    const fetchMock = mock.method(notificationTestRouteDeps, "fetch", async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      assert.equal(body.templateName, "test-customer-receipt");
      assert.equal(body.customer_email, "buyer@example.com");
      assert.equal(body.store_id, "store_1");
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });

    const response = (await notificationTestPost(
      jsonRequest("https://example.com/api/notifications/test", "POST", {
        storeId: "store_1",
        templateName: "test-customer-receipt",
        recipient: "buyer@example.com",
        channel: "email",
      }),
    ))!;

    assert.equal(response.status, 200);
    assert.equal(fetchMock.mock.callCount(), 1);
    assert.deepEqual(await response.json(), {
      success: true,
      recipient: "buyer@example.com",
      templateName: "test-customer-receipt",
      channel: "email",
      message: "Test notification queued",
    });
  });

  test("sends a merchant alert test through the server-side notification path", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    const admin = createNotificationAdminMock();

    mock.method(notificationTestRouteDeps, "getAuthenticatedUser", async () => ({
      id: "owner_1",
      email: "merchant@example.com",
    }) as never);
    mock.method(notificationTestRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(notificationTestRouteDeps, "canManageStore", async () => true);
    const fetchMock = mock.method(notificationTestRouteDeps, "fetch", async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      assert.equal(body.templateName, "merchant-order-alert");
      assert.equal(body.customer_email, "alerts@example.com");
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });

    const response = (await notificationTestPost(
      jsonRequest("https://example.com/api/notifications/test", "POST", {
        storeId: "store_1",
        templateName: "merchant-order-alert",
        recipient: "alerts@example.com",
        channel: "email",
      }),
    ))!;

    assert.equal(response.status, 200);
    assert.equal(fetchMock.mock.callCount(), 1);
  });
});

describe("notification retry side effects", () => {
  test("replays due retry rows through the server-side notification path", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    const admin = createNotificationAdminMock();

    mock.method(notificationRetryRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(notificationRetryRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(notificationRetryRouteDeps, "canManageStore", async () => true);
    const fetchMock = mock.method(notificationRetryRouteDeps, "fetch", async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      assert.equal(body.existingEventId, "event_retry_1");
      assert.equal(body.retryCount, 2);
      assert.equal(body.templateName, "merchant-order-alert");
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });

    const response = (await notificationRetryPost(
      jsonRequest("https://example.com/api/notifications/retry", "POST", {
        storeId: "store_1",
        action: "run_due",
      }),
    ))!;

    assert.equal(response.status, 200);
    assert.equal(fetchMock.mock.callCount(), 1);
    assert.deepEqual(await response.json(), {
      success: true,
      retried: 1,
      failed: 0,
    });
  });

  test("records operator escalation on a failed notification", async () => {
    const admin = createNotificationAdminMock();

    mock.method(notificationRetryRouteDeps, "getAuthenticatedUser", async () => ({ id: "owner_1" }) as never);
    mock.method(notificationRetryRouteDeps, "getSupabaseAdminClient", () => admin.client as never);
    mock.method(notificationRetryRouteDeps, "canManageStore", async () => true);

    const response = (await notificationRetryPost(
      jsonRequest("https://example.com/api/notifications/retry", "POST", {
        storeId: "store_1",
        action: "escalate",
        eventId: "event_retry_1",
        reason: "Please review before launch.",
      }),
    ))!;

    assert.equal(response.status, 200);
    assert.equal(admin.escalations.length, 1);
    assert.equal(admin.escalations[0]?.payload.operator_escalation_reason, "Please review before launch.");
    assert.deepEqual(await response.json(), { success: true, action: "escalated" });
  });
});

describe("notification queue processor side effects", () => {
  test("claims queued notification rows and dispatches them through the server-side delivery path", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    const admin = createNotificationAdminMock();

    const originalAdminClient = notificationDeliveryQueueDeps.getSupabaseAdminClient;
    const originalFetch = notificationDeliveryQueueDeps.fetch;

    mock.method(notificationProcessQueueRouteDeps, "getSecret", () => "processor-secret");
    notificationDeliveryQueueDeps.getSupabaseAdminClient = () => admin.client as never;
    notificationDeliveryQueueDeps.fetch = (async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      assert.equal(body.existingEventId, "event_retry_1");
      assert.equal(body.retryCount, 2);
      assert.equal(body.templateName, "merchant-order-alert");
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as typeof notificationDeliveryQueueDeps.fetch;

    try {
      const response = await notificationProcessQueuePost(
        new Request("https://example.com/api/notifications/process-queue", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-notification-queue-secret": "processor-secret",
          },
          body: JSON.stringify({ limit: 10 }),
        }),
      );

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        success: true,
        claimed: 1,
        dispatched: 1,
        failed: 0,
      });
    } finally {
      notificationDeliveryQueueDeps.getSupabaseAdminClient = originalAdminClient;
      notificationDeliveryQueueDeps.fetch = originalFetch;
    }
  });
});

describe("cart recovery queue processor side effects", () => {
  test("claims queued recovery rows and sends recovery emails through the server-side delivery path", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    const admin = createNotificationAdminMock();

    const originalAdminClient = recoveryMessageProcessorDeps.getSupabaseAdminClient;
    const originalFetch = notificationDeliveryQueueDeps.fetch;

    mock.method(cartRecoveryProcessQueueRouteDeps, "getSecret", () => "recovery-secret");
    recoveryMessageProcessorDeps.getSupabaseAdminClient = () => admin.client as never;
    notificationDeliveryQueueDeps.fetch = (async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      assert.equal(body.templateName, "cart-recovery");
      assert.equal(body.customer_email, "buyer@example.com");
      assert.equal(body.couponCode, "RECOVER-123");
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as typeof notificationDeliveryQueueDeps.fetch;

    try {
      const response = await cartRecoveryProcessQueuePost(
        new Request("https://example.com/api/cart-recovery/process-queue", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-cart-recovery-queue-secret": "recovery-secret",
          },
          body: JSON.stringify({ limit: 10 }),
        }),
      );

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        success: true,
        claimed: 1,
        dispatched: 1,
        skipped: 0,
        failed: 0,
      });
      assert.equal(admin.recoveryMessageUpdates.length, 1);
      assert.equal(admin.recoveryMessageUpdates[0]?.payload.status, "sent");
    } finally {
      recoveryMessageProcessorDeps.getSupabaseAdminClient = originalAdminClient;
      notificationDeliveryQueueDeps.fetch = originalFetch;
    }
  });
});

describe("platform audit logger", () => {
  test("normalizes super_admin into the persisted app_role-compatible actor role", async () => {
    const inserts: Array<Record<string, unknown>> = [];
    const client = {
      from(table: string) {
        if (table !== "platform_audit_logs") {
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          insert(payload: Record<string, unknown>) {
            inserts.push(payload);
            return Promise.resolve({ error: null });
          },
        };
      },
    };

    await logPlatformAuditAction(client as never, {
      actorId: "admin_1",
      actorEmail: "admin@example.com",
      actorRole: "super_admin",
      action: "approve_invoice",
      targetType: "invoice",
      targetId: "invoice_1",
    });

    assert.equal(inserts.length, 1);
    assert.equal(inserts[0]?.actor_role, "admin");
    assert.deepEqual(inserts[0]?.details, {
      actor_role_source: "super_admin",
    });
  });
});
