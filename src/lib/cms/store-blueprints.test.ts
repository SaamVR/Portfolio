import { describe, expect, it } from "@/test/test-utils";
import { buildBlueprintDefinitionFromRow, buildBlueprintSiteSettingsEntries, fallbackStoreBlueprints, findStoreBlueprintById } from "@/lib/cms/store-blueprints";

describe("store blueprint seeds", () => {
  it("include payment settings in every fallback blueprint", () => {
    for (const blueprint of fallbackStoreBlueprints) {
      const paymentSettings = blueprint.defaultSiteSettings.payment_settings as Record<string, unknown> | undefined;

      expect(typeof paymentSettings?.cod_enabled).toBe("boolean");
      expect(typeof paymentSettings?.bkash_enabled).toBe("boolean");
      expect(typeof paymentSettings?.nagad_enabled).toBe("boolean");
      expect(typeof paymentSettings?.prepaid_badge_text).toBe("string");
      expect(typeof paymentSettings?.prepayment_discount_type).toBe("string");
      expect(typeof paymentSettings?.prepayment_discount_value).toBe("number");
    }
  });

  it("merges partial default site settings from rows instead of replacing them wholesale", () => {
    const blueprint = buildBlueprintDefinitionFromRow({
      id: "general-catalog",
      name: "General Catalog",
      default_site_settings: {
        storefront_profile: {
          checkout_mode: "whatsapp",
        },
      },
    });

    const storefrontProfile = blueprint.defaultSiteSettings.storefront_profile as Record<string, unknown>;
    const paymentSettings = blueprint.defaultSiteSettings.payment_settings as Record<string, unknown>;

    expect(storefrontProfile.product_visibility).toBe("catalog");
    expect(storefrontProfile.checkout_mode).toBe("whatsapp");
    expect(typeof paymentSettings.cod_enabled).toBe("boolean");
    expect(typeof paymentSettings.prepaid_badge_text).toBe("string");
  });

  it("builds site setting entries and allows targeted overrides", () => {
    const entries = buildBlueprintSiteSettingsEntries(fallbackStoreBlueprints[0], {
      payment_settings: {
        cod_enabled: false,
        bkash_enabled: true,
      },
    });

    const paymentSettings = entries.find((entry) => entry.key === "payment_settings")?.value as Record<string, unknown> | undefined;
    expect(paymentSettings?.cod_enabled).toBe(false);
    expect(paymentSettings?.bkash_enabled).toBe(true);
  });

  it("resolves custom blueprint rows from their legacy template or neutral fallback base", () => {
    const blueprint = buildBlueprintDefinitionFromRow({
      id: "luxury-hotel",
      legacy_template_id: "general",
      name: "Luxury Hotel",
      short_name: "Hotel",
      business_family: "service",
      catalog_mode: "inquiry_only",
    });

    expect(blueprint.id).toBe("luxury-hotel");
    expect(blueprint.shortName).toBe("Hotel");
    expect(blueprint.defaultSiteSettings.payment_settings).toBeDefined();
    expect(blueprint.hero.subtitle.length).toBeGreaterThan(0);
  });

  it("finds custom blueprints from a loaded blueprint collection", () => {
    const customBlueprint = {
      ...fallbackStoreBlueprints[0],
      id: "custom-blueprint",
      name: "Custom Blueprint",
      shortName: "Custom",
    };

    expect(findStoreBlueprintById("custom-blueprint", [customBlueprint])).toEqual(customBlueprint);
  });
});
