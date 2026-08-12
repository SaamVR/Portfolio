import { describe, expect, it } from "@/test/test-utils";
import { buildTemplateSeedDefinitionFromRow, buildTemplateSeedSiteSettingsEntries, fallbackStorefrontTemplateSeeds, findStorefrontTemplateSeedById } from "@/lib/cms/storefront-template-seeds";

describe("storefront template seed compatibility", () => {
  it("includes payment settings in every fallback template seed", () => {
    for (const templateSeed of fallbackStorefrontTemplateSeeds) {
      const paymentSettings = templateSeed.defaultSiteSettings.payment_settings as Record<string, unknown> | undefined;

      expect(typeof paymentSettings?.cod_enabled).toBe("boolean");
      expect(typeof paymentSettings?.bkash_enabled).toBe("boolean");
      expect(typeof paymentSettings?.nagad_enabled).toBe("boolean");
      expect(typeof paymentSettings?.prepaid_badge_text).toBe("string");
      expect(typeof paymentSettings?.prepayment_discount_type).toBe("string");
      expect(typeof paymentSettings?.prepayment_discount_value).toBe("number");
    }
  });

  it("merges partial default site settings from rows instead of replacing them wholesale", () => {
    const templateSeed = buildTemplateSeedDefinitionFromRow({
      id: "general-catalog",
      name: "General Catalog",
      default_site_settings: {
        storefront_profile: {
          checkout_mode: "whatsapp",
        },
      },
    });

    const storefrontProfile = templateSeed.defaultSiteSettings.storefront_profile as Record<string, unknown>;
    const paymentSettings = templateSeed.defaultSiteSettings.payment_settings as Record<string, unknown>;

    expect(storefrontProfile.product_visibility).toBe("catalog");
    expect(storefrontProfile.checkout_mode).toBe("whatsapp");
    expect(typeof paymentSettings.cod_enabled).toBe("boolean");
    expect(typeof paymentSettings.prepaid_badge_text).toBe("string");
  });

  it("builds site setting entries and allows targeted overrides", () => {
    const entries = buildTemplateSeedSiteSettingsEntries(fallbackStorefrontTemplateSeeds[0], {
      payment_settings: {
        cod_enabled: false,
        bkash_enabled: true,
      },
    });

    const paymentSettings = entries.find((entry) => entry.key === "payment_settings")?.value as Record<string, unknown> | undefined;
    expect(paymentSettings?.cod_enabled).toBe(false);
    expect(paymentSettings?.bkash_enabled).toBe(true);
  });

  it("resolves legacy seed rows from their template alias or neutral fallback base", () => {
    const templateSeed = buildTemplateSeedDefinitionFromRow({
      id: "luxury-hotel",
      legacy_template_id: "general",
      name: "Luxury Hotel",
      short_name: "Hotel",
      business_family: "service",
      catalog_mode: "inquiry_only",
    });

    expect(templateSeed.id).toBe("luxury-hotel");
    expect(templateSeed.shortName).toBe("Hotel");
    expect(templateSeed.defaultSiteSettings.payment_settings).toBeDefined();
    expect(templateSeed.hero.subtitle.length).toBeGreaterThan(0);
  });

  it("finds custom seed definitions from an injected collection", () => {
    const customTemplateSeed = {
      ...fallbackStorefrontTemplateSeeds[0],
      id: "custom-template-seed",
      name: "Custom Template Seed",
      shortName: "Custom",
    };

    expect(findStorefrontTemplateSeedById("custom-template-seed", [customTemplateSeed])).toEqual(customTemplateSeed);
  });
});
