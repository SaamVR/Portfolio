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

  it("uses an explicit custom blueprint definition when provided", () => {
    const store = buildResolvedStoreFromRecords(
      {
        id: "store-2",
        name: "Hotel Aurora",
        slug: "hotel-aurora",
        description: null,
        currency_code: null,
        locale: null,
        is_published: true,
        store_type: "luxury-hotel",
      },
      {
        blueprint_id: "luxury-hotel",
      },
      null,
      [],
      [],
      [],
      {
        id: "luxury-hotel",
        legacyTemplateId: "general",
        name: "Luxury Hotel",
        shortName: "Hotel",
        description: "Custom hospitality blueprint",
        businessFamily: "service",
        catalogMode: "inquiry_only",
        group: "Hotels",
        recommendedPageSet: ["home", "contact"],
        recommendedBlockSet: ["hero", "rich-text", "faq-accordion"],
        defaultTheme: {
          presetId: "royal-purple",
          mode: "light",
          headingFont: "'Outfit', sans-serif",
          bodyFont: "'Inter', sans-serif",
          borderRadius: "1rem",
          customCssVars: {},
        },
        storeDescription: "Boutique rooms, direct inquiries, and tailored guest experiences.",
        hero: {
          tagline: "Stay Differently",
          title: "Boutique",
          highlight: "Escapes",
          subtitle: "Designed for direct guest inquiries and curated stays.",
        },
        capabilities: ["inquiry_only", "lead_capture"],
        onboarding: {
          steps: [],
        },
        defaultSiteSettings: {
          storefront_profile: {
            product_visibility: "inquiry_only",
            checkout_mode: "whatsapp",
          },
        },
      },
    );

    expect(store.description).toBe("Boutique rooms, direct inquiries, and tailored guest experiences.");
    expect(store.pages[0]?.blocks[0]?.type).toBe("hero");
  });
});
