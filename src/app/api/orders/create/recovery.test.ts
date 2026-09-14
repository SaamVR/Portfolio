import test, { afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { POST, orderCreateRouteDeps } from "@/app/api/orders/create/route";

const storeId = "10000000-0000-4000-8000-000000000001";
const orderId = "10000000-0000-4000-8000-000000000002";
const productId = "10000000-0000-4000-8000-000000000003";

function buildRequest(paymentMethod = "bkash") {
  return new Request("https://example.com/api/orders/create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      storeId,
      idempotencyKey: "checkout-attempt-123",
      items: [{ productId, size: "M", quantity: 1 }],
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
    }),
  });
}

function createAdminMock(options?: {
  replayed?: boolean;
  persistedPaymentMethod?: string;
  rpcError?: { message: string } | null;
}) {
  const replayed = options?.replayed ?? true;
  const persistedPaymentMethod = options?.persistedPaymentMethod ?? "bkash";

  return {
    rpc: async (name: string) => {
      assert.equal(name, "create_store_order_with_payment_lifecycle");
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
                          reservation_state: "reserved",
                          reservation_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
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

    // The mock intentionally ignores the requested COD method and returns the
    // existing bKash order, simulating an old/drifted database RPC.
    const response = await POST(buildRequest("cod"));
    assert.equal(response.status, 409);
  });
});
