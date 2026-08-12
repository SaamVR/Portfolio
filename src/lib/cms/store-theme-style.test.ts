import assert from "node:assert/strict";
import test from "node:test";
import { defaultStore } from "./default-store";
import { getStoreThemePresentationStyle, getStoreThemeStyle } from "./store-theme-style";

test("theme presentation maps radius, density, and aesthetic into storefront CSS variables", () => {
  const presentation = getStoreThemePresentationStyle({
    ...defaultStore.theme,
    aesthetic: "brutalist",
    radiusScale: 0,
    densityScale: 1,
  });

  assert.equal(presentation["--radius"], "0.12rem");
  assert.equal(presentation["--store-section-space"], "6.00rem");
  assert.match(presentation["--store-card-shadow"], /6px 6px/);
});

test("package border radius remains the fallback when no radius scale is stored", () => {
  const style = getStoreThemeStyle({
    ...defaultStore.theme,
    borderRadius: "1.75rem",
    radiusScale: undefined,
  }) as Record<string, string>;

  assert.equal(style["--radius"], "1.75rem");
});

test("theme font families resolve to self-hosted font variables", () => {
  const style = getStoreThemeStyle({
    ...defaultStore.theme,
    headingFont: "'Outfit', sans-serif",
    bodyFont: "'Plus Jakarta Sans', sans-serif",
  }) as Record<string, string>;

  assert.equal(style["--font-heading"], "var(--font-outfit), sans-serif");
  assert.equal(style["--font-body"], "var(--font-plus-jakarta-sans), sans-serif");
});
