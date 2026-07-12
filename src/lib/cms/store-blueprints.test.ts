import { describe, expect, it } from "@/test/test-utils";
import { fallbackStoreBlueprints } from "@/lib/cms/store-blueprints";

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
});
