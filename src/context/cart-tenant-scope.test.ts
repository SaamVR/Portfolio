import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

test("signed-in cart product hydration stays scoped to the active store", () => {
  const source = readFileSync(path.resolve(process.cwd(), "src/context/CartContext.tsx"), "utf8");

  assert.match(
    source,
    /const candidateProductIds = Array\.from\(new Set\(\[[\s\S]*?localItems[\s\S]*?dbRows[\s\S]*?\]\)\);/,
  );
  assert.match(
    source,
    /\.from\("products"\)[\s\S]*?\.eq\("store_id", storeId\)[\s\S]*?\.eq\("is_available", true\)[\s\S]*?\.in\("id", candidateProductIds\)/,
  );
  assert.match(source, /const validLocalItems = localItems\.filter\(\(item\) => productsMap\.has\(item\.productId\)\)/);
});
