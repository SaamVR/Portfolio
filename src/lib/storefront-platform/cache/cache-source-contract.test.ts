import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");

test("products and search routes isolate private previews from public cache headers", () => {
  for (const path of [
    "src/app/api/storefront/products/route.ts",
    "src/app/api/storefront/products/search/route.ts",
  ]) {
    const contents = source(path);
    assert.match(contents, /getValidatedStorePreviewTokenFromApiRequest/);
    assert.match(contents, /private, no-store, max-age=0/);
    assert.match(contents, /jsonPublicStorefrontCache/);
    assert.match(contents, /previewToken\s*\?/);
  }
});

test("merchant cache revalidation is authenticated, no-store, and tag scoped", () => {
  const contents = source("src/app/api/cache/storefront/revalidate/route.ts");
  assert.match(contents, /getAuthenticatedUser/);
  assert.match(contents, /canManageStore/);
  assert.match(contents, /jsonNoStore/);
  assert.match(contents, /revalidateTag\(`store:\$\{storeId\}`/);
  assert.match(contents, /revalidateTag\(`store:\$\{storeId\}:products`/);
});
