import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  LOCAL_PREVIEW_STORE_ID,
  isPreviewCatalogStore,
  resolveStorefrontCatalogSource,
} from "@/lib/storefront/storefront-product-truth";

const REAL_STORE_ID = "11111111-1111-4111-8111-111111111111";

test("real UUID storefronts use authoritative product sources", () => {
  assert.equal(resolveStorefrontCatalogSource(REAL_STORE_ID, REAL_STORE_ID), "storefront-api");
  assert.equal(resolveStorefrontCatalogSource(REAL_STORE_ID, null), "database");
  assert.equal(isPreviewCatalogStore(REAL_STORE_ID), false);
});

test("only explicit preview store identifiers enable seed catalog mode", () => {
  assert.equal(resolveStorefrontCatalogSource("preview-fashion", "preview-fashion"), "preview-seed");
  assert.equal(resolveStorefrontCatalogSource("preview-modal-store", "preview-modal-store"), "preview-seed");
  assert.equal(resolveStorefrontCatalogSource(LOCAL_PREVIEW_STORE_ID, LOCAL_PREVIEW_STORE_ID), "preview-seed");
  assert.equal(resolveStorefrontCatalogSource("merchant-preview-name", "merchant-preview-name"), "database");
});

test("local preview sentinel stays aligned with default-store.ts", () => {
  const defaultStoreSource = readFileSync(new URL("../cms/default-store.ts", import.meta.url), "utf8");
  assert.match(defaultStoreSource, new RegExp(LOCAL_PREVIEW_STORE_ID.replaceAll("-", "\\-")));
});

test("product hooks cannot swallow authoritative failures into seed fallbacks", () => {
  const hookSource = readFileSync(new URL("../../hooks/useProducts.ts", import.meta.url), "utf8");

  assert.doesNotMatch(hookSource, /using seed fallback/i);
  assert.doesNotMatch(hookSource, /catch\s*\(/);
  assert.doesNotMatch(hookSource, /mapped\.length\s*>\s*0\s*\?/);
  assert.match(hookSource, /catalogSource === "preview-seed"/);
  assert.match(hookSource, /throw new Error\(`Storefront products request failed:/);
  assert.match(hookSource, /throw new Error\(`Storefront product request failed:/);
  assert.match(hookSource, /throw new Error\(`Storefront products-by-ids request failed:/);
  assert.match(hookSource, /throw new Error\(`Storefront featured products request failed:/);
});
