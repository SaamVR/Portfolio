import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultBlock } from "@/lib/cms/block-library";
import { getStorefrontEditorQualityIssues } from "./quality-assist";

describe("storefront editor quality assist", () => {
  it("warns when an image-led hero has no media and no primary action", () => {
    const hero = createDefaultBlock("hero", 0);
    if (hero.type !== "hero") throw new Error("Expected hero block");
    hero.props = { ...hero.props, mediaUrl: "", ctaText: "" };
    const issues = getStorefrontEditorQualityIssues(hero);

    assert.ok(issues.some((issue) => issue.id === "missing-mobile-media"));
    assert.ok(issues.some((issue) => issue.id === "missing-primary-action"));
  });

  it("flags high product limits without mutating the section", () => {
    const block = createDefaultBlock("featured-products", 0);
    if (block.type !== "featured-products") throw new Error("Expected featured-products block");
    block.props = { ...block.props, limit: 18 };
    const before = JSON.stringify(block);
    const issues = getStorefrontEditorQualityIssues(block);

    assert.ok(issues.some((issue) => issue.id === "heavy-item-limit"));
    assert.equal(JSON.stringify(block), before);
  });
});
