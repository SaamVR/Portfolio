import assert from "node:assert/strict";
import test from "node:test";
import { PRIVATE_NO_STORE_CACHE_CONTROL } from "@/lib/http/cache-control";
import { PUBLIC_STOREFRONT_CACHE_CONTROL } from "@/lib/http/public-cache";
import { normalizeStorefrontPreviewToken, resolveStorefrontCachePolicy } from "@/lib/storefront-platform/cache/cache-policy";

test("anonymous storefront responses may use the shared public cache", () => {
  const policy = resolveStorefrontCachePolicy(null);
  assert.equal(policy.mode, "public");
  assert.equal(policy.mayUseSharedCache, true);
  assert.equal(policy.cacheControl, PUBLIC_STOREFRONT_CACHE_CONTROL);
});

test("preview storefront responses are private and no-store", () => {
  const policy = resolveStorefrontCachePolicy("preview-secret");
  assert.equal(policy.mode, "private-preview");
  assert.equal(policy.mayUseSharedCache, false);
  assert.equal(policy.cacheControl, PRIVATE_NO_STORE_CACHE_CONTROL);
});

test("blank preview tokens do not create a private cache partition", () => {
  assert.equal(normalizeStorefrontPreviewToken("   "), null);
  assert.equal(resolveStorefrontCachePolicy("   ").mode, "public");
});
