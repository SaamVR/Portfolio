import test from "node:test";
import assert from "node:assert/strict";
import { encodeDigitalCartVariant } from "@/lib/digital-cart";
import { validateAuthoritativeCheckoutSelections } from "@/lib/orders/authoritative-checkout-selection";

const productId = "10000000-0000-4000-8000-000000000001";

test("accepts configured physical size, color, and custom metric selections", () => {
  assert.doesNotThrow(() => validateAuthoritativeCheckoutSelections({
    items: [{ productId, size: "M • Black • Cotton" }],
    products: [{
      id: productId,
      type: "T-Shirt",
      sizes: ["S", "M", "L"],
      colors: ["Black", "White"],
      metric_values: { material: ["Cotton", "Linen"] },
    }],
  }));
});

test("rejects a physical option that the merchant did not configure", () => {
  assert.throws(() => validateAuthoritativeCheckoutSelections({
    items: [{ productId, size: "XXL" }],
    products: [{ id: productId, type: "T-Shirt", sizes: ["S", "M", "L"] }],
  }), /invalid product option/i);
});

test("keeps Default and Free Size compatibility only when no options exist", () => {
  assert.doesNotThrow(() => validateAuthoritativeCheckoutSelections({
    items: [{ productId, size: "Default" }, { productId, size: "Free Size" }],
    products: [{ id: productId, type: "Product", sizes: [], colors: [], metric_values: {} }],
  }));
  assert.throws(() => validateAuthoritativeCheckoutSelections({
    items: [{ productId, size: "Made Up" }],
    products: [{ id: productId, type: "Product", sizes: [], colors: [], metric_values: {} }],
  }), /invalid product option/i);
});

test("digital products require the digital cart encoding and reject configured license drift", () => {
  const digitalProduct = {
    id: productId,
    type: "Digital Download",
    metric_values: { licenses: ["Commercial"], formats: ["PSD", "PNG"] },
  };
  assert.doesNotThrow(() => validateAuthoritativeCheckoutSelections({
    items: [{ productId, size: encodeDigitalCartVariant({ license: "Commercial", formats: ["PSD"] }) }],
    products: [digitalProduct],
  }));
  assert.throws(() => validateAuthoritativeCheckoutSelections({
    items: [{ productId, size: "Default" }],
    products: [digitalProduct],
  }), /digital product checkout options are not configured/i);
  assert.throws(() => validateAuthoritativeCheckoutSelections({
    items: [{ productId, size: encodeDigitalCartVariant({ license: "Personal", formats: ["PSD"] }) }],
    products: [digitalProduct],
  }), /invalid digital license/i);
});
