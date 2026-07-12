import { describe, expect, it } from "@/test/test-utils";
import { applyLegacyHomepageSettingsToPages } from "@/lib/cms/homepage-settings-adapter";
import type { StorePage } from "@/lib/cms/schema";

describe("homepage settings adapter", () => {
  const homepage: StorePage = {
    id: "page-home",
    slug: "/",
    title: "Home",
    isHomepage: true,
    seoTitle: "",
    seoDescription: "",
    blocks: [
      {
        id: "hero-1",
        type: "hero",
        sortOrder: 0,
        isVisible: true,
        props: {},
      },
      {
        id: "featured-1",
        type: "featured-products",
        sortOrder: 1,
        isVisible: true,
        props: {
          limit: 6,
        },
      },
      {
        id: "promo-1",
        type: "promo-banner",
        sortOrder: 2,
        isVisible: true,
        props: {
          title: "Keep mine",
        },
      },
    ],
  };

  it("hydrates legacy homepage settings into matching block props", () => {
    const [page] = applyLegacyHomepageSettingsToPages(
      [homepage],
      [
        { key: "hero_section", value: { title: "Legacy hero", cta_text: "Shop now" } },
        { key: "home_featured", value: { tagline: "Curated picks" } },
      ],
    );

    expect(page.blocks[0]?.type).toBe("hero");
    expect(page.blocks[0]?.props).toEqual({
      title: "Legacy hero",
      ctaText: "Shop now",
    });
    expect(page.blocks[1]?.type).toBe("featured-products");
    expect(page.blocks[1]?.props).toEqual({
      limit: 6,
      tagline: "Curated picks",
    });
  });

  it("does not overwrite existing block-level customization", () => {
    const [page] = applyLegacyHomepageSettingsToPages(
      [homepage],
      [
        { key: "promo_banner", value: { title: "Legacy promo", subtitle: "Legacy subtitle" } },
      ],
    );

    expect(page.blocks[2]?.type).toBe("promo-banner");
    expect(page.blocks[2]?.props).toEqual({
      title: "Keep mine",
      subtitle: "Legacy subtitle",
    });
  });
});
