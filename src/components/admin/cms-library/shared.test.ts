import { describe, expect, it } from "@/test/test-utils";
import {
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
});
