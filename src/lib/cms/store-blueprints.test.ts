import { describe, expect, it } from "@/test/test-utils";
import { buildBlueprintDefinitionFromRow, fallbackStoreBlueprints } from "@/lib/cms/store-blueprints";

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
});
