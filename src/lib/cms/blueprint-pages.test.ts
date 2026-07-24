import { describe, expect, it } from "@/test/test-utils";
import { instantiateStorePagesFromBlueprint } from "@/lib/cms/blueprint-pages";
import { normalizePageBlueprintPayload } from "@/lib/cms/page-blueprints";
import type { CmsPageBlueprint } from "@/lib/cms/page-blueprints";
import type { StoreBlueprintDefinition } from "@/lib/cms/store-blueprints";
import assert from "node:assert/strict";

describe("blueprint page instantiation", () => {
  it("builds a homepage from the blueprint block set", () => {
    const pages = instantiateStorePagesFromBlueprint("gadgets");
    const homepage = pages.find((page) => page.isHomepage);

    expect(homepage).toBeDefined();
    expect(homepage?.slug).toBe("/");
    expect(homepage?.blocks[0]?.type).toBe("hero");
    expect((homepage?.blocks[0]?.props as { title?: string })?.title).toBe("Gear Up with");
  });

  it("adds recommended secondary pages from page blueprints", () => {
    const pages = instantiateStorePagesFromBlueprint("general-catalog");

    expect(pages.some((page) => page.slug === "/policy")).toBe(true);
    expect(pages.some((page) => page.slug === "/about-brand")).toBe(true);
  });

  it("adds a shop page for catalog-style commerce blueprints", () => {
    const pages = instantiateStorePagesFromBlueprint("general-catalog");
    const shopPage = pages.find((page) => page.slug === "/shop");

    expect(shopPage).toBeDefined();
    expect(shopPage?.title).toBe("Shop");
    expect(shopPage?.isHomepage).toBe(false);
  });

  it("does not add a shop page for single-product launch blueprints", () => {
    const pages = instantiateStorePagesFromBlueprint("single-product");

    expect(pages.some((page) => page.slug === "/shop")).toBe(false);
  });

  it("instantiates custom recommended page blueprints from the provided collection", () => {
    const blueprint = {
      id: "custom-blueprint",
      name: "Custom blueprint",
      shortName: "Custom",
      description: "Custom blueprint description",
      businessFamily: "commerce",
      catalogMode: "multi_product",
      group: "Custom",
      capabilities: [],
      recommendedPageSet: ["custom-lookbook"],
      recommendedBlockSet: ["hero", "rich-text"],
      defaultTheme: {
        presetId: "minimal",
        mode: "light",
        aesthetic: "minimal",
        effects: { scrollReveals: false, hoverEffects: true, parallax: false, intensity: "subtle" },
        headingFont: "'Inter', sans-serif",
        bodyFont: "'Inter', sans-serif",
        borderRadius: "0.75rem",
        customCssVars: {},
      },
      hero: {
        tagline: "Custom tagline",
        title: "Custom",
        highlight: "Lookbook",
        subtitle: "Custom subtitle",
      },
      storeDescription: "Custom store description",
      onboarding: {
        steps: [],
      },
      defaultSiteSettings: {},
    } satisfies StoreBlueprintDefinition;

    const pageBlueprints: CmsPageBlueprint[] = [{
      id: "custom-lookbook",
      name: "Custom lookbook",
      description: "Custom lookbook page",
      businessFamily: "commerce",
      catalogModes: ["multi_product"],
      page: {
        slug: "/lookbook",
        title: "Lookbook",
        seoTitle: "Lookbook",
        seoDescription: "Custom lookbook page",
        isHomepage: false,
        blocks: [{
          id: "lookbook-rich-text",
          type: "rich-text",
          isVisible: true,
          visible: true,
          sortOrder: 0,
          props: {
            title: "Lookbook",
            body: "Curated styles",
            align: "left",
          },
        }],
      },
    }];

    const pages = instantiateStorePagesFromBlueprint(blueprint, pageBlueprints);

    expect(pages.some((page) => page.slug === "/lookbook")).toBe(true);
  });

  it("normalizes valid page blueprint payloads and drops invalid blocks", () => {
    const payload = normalizePageBlueprintPayload({
      slug: "/promo",
      title: "Promo",
      isHomepage: false,
      blocks: [
        {
          id: "rich-1",
          type: "rich-text",
          isVisible: true,
          visible: true,
          sortOrder: 99,
          props: {
            title: "Promo headline",
            body: "Promo body",
            align: "center",
          },
        },
        {
          id: "bad-rich",
          type: "rich-text",
          isVisible: true,
          visible: true,
          sortOrder: 100,
          props: {
            title: "",
            body: "",
          },
        },
      ],
    });

    expect(payload.blocks).toHaveLength(1);
    expect(payload.blocks[0]?.sortOrder).toBe(0);
  });

  it("rejects page blueprint payloads without valid blocks", () => {
    assert.throws(() => normalizePageBlueprintPayload({
      slug: "/promo",
      title: "Promo",
      blocks: [],
    }), /at least one valid block/i);
  });
});
