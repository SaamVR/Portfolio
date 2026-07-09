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
  PATCH as orderStatusPatch,
  orderStatusRouteDeps,
} from "@/app/api/orders/status/route";
import {
  POST as billingWebhookPost,
  billingWebhookRouteDeps,
} from "@/app/api/billing/webhook/route";

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
        planId: "starter",
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
        planId: "starter",
      }),
    );

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
    assert.equal(canManageStoreMock.mock.callCount(), 1);
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

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
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
