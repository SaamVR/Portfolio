import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

test("public recovery lead writes cannot author merchant coupon identity", () => {
  const lead = source("src/app/api/cart-recovery/lead/route.ts");
  assert.equal(lead.includes("body?.recoveryCouponCode"), false);
  assert.equal(lead.includes("recovery_coupon_code: recoveryCouponCode"), false);
});

test("recovery queue never fabricates a coupon from a prefix", () => {
  const queue = source("src/app/api/cart-recovery/queue/route.ts");
  assert.equal(queue.includes("normalized.couponPrefix"), false);
  assert.equal(queue.includes("lead.id.slice(0, 6).toUpperCase()"), false);
  assert.match(queue, /\.from\("coupon_codes"\)/);
  assert.match(queue, /isRecoveryCouponUsable\(coupon, lead\.cart_value/);
});

test("recovery settings do not advertise unsupported automatic coupon creation", () => {
  const settings = source("src/lib/admin/merchant-growth-settings.ts");
  const admin = source("src/views/admin/CartRecovery.tsx");
  assert.equal(settings.includes("couponPrefix"), false);
  assert.equal(admin.includes("cart-coupon-prefix"), false);
});

test("send-email supports cart recovery without inventing a discount", () => {
  const email = source("supabase/functions/send-email/index.ts");
  assert.match(email, /"cart-recovery": \(data\) =>/);
  assert.match(email, /const couponLine = couponCode/);
  assert.match(email, /Eligibility is rechecked when you order\./);
});
