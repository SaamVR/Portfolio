import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("public resolver reads use tagged shared cache while preview reads bypass it", () => {
  const contents = readFileSync("src/lib/cms/store-resolver.ts", "utf8");
  assert.match(contents, /unstable_cache/);
  assert.match(contents, /return getStoreBySlugCached\(slug, requestedPageSlug\)/);
  assert.match(contents, /return getStoreBySlugUncached\(slug, previewToken, options\)/);
  assert.match(contents, /buildStorefrontContentTags/);
  assert.doesNotMatch(contents, /getStoreBySlugRequestCached/);
  assert.doesNotMatch(contents, /import \{ cache \} from "react"/);
});
