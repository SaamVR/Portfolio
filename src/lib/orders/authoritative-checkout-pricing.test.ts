import test from "node:test";
import assert from "node:assert/strict";
import { resolveAuthoritativeCheckoutPricing } from "@/lib/orders/authoritative-checkout-pricing";

const physicalProduct = {
  id: "10000000-0000-4000-8000-000000000001",
  price: 1000,
  type: "T-Shirt",
};

const digitalProduct = {
  id: "10000000-0000-4000-8000-000000000002",
  price: 700,
  type: "Digital Download",
};

test("authoritative checkout pricing applies the merchant primary delivery fee", () => {
  const pricing = resolveAuthoritativeCheckoutPricing({
    items: [{ productId: physicalProduct.id, quantity: 1 }],
    products: [physicalProduct],
    deliverySettings: { enabled: true, delivery_fee: 120, free_threshold: 2000 },
    paymentSettings: { prepayment_discount_type: "none" },
    paymentMethod: "cod",
  });

  assert.equal(pricing.subtotal, 1000);
  assert.equal(pricing.deliveryFee, 120);
  assert.equal(pricing.digitalOnly, false);
});

test("authoritative checkout pricing grants threshold free delivery from database prices", () => {
  const pricing = resolveAuthoritativeCheckoutPricing({
    items: [{ productId: physicalProduct.id, quantity: 2 }],
    products: [physicalProduct],
    deliverySettings: { enabled: true, delivery_fee: 120, free_threshold: 2000 },
    paymentSettings: { prepayment_discount_type: "none" },
    paymentMethod: "cod",
  });

  assert.equal(pricing.subtotal, 2000);
  assert.equal(pricing.deliveryFee, 0);
});

test("authoritative checkout pricing does not charge shipping for digital products", () => {
  const pricing = resolveAuthoritativeCheckoutPricing({
    items: [{ productId: digitalProduct.id, quantity: 1 }],
    products: [digitalProduct],
    deliverySettings: { enabled: true, delivery_fee: 120, free_threshold: 2000 },
    paymentSettings: { prepayment_discount_type: "none" },
    paymentMethod: "cod",
  });

  assert.equal(pricing.deliveryFee, 0);
  assert.equal(pricing.digitalOnly, true);
});

test("authoritative checkout pricing honors prepaid free-delivery configuration", () => {
  const pricing = resolveAuthoritativeCheckoutPricing({
    items: [{ productId: physicalProduct.id, quantity: 1 }],
    products: [physicalProduct],
    deliverySettings: { enabled: true, delivery_fee: 120, free_threshold: 2000 },
    paymentSettings: { prepayment_discount_type: "free_delivery", prepayment_discount_value: 0 },
    paymentMethod: "bkash",
  });

  assert.equal(pricing.deliveryFee, 0);
});

test("authoritative checkout pricing rejects products missing from the store-scoped lookup", () => {
  assert.throws(() => resolveAuthoritativeCheckoutPricing({
    items: [{ productId: physicalProduct.id, quantity: 1 }],
    products: [],
    deliverySettings: {},
    paymentSettings: {},
    paymentMethod: "cod",
  }), /unavailable/i);
});
