import test from "node:test";
import assert from "node:assert/strict";
import { canStoreAcceptOrders } from "@/app/api/orders/create/route";

test("published legacy stores without subscriptions may accept orders", () => {
  assert.equal(canStoreAcceptOrders({
    isPublished: true,
    hasSubscription: false,
    planLive: false,
  }), true);
});

test("live trial stores may accept orders before the publish flag is flipped", () => {
  assert.equal(canStoreAcceptOrders({
    isPublished: false,
    hasSubscription: true,
    planLive: true,
  }), true);
});

test("private unpublished previews cannot create real orders", () => {
  assert.equal(canStoreAcceptOrders({
    isPublished: false,
    hasSubscription: false,
    planLive: false,
  }), false);
});

test("non-live subscribed stores cannot accept orders", () => {
  assert.equal(canStoreAcceptOrders({
    isPublished: true,
    hasSubscription: true,
    planLive: false,
  }), false);
  assert.equal(canStoreAcceptOrders(null), false);
});
