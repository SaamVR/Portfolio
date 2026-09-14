import test, { afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { POST, orderCreateRouteDeps } from "@/app/api/orders/create/route";

const storeId = "10000000-0000-4000-8000-000000000001";
const orderId = "10000000-0000-4000-8000-000000000002";
const productId = "10000000-0000-4000-8000-000000000003";

function buildRequest(paymentMethod = "cod", deliveryFee = 80, deliveryLocation = "primary") {
  return new Request("https://example.com/api/orders/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      storeId,
      idempotencyKey: "checkout-attempt-123",
      items: [{ productId, size: "M", quantity: 1 }],
      deliveryFee,
      deliveryLocation,
      discountAmount: 0,
      customerName: "Test Customer",
      customerPhone: "01700000000",
      customerEmail: null,
      shippingAddress: "123 Test Road",
      shippingCity: "Dhaka",
      paymentMethod,
      notes: "Checkout recovery test",
      couponCode: null,
    }),
  });
}

function createAdminMock(options?: {
  replayed?: boolean;
  persistedPaymentMethod?: string;
  rpcError?: { message: string } | null;
  storefrontProfile?: Record<string, unknown> | null;
}) {
  const replayed = options?.replayed ?? true;
  const persistedPaymentMethod = options?.persistedPaymentMethod ?? "cod";

  return {
    rpc: async (name: string) => {
      assert.equal(name, "create_store_order_with_stock_v2");
      if (options?.rpcError) {
        return { data: null, error: options.rpcError };
      }
      return {
        data: [{
          id: orderId,
          order_number: "ORD-RECOVERY-1",
          subtotal: 1000,
          delivery_fee: 80,
          total: 1080,
          payment_method: persistedPaymentMethod,
          status: "pending",
          replayed,
        }],
        error: null,
      };
    },
    from(table: string) {
      if (table === "stores") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data: { name: "Recovery Store", is_published: true },
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
                  eq(_column: string, key: string) {
                    return {
                      maybeSingle: async () => ({
                        data: key === "storefront_profile" && options?.storefrontProfile !== undefined
                          ? { value: options.storefrontProfile }
                          : null,
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

      if (table === "products") {
        return {
          select() {
            return {
              eq() {
                return {
                  in: async () => ({
                    data: [{ id: productId, price: 1000, type: "T-Shirt", sizes: ["M"], colors: [], metric_values: {} }],
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }

      if (table === "orders") {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      maybeSingle: async () => ({
                        data: {
                          id: orderId,
                          order_number: "ORD-RECOVERY-1",
                          subtotal: 1000,
                          delivery_fee: 80,
                          total: 1080,
                          items: [{ productId, name: "Product", price: 1000, image: "", size: "M", quantity: 1 }],
                          status: "pending",
                          payment_method: persistedPaymentMethod,
                          client_request_id: "checkout-attempt-123",
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
  };
}

afterEach(() => {
  mock.restoreAll();
});

describe("order creation checkout recovery", () => {
  test("rejects malformed JSON as a client error before touching commerce data", async () => {
    let adminCalls = 0;
    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(orderCreateRouteDeps, "getSupabaseAdminClient", () => {
      adminCalls += 1;
      throw new Error("admin client should not be created");
    });

    const response = await POST(new Request("https://example.com/api/orders/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"storeId":',
    }));

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.error, /invalid json/i);
    assert.equal(adminCalls, 0);
  });

  test("rejects oversized order payloads before parsing or database access", async () => {
    let adminCalls = 0;
    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(orderCreateRouteDeps, "getSupabaseAdminClient", () => {
      adminCalls += 1;
      throw new Error("admin client should not be created");
    });

    const response = await POST(new Request("https://example.com/api/orders/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes: "x".repeat(70 * 1024) }),
    }));

    assert.equal(response.status, 413);
    const body = await response.json();
    assert.match(body.error, /too large/i);
    assert.equal(adminCalls, 0);
  });
  test("returns the persisted payment method and skips order-created side effects for an idempotent replay", async () => {
    const admin = createAdminMock({ replayed: true, persistedPaymentMethod: "cod" });
    let dispatchCount = 0;

    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(orderCreateRouteDeps, "getAuthenticatedUser", async () => null);
    mock.method(orderCreateRouteDeps, "getSupabaseAdminClient", () => admin as never);
    mock.method(orderCreateRouteDeps, "loadStorePlanState", async () => ({
      data: { isPublished: true, subscription: null, resolved: { live: true } },
      error: null,
    }) as never);
    mock.method(orderCreateRouteDeps, "dispatchOrderCreatedBackgroundJobs", async () => {
      dispatchCount += 1;
      return { mode: "inline" as const };
    });

    const response = await POST(buildRequest("cod"));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.replayed, true);
    assert.equal(body.order.payment_method, "cod");
    assert.equal(body.order.order_number, "ORD-RECOVERY-1");
    assert.equal(dispatchCount, 0);
  });

  test("uses the authenticated user email instead of a browser-supplied email", async () => {
    const admin = createAdminMock({ replayed: true, persistedPaymentMethod: "cod" });
    const rpcArgs: Array<Record<string, unknown>> = [];
    const originalRpc = admin.rpc;
    admin.rpc = async (name: string, args?: Record<string, unknown>) => {
      if (args) rpcArgs.push(args);
      return originalRpc(name);
    };

    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(orderCreateRouteDeps, "getAuthenticatedUser", async () => ({
      id: "10000000-0000-4000-8000-000000000099",
      email: "owner@example.test",
    }) as never);
    mock.method(orderCreateRouteDeps, "getSupabaseAdminClient", () => admin as never);
    mock.method(orderCreateRouteDeps, "loadStorePlanState", async () => ({
      data: { isPublished: true, subscription: null, resolved: { live: true } },
      error: null,
    }) as never);

    const request = buildRequest("cod");
    const body = await request.json();
    body.customerEmail = "attacker@example.test";
    const response = await POST(new Request(request.url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer test" },
      body: JSON.stringify(body),
    }));

    assert.equal(response.status, 200);
    assert.equal(rpcArgs[0]?._customer_email, "owner@example.test");
  });

  test("does not accept an injected guest notification email", async () => {
    const admin = createAdminMock({ replayed: true, persistedPaymentMethod: "cod" });
    const rpcArgs: Array<Record<string, unknown>> = [];
    const originalRpc = admin.rpc;
    admin.rpc = async (name: string, args?: Record<string, unknown>) => {
      if (args) rpcArgs.push(args);
      return originalRpc(name);
    };

    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(orderCreateRouteDeps, "getAuthenticatedUser", async () => null);
    mock.method(orderCreateRouteDeps, "getSupabaseAdminClient", () => admin as never);
    mock.method(orderCreateRouteDeps, "loadStorePlanState", async () => ({
      data: { isPublished: true, subscription: null, resolved: { live: true } },
      error: null,
    }) as never);

    const request = buildRequest("cod");
    const body = await request.json();
    body.customerEmail = "victim@example.test";
    const response = await POST(new Request(request.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }));

    assert.equal(response.status, 200);
    assert.equal(rpcArgs[0]?._customer_email, null);
  });

  test("returns a conflict when the recovery RPC rejects changed payment-method reuse", async () => {
    const admin = createAdminMock({
      rpcError: { message: "checkout recovery conflict: payment method does not match the existing order" },
    });

    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(orderCreateRouteDeps, "getAuthenticatedUser", async () => null);
    mock.method(orderCreateRouteDeps, "getSupabaseAdminClient", () => admin as never);
    mock.method(orderCreateRouteDeps, "loadStorePlanState", async () => ({
      data: { isPublished: true, subscription: null, resolved: { live: true } },
      error: null,
    }) as never);

    const response = await POST(buildRequest("cod"));
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.match(body.error, /checkout recovery conflict/i);
  });

  test("defense-in-depth rejects a drifted RPC that returns an order persisted under a different payment method", async () => {
    const admin = createAdminMock({ replayed: true, persistedPaymentMethod: "bkash" });

    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(orderCreateRouteDeps, "getAuthenticatedUser", async () => null);
    mock.method(orderCreateRouteDeps, "getSupabaseAdminClient", () => admin as never);
    mock.method(orderCreateRouteDeps, "loadStorePlanState", async () => ({
      data: { isPublished: true, subscription: null, resolved: { live: true } },
      error: null,
    }) as never);

    const response = await POST(buildRequest("cod"));
    assert.equal(response.status, 409);
  });


  test("rejects unauthenticated order creation when the merchant disables guest checkout", async () => {
    const admin = createAdminMock({
      replayed: false,
      persistedPaymentMethod: "cod",
      storefrontProfile: { allow_guest_checkout: false },
    });
    let rpcCalls = 0;
    const originalRpc = admin.rpc;
    admin.rpc = async (name: string) => {
      rpcCalls += 1;
      return originalRpc(name);
    };

    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(orderCreateRouteDeps, "getAuthenticatedUser", async () => null);
    mock.method(orderCreateRouteDeps, "getSupabaseAdminClient", () => admin as never);
    mock.method(orderCreateRouteDeps, "loadStorePlanState", async () => ({
      data: { isPublished: true, subscription: null, resolved: { live: true } },
      error: null,
    }) as never);

    const response = await POST(buildRequest("cod"));
    assert.equal(response.status, 401);
    const body = await response.json();
    assert.match(body.error, /sign in is required/i);
    assert.equal(rpcCalls, 0);
  });

  test("rejects a product option that is not configured for the store product", async () => {
    const admin = createAdminMock({ replayed: false, persistedPaymentMethod: "cod" });
    let rpcCalls = 0;
    const originalRpc = admin.rpc;
    admin.rpc = async (name: string) => {
      rpcCalls += 1;
      return originalRpc(name);
    };

    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(orderCreateRouteDeps, "getAuthenticatedUser", async () => null);
    mock.method(orderCreateRouteDeps, "getSupabaseAdminClient", () => admin as never);
    mock.method(orderCreateRouteDeps, "loadStorePlanState", async () => ({
      data: { isPublished: true, subscription: null, resolved: { live: true } },
      error: null,
    }) as never);

    const request = buildRequest("cod");
    const body = await request.json();
    body.items[0].size = "XXL";
    const tamperedRequest = new Request(request.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const response = await POST(tamperedRequest);
    assert.equal(response.status, 400);
    const responseBody = await response.json();
    assert.match(responseBody.error, /invalid product option/i);
    assert.equal(rpcCalls, 0);
  });

  test("rejects a client-supplied delivery fee that disagrees with authoritative store pricing", async () => {
    const admin = createAdminMock({ replayed: false, persistedPaymentMethod: "cod" });
    let rpcCalls = 0;
    const originalRpc = admin.rpc;
    admin.rpc = async (name: string) => {
      rpcCalls += 1;
      return originalRpc(name);
    };

    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(orderCreateRouteDeps, "getAuthenticatedUser", async () => null);
    mock.method(orderCreateRouteDeps, "getSupabaseAdminClient", () => admin as never);
    mock.method(orderCreateRouteDeps, "loadStorePlanState", async () => ({
      data: { isPublished: true, subscription: null, resolved: { live: true } },
      error: null,
    }) as never);

    const response = await POST(buildRequest("cod", 0));
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.error, /pricing changed/i);
    assert.equal(rpcCalls, 0);
  });

  test("rejects the primary delivery fee when the customer selected the secondary zone", async () => {
    const admin = createAdminMock({ replayed: false, persistedPaymentMethod: "cod" });
    let rpcCalls = 0;
    const originalRpc = admin.rpc;
    admin.rpc = async (name: string) => {
      rpcCalls += 1;
      return originalRpc(name);
    };

    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(orderCreateRouteDeps, "getAuthenticatedUser", async () => null);
    mock.method(orderCreateRouteDeps, "getSupabaseAdminClient", () => admin as never);
    mock.method(orderCreateRouteDeps, "loadStorePlanState", async () => ({
      data: { isPublished: true, subscription: null, resolved: { live: true } },
      error: null,
    }) as never);

    const response = await POST(buildRequest("cod", 80, "secondary"));
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.error, /pricing changed/i);
    assert.equal(rpcCalls, 0);
  });

  test("rejects an unknown delivery location before reserving stock", async () => {
    const admin = createAdminMock({ replayed: false, persistedPaymentMethod: "cod" });
    let rpcCalls = 0;
    const originalRpc = admin.rpc;
    admin.rpc = async (name: string) => {
      rpcCalls += 1;
      return originalRpc(name);
    };

    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(orderCreateRouteDeps, "getAuthenticatedUser", async () => null);
    mock.method(orderCreateRouteDeps, "getSupabaseAdminClient", () => admin as never);
    mock.method(orderCreateRouteDeps, "loadStorePlanState", async () => ({
      data: { isPublished: true, subscription: null, resolved: { live: true } },
      error: null,
    }) as never);

    const response = await POST(buildRequest("cod", 80, "unknown-zone"));
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.error, /invalid delivery location/i);
    assert.equal(rpcCalls, 0);
  });

  test("rejects a globally valid manual payment method when the merchant has not enabled it", async () => {
    const admin = createAdminMock({ replayed: false, persistedPaymentMethod: "bkash_manual" });
    let rpcCalls = 0;
    const originalRpc = admin.rpc;
    admin.rpc = async (name: string) => {
      rpcCalls += 1;
      return originalRpc(name);
    };

    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(orderCreateRouteDeps, "getAuthenticatedUser", async () => null);
    mock.method(orderCreateRouteDeps, "getSupabaseAdminClient", () => admin as never);
    mock.method(orderCreateRouteDeps, "loadStorePlanState", async () => ({
      data: { isPublished: true, subscription: null, resolved: { live: true } },
      error: null,
    }) as never);

    const response = await POST(buildRequest("bkash_manual"));
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.error, /not available/i);
    assert.equal(rpcCalls, 0);
  });
});
