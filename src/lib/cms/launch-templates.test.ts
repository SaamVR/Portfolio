import { describe, expect, it } from "@/test/test-utils";
import {
  instantiateLaunchPages,
  launchTemplates,
  type LaunchTemplateId,
} from "@/lib/cms/launch-templates";
import { createStoreSlug } from "@/lib/slug";

describe("launch templates", () => {
  it("exposes the three Phase 2 business templates", () => {
    expect(launchTemplates.map((template) => template.id)).toEqual(["clothing", "food", "general"]);
  });

  it("creates slug-safe store URLs with the shared slug style", () => {
    expect(createStoreSlug("My Fancy Store!")).toBe("my-fancy-store");
    expect(createStoreSlug("")).toBe("my-store");
  });

  it.each<LaunchTemplateId>(["clothing", "food", "general"])("instantiates %s pages with fresh IDs and homepage blocks", (templateId) => {
    const pages = instantiateLaunchPages(templateId);
    const homepage = pages.find((page) => page.isHomepage);
    const ids = new Set<string>();

    for (const page of pages) {
      ids.add(page.id);
      for (const block of page.blocks) {
        ids.add(block.id);
      }
    }

    expect(homepage).toBeDefined();
    expect(homepage?.blocks.some((block) => block.type === "hero")).toBe(true);
    expect(ids.size).toBe(pages.length + pages.reduce((sum, page) => sum + page.blocks.length, 0));
  });

  it("keeps launch template CTAs free of hardcoded sale routes", () => {
    const serialized = JSON.stringify(launchTemplates);
    expect(serialized.includes("/shop?sale=1")).toBe(false);
  });
});
