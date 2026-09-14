import test from "node:test";
import assert from "node:assert/strict";
import { isStorefrontPaymentMethodConfigured } from "@/lib/payments/storefront-payment-availability";

test("cash on delivery defaults enabled unless the merchant disables it", () => {
  assert.equal(isStorefrontPaymentMethodConfigured({ paymentMethod: "cod", paymentSettings: {} }), true);
  assert.equal(isStorefrontPaymentMethodConfigured({
    paymentMethod: "cod",
    paymentSettings: { cod_enabled: false },
  }), false);
});

test("manual mobile payment methods require the merchant-specific enable flag", () => {
  assert.equal(isStorefrontPaymentMethodConfigured({
    paymentMethod: "bkash_manual",
    paymentSettings: { bkash_enabled: false },
  }), false);
  assert.equal(isStorefrontPaymentMethodConfigured({
    paymentMethod: "bkash_manual",
    paymentSettings: { bkash_enabled: true },
  }), true);
  assert.equal(isStorefrontPaymentMethodConfigured({
    paymentMethod: "nagad",
    paymentSettings: { nagad_enabled: true },
  }), true);
});

test("redirect providers require a connected merchant provider record", () => {
  assert.equal(isStorefrontPaymentMethodConfigured({
    paymentMethod: "bkash",
    paymentSettings: {},
    gatewayConnection: null,
  }), false);

  assert.equal(isStorefrontPaymentMethodConfigured({
    paymentMethod: "bkash",
    paymentSettings: {},
    gatewayConnection: { provider: "bkash", status: "connected" },
  }), true);
});
