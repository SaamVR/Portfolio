import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAuthoritativeRecoveryCart,
  normalizeRecoveryCartInput,
} from "./recovery-cart-authority";

const productId = "11111111-1111-4111-8111-111111111111";

test("recovery cart input rejects malformed ids, quantities, and oversized line sets", () => {
  assert.equal(normalizeRecoveryCartInput([{ productId: "bad", quantity: 1 }]), null);
  assert.equal(normalizeRecoveryCartInput([{ productId, quantity: 0 }]), null);
  assert.equal(normalizeRecoveryCartInput([{ productId, quantity: 100 }]), null);
  assert.equal(normalizeRecoveryCartInput(Array.from({ length: 31 }, () => ({ productId, quantity: 1 }))), null);
});

test("recovery cart truth is rebuilt from authoritative product rows", () => {
  const input = normalizeRecoveryCartInput([{
    productId,
    quantity: 2,
    name: "Spoofed name",
    price: 1,
    variant: "M",
  }]);
  assert.ok(input);

  const cart = buildAuthoritativeRecoveryCart(input, [{
    id: productId,
    name: "Authoritative Shirt",
    price: 750,
    is_available: true,
  }]);
  assert.deepEqual(cart, {
    snapshot: [{ productId, quantity: 2, variant: "M", name: "Authoritative Shirt", price: 750 }],
    cartValue: 1500,
    itemCount: 2,
  });
});

test("recovery cart truth fails closed for missing or unavailable products", () => {
  const input = normalizeRecoveryCartInput([{ productId, quantity: 1 }]);
  assert.ok(input);

  assert.equal(buildAuthoritativeRecoveryCart(input, []), null);
  assert.equal(buildAuthoritativeRecoveryCart(input, [{
    id: productId,
    name: "Unavailable Shirt",
    price: 750,
    is_available: false,
  }]), null);
});


test("recovery cart normalization aggregates duplicate commercial lines and enforces the checkout 99-unit aggregate", () => {
  assert.deepEqual(normalizeRecoveryCartInput([
    { productId: productId, quantity: 40, variant: "M" },
    { productId: productId, quantity: 59, variant: "M" },
    { productId: productId, quantity: 1, variant: "L" },
  ]), [
    { productId: productId, quantity: 99, variant: "M" },
    { productId: productId, quantity: 1, variant: "L" },
  ]);

  assert.equal(normalizeRecoveryCartInput([
    { productId: productId, quantity: 60, variant: "M" },
    { productId: productId, quantity: 40, variant: "M" },
  ]), null);
});
