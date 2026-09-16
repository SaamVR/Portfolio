import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_CART_LINES,
  MAX_CART_QUANTITY,
  clampCartQuantity,
  normalizePersistedCartItems,
} from "@/lib/cart-state";

test("clampCartQuantity matches checkout quantity bounds", () => {
  assert.equal(clampCartQuantity(-1), 1);
  assert.equal(clampCartQuantity(0), 1);
  assert.equal(clampCartQuantity(3.9), 3);
  assert.equal(clampCartQuantity(1000), MAX_CART_QUANTITY);
  assert.equal(clampCartQuantity("not-a-number"), 1);
});

test("persisted cart normalization drops malformed and cross-store rows", () => {
  const items = normalizePersistedCartItems([
    null,
    "bad",
    { productId: "p-1", name: "Valid", price: 100, image: "", size: "M", quantity: 2, storeId: "store-a" },
    { productId: "p-2", name: "Wrong store", price: 100, image: "", size: "L", quantity: 1, storeId: "store-b" },
    { productId: "", name: "Missing product", price: 100, image: "", size: "M", quantity: 1, storeId: "store-a" },
    { productId: "p-3", name: "Bad price", price: -5, image: "", size: "M", quantity: 1, storeId: "store-a" },
  ], "store-a");

  assert.deepEqual(items, [{
    productId: "p-1",
    name: "Valid",
    price: 100,
    image: "",
    size: "M",
    quantity: 2,
    storeId: "store-a",
  }]);
});

test("persisted cart normalization deduplicates lines and clamps quantity", () => {
  const items = normalizePersistedCartItems([
    { productId: "p-1", name: "Valid", price: 100, image: "", size: "M", quantity: 2 },
    { productId: "p-1", name: "Valid", price: 100, image: "", size: "M", quantity: 500 },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0]?.quantity, MAX_CART_QUANTITY);
});

test("persisted cart normalization caps distinct lines at the checkout limit", () => {
  const input = Array.from({ length: MAX_CART_LINES + 10 }, (_, index) => ({
    productId: `p-${index}`,
    name: `Product ${index}`,
    price: 1,
    image: "",
    size: "Default",
    quantity: 1,
  }));

  assert.equal(normalizePersistedCartItems(input).length, MAX_CART_LINES);
});
