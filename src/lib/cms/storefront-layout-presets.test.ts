import { describe, expect, it } from "@/test/test-utils";
import { getStorefrontTemplateDefinition } from "@/lib/cms/storefront-templates";
import {
  getStorefrontLayoutPreset,
  getStorefrontLayoutPresets,
} from "@/lib/cms/storefront-layout-presets";

describe("storefront layout presets", () => {
  it("registers four Fashion V2 presets and no implicit presets for unrelated templates", () => {
    expect(getStorefrontLayoutPresets("fashion").map((preset) => preset.id)).toEqual([
      "fashion-editorial",
      "fashion-culture-graphic",
      "fashion-boutique",
      "fashion-drop-streetwear",
    ]);
    expect(getStorefrontLayoutPresets("electronics")).toEqual([]);
  });

  it("keeps every Fashion preset inside the Fashion-compatible shared block system", () => {
    const compatible = new Set(getStorefrontTemplateDefinition("fashion").compatibleBlockSet);

    for (const preset of getStorefrontLayoutPresets("fashion")) {
      for (const section of preset.sections) {
        expect(compatible.has(section.type)).toBe(true);
      }
    }
  });

  it("uses stable unique slot ids and leads each Fashion preset with a hero", () => {
    for (const preset of getStorefrontLayoutPresets("fashion")) {
      const slotIds = preset.sections.map((section) => section.slotId);
      expect(new Set(slotIds).size).toBe(slotIds.length);
      expect(preset.sections[0]?.type).toBe("hero");
    }
  });

  it("locks preset application to preserving merchant-authored content and extra blocks", () => {
    for (const preset of getStorefrontLayoutPresets("fashion")) {
      expect(preset.contentPolicy).toBe("preserve-merchant-content");
      expect(preset.extraBlockPolicy).toBe("preserve-after-preset-flow");
    }
  });

  it("returns a preset by id without manufacturing fallback content", () => {
    const preset = getStorefrontLayoutPreset("fashion-culture-graphic");

    expect(preset?.templateId).toBe("fashion");
    expect(preset?.sections.find((section) => section.slotId === "new-drop")?.props).toEqual({ source: "newest" });
    expect(preset?.sections.some((section) => section.type === "testimonials")).toBe(false);
  });
});
