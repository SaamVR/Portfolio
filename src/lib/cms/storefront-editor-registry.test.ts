import { describe, expect, it } from "@/test/test-utils";
import { createDefaultBlock } from "@/lib/cms/block-library";
import { getBasicLayoutVariantOptions } from "@/lib/cms/storefront-editor-registry";

describe("storefront editor canonical layout metadata adapter", () => {
  it("projects canonical hero metadata instead of maintaining an editor-only variant list", () => {
    const options = getBasicLayoutVariantOptions("fashion", "hero");

    const ids = options.map((option) => option.id);
    for (const id of ["full-bleed", "split", "centered", "editorial", "poster", "collection-spotlight"]) {
      expect(ids).toContain(id);
    }
    expect(options.every((option) => Boolean(option.guidance))).toBe(true);
  });

  it("filters media-required layouts when the selected block has no primary media", () => {
    const hero = createDefaultBlock("hero", 0);
    if (hero.type !== "hero") throw new Error("Expected hero block");
    hero.props = { ...hero.props, mediaUrl: "" };

    const options = getBasicLayoutVariantOptions("fashion", "hero", hero).map((option) => option.id);

    expect(options).not.toContain("full-bleed");
    expect(options).not.toContain("poster");
    expect(options).toContain("centered");
    expect(options).toContain("split");
  });

  it("uses canonical recommendation metadata when ordering specialized layouts", () => {
    const options = getBasicLayoutVariantOptions("electronics", "comparison");

    expect(options[0]?.id).toBe("tech-spec");
    expect(options[0]?.recommended).toBe(true);
  });
});
