import { describe, expect, it } from "@/test/test-utils";
import {
  allStoreCatalogModes,
  getCatalogModeLabel,
  isSettingsTabCompatible,
  supportsDedicatedShopPage,
  supportsTransactionalCheckout,
} from "@/lib/cms/storefront-compat";

describe("storefront compatibility helpers", () => {
  it("covers the full catalog mode matrix including newer commerce variants", () => {
    expect(allStoreCatalogModes).toEqual([
      "single_product",
      "multi_product",
      "menu",
      "inquiry_only",
      "landing_only",
      "digital_download",
      "multi_vendor",
      "pre_order",
      "donation_tiers",
    ]);
  });

  it("keeps transactional settings hidden for assisted-conversion storefronts", () => {
    expect(supportsTransactionalCheckout("commerce", "landing_only")).toBe(false);
    expect(supportsTransactionalCheckout("commerce", "inquiry_only")).toBe(false);
    expect(isSettingsTabCompatible("payment", "commerce", "landing_only")).toBe(false);
    expect(isSettingsTabCompatible("delivery", "commerce", "inquiry_only")).toBe(false);
    expect(isSettingsTabCompatible("payment", "commerce", "multi_product")).toBe(true);
  });

  it("only exposes a dedicated shop page for catalog-style commerce modes", () => {
    expect(supportsDedicatedShopPage("commerce", "multi_product")).toBe(true);
    expect(supportsDedicatedShopPage("commerce", "digital_download")).toBe(true);
    expect(supportsDedicatedShopPage("commerce", "single_product")).toBe(false);
    expect(supportsDedicatedShopPage("service", "inquiry_only")).toBe(false);
  });

  it("formats catalog mode labels for admin surfaces", () => {
    expect(getCatalogModeLabel("landing_only")).toBe("landing only");
    expect(getCatalogModeLabel("digital_download")).toBe("digital download");
  });
});
