import assert from "node:assert/strict";
import test from "node:test";
import { resolveStorefrontEffectPolicy } from "@/lib/storefront-platform/effects/effect-policy";

test("mobile storefronts default to reduced expensive effects", () => {
  for (const width of [360, 390, 430]) {
    const policy = resolveStorefrontEffectPolicy({ viewportWidth: width });
    assert.equal(policy.mode, "reduced");
    assert.equal(policy.allowContinuousMotion, false);
    assert.equal(policy.allowParallax, false);
    assert.equal(policy.allowBackdropFilter, false);
  }
});

test("prefers-reduced-motion and save-data override desktop effects", () => {
  assert.equal(resolveStorefrontEffectPolicy({ viewportWidth: 1440, prefersReducedMotion: true }).mode, "reduced");
  assert.equal(resolveStorefrontEffectPolicy({ viewportWidth: 1440, saveData: true }).mode, "reduced");
});

test("desktop effects remain constrained and never require continuous JS motion", () => {
  const policy = resolveStorefrontEffectPolicy({ viewportWidth: 1440 });
  assert.equal(policy.allowContinuousMotion, false);
  assert.equal(policy.maxBackdropBlurPx, 8);
});
