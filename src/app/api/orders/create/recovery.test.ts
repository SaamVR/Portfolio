import test, { afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { POST, orderCreateRouteDeps } from "@/app/api/orders/create/route";

const storeId = "10000000-0000-4000-8000-000000000001";
const orderId = "10000000-0000-4000-8000-000000000002";
const productId = "10000000-0000-4000-8000-000000000003";

function buildRequest(paymentMethod = "bkash", overrides: Record<string, unknown> = {}) {
  return new Request("https://example.com/api/orders/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      storeId,
      idempotencyKey: "checkout-attempt-123",
      items: [{ productId, size: "M", optionIds: [], expectedUnitPrice: 1000, quantity: 1 }],
      deliveryZone: "primary",
      deliveryFee: 80,
      discountAmount: 0,
      customerName: "Test Customer",
      customerPhone: "01700000000",
      customerEmail: null,
      shippingAddress: "123 Test Road",
      shippingCity: "Dhaka",
      paymentMethod,
      notes: "Payment: bKash (Automated)",
      couponCode: null,
      ...overrides,
    }),
  });
}

function createAdminMock(options?: {
  replayed?: boolean;
  persistedPaymentMethod?: string;
  rpcError?: { message: string } | null;
  onRpc?: (name: string, args: Record<string, unknown>) => void;
}) {
  const replayed = options?.replayed ?? true;
  const persistedPaymentMethod = options?.persistedPaymentMethod ?? "bkash";

  return {
    rpc: async (name: string, args: Record<string, unknown>) => {
      assert.equal(name, "create_store_order_authoritative_v3");
      options?.onRpc?.(name, args);
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
                  eq() {
                    return {
                      maybeSingle: async () => ({ data: null, error: null }),
                    };
                  },
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
  test("returns the persisted payment method and skips order-created side effects for an idempotent replay", async () => {
    const admin = createAdminMock({ replayed: true, persistedPaymentMethod: "bkash" });
    let dispatchCount = 0;

    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(orderCreateRouteDeps, "getAuthenticatedUser", async () => null);
    mock.method(orderCreateRouteDeps, "getSupabaseAdminClient", () => admin as never);
    mock.method(orderCreateRouteDeps, "loadStorePlanState", async () => ({
      data: { isPublished: true, subscription: null, resolved: { live: true } },
      error: null,
    }) as never);
    mock.method(orderCreateRouteDeps, "resolveStorePaymentAuthority", async (_admin, _storeId, method) => ({
      allowed: true, paymentMethod: method, providerId: method === "bkash" ? "bkash" : null,
      prepaidEligible: method !== "cod", reason: null,
    }));
    mock.method(orderCreateRouteDeps, "dispatchOrderCreatedBackgroundJobs", async () => {
      dispatchCount += 1;
      return { mode: "inline" as const };
    });

    const response = await POST(buildRequest("bkash"));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.replayed, true);
    assert.equal(body.order.payment_method, "bkash");
    assert.equal(body.order.order_number, "ORD-RECOVERY-1");
    assert.equal(dispatchCount, 0);
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
    mock.method(orderCreateRouteDeps, "resolveStorePaymentAuthority", async (_admin, _storeId, method) => ({
      allowed: true, paymentMethod: method, providerId: method === "bkash" ? "bkash" : null,
      prepaidEligible: method !== "cod", reason: null,
    }));

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
    mock.method(orderCreateRouteDeps, "resolveStorePaymentAuthority", async (_admin, _storeId, method) => ({
      allowed: true, paymentMethod: method, providerId: method === "bkash" ? "bkash" : null,
      prepaidEligible: method !== "cod", reason: null,
    }));

    // The mock intentionally ignores the requested COD method and returns the
    // existing bKash order, simulating an old/drifted database RPC.
    const response = await POST(buildRequest("cod"));
    assert.equal(response.status, 409);
  });

  test("forwards only assertions plus stable option identity and delivery zone to the authoritative RPC", async () => {
    const capturedRpcArgs: Array<Record<string, unknown>> = [];
    const admin = createAdminMock({ replayed: true, persistedPaymentMethod: "cod", onRpc: (_name, args) => { capturedRpcArgs.push(args); } });

    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(orderCreateRouteDeps, "getAuthenticatedUser", async () => null);
    mock.method(orderCreateRouteDeps, "getSupabaseAdminClient", () => admin as never);
    mock.method(orderCreateRouteDeps, "loadStorePlanState", async () => ({
      data: { isPublished: true, subscription: null, resolved: { live: true } }, error: null,
    }) as never);
    mock.method(orderCreateRouteDeps, "resolveStorePaymentAuthority", async () => ({
      allowed: true, paymentMethod: "cod", providerId: null, prepaidEligible: false, reason: null,
    }));

    const response = await POST(buildRequest("cod", {
      deliveryZone: "secondary",
      deliveryFee: 9999,
      discountAmount: 777,
      items: [{ productId, size: "Tampered label", optionIds: ["opt-size-l"], expectedUnitPrice: 1100, quantity: 1 }],
    }));
    assert.equal(response.status, 200);
    const rpcArgs = capturedRpcArgs[0];
    assert.ok(rpcArgs);
    assert.equal(rpcArgs._delivery_zone, "secondary");
    assert.equal(rpcArgs._expected_delivery_fee, 9999);
    assert.equal(rpcArgs._expected_discount_amount, 777);
    assert.deepEqual(rpcArgs._items, [{
      productId, size: "Tampered label", optionIds: ["opt-size-l"], expectedUnitPrice: 1100, quantity: 1,
    }]);
    assert.equal(rpcArgs._payment_method_authorized, true);
    assert.equal(rpcArgs._payment_method_prepaid, false);
    assert.equal(rpcArgs._manual_payment_provider, null);
    assert.equal(rpcArgs._manual_payment_reference, null);
  });

  test("passes denied payment authority into the transactional RPC so a fresh order fails closed", async () => {
    let rpcCalls = 0;
    const admin = createAdminMock({
      rpcError: { message: "payment method is not enabled or connected for this store" },
      onRpc: () => { rpcCalls += 1; },
    });

    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(orderCreateRouteDeps, "getAuthenticatedUser", async () => null);
    mock.method(orderCreateRouteDeps, "getSupabaseAdminClient", () => admin as never);
    mock.method(orderCreateRouteDeps, "loadStorePlanState", async () => ({
      data: { isPublished: true, subscription: null, resolved: { live: true } }, error: null,
    }) as never);
    mock.method(orderCreateRouteDeps, "resolveStorePaymentAuthority", async (_admin, _storeId, method) => ({
      allowed: false, paymentMethod: method, providerId: method === "bkash" ? "bkash" : null,
      prepaidEligible: false, reason: "Payment method is disabled or disconnected",
    }));

    const response = await POST(buildRequest("bkash"));
    assert.equal(response.status, 400);
    assert.equal(rpcCalls, 1);
    assert.match((await response.json()).error, /not enabled or connected/i);
  });

  test("idempotent replay remains recoverable when the payment method was disabled after creation", async () => {
    const admin = createAdminMock({ replayed: true, persistedPaymentMethod: "bkash" });
    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(orderCreateRouteDeps, "getAuthenticatedUser", async () => null);
    mock.method(orderCreateRouteDeps, "getSupabaseAdminClient", () => admin as never);
    mock.method(orderCreateRouteDeps, "loadStorePlanState", async () => ({
      data: { isPublished: true, subscription: null, resolved: { live: true } }, error: null,
    }) as never);
    mock.method(orderCreateRouteDeps, "resolveStorePaymentAuthority", async (_admin, _storeId, method) => ({
      allowed: false, paymentMethod: method, providerId: "bkash", prepaidEligible: false, reason: "disabled later",
    }));

    const response = await POST(buildRequest("bkash"));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).replayed, true);
  });

  test("rejects malformed delivery-zone and negative monetary assertions before authority resolution", async () => {
    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    const invalidZone = await POST(buildRequest("cod", { deliveryZone: "attacker-zone" }));
    assert.equal(invalidZone.status, 400);
    assert.match((await invalidZone.json()).error, /invalid delivery zone/i);

    const negativeFee = await POST(buildRequest("cod", { deliveryFee: -1 }));
    assert.equal(negativeFee.status, 400);
    assert.match((await negativeFee.json()).error, /invalid delivery fee pricing assertion/i);
  });

  test("normalizes manual payment evidence into structured RPC fields", async () => {
    const capturedRpcArgs: Array<Record<string, unknown>> = [];
    const admin = createAdminMock({ replayed: true, persistedPaymentMethod: "bkash_manual", onRpc: (_name, args) => { capturedRpcArgs.push(args); } });

    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(orderCreateRouteDeps, "getAuthenticatedUser", async () => null);
    mock.method(orderCreateRouteDeps, "getSupabaseAdminClient", () => admin as never);
    mock.method(orderCreateRouteDeps, "loadStorePlanState", async () => ({
      data: { isPublished: true, subscription: null, resolved: { live: true } }, error: null,
    }) as never);
    mock.method(orderCreateRouteDeps, "resolveStorePaymentAuthority", async () => ({
      allowed: true, paymentMethod: "bkash_manual", providerId: null, prepaidEligible: true, reason: null,
    }));

    const response = await POST(buildRequest("bkash_manual", { manualPaymentReference: " trx-1234 " }));
    assert.equal(response.status, 200);
    assert.equal(capturedRpcArgs[0]?._manual_payment_provider, "bkash");
    assert.equal(capturedRpcArgs[0]?._manual_payment_reference, "TRX-1234");
  });

  test("rejects missing or malformed manual payment evidence before order creation", async () => {
    mock.method(orderCreateRouteDeps, "rateLimit", async () => ({ success: true } as never));
    const missing = await POST(buildRequest("bkash_manual", { manualPaymentReference: "" }));
    assert.equal(missing.status, 400);
    assert.match((await missing.json()).error, /manual payment reference/i);

    const malformed = await POST(buildRequest("nagad", { manualPaymentReference: "bad ref with spaces" }));
    assert.equal(malformed.status, 400);
    assert.match((await malformed.json()).error, /manual payment reference/i);

    const unsupportedPunctuation = await POST(buildRequest("bkash_manual", { manualPaymentReference: "TRX.1234" }));
    assert.equal(unsupportedPunctuation.status, 400);
    assert.match((await unsupportedPunctuation.json()).error, /manual payment reference/i);
  });

});
