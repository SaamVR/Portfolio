import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => readFileSync(path.resolve(root, file), "utf8");

test("shared renderer consumes A-owned normalized explicit options", () => {
  const renderer = source("src/components/storefront/StorefrontBlockRenderer.tsx");
  assert.match(renderer, /getExplicitVariantOptions\(template\.id, block\)/);
  assert.match(renderer, /variantOptions=\{variantOptions\}/);
  assert.doesNotMatch(renderer, /block\.variantOptions\?\.[A-Za-z]/);
});

test("R4 option wiring preserves product and category source truth", () => {
  const products = source("src/components/FeaturedProducts.tsx");
  const categories = source("src/components/CategoryShowcase.tsx");
  assert.match(products, /switch \(source\)/);
  assert.match(products, /availableProducts\.filter/);
  assert.match(products, /productsToRender\.slice\(0, limit\)/);
  assert.match(categories, /useProductCategories\(storeId\)/);
  assert.match(categories, /useProductTypes\(storeId\)/);
  assert.match(categories, /categoriesToRender/);
});
test("presentation primitives do not parse legacy props or theme spacing", () => {
  const primitives = source("src/components/storefront/section-styles/section-option-primitives.ts");
  for (const legacyKey of ["mediaFit", "textAlignment", "align", "paddingSize"]) {
    assert.doesNotMatch(primitives, new RegExp(`props\\.${legacyKey}`));
  }
  assert.doesNotMatch(primitives, /theme|storefront-theme-customization/i);
  assert.match(primitives, /resolveSectionSpacing/);
});

test("all five core shared families receive only presentation options", () => {
  const hero = source("src/components/HeroSection.tsx");
  const categories = source("src/components/CategoryShowcase.tsx");
  const products = source("src/components/FeaturedProducts.tsx");
  const promo = source("src/components/PromoBanner.tsx");
  const renderer = source("src/components/storefront/StorefrontBlockRenderer.tsx");
  assert.match(hero, /variantOptions\?: StorefrontVariantOptions/);
  assert.match(categories, /variantOptions\?: StorefrontVariantOptions/);
  assert.match(products, /variantOptions\?: StorefrontVariantOptions/);
  assert.match(promo, /variantOptions\?: StorefrontVariantOptions/);
  assert.match(renderer, /variantOptions\?: StorefrontVariantOptions/);
  assert.match(renderer, /<RichTextVisualStyles[\s\S]*variantOptions=\{variantOptions\}/);
});
