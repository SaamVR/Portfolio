import { describe, expect, it } from "@/test/test-utils";
import { getLifecycleStatusForDate, resolveEffectiveFeatures } from "@/lib/platform/control-plane";

describe("resolveEffectiveFeatures", () => {
  const features = [
    { key: "cms_pages", name: "CMS Pages", description: "", category: "content", default_visible: true, is_active: true },
    { key: "media_library", name: "Media Library", description: "", category: "content", default_visible: true, is_active: true },
    { key: "advanced_analytics", name: "Advanced Analytics", description: "", category: "analytics", default_visible: true, is_active: true },
  ];

  it("uses package mapping as the base grant", () => {
    const featureMap = resolveEffectiveFeatures({
      features,
      planMappings: [{ feature_key: "cms_pages", enabled: true }],
      storeOverrides: [],
      emailOverrides: [],
      isPlatformAdmin: false,
    });

    expect(featureMap.get("cms_pages")?.enabled).toBe(true);
    expect(featureMap.get("media_library")?.enabled).toBe(false);
  });

  it("applies store override over plan", () => {
    const featureMap = resolveEffectiveFeatures({
      features,
      planMappings: [{ feature_key: "cms_pages", enabled: true }],
      storeOverrides: [{ feature_key: "cms_pages", enabled: false }],
      emailOverrides: [],
      isPlatformAdmin: false,
    });

    expect(featureMap.get("cms_pages")?.enabled).toBe(false);
    expect(featureMap.get("cms_pages")?.reason).toBe("store_override_disabled");
  });

  it("applies email override over store and plan", () => {
    const featureMap = resolveEffectiveFeatures({
      features,
      planMappings: [{ feature_key: "advanced_analytics", enabled: false }],
      storeOverrides: [{ feature_key: "advanced_analytics", enabled: false }],
      emailOverrides: [{ feature_key: "advanced_analytics", enabled: true }],
      isPlatformAdmin: false,
    });

    expect(featureMap.get("advanced_analytics")?.enabled).toBe(true);
    expect(featureMap.get("advanced_analytics")?.reason).toBe("email_override_enabled");
  });
});

describe("getLifecycleStatusForDate", () => {
  it("moves inactive stores into lifecycle buckets", () => {
    const now = new Date("2026-07-02T00:00:00.000Z");
    expect(getLifecycleStatusForDate(new Date("2026-06-20T00:00:00.000Z"), now)).toBe("active");
    expect(getLifecycleStatusForDate(new Date("2026-05-10T00:00:00.000Z"), now)).toBe("at_risk");
    expect(getLifecycleStatusForDate(new Date("2026-05-01T00:00:00.000Z"), now)).toBe("reminded");
    expect(getLifecycleStatusForDate(new Date("2026-04-01T00:00:00.000Z"), now)).toBe("archived");
    expect(getLifecycleStatusForDate(new Date("2026-03-01T00:00:00.000Z"), now)).toBe("pending_delete");
  });
});
