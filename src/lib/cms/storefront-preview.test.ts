import test from "node:test";
import assert from "node:assert/strict";
import { buildTemplatePreviewStore } from "@/lib/cms/storefront-preview";

test("buildTemplatePreviewStore creates a published preview seeded from template data", () => {
  const store = buildTemplatePreviewStore("fashion");

  assert.equal(store.isPublished, true);
  assert.equal(store.slug, "fashion");
  assert.ok(store.pages.length > 0);
  assert.equal(store.pages[0]?.isHomepage, true);
});
