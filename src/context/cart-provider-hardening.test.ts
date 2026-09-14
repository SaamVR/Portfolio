import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(
  path.join(process.cwd(), "src/context/CartContext.tsx"),
  "utf8",
);

test("cart provider normalizes browser state and enforces checkout bounds", () => {
  assert.match(source, /normalizePersistedCartItems\(parsed, storeId\)/);
  assert.match(source, /MAX_CART_LINES/);
  assert.match(source, /MAX_CART_QUANTITY/);
  assert.match(source, /clampCartQuantity\(i\.quantity \+ 1\)/);
});

test("signed-in cart merge validates the union of local and database products", () => {
  assert.match(source, /candidateProductIds = Array\.from\(new Set\(\[/);
  assert.match(source, /\.\.\.localItems\.map\(\(item\) => item\.productId\)/);
  assert.match(source, /\.\.\.dbRows\.map\(\(item\) => item\.product_id\)/);
  assert.ok((source.match(/\.eq\("is_available", true\)/g) ?? []).length >= 2);
});

test("cart restore distinguishes unavailable products from legitimate zero-price products", () => {
  assert.match(source, /if \(!prod\) return \[\];/);
  assert.match(source, /price: Number\(prod\.price \?\? 0\)/);
  assert.equal(/\.filter\(item => item\.price > 0\)/.test(source), false);
});
