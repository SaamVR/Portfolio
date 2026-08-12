import { describe, expect, it } from "@/test/test-utils";
import { instantiateStorePagesFromTemplate } from "@/lib/cms/template-pages";
import { normalizePageTemplatePayload } from "@/lib/cms/page-templates";
import type { StorefrontTemplateSeedDefinition } from "@/lib/cms/storefront-template-seeds";
import assert from "node:assert/strict";

describe("template page instantiation", () => {
  it("builds a homepage from the template block set", () => {
    const pages = instantiateStorePagesFromTemplate("gadgets", { templateSeedId: "gadgets" });
    const homepage = pages.find((page) => page.isHomepage);

    expect(homepage).toBeDefined();
    expect(homepage?.slug).toBe("/");
    expect(homepage?.blocks[0]?.type).toBe("hero");
    expect((homepage?.blocks[0]?.props as { title?: string })?.title).toBe("Gear Up with");
  });

  it("adds recommended secondary pages from page templates", () => {
    const pages = instantiateStorePagesFromTemplate("general-catalog");

    expect(pages.some((page) => page.slug === "/policy")).toBe(true);
    expect(pages.some((page) => page.slug === "/about-brand")).toBe(true);
  });

  it("adds a shop page for catalog-style commerce template seeds", () => {
    const pages = instantiateStorePagesFromTemplate("general-catalog");
    const shopPage = pages.find((page) => page.slug === "/shop");

    expect(shopPage).toBeDefined();
    expect(shopPage?.title).toBe("Shop");
    expect(shopPage?.isHomepage).toBe(false);
  });

  it("does not add a shop page for single-product launch template seeds", () => {
    const pages = instantiateStorePagesFromTemplate("single-product");

    expect(pages.some((page) => page.slug === "/shop")).toBe(false);
  });

  it("ignores recommended page ids that do not exist in the static template registry", () => {
    const templateSeed = {
      id: "custom-template",
      name: "Custom template",
      shortName: "Custom",
      description: "Custom template seed description",
      businessFamily: "commerce",
      catalogMode: "multi_product",
      group: "Custom",
      onboardingMode: "template",
      capabilities: [],
      recommendedPageSet: ["custom-lookbook"],
      compatibleBlockSet: ["hero", "rich-text"],
      recommendedBlockSet: ["hero", "rich-text"],
      defaultBlockSet: ["hero", "rich-text"],
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
    } satisfies StorefrontTemplateSeedDefinition;

    const pages = instantiateStorePagesFromTemplate(templateSeed);

    expect(pages.some((page) => page.slug === "/lookbook")).toBe(false);
  });

  it("normalizes valid page template payloads and drops invalid blocks", () => {
    const payload = normalizePageTemplatePayload({
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

  it("rejects page template payloads without valid blocks", () => {
    assert.throws(() => normalizePageTemplatePayload({
      slug: "/promo",
      title: "Promo",
      blocks: [],
    }), /at least one valid block/i);
  });
});
