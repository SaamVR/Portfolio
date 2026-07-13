import { describe, expect, it } from "@/test/test-utils";
import {
  buildKnownBlockOptions,
  buildKnownCapabilities,
  buildKnownPageBlueprintIds,
  findBlueprintRowsUsingThemePackage,
  readDefaultSiteSettings,
  readThemeEditorPayload,
  updateDefaultSiteSettingsField,
  updateThemeJsonField,
} from "@/components/admin/cms-library/shared";

describe("cms library shared helpers", () => {
  it("reads structured default site settings from blueprint json", () => {
    const settings = readDefaultSiteSettings(JSON.stringify({
      storefront_profile: {
        product_visibility: "menu",
        checkout_mode: "whatsapp",
      },
      payment_settings: {
        cod_enabled: false,
        bkash_enabled: true,
        nagad_enabled: true,
        prepaid_badge_text: "Pay first",
        prepayment_discount_type: "percentage",
        prepayment_discount_value: 10,
      },
    }));

    expect(settings.storefrontProfile.productVisibility).toBe("menu");
    expect(settings.storefrontProfile.checkoutMode).toBe("whatsapp");
    expect(settings.paymentSettings.codEnabled).toBe(false);
    expect(settings.paymentSettings.prepaymentDiscountType).toBe("percentage");
    expect(settings.paymentSettings.prepaymentDiscountValue).toBe(10);
  });

  it("updates one default site settings section without dropping the others", () => {
    const updated = updateDefaultSiteSettingsField(JSON.stringify({
      storefront_profile: {
        product_visibility: "catalog",
        checkout_mode: "standard",
      },
      payment_settings: {
        cod_enabled: true,
        prepaid_badge_text: "Priority Delivery",
      },
    }), "payment_settings", {
      cod_enabled: false,
      bkash_enabled: true,
    });

    const parsed = JSON.parse(updated) as {
      storefront_profile: { product_visibility: string; checkout_mode: string };
      payment_settings: { cod_enabled: boolean; bkash_enabled?: boolean; prepaid_badge_text: string };
    };

    expect(parsed.storefront_profile.product_visibility).toBe("catalog");
    expect(parsed.payment_settings.cod_enabled).toBe(false);
    expect(parsed.payment_settings.bkash_enabled).toBe(true);
    expect(parsed.payment_settings.prepaid_badge_text).toBe("Priority Delivery");
  });

  it("reads theme editor payload from preview and tokens json", () => {
    const payload = readThemeEditorPayload(
      JSON.stringify({ bg: "#111111", primary: "#22c55e", accent: "#38bdf8" }),
      JSON.stringify({
        light: { "--background": "#ffffff" },
        dark: { "--background": "#111111" },
        typography: { headingFont: "'Outfit', sans-serif", bodyFont: "'Inter', sans-serif" },
        components: { borderRadius: "1rem" },
      }),
    );

    expect(payload.preview.bg).toBe("#111111");
    expect(payload.tokens.typography.headingFont).toBe("'Outfit', sans-serif");
    expect(payload.tokens.components.borderRadius).toBe("1rem");
  });

  it("updates theme json fields without dropping existing values", () => {
    const updated = updateThemeJsonField(JSON.stringify({
      bg: "#000000",
      primary: "#ffffff",
    }), { accent: "#38bdf8" });

    const parsed = JSON.parse(updated) as { bg: string; primary: string; accent: string };

    expect(parsed.bg).toBe("#000000");
    expect(parsed.primary).toBe("#ffffff");
    expect(parsed.accent).toBe("#38bdf8");
  });

  it("builds live known library options from custom rows", () => {
    const pageIds = buildKnownPageBlueprintIds([
      {
        id: "custom-gallery",
        name: "Custom Gallery",
        description: "Custom",
        business_family: "commerce",
        catalog_modes: ["multi_product"],
        page_payload: {},
        is_active: true,
      },
    ]);
    const blockOptions = buildKnownBlockOptions([
      {
        block_type: "booking-widget",
        label: "Booking Widget",
        description: "Booking block",
        layer: "extension",
        compatible_business_families: ["service"],
        required_capabilities: ["bookings"],
        is_active: true,
      },
    ]);
    const capabilities = buildKnownCapabilities({
      blueprints: [{
        id: "hotel",
        name: "Hotel",
        short_name: "Hotel",
        description: "Hotel",
        business_family: "service",
        catalog_mode: "inquiry_only",
        group_name: "Hotels",
        store_description: "Hotel profile",
        legacy_template_id: "general",
        recommended_page_set: [],
        recommended_block_set: [],
        required_capabilities: ["bookings"],
        default_theme: {},
        hero_payload: {},
        onboarding_schema: {},
        default_site_settings: {},
        is_active: true,
      }],
      blocks: [{
        block_type: "booking-widget",
        label: "Booking Widget",
        description: "Booking block",
        layer: "extension",
        compatible_business_families: ["service"],
        required_capabilities: ["bookings"],
        is_active: true,
      }],
    });

    expect(pageIds.some((item) => item === "custom-gallery")).toBe(true);
    expect(blockOptions.some((item) => item.value === "booking-widget")).toBe(true);
    expect(capabilities.some((item) => item === "bookings")).toBe(true);
  });

  it("finds blueprints that reference a theme package by exact id or slug", () => {
    const dependents = findBlueprintRowsUsingThemePackage({
      blueprints: [
        {
          id: "gadgets",
          name: "Gadgets",
          short_name: "Gadgets",
          description: "Gadgets",
          business_family: "commerce",
          catalog_mode: "multi_product",
          group_name: "Commerce",
          store_description: "Gadgets store",
          legacy_template_id: "general",
          recommended_page_set: [],
          recommended_block_set: [],
          required_capabilities: [],
          default_theme: { presetId: "merchant-noir" },
          hero_payload: {},
          onboarding_schema: {},
          default_site_settings: {},
          is_active: true,
        },
        {
          id: "food",
          name: "Food",
          short_name: "Food",
          description: "Food",
          business_family: "commerce",
          catalog_mode: "menu",
          group_name: "Commerce",
          store_description: "Food store",
          legacy_template_id: "food",
          recommended_page_set: [],
          recommended_block_set: [],
          required_capabilities: [],
          default_theme: { presetId: "food" },
          hero_payload: {},
          onboarding_schema: {},
          default_site_settings: {},
          is_active: true,
        },
      ],
      themes: [
        {
          id: "theme-1",
          slug: "merchant-noir",
          name: "Merchant Noir",
          description: "Private theme",
          source_type: "admin_shared",
          version: 1,
          compatibility_version: 1,
          preset_id: "default",
          mode: "dark",
          preview_metadata: {},
          tokens: {},
          component_recipes: {},
          custom_css: null,
          owner_store_id: null,
        },
      ],
      pages: [],
      blocks: [],
    }, "theme-1");

    expect(dependents.map((item) => item.id)).toEqual(["gadgets"]);
  });
});
