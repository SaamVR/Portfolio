import { describe, expect, it } from "@/test/test-utils";
import { instantiateStorePagesFromBlueprint } from "@/lib/cms/blueprint-pages";
import { normalizePageBlueprintPayload } from "@/lib/cms/page-blueprints";
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
