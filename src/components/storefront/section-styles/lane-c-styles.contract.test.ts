import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => readFileSync(path.resolve(root, file), "utf8");

test("Featured Products visual styles preserve the existing product data pipeline", () => {
  const featured = source("src/components/FeaturedProducts.tsx");
  assert.match(featured, /switch \(source\)/);
  assert.match(featured, /availableProducts\.filter/);
  assert.match(featured, /productsToRender\.slice\(0, limit\)/);
  assert.match(featured, /resolveFeaturedProductSectionStyle\(layoutVariant\)/);
  assert.match(featured, /<ProductCard product=\{product\}/);
});

test("Promo and Story styles remain presentation-only branches", () => {
  const promo = source("src/components/PromoBanner.tsx");
  const renderer = source("src/components/storefront/StorefrontBlockRenderer.tsx");
  assert.match(promo, /const isContactVariant = overrides\?\.layoutVariant === "contact-cta"/);
  assert.match(promo, /resolvePromoSectionStyle\(overrides\?\.layoutVariant\)/);
  assert.match(renderer, /source=\{mergedProps\.source\}/);
  assert.match(renderer, /category=\{mergedProps\.category\}/);
  assert.match(renderer, /productType=\{mergedProps\.productType\}/);
  assert.match(renderer, /blockLayoutVariant === "blog-posts"/);
  assert.match(renderer, /<RichTextBlock \{\.\.\.mergedProps\} templateId=\{template\?\.id\} \/>/);
});

test("new visual renderers expose stable renderer markers and touch-safe CTAs", () => {
  const products = source("src/components/storefront/section-styles/FeaturedProductsVisualStyles.tsx");
  const promo = source("src/components/storefront/section-styles/PromoBannerVisualStyles.tsx");
  const story = source("src/components/storefront/section-styles/RichTextVisualStyles.tsx");
  for (const key of ["editorial-grid", "center-focus-rail", "compact-commerce-grid", "product-spotlight", "magazine-rail", "dense-catalog"]) {
    assert.match(products, new RegExp(`data-section-renderer=\\"featured-products/${key}\\"`));
  }
  assert.match(promo, /min-h-11/);
  assert.match(promo, /promo-banner\/image-campaign-banner/);
  assert.match(promo, /promo-banner\/dual-promo/);
  assert.match(promo, /promo-banner\/campaign-cta/);
  assert.match(story, /rich-text\/split-brand-story/);
  assert.match(story, /rich-text\/editorial-quote/);
  assert.match(story, /rich-text\/minimal-story/);
});
