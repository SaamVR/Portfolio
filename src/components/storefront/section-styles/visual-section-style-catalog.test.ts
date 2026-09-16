import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  CATEGORY_REGISTRY_ADDITIONS,
  CATEGORY_VISUAL_STYLES,
  HERO_VISUAL_STYLES,
  MOBILE_REVIEW_WIDTHS,
  resolveCategoryVisualStyleId,
  resolveHeroVisualStyleId,
} from "./visual-section-style-catalog";

const readSibling = (fileName: string) => readFileSync(fileURLToPath(new URL(fileName, import.meta.url)), "utf8");

test("hero catalog exposes six genuinely named art directions with stable legacy ids", () => {
  assert.deepEqual(HERO_VISUAL_STYLES.map((style) => style.id), [
    "split",
    "poster",
    "centered",
    "full-bleed",
    "collection-spotlight",
    "editorial",
  ]);
  assert.equal(new Set(HERO_VISUAL_STYLES.map((style) => style.label)).size, 6);
  assert.equal(resolveHeroVisualStyleId("poster"), "poster");
  assert.equal(resolveHeroVisualStyleId("unknown-style"), "full-bleed");
});

test("category catalog keeps existing ids and isolates the two Lane A registry additions", () => {
  assert.deepEqual(CATEGORY_VISUAL_STYLES.map((style) => style.id), [
    "cards",
    "carousel",
    "circular-categories",
    "collection-tiles",
    "masonry",
    "compact-list",
  ]);
  assert.deepEqual(CATEGORY_REGISTRY_ADDITIONS, ["circular-categories", "collection-tiles"]);
  assert.equal(resolveCategoryVisualStyleId("collection-tiles"), "collection-tiles");
  assert.equal(resolveCategoryVisualStyleId("unknown-style"), "cards");
});

test("mobile review contract covers the required 360/390/430 widths", () => {
  assert.deepEqual(MOBILE_REVIEW_WIDTHS, [360, 390, 430]);

  const categorySource = readSibling("./CategoryVisualStyles.tsx");
  assert.match(categorySource, /min-w-\[82vw\]/, "editorial rail should use viewport-relative cards on narrow screens");
  assert.match(categorySource, /grid-cols-2/, "circular categories should respect the platform two-column mobile ceiling");
  assert.match(categorySource, /grid-cols-2/, "tile and image-card styles should remain two-column capable on mobile");

  const heroSource = readSibling("./HeroVisualStyles.tsx");
  assert.match(heroSource, /flex-col[^\n]*sm:flex-row/, "hero actions should stack before the small breakpoint");
  assert.match(heroSource, /clamp\(/, "hero display type should scale instead of relying on one fixed mobile size");
});
