import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createBlogArticleBlock,
  insertBlogArticleContent,
  parseBlogArticleBlocks,
  serializeBlogArticleBlocks,
} from "./blog-article-blocks";
import { blogArticleTemplates } from "./blog-templates";

describe("Blog article block adapter", () => {
  it("round-trips existing ecommerce Markdown without changing its meaning", () => {
    const markdown = [
      "## What matters",
      "",
      "Choose **durable** materials and read the [care guide](/blog/care-guide).",
      "",
      "- Fit",
      "- Material",
      "- Warranty",
      "",
      "> Buy for the way you actually use the product.",
      "",
      "[[products]]",
      "",
      "### Quick comparison",
      "",
      "| Option | Best for |",
      "| --- | --- |",
      "| A | Everyday use |",
    ].join("\n");

    const blocks = parseBlogArticleBlocks(markdown);

    assert.deepEqual(blocks.map((block) => block.type), [
      "heading",
      "paragraph",
      "list",
      "quote",
      "products",
      "heading",
      "table",
    ]);
    assert.equal(serializeBlogArticleBlocks(blocks), markdown);
  });

  it("round-trips every current ecommerce article template exactly", () => {
    for (const template of blogArticleTemplates) {
      const serialized = serializeBlogArticleBlocks(parseBlogArticleBlocks(template.content));
      assert.equal(serialized, template.content, `structured editor changed the ${template.id} template body`);
    }
  });

  it("round-trips dynamic product source directives as first-class product blocks", () => {
    const markdown = "Intro.\n\n[[products source=category category=Travel%20Bags limit=6]]\n\nClosing.";
    const blocks = parseBlogArticleBlocks(markdown);
    const productBlock = blocks.find((block) => block.type === "products");

    assert.deepEqual(productBlock, {
      type: "products",
      source: "category",
      category: "Travel Bags",
      limit: 6,
      layout: "grid",
    });
    assert.equal(serializeBlogArticleBlocks(blocks), markdown);
  });

  it("round-trips non-grid merchandising layouts exactly", () => {
    const markdown = "Intro.\n\n[[products source=featured limit=3 layout=lookbook]]\n\nClosing.";
    const blocks = parseBlogArticleBlocks(markdown);
    const productBlock = blocks.find((block) => block.type === "products");

    assert.deepEqual(productBlock, {
      type: "products",
      source: "featured",
      limit: 3,
      layout: "lookbook",
    });
    assert.equal(serializeBlogArticleBlocks(blocks), markdown);
  });

  it("round-trips migration-free CTA directives as first-class structured blocks", () => {
    const markdown = "Intro.\n\n[[cta kind=category label=Shop%20bags heading=Ready%20to%20browse%3F text=Explore%20the%20collection. category=Travel%20Bags]]\n\nClosing.";
    const blocks = parseBlogArticleBlocks(markdown);
    const ctaBlock = blocks.find((block) => block.type === "cta");

    assert.deepEqual(ctaBlock, {
      type: "cta",
      kind: "category",
      label: "Shop bags",
      heading: "Ready to browse?",
      text: "Explore the collection.",
      category: "Travel Bags",
    });
    assert.equal(serializeBlogArticleBlocks(blocks), markdown);
  });

  it("preserves fenced and unsupported Markdown as raw blocks", () => {
    const markdown = [
      "# Legacy body heading",
      "",
      "```json",
      "{\"safe\": true}",
      "```",
      "",
      "#### Deep heading kept raw",
    ].join("\n");

    const blocks = parseBlogArticleBlocks(markdown);

    assert.equal(blocks.length, 3);
    assert.ok(blocks.every((block) => block.type === "markdown"));
    assert.equal(serializeBlogArticleBlocks(blocks), markdown);
  });

  it("keeps manual product directives as backward-compatible first-class blocks", () => {
    const blocks = parseBlogArticleBlocks("Intro paragraph.\n\n[[products]]\n\nClosing paragraph.");
    const productBlock = blocks.find((block) => block.type === "products");

    assert.deepEqual(productBlock, { type: "products", source: "manual", limit: 4, layout: "grid" });
    assert.equal(serializeBlogArticleBlocks(blocks), "Intro paragraph.\n\n[[products]]\n\nClosing paragraph.");
  });

  it("inserts assistant Markdown into the active text block", () => {
    const blocks = parseBlogArticleBlocks("## Start\n\nHelpful paragraph.\n\n## Next");
    const next = insertBlogArticleContent(blocks, 1, {
      type: "markdown",
      markdown: "[Related guide](/blog/related-guide)",
    });

    assert.equal(
      serializeBlogArticleBlocks(next),
      "## Start\n\nHelpful paragraph. [Related guide](/blog/related-guide)\n\n## Next",
    );
  });

  it("inserts assistant Markdown after a non-text target instead of at article end", () => {
    const blocks = parseBlogArticleBlocks("## Start\n\n- One\n- Two\n\n## Next");
    const next = insertBlogArticleContent(blocks, 1, {
      type: "markdown",
      markdown: "[Related guide](/blog/related-guide)",
    });

    assert.equal(
      serializeBlogArticleBlocks(next),
      "## Start\n\n- One\n- Two\n\n[Related guide](/blog/related-guide)\n\n## Next",
    );
  });

  it("places one manual grid product block after the active structured block and avoids duplicates", () => {
    const blocks = parseBlogArticleBlocks("## Start\n\nIntro.\n\n## Next");
    const withProducts = insertBlogArticleContent(blocks, 1, { type: "products" });
    const duplicateAttempt = insertBlogArticleContent(withProducts, 0, { type: "products" });

    assert.equal(
      serializeBlogArticleBlocks(withProducts),
      "## Start\n\nIntro.\n\n[[products]]\n\n## Next",
    );
    assert.deepEqual(duplicateAttempt, withProducts);
  });

  it("creates supported starter blocks without introducing a new storage format", () => {
    assert.deepEqual(createBlogArticleBlock("heading"), { type: "heading", level: 2, text: "New section" });
    assert.deepEqual(createBlogArticleBlock("products"), { type: "products", source: "manual", limit: 4, layout: "grid" });
    assert.deepEqual(createBlogArticleBlock("cta"), {
      type: "cta",
      kind: "shop",
      heading: "Ready to explore?",
      text: "Browse the products and options available from this store.",
      label: "Shop now",
    });
    assert.match(serializeBlogArticleBlocks([createBlogArticleBlock("table")]), /\| Option \| Details \|/);
  });
});
