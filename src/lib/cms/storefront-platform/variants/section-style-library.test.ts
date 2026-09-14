import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSectionStylesPath } from "@/lib/admin-paths";
import type { StorePageBlock } from "@/lib/cms/schema";
import { getSectionStylePreviewFixture, getSectionStylePreviewFixtureById } from "./preview-fixtures";
import { applySectionStyleToBlock, buildSectionStylePersistencePatch, getSectionStyleLibraryEntries, getSectionStyleResetTarget } from "./section-style-library";
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
  });

  it("keeps the current style marked and preserves compatibility ordering", () => {
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

  it("changes only presentation when a section style is applied or reset", () => {
    const block = {
      id: "hero-1",
      type: "hero",
      sortOrder: 0,
      isVisible: true,
      visible: true,
      layoutVariant: "split",
      props: { title: "Keep this", mediaUrl: "/keep.jpg", ctaText: "Shop" },
    } as StorePageBlock;
    const props = block.props;

    const styled = applySectionStyleToBlock(block, "editorial");
    assert.equal(styled.layoutVariant, "editorial");
    assert.equal(styled.props, props);
    assert.deepEqual(styled.props, block.props);
    assert.deepEqual(buildSectionStylePersistencePatch("editorial"), { layout_variant: "editorial" });

    const reset = applySectionStyleToBlock(styled, null);
    assert.equal(reset.layoutVariant, undefined);
    assert.equal(reset.props, props);
    assert.deepEqual(buildSectionStylePersistencePatch(null), { layout_variant: null });
  });


  it("uses template presentation defaults when resetting a section style", () => {
    const hero = {
      id: "hero-1", type: "hero", sortOrder: 0, isVisible: true, visible: true,
      layoutVariant: "editorial", props: { title: "Keep this", mediaUrl: "/keep.jpg" },
    } as StorePageBlock;
    const promo = {
      id: "promo-1", type: "promo-banner", sortOrder: 1, isVisible: true, visible: true,
      layoutVariant: "contact-cta", props: { title: "Keep promo" },
    } as StorePageBlock;

    const heroTarget = getSectionStyleResetTarget("threads", hero);
    assert.equal(heroTarget?.definition.id, "split");
    assert.equal(heroTarget?.templateDefault, true);

    const promoTarget = getSectionStyleResetTarget("threads", promo);
    assert.equal(promoTarget?.definition.id, "standard");
    assert.equal(promoTarget?.templateDefault, false);
  });

  it("uses canonical preview fixtures and stable Section Styles routing", () => {
    assert.equal(getSectionStylePreviewFixture("hero").id, "hero-standard");
    assert.equal(getSectionStylePreviewFixtureById("hero-standard", "hero").title, "Made to carry your story");
    assert.equal(getSectionStylePreviewFixture("featured-products").items?.length, 4);
    assert.equal(
      buildSectionStylesPath({ storeId: "store-1", pageId: "page-1", blockId: "hero-1" }),
      "/admin/page-builder/styles?page=page-1&block=hero-1&storeId=store-1",
    );
  });
});
