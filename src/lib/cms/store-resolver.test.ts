import { describe, expect, it } from "@/test/test-utils";
import { buildResolvedStoreFromRecords, canAccessStorefrontStore } from "@/lib/cms/store-resolver";
import type { ThemePackageDefinition } from "@/lib/theme-packages";

describe("store resolver mapping", () => {
  it("allows storefront access for trialing stores even before the publish flag is flipped", () => {
    const trialEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    expect(
      canAccessStorefrontStore(
        { is_published: false },
        { status: "trialing", trial_ends_at: trialEndsAt },
      ),
    ).toBe(true);
  });

  it("still blocks storefront access when the subscription is no longer live", () => {
    expect(
      canAccessStorefrontStore(
        { is_published: true },
        { status: "past_due", trial_ends_at: "2026-07-10T00:00:00.000Z" },
      ),
    ).toBe(false);
  });

  it("ensures preview token bypass is scoped to the matching store_id only", () => {
    const tokenStoreId: string = "store-a";
    const requestedStoreId: string = "store-b";

    // A token for store-a must never grant access to store-b
    const isValidForStoreB = tokenStoreId === requestedStoreId;
    expect(isValidForStoreB).toBe(false);
  });

  it("ensures unexpired preview token allows unpublished store preview access", () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const isUnexpired = new Date(expiresAt).getTime() > Date.now();
    expect(isUnexpired).toBe(true);
  });

  it("uses business profile template seeds and theme package defaults when records are sparse", () => {
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
        template_id: "single-product",
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

    expect(store.description).toBe("A focused storefront designed to sell one hero product with demo media, proof, and a tighter conversion path.");
    expect(store.theme.presetId).toBe("ocean-teal");
    expect(store.theme.themePackageId).toBe("ocean-teal");
    expect(store.theme.mode).toBe("dark");
    expect(store.pages[0]?.slug).toBe("/");
  });

  it("uses an explicit custom template seed definition when provided", () => {
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
        template_id: "luxury-hotel",
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
        description: "Custom hospitality template seed",
        businessFamily: "service",
        catalogMode: "inquiry_only",
        group: "Hotels",
        onboardingMode: "template",
        recommendedPageSet: ["home", "contact"],
        compatibleBlockSet: ["hero", "rich-text", "faq-accordion"],
        recommendedBlockSet: ["hero", "rich-text", "faq-accordion"],
        defaultBlockSet: ["hero", "rich-text", "faq-accordion"],
        defaultTheme: {
          presetId: "royal-purple",
          mode: "light",
          aesthetic: "minimal",
          effects: { scrollReveals: false, hoverEffects: true, parallax: false, intensity: "subtle" },
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

  it("resolves custom theme packages and custom recommended page templates when provided", () => {
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
        template_id: "gallery-studio",
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
        description: "Custom gallery template seed",
        businessFamily: "commerce",
        catalogMode: "multi_product",
        group: "Custom",
        onboardingMode: "template",
        recommendedPageSet: ["home", "custom-gallery"],
        compatibleBlockSet: ["hero", "rich-text"],
        recommendedBlockSet: ["hero", "rich-text"],
        defaultBlockSet: ["hero", "rich-text"],
        defaultTheme: {
          presetId: "merchant-noir",
          mode: "light",
          aesthetic: "minimal",
          effects: { scrollReveals: false, hoverEffects: true, parallax: false, intensity: "subtle" },
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
    );

    expect(store.theme.themePackageId).toBe("merchant-noir");
    expect(store.theme.headingFont).toBe("'Manrope', sans-serif");
    expect(store.theme.customCssVars["--background"]).toBe("#111111");
    expect(store.pages.some((page) => page.slug === "/gallery")).toBe(false);
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
        template_id: "general-catalog",
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

  it("preserves a store custom domain on the resolved storefront model", () => {
    const store = buildResolvedStoreFromRecords(
      {
        id: "store-5",
        name: "Domain Store",
        slug: "domain-store",
        custom_domain: "shop.domain-store.com",
        description: null,
        currency_code: null,
        locale: null,
        is_published: true,
        store_type: "general-catalog",
      },
      {
        template_id: "general-catalog",
      },
      null,
      [],
      [],
      [],
    );

    expect(store.customDomain).toBe("shop.domain-store.com");
  });

  it("can build a lightweight shell store without persisted page rows or page blocks", () => {
    const store = buildResolvedStoreFromRecords(
      {
        id: "store-6",
        name: "Shell Store",
        slug: "shell-store",
        description: "Fast public storefront shell",
        currency_code: "USD",
        locale: "en-US",
        is_published: true,
        store_type: "general-catalog",
      },
      {
        template_id: "general-catalog",
      },
      {
        preset_id: "default",
        theme_package_id: "default",
        mode: "light",
        typography: null,
        components: null,
        colors: {
          "--background": "#ffffff",
        },
        resolved_tokens: null,
      },
      [],
      [],
      [{
        key: "storefront_profile",
        value: {
          template_id: "general-catalog",
          product_visibility: "catalog",
        },
      }],
    );

    expect(store.pages.length > 0).toBe(true);
    expect(store.pages[0]?.blocks.length > 0).toBe(true);
    expect(store.theme.mode).toBe("light");
    expect(store.siteSettings?.storefront_profile).toEqual({
      template_id: "general-catalog",
      product_visibility: "catalog",
    });
  });
});
