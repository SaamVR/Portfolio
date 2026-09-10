import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => readFileSync(path.resolve(root, file), "utf8");

test("desktop storefront dropdowns are keyboard reachable and expose expanded state", () => {
  const source = read("src/components/Navbar.tsx");
  assert.match(source, /onFocusCapture=/);
  assert.match(source, /onBlurCapture=/);
  assert.match(source, /aria-expanded=/);
  assert.match(source, /invisible opacity-0 pointer-events-none/);
  assert.doesNotMatch(source, /shopDropdownOpen/);
});

test("cart drawer behaves as a modal dialog and restores keyboard focus", () => {
  const source = read("src/components/CartDrawer.tsx");
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-labelledby="cart-drawer-title"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /closeButtonRef\.current\?\.focus/);
  assert.match(source, /previouslyFocusedRef\.current\?\.focus/);
  assert.match(source, />You may also like</);
});

test("product image lightbox supports modal keyboard interaction and touch-sized controls", () => {
  const source = read("src/components/ProductImageGallery.tsx");
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /event\.key === "ArrowLeft"/);
  assert.match(source, /event\.key === "ArrowRight"/);
  assert.match(source, /flex h-11 w-11/);
  assert.match(source, /md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100/);
});

test("storefront reduced-motion preference and mobile PDP actions have explicit safeguards", () => {
  const css = read("src/index.css");
  const product = read("src/components/storefront/product/ProductDetailRenderer.tsx");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\[data-storefront-template\] \*/);
  assert.match(product, /flex h-11 w-11 items-center justify-center rounded-full border/);
  assert.match(product, /inline-flex min-h-11 items-center justify-center rounded-md bg-primary/);
  assert.match(product, /aria-label="Decrease quantity"/);
  assert.match(product, /aria-label="Increase quantity"/);
});

test("storefront search exposes combobox semantics with touch-sized controls", () => {
  const source = read("src/components/SearchBar.tsx");
  assert.match(source, /role="combobox"/);
  assert.match(source, /aria-autocomplete="list"/);
  assert.match(source, /aria-controls=/);
  assert.match(source, /aria-activedescendant=/);
  assert.match(source, /id=\{listboxId\}.*role="listbox"/s);
  assert.match(source, /absolute right-0 flex h-11 w-11/);
  assert.doesNotMatch(source, /<span\s+role="button"/);
});

test("shop filters use touch-sized controls and a modal mobile drawer", () => {
  const source = read("src/components/storefront/shop/ContextAwareShopPage.tsx");
  assert.match(source, /aria-labelledby="shop-filter-drawer-title"/);
  assert.match(source, /aria-label="Close filters"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /min-h-11 rounded-full border px-3 py-2/);
  assert.match(source, /h-11 w-full rounded-lg border/);
});
