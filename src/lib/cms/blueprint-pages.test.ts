import { describe, expect, it } from "@/test/test-utils";
import { instantiateStorePagesFromBlueprint } from "@/lib/cms/blueprint-pages";

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
});
