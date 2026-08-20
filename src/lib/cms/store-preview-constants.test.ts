import test from "node:test";
import assert from "node:assert/strict";
import {
  STORE_PREVIEW_SLUG_HEADER,
  STORE_PREVIEW_TOKEN_HEADER,
  STORE_PREVIEW_TTL_SECONDS,
  getStorePreviewCookieName,
} from "@/lib/cms/store-preview-constants";

test("store preview transport stays store-scoped and 24 hours", () => {
  assert.equal(STORE_PREVIEW_TOKEN_HEADER, "x-ezcomo-preview-token");
  assert.equal(STORE_PREVIEW_SLUG_HEADER, "x-ezcomo-preview-store-slug");
  assert.equal(STORE_PREVIEW_TTL_SECONDS, 86400);
  assert.equal(getStorePreviewCookieName("Thread-BD"), "ezcomo_store_preview_thread-bd");
});
