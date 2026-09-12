import assert from "node:assert/strict";
import test from "node:test";
import { defaultStore } from "@/lib/cms/default-store";
import { buildStorefrontAestheticCss, resolveStorefrontAesthetic } from "./aesthetic-engine";

test("proof aesthetics resolve from existing stored aesthetic values", () => {
  assert.equal(resolveStorefrontAesthetic({ ...defaultStore.theme, aesthetic: "minimal" }).id, "flat");
  assert.equal(resolveStorefrontAesthetic({ ...defaultStore.theme, aesthetic: "editorial" }).id, "editorial");
  assert.equal(resolveStorefrontAesthetic({ ...defaultStore.theme, aesthetic: "glassmorphism" }).id, "glass");
  assert.equal(resolveStorefrontAesthetic({ ...defaultStore.theme, aesthetic: "artisan" }).id, "artisan");
});

test("glass changes presentation tokens without replacing merchant color variables", () => {
  const profile = resolveStorefrontAesthetic({ ...defaultStore.theme, aesthetic: "glassmorphism" });

  assert.equal(profile.tokens["--store-backdrop-blur"], "18px");
  assert.equal(profile.tokens["--store-surface-alpha"], "0.72");
  assert.equal(profile.tokens["--store-brand"], undefined);
});

test("scoped aesthetic css includes mobile reductions and reduced-motion safeguards", () => {
  const css = buildStorefrontAestheticCss('[data-store-theme-scope="test"]');

  assert.match(css, /max-width: 767px/);
  assert.match(css, /data-store-aesthetic-engine="glass"/);
  assert.match(css, /--store-backdrop-blur: 6px/);
  assert.match(css, /data-store-aesthetic-engine="editorial"[\s\S]*--store-overlap-offset: 0px/);
  assert.match(css, /data-store-aesthetic-engine="artisan"[\s\S]*--store-decoration-opacity: 0.32/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
