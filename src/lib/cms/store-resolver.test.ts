import { describe, expect, it } from "@/test/test-utils";
import { buildResolvedStoreFromRecords } from "@/lib/cms/store-resolver";
import type { CmsPageBlueprint } from "@/lib/cms/page-blueprints";
import type { ThemePackageDefinition } from "@/lib/theme-packages";

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

  it("resolves custom theme packages and custom recommended page blueprints when provided", () => {
    const themePackages: ThemePackageDefinition[] = [{
      id: "merchant-noir",
      slug: "merchant-noir",
      name: "Merchant Noir",
      description: "Custom private package",
      preview: {
        bg: "#111111",
        primary: "#fafafa",
        accent: "#22c55e",
      },
      sourceType: "merchant_private",
      version: 1,
      compatibilityVersion: 1,
      presetId: "merchant-noir",
      mode: "light",
      tokens: {
        light: {
          "--background": "#111111",
        },
        dark: {
          "--background": "#000000",
        },
        typography: {
          headingFont: "'Manrope', sans-serif",
          bodyFont: "'Inter', sans-serif",
        },
        components: {
          borderRadius: "1.25rem",
        },
      },
      recipes: {},
      ownerStoreId: "store-3",
      isActive: true,
    }];
    const pageBlueprints: CmsPageBlueprint[] = [{
      id: "custom-gallery",
      name: "Custom Gallery",
      description: "Custom gallery page",
      businessFamily: "commerce",
      catalogModes: ["multi_product"],
      page: {
        slug: "/gallery",
        title: "Gallery",
        seoTitle: "Gallery",
        seoDescription: "A custom gallery page",
        isHomepage: false,
        blocks: [{
          id: "gallery-rich-text",
          type: "rich-text",
          isVisible: true,
          sortOrder: 0,
          props: {
            title: "Gallery",
            body: "Custom gallery body",
            align: "left",
          },
        }],
      },
    }];

    const store = buildResolvedStoreFromRecords(
      {
        id: "store-3",
        name: "Gallery Studio",
        slug: "gallery-studio",
        description: null,
        currency_code: null,
        locale: null,
        is_published: true,
        store_type: "gallery-studio",
      },
      {
        blueprint_id: "gallery-studio",
      },
      {
        preset_id: "merchant-noir",
        theme_package_id: "merchant-noir",
        mode: null,
        typography: null,
        components: null,
        colors: null,
        resolved_tokens: null,
      },
      [],
      [],
      [],
      {
        id: "gallery-studio",
        legacyTemplateId: "general",
        name: "Gallery Studio",
        shortName: "Gallery",
        description: "Custom gallery blueprint",
        businessFamily: "commerce",
        catalogMode: "multi_product",
        group: "Custom",
        recommendedPageSet: ["home", "custom-gallery"],
        recommendedBlockSet: ["hero", "rich-text"],
        defaultTheme: {
          presetId: "merchant-noir",
          mode: "light",
          headingFont: "'Manrope', sans-serif",
          bodyFont: "'Inter', sans-serif",
          borderRadius: "1.25rem",
          customCssVars: {},
        },
        storeDescription: "Custom gallery-first store.",
        hero: {
          tagline: "Curated",
          title: "Build a",
          highlight: "Gallery",
          subtitle: "Custom pages and custom themes should resolve together.",
        },
        capabilities: ["catalog"],
        onboarding: {
          steps: [],
        },
        defaultSiteSettings: {},
      },
      themePackages,
      pageBlueprints,
    );

    expect(store.theme.themePackageId).toBe("merchant-noir");
    expect(store.theme.headingFont).toBe("'Manrope', sans-serif");
    expect(store.theme.customCssVars["--background"]).toBe("#111111");
    expect(store.pages.some((page) => page.slug === "/gallery")).toBe(true);
  });

  it("carries store-scoped custom css from the installed theme snapshot", () => {
    const store = buildResolvedStoreFromRecords(
      {
        id: "store-4",
        name: "Scoped Theme Store",
        slug: "scoped-theme-store",
        description: null,
        currency_code: null,
        locale: null,
        is_published: true,
        store_type: "general-catalog",
      },
      {
        blueprint_id: "general-catalog",
      },
      {
        preset_id: "default",
        theme_package_id: "default",
        mode: "dark",
        typography: null,
        components: null,
        colors: null,
        custom_css: ".hero { border: 3px solid red; }",
        resolved_tokens: null,
      },
      [],
      [],
      [],
    );

    expect(store.theme.customCss).toBe(".hero { border: 3px solid red; }");
  });
});
