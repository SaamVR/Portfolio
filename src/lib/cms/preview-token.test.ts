import test from "node:test";
import assert from "node:assert/strict";
import { buildStorePreviewUrl } from "@/lib/cms/preview-token";

test("buildStorePreviewUrl encodes slug and token", () => {
  assert.equal(buildStorePreviewUrl("my store", "a/b?c"), "/stores/my%20store?preview=a%2Fb%3Fc");
});
