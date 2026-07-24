import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultStore } from "@/lib/cms/default-store";
import { fallbackPageBlueprints } from "@/lib/cms/page-blueprints";
import {
  createBuiltInBundle,
  createBuiltInCardBundle,
  getCommunityPreviewAsset,
} from "@/lib/cms/template-gallery-preview";

describe("template gallery preview helpers", () => {
  it("personalizes the built-in preview bundle with merchant store identity", () => {
    const bundle = createBuiltInBundle("landing", fallbackPageBlueprints, {
      ...defaultStore,
      name: "Thread BD",
      description: "Launch-ready merchant storefront",
    });

    const heroBlock = bundle.pages?.[0]?.blocks.find((block) => block.type === "hero");

    assert.equal(bundle.theme, defaultStore.theme);
    assert.equal(heroBlock?.props.title, "Thread BD");
    assert.equal(heroBlock?.props.subtitle, "Launch-ready merchant storefront");
  });

  it("uses the neutral default-store theme for static card previews", () => {
    const bundle = createBuiltInCardBundle("landing", fallbackPageBlueprints, {
      ...defaultStore,
      theme: {
        ...defaultStore.theme,
        mode: "light",
      },
    });

    assert.deepEqual(bundle.theme, defaultStore.theme);
  });

  it("selects preview assets by viewport with sensible fallback order", () => {
    const item = {
      preview_asset_urls: ["desktop.png", "tablet.png", "mobile.png"],
      cover_image: "cover.png",
    };

    assert.equal(getCommunityPreviewAsset(item, "desktop"), "desktop.png");
    assert.equal(getCommunityPreviewAsset(item, "tablet"), "tablet.png");
    assert.equal(getCommunityPreviewAsset(item, "mobile"), "mobile.png");
    assert.equal(getCommunityPreviewAsset({ preview_asset_urls: ["desktop.png"], cover_image: "cover.png" }, "mobile"), "desktop.png");
    assert.equal(getCommunityPreviewAsset({ cover_image: "cover.png" }, "desktop"), "cover.png");
  });
});
