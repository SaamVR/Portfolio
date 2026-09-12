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
  assert.equal(tokens["--store-section-spacing"], "4.38rem");
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
