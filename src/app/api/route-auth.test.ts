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
  PATCH as orderStatusPatch,
  orderStatusRouteDeps,
} from "@/app/api/orders/status/route";
import {
  POST as billingWebhookPost,
  billingWebhookRouteDeps,
} from "@/app/api/billing/webhook/route";
import {
  POST as deleteStorePost,
  deleteStoreRouteDeps,
} from "@/app/api/stores/delete/route";
import {
  GET as courierConnectionsGet,
  POST as courierConnectionsPost,
  courierConnectionsRouteDeps,
} from "@/app/api/couriers/connections/route";
import {
  GET as courierShipmentsGet,
  courierShipmentsRouteDeps,
} from "@/app/api/couriers/shipments/route";
import {
  POST as courierBookPost,
  courierBookingRouteDeps,
} from "@/app/api/couriers/book/route";
import {
  GET as bkashConnectionGet,
  PUT as bkashConnectionPut,
  bkashPaymentConnectionRouteDeps,
} from "@/app/api/payment-connections/bkash/route";
import {
  GET as platformBkashConnectionGet,
  PUT as platformBkashConnectionPut,
  platformBkashPaymentConnectionRouteDeps,
} from "@/app/api/platform/payment-connections/bkash/route";
import {
  GET as notificationPreviewGet,
  POST as notificationTestPost,
  notificationTestRouteDeps,
} from "@/app/api/notifications/test/route";
import {
  POST as notificationRetryPost,
  notificationRetryRouteDeps,
} from "@/app/api/notifications/retry/route";

afterEach(() => {
  mock.restoreAll();
  delete process.env.BILLING_WEBHOOK_SECRET;
});

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

describe("billing checkout route authorization", () => {
  test("rejects unauthenticated checkout requests before creating a service-role client", async () => {
    mock.method(billingCheckoutRouteDeps, "rateLimit", () => ({ success: true }));
    mock.method(billingCheckoutRouteDeps, "getAuthenticatedUser", async () => null);
    const adminClientMock = mock.method(billingCheckoutRouteDeps, "getSupabaseAdminClient", () => {
      throw new Error("should not create admin client");
    });

    const response = await checkoutPost(
      jsonRequest("https://example.com/api/billing/checkout", "POST", {
        storeId: "store_1",
        planId: "plan_1",
      }),
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
    assert.equal(adminClientMock.mock.callCount(), 0);
  });

  test("rejects authenticated non-managers from initializing checkout", async () => {
    mock.method(billingCheckoutRouteDeps, "rateLimit", () => ({ success: true }));
    mock.method(billingCheckoutRouteDeps, "getAuthenticatedUser", async () => ({ id: "viewer_1" }) as never);
    mock.method(billingCheckoutRouteDeps, "getSupabaseAdminClient", () => ({} as never));
    const canManageStoreMock = mock.method(
      billingCheckoutRouteDeps,
      "canManageStore",
      async () => false,
    );
    const fetchMock = mock.method(billingCheckoutRouteDeps, "fetch", async () => {
      throw new Error("should not hit bKash");
    });

    const response = await checkoutPost(
      jsonRequest("https://example.com/api/billing/checkout", "POST", {
        storeId: "store_1",
        planId: "plan_1",
      }),
    );

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
    assert.equal(canManageStoreMock.mock.callCount(), 1);
    assert.equal(fetchMock.mock.callCount(), 0);
  });
});

describe("billing subscription route authorization", () => {
  test("rejects unauthenticated subscription mutations", async () => {
    mock.method(billingSubscriptionRouteDeps, "getAuthenticatedUser", async () => null);
    const adminClientMock = mock.method(
      billingSubscriptionRouteDeps,
      "getSupabaseAdminClient",
      () => {
        throw new Error("should not create admin client");
      },
    );

    const response = await subscriptionPatch(
      jsonRequest("https://example.com/api/billing/subscription", "PATCH", {
        storeId: "store_1",
        planId: "basic",
      }),
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
    assert.equal(adminClientMock.mock.callCount(), 0);
  });

  test("rejects authenticated users without owner/admin access", async () => {
    mock.method(billingSubscriptionRouteDeps, "getAuthenticatedUser", async () => ({ id: "viewer_1" }) as never);
    mock.method(billingSubscriptionRouteDeps, "getSupabaseAdminClient", () => ({} as never));
    const canManageStoreMock = mock.method(
      billingSubscriptionRouteDeps,
      "canManageStore",
      async () => false,
    );

    const response = await subscriptionPatch(
      jsonRequest("https://example.com/api/billing/subscription", "PATCH", {
        storeId: "store_1",
        planId: "basic",
      }),
    );

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
    assert.equal(canManageStoreMock.mock.callCount(), 1);
  });
});

describe("manual billing invoice route authorization", () => {
  test("rejects unauthenticated manual invoice submissions before creating a service-role client", async () => {
    mock.method(billingManualInvoiceRouteDeps, "getAuthenticatedUser", async () => null);
    const adminClientMock = mock.method(
      billingManualInvoiceRouteDeps,
      "getSupabaseAdminClient",
      () => {
        throw new Error("should not create admin client");
      },
    );

    const response = await billingManualInvoicePost(
      jsonRequest("https://example.com/api/billing/manual-invoice", "POST", {
        storeId: "store_1",
        planId: "plan_1",
        transactionId: "trx_1",
      }),
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
    assert.equal(adminClientMock.mock.callCount(), 0);
  });

  test("rejects authenticated users without owner/admin access from submitting manual invoices", async () => {
    mock.method(billingManualInvoiceRouteDeps, "getAuthenticatedUser", async () => ({ id: "viewer_1" }) as never);
    mock.method(billingManualInvoiceRouteDeps, "getSupabaseAdminClient", () => ({} as never));
    const canManageStoreMock = mock.method(
      billingManualInvoiceRouteDeps,
      "canManageStore",
      async () => false,
    );

    const response = await billingManualInvoicePost(
      jsonRequest("https://example.com/api/billing/manual-invoice", "POST", {
        storeId: "store_1",
        planId: "plan_1",
        transactionId: "TRX1",
      }),
    );

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
    assert.equal(canManageStoreMock.mock.callCount(), 1);
    assert.equal(canManageStoreMock.mock.calls[0]?.arguments[1], "store_1");
    assert.equal(canManageStoreMock.mock.calls[0]?.arguments[2], "viewer_1");
    assert.deepEqual(canManageStoreMock.mock.calls[0]?.arguments[3], ["owner", "admin"]);
  });
});

describe("domain management route authorization", () => {
  test("rejects unauthenticated custom-domain claims", async () => {
    mock.method(domainRouteDeps, "getAuthenticatedUser", async () => null);
    const adminClientMock = mock.method(domainRouteDeps, "getSupabaseAdminClient", () => {
      throw new Error("should not create admin client");
    });
    const fetchMock = mock.method(domainRouteDeps, "fetch", async () => {
      throw new Error("should not call Vercel");
    });

    const response = await domainsPost(
      jsonRequest("https://example.com/api/domains", "POST", {
        storeId: "store_1",
        domain: "shop.example.com",
      }),
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
    assert.equal(adminClientMock.mock.callCount(), 0);
    assert.equal(fetchMock.mock.callCount(), 0);
  });

  test("rejects authenticated users without owner/admin access from deleting domains", async () => {
    mock.method(domainRouteDeps, "getAuthenticatedUser", async () => ({ id: "viewer_1" }) as never);
    mock.method(domainRouteDeps, "getSupabaseAdminClient", () => ({} as never));
    const canManageStoreMock = mock.method(domainRouteDeps, "canManageStore", async () => false);
    const fetchMock = mock.method(domainRouteDeps, "fetch", async () => {
      throw new Error("should not call Vercel");
    });

    const response = await domainsDelete(
      new Request("https://example.com/api/domains?storeId=store_1&domain=shop.example.com", {
        method: "DELETE",
      }),
    );

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
    assert.equal(canManageStoreMock.mock.callCount(), 1);
    assert.equal(fetchMock.mock.callCount(), 0);
  });
});

describe("order status route authorization", () => {
  test("rejects unauthenticated order status updates", async () => {
    mock.method(orderStatusRouteDeps, "getAuthenticatedUser", async () => null);
    const adminClientMock = mock.method(orderStatusRouteDeps, "getSupabaseAdminClient", () => {
      throw new Error("should not create admin client");
    });

    const response = await orderStatusPatch(
      jsonRequest("https://example.com/api/orders/status", "PATCH", {
        orderId: "order_1",
        storeId: "store_1",
        status: "confirmed",
      }),
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
    assert.equal(adminClientMock.mock.callCount(), 0);
  });

  test("rejects authenticated users without order-management access", async () => {
    mock.method(orderStatusRouteDeps, "getAuthenticatedUser", async () => ({ id: "viewer_1" }) as never);
    mock.method(orderStatusRouteDeps, "getSupabaseAdminClient", () => ({} as never));
    const canManageStoreMock = mock.method(orderStatusRouteDeps, "canManageStore", async () => false);

    const response = await orderStatusPatch(
      jsonRequest("https://example.com/api/orders/status", "PATCH", {
        orderId: "order_1",
        storeId: "store_1",
        status: "confirmed",
      }),
    );

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
    assert.equal(canManageStoreMock.mock.callCount(), 1);
  });
});

describe("billing webhook authorization", () => {
  test("rejects webhook calls without the shared secret before touching billing data", async () => {
    process.env.BILLING_WEBHOOK_SECRET = "expected-secret";
    const adminClientMock = mock.method(billingWebhookRouteDeps, "getSupabaseAdminClient", () => {
      throw new Error("should not create admin client");
    });

    const response = await billingWebhookPost(
      jsonRequest("https://example.com/api/billing/webhook", "POST", {
        type: "payment.success",
        data: { invoice_id: "invoice_1" },
      }),
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
    assert.equal(adminClientMock.mock.callCount(), 0);
  });
});

describe("store deletion route authorization", () => {
  test("rejects unauthenticated store deletion requests", async () => {
    mock.method(deleteStoreRouteDeps, "getAuthenticatedUser", async () => null);
    const adminClientMock = mock.method(deleteStoreRouteDeps, "getSupabaseAdminClient", () => {
      throw new Error("should not create admin client");
    });

    const response = await deleteStorePost(
      jsonRequest("https://example.com/api/stores/delete", "POST", {
        storeId: "store_1",
      }),
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
    assert.equal(adminClientMock.mock.callCount(), 0);
  });

  test("rejects authenticated users without owner or admin access", async () => {
    mock.method(deleteStoreRouteDeps, "getAuthenticatedUser", async () => ({ id: "viewer_1" }) as never);
    mock.method(deleteStoreRouteDeps, "getSupabaseAdminClient", () => ({} as never));
    const canManageStoreMock = mock.method(deleteStoreRouteDeps, "canManageStore", async () => false);

    const response = await deleteStorePost(
      jsonRequest("https://example.com/api/stores/delete", "POST", {
        storeId: "store_1",
      }),
    );

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
    assert.equal(canManageStoreMock.mock.callCount(), 1);
  });
});

describe("courier connections route authorization", () => {
  test("rejects unauthenticated courier connection reads before creating a service-role client", async () => {
    mock.method(courierConnectionsRouteDeps, "getAuthenticatedUser", async () => null);
    const adminClientMock = mock.method(courierConnectionsRouteDeps, "getSupabaseAdminClient", () => {
      throw new Error("should not create admin client");
    });

    const response = (await courierConnectionsGet(
      new Request("https://example.com/api/couriers/connections?storeId=store_1"),
    ))!;

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
    assert.equal(adminClientMock.mock.callCount(), 0);
  });

  test("rejects authenticated users without courier-management access from saving connections", async () => {
    mock.method(courierConnectionsRouteDeps, "getAuthenticatedUser", async () => ({ id: "viewer_1" }) as never);
    mock.method(courierConnectionsRouteDeps, "getSupabaseAdminClient", () => ({} as never));
    const canManageStoreMock = mock.method(courierConnectionsRouteDeps, "canManageStore", async () => false);

    const response = (await courierConnectionsPost(
      jsonRequest("https://example.com/api/couriers/connections", "POST", {
        storeId: "store_1",
        provider: "pathao",
        displayName: "Pathao Viewer Test",
      }),
    ))!;

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
    assert.equal(canManageStoreMock.mock.callCount(), 1);
  });
});

describe("merchant bKash payment connection route authorization", () => {
  test("rejects unauthenticated payment connection reads before creating a service-role client", async () => {
    mock.method(bkashPaymentConnectionRouteDeps, "getAuthenticatedUser", async () => null);
    const adminClientMock = mock.method(bkashPaymentConnectionRouteDeps, "getSupabaseAdminClient", () => {
      throw new Error("should not create admin client");
    });

    const response = (await bkashConnectionGet(
      new Request("https://example.com/api/payment-connections/bkash?storeId=store_1"),
    ))!;

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
    assert.equal(adminClientMock.mock.callCount(), 0);
  });

  test("rejects authenticated users without owner/admin access from saving payment secrets", async () => {
    mock.method(bkashPaymentConnectionRouteDeps, "getAuthenticatedUser", async () => ({ id: "viewer_1" }) as never);
    mock.method(bkashPaymentConnectionRouteDeps, "getSupabaseAdminClient", () => ({} as never));
    const canManageStoreMock = mock.method(bkashPaymentConnectionRouteDeps, "canManageStore", async () => false);

    const response = (await bkashConnectionPut(
      jsonRequest("https://example.com/api/payment-connections/bkash", "PUT", {
        storeId: "store_1",
        settings: {
          appKey: "app-key",
          appSecret: "secret",
          username: "merchant",
          password: "password",
        },
      }),
    ))!;

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
    assert.equal(canManageStoreMock.mock.callCount(), 1);
  });
});

describe("platform CMS bKash payment connection route authorization", () => {
  test("rejects unauthenticated CMS payment connection reads before creating a service-role client", async () => {
    mock.method(platformBkashPaymentConnectionRouteDeps, "getAuthenticatedUser", async () => null);
    const adminClientMock = mock.method(platformBkashPaymentConnectionRouteDeps, "getSupabaseAdminClient", () => {
      throw new Error("should not create admin client");
    });

    const response = (await platformBkashConnectionGet(
      new Request("https://example.com/api/platform/payment-connections/bkash"),
    ))!;

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
    assert.equal(adminClientMock.mock.callCount(), 0);
  });

  test("rejects authenticated users without platform billing roles from saving CMS payment secrets", async () => {
    mock.method(platformBkashPaymentConnectionRouteDeps, "getAuthenticatedUser", async () => ({
      id: "viewer_1",
    }) as never);
    mock.method(platformBkashPaymentConnectionRouteDeps, "getSupabaseAdminClient", () => ({
      from(table: string) {
        assert.equal(table, "user_roles");
        return {
          select() {
            return {
              eq() {
                return {
                  in() {
                    return {
                      order: async () => ({
                        data: [],
                        error: null,
                      }),
                    };
                  },
                };
              },
            };
          },
        };
      },
    }) as never);

    const response = (await platformBkashConnectionPut(
      jsonRequest("https://example.com/api/platform/payment-connections/bkash", "PUT", {
        settings: {
          appKey: "app-key",
          appSecret: "secret",
          username: "platform-user",
          password: "platform-password",
        },
      }),
    ))!;

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
  });
});

describe("courier shipments route authorization", () => {
  test("rejects unauthenticated shipment reads before creating a service-role client", async () => {
    mock.method(courierShipmentsRouteDeps, "getAuthenticatedUser", async () => null);
    const adminClientMock = mock.method(courierShipmentsRouteDeps, "getSupabaseAdminClient", () => {
      throw new Error("should not create admin client");
    });

    const response = (await courierShipmentsGet(
      new Request("https://example.com/api/couriers/shipments?storeId=store_1"),
    ))!;

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
    assert.equal(adminClientMock.mock.callCount(), 0);
  });

  test("rejects authenticated non-managers from reading shipment activity", async () => {
    mock.method(courierShipmentsRouteDeps, "getAuthenticatedUser", async () => ({ id: "viewer_1" }) as never);
    mock.method(courierShipmentsRouteDeps, "getSupabaseAdminClient", () => ({} as never));
    const canManageStoreMock = mock.method(courierShipmentsRouteDeps, "canManageStore", async () => false);

    const response = (await courierShipmentsGet(
      new Request("https://example.com/api/couriers/shipments?storeId=store_1"),
    ))!;

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
    assert.equal(canManageStoreMock.mock.callCount(), 1);
  });
});

describe("courier booking route authorization", () => {
  test("rejects unauthenticated courier bookings before creating a service-role client", async () => {
    mock.method(courierBookingRouteDeps, "getAuthenticatedUser", async () => null);
    const adminClientMock = mock.method(courierBookingRouteDeps, "getSupabaseAdminClient", () => {
      throw new Error("should not create admin client");
    });

    const response = (await courierBookPost(
      jsonRequest("https://example.com/api/couriers/book", "POST", {
        storeId: "store_1",
        orderId: "order_1",
        connectionId: "connection_1",
      }),
    ))!;

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
    assert.equal(adminClientMock.mock.callCount(), 0);
  });

  test("rejects authenticated users without order-management access from booking couriers", async () => {
    mock.method(courierBookingRouteDeps, "getAuthenticatedUser", async () => ({ id: "viewer_1" }) as never);
    mock.method(courierBookingRouteDeps, "getSupabaseAdminClient", () => ({} as never));
    const canManageStoreMock = mock.method(courierBookingRouteDeps, "canManageStore", async () => false);

    const response = (await courierBookPost(
      jsonRequest("https://example.com/api/couriers/book", "POST", {
        storeId: "store_1",
        orderId: "order_1",
        connectionId: "connection_1",
      }),
    ))!;

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
    assert.equal(canManageStoreMock.mock.callCount(), 1);
  });
});

describe("notification preview and test route authorization", () => {
  test("rejects unauthenticated notification preview requests", async () => {
    mock.method(notificationTestRouteDeps, "getAuthenticatedUser", async () => null);
    const adminClientMock = mock.method(notificationTestRouteDeps, "getSupabaseAdminClient", () => {
      throw new Error("should not create admin client");
    });

    const response = (await notificationPreviewGet(
      new Request("https://example.com/api/notifications/test?storeId=store_1"),
    ))!;

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
    assert.equal(adminClientMock.mock.callCount(), 0);
  });

  test("rejects authenticated users without store access from sending notification tests", async () => {
    mock.method(notificationTestRouteDeps, "getAuthenticatedUser", async () => ({ id: "viewer_1" }) as never);
    mock.method(notificationTestRouteDeps, "getSupabaseAdminClient", () => ({} as never));
    const canManageStoreMock = mock.method(notificationTestRouteDeps, "canManageStore", async () => false);
    const fetchMock = mock.method(notificationTestRouteDeps, "fetch", async () => {
      throw new Error("should not hit send-email");
    });

    const response = (await notificationTestPost(
      jsonRequest("https://example.com/api/notifications/test", "POST", {
        storeId: "store_1",
        templateName: "merchant-order-alert",
      }),
    ))!;

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
    assert.equal(canManageStoreMock.mock.callCount(), 1);
    assert.equal(fetchMock.mock.callCount(), 0);
  });
});

describe("notification retry route authorization", () => {
  test("rejects unauthenticated retry requests", async () => {
    mock.method(notificationRetryRouteDeps, "getAuthenticatedUser", async () => null);
    const adminClientMock = mock.method(notificationRetryRouteDeps, "getSupabaseAdminClient", () => {
      throw new Error("should not create admin client");
    });

    const response = (await notificationRetryPost(
      jsonRequest("https://example.com/api/notifications/retry", "POST", {
        storeId: "store_1",
        action: "run_due",
      }),
    ))!;

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
    assert.equal(adminClientMock.mock.callCount(), 0);
  });

  test("rejects authenticated users without store access from processing retries", async () => {
    mock.method(notificationRetryRouteDeps, "getAuthenticatedUser", async () => ({ id: "viewer_1" }) as never);
    mock.method(notificationRetryRouteDeps, "getSupabaseAdminClient", () => ({} as never));
    const canManageStoreMock = mock.method(notificationRetryRouteDeps, "canManageStore", async () => false);

    const response = (await notificationRetryPost(
      jsonRequest("https://example.com/api/notifications/retry", "POST", {
        storeId: "store_1",
        action: "run_due",
      }),
    ))!;

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
    assert.equal(canManageStoreMock.mock.callCount(), 1);
  });
});
