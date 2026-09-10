import { describe, expect, it } from "@/test/test-utils";
import {
  getAvailableSettingsTabs,
  mobilePinnedSettingTabs,
} from "@/lib/cms/site-settings-tabs";

describe("site settings information architecture", () => {
  it("keeps commerce configuration in Site Settings without presenting Page Builder as a settings panel", () => {
    const values = getAvailableSettingsTabs({
      businessFamily: "commerce",
      catalogMode: "multi_product",
      templateId: "fashion",
    }).map((tab) => tab.value);

    expect(values).toContain("payment");
    expect(values).toContain("delivery");
    expect(values).toContain("couriers");
    expect(values).toContain("domain");
    expect(values).not.toContain("page_builder");
    expect(mobilePinnedSettingTabs).toContain("couriers");
  });

  it("hides physical delivery and courier configuration for non-physical storefronts", () => {
    const values = getAvailableSettingsTabs({
      businessFamily: "commerce",
      catalogMode: "digital_download",
      templateId: "digital-downloads",
    }).map((tab) => tab.value);

    expect(values).not.toContain("delivery");
    expect(values).not.toContain("couriers");
  });
});
