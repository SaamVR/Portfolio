import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTrackingPhone, orderTrackRouteDeps, POST } from "./route";

const storeId = "11111111-1111-4111-8111-111111111111";

function makeAdminResult(
  data: Record<string, unknown> | null,
  calls: { table?: string; select?: string; eq: Array<[string, unknown]> },
  error: unknown = null,
) {
  const chain: Record<string, any> = {};
  chain.select = (value: string) => {
    calls.select = value;
    return chain;
  };
  chain.eq = (field: string, value: unknown) => {
    calls.eq.push([field, value]);
    return chain;
  };
  chain.maybeSingle = async () => ({ data, error });

  return {
    from(table: string) {
      calls.table = table;
      return chain;
    },
  } as any;
}

function request(body: unknown, headers?: Record<string, string>) {
  return new Request("https://example.com/api/orders/track", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

test("normalizes common Bangladesh checkout phone formats", () => {
  assert.equal(normalizeTrackingPhone("01712-345678"), "01712345678");
  assert.equal(normalizeTrackingPhone("+880 1712 345678"), "01712345678");
  assert.equal(normalizeTrackingPhone("00880 1712 345678"), "01712345678");
  assert.equal(normalizeTrackingPhone("1712345678"), "01712345678");
});

test("guest order tracking is tenant-scoped, generic on mismatch, sanitized, and rate-limited", async (t) => {
  const originalAdmin = orderTrackRouteDeps.getSupabaseAdminClient;
  const originalRateLimit = orderTrackRouteDeps.rateLimit;

  try {
    await t.test("returns only the customer-safe projection for a verified guest order", async () => {
      const calls = { eq: [] as Array<[string, unknown]> };
      orderTrackRouteDeps.rateLimit = async () => ({
        success: true,
        limit: 12,
        remaining: 11,
        reset: Date.now() + 60_000,
      });
      orderTrackRouteDeps.getSupabaseAdminClient = () => makeAdminResult({
        id: "22222222-2222-4222-8222-222222222222",
        order_number: "EZ-1234",
        status: "processing",
        items: [{
          productId: "33333333-3333-4333-8333-333333333333",
          name: "Safe item",
          price: 450,
          size: "M",
          quantity: 2,
          internalCost: 100,
          secretMetadata: "do-not-return",
        }],
        subtotal: 900,
        delivery_fee: 80,
        total: 980,
        payment_method: "cod",
        created_at: "2026-08-23T12:00:00.000Z",
        customer_phone: "01712345678",
        internal_notes: "hidden",
      }, calls);

      const response = await POST(request({
        storeId,
        orderNumber: "ez-1234",
        phone: "+880 1712 345678",
      }, { "x-forwarded-for": "203.0.113.9, 10.0.0.1" }));

      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const body = await response.json();
      assert.equal(body.order.order_number, "EZ-1234");
      assert.equal(body.order.status, "processing");
      assert.equal(body.order.customer_phone, undefined);
      assert.deepEqual(body.order.items, [{ name: "Safe item", price: 450, size: "M", quantity: 2 }]);
      assert.equal(calls.table, "orders");
      assert.deepEqual(calls.eq, [
        ["store_id", storeId],
        ["order_number", "EZ-1234"],
      ]);
      assert.ok(calls.select?.includes("customer_phone"));
      assert.ok(!calls.select?.includes("customer_email"));
      assert.ok(!calls.select?.includes("notes"));
    });

    await t.test("uses the same generic failure for a wrong phone and a missing order", async () => {
      orderTrackRouteDeps.rateLimit = async () => ({
        success: true,
        limit: 12,
        remaining: 10,
        reset: Date.now() + 60_000,
      });

      orderTrackRouteDeps.getSupabaseAdminClient = () => makeAdminResult({
        id: "22222222-2222-4222-8222-222222222222",
        order_number: "EZ-1234",
        status: "pending",
        items: [],
        subtotal: 0,
        delivery_fee: 0,
        total: 0,
        payment_method: "cod",
        created_at: "2026-08-23T12:00:00.000Z",
        customer_phone: "01712345678",
      }, { eq: [] });

      const wrongPhone = await POST(request({ storeId, orderNumber: "EZ-1234", phone: "01999999999" }));
      assert.equal(wrongPhone.status, 404);
      const wrongPhoneBody = await wrongPhone.json();

      orderTrackRouteDeps.getSupabaseAdminClient = () => makeAdminResult(null, { eq: [] });
      const missingOrder = await POST(request({ storeId, orderNumber: "EZ-9999", phone: "01999999999" }));
      assert.equal(missingOrder.status, 404);
      const missingOrderBody = await missingOrder.json();

      assert.deepEqual(wrongPhoneBody, missingOrderBody);
      assert.deepEqual(missingOrderBody, { error: "Unable to verify order" });
    });

    await t.test("stops rate-limited requests before touching the orders table", async () => {
      let adminCalled = false;
      orderTrackRouteDeps.rateLimit = async () => ({
        success: false,
        limit: 12,
        remaining: 0,
        reset: Date.now() + 60_000,
      });
      orderTrackRouteDeps.getSupabaseAdminClient = () => {
        adminCalled = true;
        throw new Error("should not create admin client");
      };

      const response = await POST(request({ storeId, orderNumber: "EZ-1234", phone: "01712345678" }));
      assert.equal(response.status, 429);
      assert.equal(adminCalled, false);
    });
  } finally {
    orderTrackRouteDeps.getSupabaseAdminClient = originalAdmin;
    orderTrackRouteDeps.rateLimit = originalRateLimit;
  }
});
