import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

test("signed-in cart product hydration stays scoped to the active store", () => {
  const source = readFileSync(path.resolve(process.cwd(), "src/context/CartContext.tsx"), "utf8");
  const hydrationStart = source.indexOf("// 2. Fetch product details for those items");
  const hydrationEnd = source.indexOf("// Convert dbCart to CartItem format", hydrationStart);

  assert.notEqual(hydrationStart, -1);
  assert.notEqual(hydrationEnd, -1);
  const hydrationQuery = source.slice(hydrationStart, hydrationEnd);

  assert.match(hydrationQuery, /\.from\("products"\)[\s\S]*?\.eq\("store_id", storeId\)[\s\S]*?\.in\("id", productIds\)/);
});
