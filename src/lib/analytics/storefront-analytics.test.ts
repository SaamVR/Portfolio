import { describe, expect, it } from "@/test/test-utils";
import {
  extractAttribution,
  inferPageType,
  mapEventToGa4,
  mapEventToMeta,
} from "@/lib/analytics/storefront-analytics";

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

  it("keeps Blog CTA clicks as a GA4/first-party custom event without a Meta standard-event mapping", () => {
    const event = {
      eventName: "blog_cta_click" as const,
      pageType: "blog_article",
      metadata: {
        source: "blog",
        medium: "editorial",
        campaign: "buying-guide",
        content: "cta",
        ctaKind: "whatsapp",
      },
    };

    const ga4Event = mapEventToGa4(event);
    expect(ga4Event.page_type).toBe("blog_article");
    expect(ga4Event.source).toBe("blog");
    expect(ga4Event.medium).toBe("editorial");
    expect(ga4Event.campaign).toBe("buying-guide");
    expect(ga4Event.content).toBe("cta");
    expect(ga4Event.ctaKind).toBe("whatsapp");
    expect(mapEventToMeta(event)).toBeNull();
  });
});