import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.resolve(root, relativePath), "utf8");
}

test("low-end mobile follow-up keeps audited navigation and CTA targets at least 44px", () => {
  const signup = source("src/app/signup/page.tsx");
  const layout = source("src/components/Layout.tsx");
  const backToTop = source("src/components/BackToTop.tsx");
  const cart = source("src/views/Cart.tsx");

  assert.match(signup, /\[&_header_a\]:min-h-11/);
  assert.match(layout, /nav\[aria-label="Main navigation"\] > div > div:first-child > a \{[\s\S]*?display: flex;[\s\S]*?min-height: 2\.75rem;[\s\S]*?align-items: center;/);
  assert.match(backToTop, /flex h-11 w-11 items-center justify-center/);
  assert.ok((cart.match(/inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-8 py-3/g) || []).length >= 2);
});

test("product-card title targets stay touch-safe across shared and compact Beauty variants", () => {
  const productCard = source("src/components/storefront/product/ProductCardFoundation.tsx");
  const beautyCard = source("src/components/storefront/beauty/BeautyProductCard.tsx");

  assert.match(productCard, /h-\[2\.75rem\] min-h-\[2\.75rem\]/);
  assert.match(productCard, /<Link href=\{href\} className="block group-hover:text-primary transition-colors">/);
  assert.match(beautyCard, /<ProductCardTitle[^>]*className="h-\[2\.875rem\] min-h-\[2\.875rem\][^"]*sm:h-\[2\.75rem\] sm:min-h-\[2\.75rem\]/);
  assert.doesNotMatch(beautyCard, /<ProductCardTitle[^>]*className="h-10 min-h-10/);
});
