import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

test("shared product-card wishlist action keeps a 44px mobile touch target", () => {
  const source = readFileSync(
    path.resolve(root, "src/components/storefront/product/ProductCardFoundation.tsx"),
    "utf8",
  );

  assert.match(source, /right-3 top-3 z-20 flex h-11 w-11 items-center justify-center/);
  assert.match(source, /sm:h-8 sm:w-8/);
  assert.match(source, /<Heart className=\{cn\("h-4 w-4"/);
});
