import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasBlogCtaDirectives,
  parseBlogCtaDirective,
  serializeBlogCtaDirective,
  splitBlogContentAtCtaDirectives,
  stripBlogCtaDirectives,
} from "./blog-cta";

describe("Blog CTA directives", () => {
  it("round-trips encoded CTA copy and category intent", () => {
    const directive = serializeBlogCtaDirective({
      kind: "category",
      label: "Shop travel bags",
      heading: "Ready for your next trip?",
      text: "Browse the bags selected for travel and everyday carry.",
      category: "Travel Bags",
    });

    assert.equal(
      directive,
      "[[cta kind=category label=Shop%20travel%20bags heading=Ready%20for%20your%20next%20trip%3F text=Browse%20the%20bags%20selected%20for%20travel%20and%20everyday%20carry. category=Travel%20Bags]]",
    );
    assert.deepEqual(parseBlogCtaDirective(directive), {
      kind: "category",
      label: "Shop travel bags",
      heading: "Ready for your next trip?",
      text: "Browse the bags selected for travel and everyday carry.",
      category: "Travel Bags",
    });
  });

  it("falls back unknown CTA kinds to a safe Shop action", () => {
    assert.deepEqual(parseBlogCtaDirective("[[cta kind=unknown]]"), {
      kind: "shop",
      label: "Shop now",
    });
  });

  it("does not match CTA directives across multiple article lines", () => {
    const content = "Before [[cta kind=contact\nlabel=Contact%20us]] after";
    assert.equal(hasBlogCtaDirectives(content), false);
  });

  it("splits article content around multiple CTA positions", () => {
    const content = [
      "Intro paragraph.",
      "",
      "[[cta kind=shop label=Shop%20now]]",
      "",
      "Buying advice.",
      "",
      "[[cta kind=contact label=Ask%20a%20question]]",
      "",
      "Closing paragraph.",
    ].join("\n");

    const segments = splitBlogContentAtCtaDirectives(content);
    assert.equal(segments.length, 5);
    assert.equal(segments[0].type, "content");
    assert.deepEqual(segments[1], { type: "cta", directive: { kind: "shop", label: "Shop now" } });
    assert.equal(segments[2].type, "content");
    assert.deepEqual(segments[3], { type: "cta", directive: { kind: "contact", label: "Ask a question" } });
    assert.equal(segments[4].type, "content");
  });

  it("strips CTA metadata from plain article text", () => {
    const content = "Useful intro.\n\n[[cta kind=whatsapp label=Chat%20now heading=Need%20help%3F]]\n\nUseful ending.";
    assert.equal(stripBlogCtaDirectives(content).replace(/\s+/g, " ").trim(), "Useful intro. Useful ending.");
  });
});
