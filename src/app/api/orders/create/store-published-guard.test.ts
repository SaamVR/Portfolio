import test from "node:test";
import assert from "node:assert/strict";
import { canStoreAcceptOrders } from "@/app/api/orders/create/route";

test("only published stores may accept public orders", () => {
  assert.equal(canStoreAcceptOrders({ is_published: true }), true);
  assert.equal(canStoreAcceptOrders({ is_published: false }), false);
  assert.equal(canStoreAcceptOrders({ is_published: null }), false);
  assert.equal(canStoreAcceptOrders(null), false);
});
