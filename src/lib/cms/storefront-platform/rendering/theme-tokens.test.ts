import assert from "node:assert/strict";
import test from "node:test";
import { defaultStore } from "@/lib/cms/default-store";
import { resolveStorefrontSemanticTokens } from "./theme-tokens";

test("semantic storefront tokens alias merchant palette instead of replacing it", () => {
  const tokens = resolveStorefrontSemanticTokens({
    ...defaultStore.theme,
    densityScale: 0.5,
  });

  assert.equal(tokens["--store-brand"], "var(--primary)");
  assert.equal(tokens["--store-surface"], "var(--background)");
  assert.equal(tokens["--store-text"], "var(--foreground)");
  assert.equal(tokens["--store-section-gap-mobile"], "0rem");
  assert.equal(tokens["--store-section-gap-desktop"], "0rem");
});

test("merchant effect preferences feed semantic decoration and motion intensity", () => {
  const tokens = resolveStorefrontSemanticTokens({
    ...defaultStore.theme,
    effects: {
      scrollReveals: false,
      hoverEffects: false,
      parallax: true,
      intensity: "bold",
    },
  });

  assert.equal(tokens["--store-decoration-intensity"], "1");
  assert.equal(tokens["--store-motion-intensity"], "0");
  assert.equal(tokens["--store-parallax-enabled"], "1");
});


test("section spacing presets resolve independently from component density", () => {
  const compact = resolveStorefrontSemanticTokens({
    ...defaultStore.theme,
    densityScale: 1,
    sectionSpacing: "compact",
  });
  const airy = resolveStorefrontSemanticTokens({
    ...defaultStore.theme,
    densityScale: 0,
    sectionSpacing: "airy",
  });

  assert.equal(compact["--store-section-gap-mobile"], "1rem");
  assert.equal(compact["--store-section-gap-desktop"], "1.25rem");
  assert.equal(airy["--store-section-gap-mobile"], "2rem");
  assert.equal(airy["--store-section-gap-desktop"], "3rem");
  assert.notEqual(compact["--store-card-spacing"], airy["--store-card-spacing"]);
});
