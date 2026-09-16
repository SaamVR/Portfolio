import test from "node:test";
import assert from "node:assert/strict";
import { buildTemplatePreviewStore } from "@/lib/cms/storefront-preview";
import { buildTemplateCatalogSeedRows } from "@/lib/cms/template-demo-seeds";
import { readStorefrontTaxonomySnapshot } from "@/lib/storefront-taxonomy-snapshot";
import { storefrontTemplateIds } from "@/lib/cms/storefront-templates";
import { resolveExplicitTemplatePreviewStore } from "@/lib/cms/store-resolver";

test("buildTemplatePreviewStore creates a published preview seeded from template data", () => {
  const store = buildTemplatePreviewStore("fashion");

  assert.equal(store.isPublished, true);
  assert.equal(store.slug, "fashion");
  assert.ok(store.pages.length > 0);
  assert.equal(store.pages[0]?.isHomepage, true);
});

test("threads preview keeps the reference homepage composition order", () => {
  const store = buildTemplatePreviewStore("threads");
  const homepage = store.pages.find((page) => page.isHomepage);

  assert.ok(homepage);
  assert.deepEqual(
    homepage.blocks.filter((block) => block.isVisible !== false).map((block) => block.type),
    [
      "hero",
      "trust-badges",
      "category-showcase",
      "promo-banner",
      "featured-products",
      "recommended-products",
      "social-feed",
      "faq-accordion",
      "rich-text",
    ],
  );
});

test("threads preview content is populated from its dedicated demo seed", () => {
  const store = buildTemplatePreviewStore("threads");
  const homepage = store.pages.find((page) => page.isHomepage);
  const hero = homepage?.blocks.find((block) => block.type === "hero");
  const categories = homepage?.blocks.find((block) => block.type === "category-showcase");
  const recommended = homepage?.blocks.find((block) => block.type === "recommended-products");
  const community = homepage?.blocks.find((block) => block.type === "social-feed");
  const faq = homepage?.blocks.find((block) => block.type === "faq-accordion");

  assert.ok(hero && hero.type === "hero");
  assert.match(hero.props.mediaUrl ?? "", /^\/demo-assets\//);
  assert.ok(categories && categories.type === "category-showcase");
  assert.ok(Array.isArray(categories.props.items));
  assert.ok(categories.props.items.length > 0);

  assert.ok(recommended && recommended.type === "recommended-products");
  assert.equal(recommended.props.title, "New at EZCOMO");

  assert.ok(community && community.type === "social-feed");
  assert.ok(Array.isArray(community.props.images));
  assert.ok(community.props.images.length > 0);
  assert.equal(
    new Set(community.props.images).size,
    community.props.images.length,
    "Threads community preview should not repeat the same seeded image",
  );

  assert.ok(faq && faq.type === "faq-accordion");
  assert.ok(Array.isArray(faq.props.faqs));
  assert.ok(faq.props.faqs.length > 0);
});


test("threads preview exposes the same seeded catalog taxonomy used by product fallback data", () => {
  const store = buildTemplatePreviewStore("threads");
  const seeded = buildTemplateCatalogSeedRows(store.id, "threads");
  const taxonomy = readStorefrontTaxonomySnapshot(store.siteSettings);
  const homepage = store.pages.find((page) => page.isHomepage);
  const categories = homepage?.blocks.find((block) => block.type === "category-showcase");
  const featured = homepage?.blocks.find((block) => block.type === "featured-products");
  const recommended = homepage?.blocks.find((block) => block.type === "recommended-products");

  assert.ok(seeded.categoryRows.length > 0);
  assert.ok(seeded.productRows.length > 0);
  assert.deepEqual(
    taxonomy.categories.map((entry) => entry.name),
    seeded.categoryRows.map((row) => row.name),
  );
  assert.deepEqual(
    taxonomy.types.map((entry) => entry.name),
    seeded.productTypeRows.map((row) => row.name),
  );

  assert.ok(categories && categories.type === "category-showcase");
  const categoryItems = categories.props.items ?? [];
  assert.deepEqual(
    categoryItems.map((item) => item.label),
    seeded.categoryRows.map((row) => row.name),
  );

  assert.ok(featured && featured.type === "featured-products");
  assert.equal(featured.props.source, "featured-or-all");
  assert.equal("items" in featured.props, false);
  assert.ok(recommended && recommended.type === "recommended-products");
  assert.equal(recommended.props.source, "newest");
  assert.equal("items" in recommended.props, false);

  for (const product of seeded.productRows) {
    assert.match(product.image_url ?? "", /^\/demo-assets\//);
  }
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


test("explicit template storefront routing is gated and limited to built-in template ids", () => {
  assert.equal(resolveExplicitTemplatePreviewStore("fashion", false), null);
  assert.equal(resolveExplicitTemplatePreviewStore("merchant-store", true), null);

  const preview = resolveExplicitTemplatePreviewStore("fashion", true);
  assert.equal(preview?.id, "preview-fashion");
  assert.equal(preview?.slug, "fashion");
  assert.equal(preview?.isPublished, true);
});
