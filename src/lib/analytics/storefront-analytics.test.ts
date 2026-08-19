import { describe, expect, it } from "@/test/test-utils";
import { extractAttribution, inferPageType } from "@/lib/analytics/storefront-analytics";

describe("storefront Blog analytics", () => {
  it("recognizes Blog index and article page types", () => {
    expect(inferPageType("/stores/demo/blog")).toBe("blog_index");
    expect(inferPageType("/stores/demo/blog/buying-guide")).toBe("blog_article");
  });

  it("captures article identity from shoppable Blog product links", () => {
    const attribution = extractAttribution(
      new URLSearchParams({
        utm_source: "blog",
        utm_medium: "editorial",
        utm_campaign: "buying-guide",
        utm_content: "post-123",
      }),
      "",
      "demo.ezcomo.shop",
    );

    expect(attribution).toEqual({
      source: "blog",
      medium: "editorial",
      campaign: "buying-guide",
      term: undefined,
      content: "post-123",
    });
  });
});
