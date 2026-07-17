import test from "node:test";
import assert from "node:assert/strict";
import { buildBlueprintPreviewStore } from "@/lib/cms/storefront-preview";

test("buildBlueprintPreviewStore creates a published preview seeded from blueprint data", () => {
  const store = buildBlueprintPreviewStore("clothing");

  assert.equal(store.isPublished, true);
  assert.equal(store.slug, "clothing");
  assert.ok(store.pages.length > 0);
  assert.equal(store.pages[0]?.isHomepage, true);
});
