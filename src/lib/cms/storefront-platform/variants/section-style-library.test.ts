import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSectionStylesPath } from "@/lib/admin-paths";
import type { StorePageBlock } from "@/lib/cms/schema";
import { getSectionStylePreviewFixture } from "./preview-fixtures";
import { getSectionStyleLibraryEntries } from "./section-style-library";
import { canonicalStorefrontVariantRegistry } from "./registry";

describe("section style library", () => {
  it("gives every registered style lifecycle, preview, visibility, and version metadata", () => {
    for (const definition of canonicalStorefrontVariantRegistry) {
      assert.ok(definition.version >= 1, `${definition.blockType}:${definition.id} needs a version`);
      assert.ok(definition.lifecycle, `${definition.blockType}:${definition.id} needs a lifecycle`);
      assert.ok(definition.visibility, `${definition.blockType}:${definition.id} needs visibility`);
      assert.ok(definition.previewSpec.fixtureId, `${definition.blockType}:${definition.id} needs a preview fixture`);
      assert.ok(definition.previewSpec.desktop.mode);
      assert.ok(definition.previewSpec.mobile.mode);
    }
  });  it("keeps the current style marked and preserves compatibility ordering", () => {
    const block = {
      id: "hero-1",
      type: "hero",
      sortOrder: 0,
      isVisible: true,
      visible: true,
      layoutVariant: "editorial",
      props: { title: "Story", mediaUrl: "/demo.jpg" },
    } as StorePageBlock;

    const entries = getSectionStyleLibraryEntries("threads", block);
    assert.ok(entries.length > 0);
    assert.equal(entries.find((entry) => entry.current)?.definition.id, "editorial");
    assert.ok(entries.every((entry) => entry.definition.lifecycle === "published" || entry.current));
    assert.ok(entries.some((entry) => entry.recommended));
  });

  it("uses canonical preview fixtures and stable Section Styles routing", () => {
    assert.equal(getSectionStylePreviewFixture("hero").id, "hero-standard");
    assert.equal(getSectionStylePreviewFixture("featured-products").items?.length, 4);
    assert.equal(
      buildSectionStylesPath({ storeId: "store-1", pageId: "page-1", blockId: "hero-1" }),
      "/admin/page-builder/styles?page=page-1&block=hero-1&storeId=store-1",
    );
  });
});