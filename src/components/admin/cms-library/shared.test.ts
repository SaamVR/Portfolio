import { describe, expect, it } from "@/test/test-utils";
import { readDefaultSiteSettings, updateDefaultSiteSettingsField } from "@/components/admin/cms-library/shared";

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
});
