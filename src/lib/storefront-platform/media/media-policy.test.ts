import assert from "node:assert/strict";
import test from "node:test";
import { isProductionMediaSourceAllowed, resolveStorefrontMediaPolicy, resolveStorefrontObjectPosition } from "@/lib/storefront-platform/media/media-policy";

test("only a genuine LCP hero opts into eager priority", () => {
  assert.equal(resolveStorefrontMediaPolicy({ role: "hero", isLcp: true }).priority, true);
  assert.equal(resolveStorefrontMediaPolicy({ role: "hero" }).priority, false);
  assert.equal(resolveStorefrontMediaPolicy({ role: "product-card", isLcp: true }).priority, false);
  assert.equal(resolveStorefrontMediaPolicy({ role: "product-card" }).loading, "lazy");
});

test("product media gets responsive mobile-first sizes and focal point clamping", () => {
  assert.match(resolveStorefrontMediaPolicy({ role: "product-card" }).sizes, /430px/);
  assert.equal(resolveStorefrontObjectPosition({ x: 120, y: -5 }), "100% 0%");
});

test("large inline base64 images are rejected by production media policy", () => {
  assert.equal(isProductionMediaSourceAllowed("https://cdn.example.com/image.webp"), true);
  assert.equal(isProductionMediaSourceAllowed(`data:image/png;base64,${"A".repeat(1024)}`), true);
  assert.equal(isProductionMediaSourceAllowed(`data:image/png;base64,${"A".repeat(64 * 1024)}`), false);
  assert.equal(isProductionMediaSourceAllowed("data:image/svg+xml,%E0%A4%A"), false);
});
