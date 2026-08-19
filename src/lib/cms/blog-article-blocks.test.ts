import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createBlogArticleBlock,
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

  it("keeps product directives as first-class blocks", () => {
    const blocks = parseBlogArticleBlocks("Intro paragraph.\n\n[[products]]\n\nClosing paragraph.");
    const productBlock = blocks.find((block) => block.type === "products");

    assert.ok(productBlock);
    assert.equal(serializeBlogArticleBlocks(blocks), "Intro paragraph.\n\n[[products]]\n\nClosing paragraph.");
  });

  it("creates supported starter blocks without introducing a new storage format", () => {
    assert.deepEqual(createBlogArticleBlock("heading"), { type: "heading", level: 2, text: "New section" });
    assert.deepEqual(createBlogArticleBlock("products"), { type: "products" });
    assert.match(serializeBlogArticleBlocks([createBlogArticleBlock("table")]), /\| Option \| Details \|/);
  });
});
