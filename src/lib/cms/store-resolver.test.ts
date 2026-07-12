import { describe, expect, it } from "@/test/test-utils";
import { buildResolvedStoreFromRecords } from "@/lib/cms/store-resolver";

describe("store resolver mapping", () => {
  it("uses business profile blueprints and theme package defaults when records are sparse", () => {
    const store = buildResolvedStoreFromRecords(
      {
        id: "store-1",
        name: "Service Studio",
        slug: "service-studio",
        description: null,
        currency_code: null,
        locale: null,
        is_published: true,
        store_type: "clothing",
      },
      {
        blueprint_id: "single-product",
      },
      {
        preset_id: "ocean-teal",
        theme_package_id: "ocean-teal",
        mode: null,
        typography: null,
        components: null,
        colors: null,
        resolved_tokens: null,
      },
      [],
      [],
      [],
    );

    expect(store.description).toBe("A focused storefront designed to sell one hero product with a tighter story and stronger conversion path.");
    expect(store.theme.presetId).toBe("ocean-teal");
    expect(store.theme.themePackageId).toBe("ocean-teal");
    expect(store.theme.mode).toBe("dark");
    expect(store.pages[0]?.slug).toBe("/");
  });
});
