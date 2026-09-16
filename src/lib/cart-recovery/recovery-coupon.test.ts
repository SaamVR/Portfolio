import assert from "node:assert/strict";
import test from "node:test";
import { isRecoveryCouponUsable, normalizeRecoveryCouponCode } from "./recovery-coupon";

test("recovery coupon codes normalize to the checkout coupon identity", () => {
  assert.equal(normalizeRecoveryCouponCode("  save10  "), "SAVE10");
  assert.equal(normalizeRecoveryCouponCode("   "), null);
  assert.equal(normalizeRecoveryCouponCode(null), null);
});

test("recovery offers require a currently redeemable merchant coupon", () => {
  const now = Date.parse("2026-09-14T12:00:00Z");
  const base = {
    code: "SAVE10",
    is_active: true,
    expires_at: "2026-09-15T12:00:00Z",
    max_uses: 10,
    uses_count: 2,
    min_order: 500,
  };

  assert.equal(isRecoveryCouponUsable(base, 900, now), true);
  assert.equal(isRecoveryCouponUsable({ ...base, is_active: false }, 900, now), false);
  assert.equal(isRecoveryCouponUsable({ ...base, expires_at: "2026-09-13T12:00:00Z" }, 900, now), false);
  assert.equal(isRecoveryCouponUsable({ ...base, uses_count: 10 }, 900, now), false);
  assert.equal(isRecoveryCouponUsable(base, 499, now), false);
});
