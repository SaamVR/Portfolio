import test from "node:test";
import assert from "node:assert/strict";
import { buildTemplatePreviewStore } from "@/lib/cms/storefront-preview";
import { storefrontTemplateIds } from "@/lib/cms/storefront-templates";

test("buildTemplatePreviewStore creates a published preview seeded from template data", () => {
  const store = buildTemplatePreviewStore("fashion");

  assert.equal(store.isPublished, true);
  assert.equal(store.slug, "fashion");
  assert.ok(store.pages.length > 0);
  assert.equal(store.pages[0]?.isHomepage, true);
});

test("every non-blank built-in preview exposes canonical category demo hero media", () => {
  const mediaByTemplate = new Map<string, string>();

  for (const templateId of storefrontTemplateIds) {
    if (templateId === "blank") continue;
    const store = buildTemplatePreviewStore(templateId);
    const hero = store.pages[0]?.blocks.find((block) => block.type === "hero");
    if (!hero || hero.type !== "hero") throw new Error(`${templateId} preview hero missing`);

    assert.equal(hero.props.mediaType, "image", `${templateId} should use image demo media`);
    assert.match(hero.props.mediaUrl ?? "", /^\/demo-assets\//, `${templateId} should use a repo-owned demo asset`);
    mediaByTemplate.set(templateId, hero.props.mediaUrl ?? "");
  }

  assert.notEqual(mediaByTemplate.get("fashion"), mediaByTemplate.get("electronics"));
  assert.notEqual(mediaByTemplate.get("food"), mediaByTemplate.get("hotel"));
  assert.notEqual(mediaByTemplate.get("beauty"), mediaByTemplate.get("real-estate"));
});
