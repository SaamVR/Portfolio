import assert from "node:assert/strict";
import test from "node:test";
import {
  FEATURED_PRODUCT_SECTION_RENDERER_KEYS,
  PROMO_SECTION_RENDERER_KEYS,
  STORY_SECTION_RENDERER_KEYS,
  resolveFeaturedProductSectionStyle,
  resolvePromoSectionStyle,
  resolveStorySectionStyle,
} from "./lane-c-style-keys";

test("Lane C exposes the requested renderer keys", () => {
  assert.deepEqual(Object.values(FEATURED_PRODUCT_SECTION_RENDERER_KEYS), [
    "featured-products/editorial-grid",
    "featured-products/center-focus-rail",
    "featured-products/compact-commerce-grid",
    "featured-products/product-spotlight",
    "featured-products/magazine-rail",
    "featured-products/dense-catalog",
  ]);
  assert.deepEqual(Object.values(PROMO_SECTION_RENDERER_KEYS), [
    "promo-banner/image-campaign-banner",
    "promo-banner/dual-promo",
    "promo-banner/campaign-cta",
  ]);
  assert.deepEqual(Object.values(STORY_SECTION_RENDERER_KEYS), [
    "rich-text/split-brand-story",
    "rich-text/editorial-quote",
    "rich-text/minimal-story",
  ]);
});

test("Lane C resolvers ignore legacy and unknown variants", () => {
  assert.equal(resolveFeaturedProductSectionStyle("editorial-grid"), "editorial-grid");
  assert.equal(resolveFeaturedProductSectionStyle("carousel"), "center-focus-rail");
  assert.equal(resolveFeaturedProductSectionStyle("3-col"), null);
  assert.equal(resolvePromoSectionStyle("campaign-cta"), "campaign-cta");
  assert.equal(resolvePromoSectionStyle("contact-cta"), null);
  assert.equal(resolveStorySectionStyle("minimal-story"), "minimal-story");
  assert.equal(resolveStorySectionStyle("brand-story"), null);
  assert.equal(resolveStorySectionStyle(undefined), null);
});
