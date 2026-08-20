import test, { afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { PATCH, orderStatusRouteDeps } from "@/app/api/orders/status/route";

afterEach(() => {
  mock.restoreAll();
});

function statusRequest(status: string) {
  return new Request("https://example.com/api/orders/status", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      orderId: "order_1",
      storeId: "store_1",
      status,
    }),
  });
}

function buildOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order_1",
    store_id: "store_1",
    order_number: "1001",
    status: "processing",
    total: 1200,
    payment_method: "cod",
    user_id: null,
    customer_name: "Buyer",
    customer_phone: "01700000000",
    ...overrides,
  };
}

describe("order status transition idempotency", () => {
  test("treats a repeated current-status PATCH as a no-op without writing again", async () => {
    let updateCalls = 0;
    const order = buildOrder({ status: "shipped" });
    const selectChain: any = {
      eq: () => selectChain,
      maybeSingle: async () => ({ data: order, error: null }),
    };
    const adminClient = {
      from(table: string) {
        assert.equal(table, "orders");
        return {
          select: () => selectChain,
          update: () => {
            updateCalls += 1;
            throw new Error("same-status update must not write");
          },
        };
      },
    };

    mock.method(orderStatusRouteDeps, "getAuthenticatedUser", async () => ({ id: "manager_1" }) as never);
    mock.method(orderStatusRouteDeps, "getSupabaseAdminClient", () => adminClient as never);
    mock.method(orderStatusRouteDeps, "canManageStore", async () => true);

    const response = await PATCH(statusRequest("shipped"));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      status: "shipped",
      changed: false,
    });
    assert.equal(updateCalls, 0);
  });

  test("returns conflict when another request wins the compare-and-set transition", async () => {
    const order = buildOrder({ status: "processing" });
    const initialSelectChain: any = {
      eq: () => initialSelectChain,
      maybeSingle: async () => ({ data: order, error: null }),
    };
    const updateFilters: Array<[string, string]> = [];
    const updateChain: any = {
      eq(column: string, value: string) {
        updateFilters.push([column, value]);
        return updateChain;
      },
      select: () => updateChain,
      maybeSingle: async () => ({ data: null, error: null }),
    };
    const adminClient = {
      from(table: string) {
        assert.equal(table, "orders");
        return {
          select: () => initialSelectChain,
          update: () => updateChain,
        };
      },
    };

    mock.method(orderStatusRouteDeps, "getAuthenticatedUser", async () => ({ id: "manager_1" }) as never);
    mock.method(orderStatusRouteDeps, "getSupabaseAdminClient", () => adminClient as never);
    mock.method(orderStatusRouteDeps, "canManageStore", async () => true);

    const response = await PATCH(statusRequest("shipped"));

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      error: "Order status changed while this update was being processed. Refresh and try again.",
    });
    assert.deepEqual(updateFilters, [
      ["id", "order_1"],
      ["store_id", "store_1"],
      ["status", "processing"],
    ]);
  });
});
