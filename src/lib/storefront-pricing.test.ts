import { describe, expect, it } from "@/test/test-utils";
import { getNormalizedDeliverySettings, getStorefrontPricing } from "@/lib/storefront-pricing";

describe("storefront pricing", () => {
  it("applies prepaid percentage discounts to the real checkout total", () => {
    const pricing = getStorefrontPricing({
      subtotal: 1000,
      couponDiscount: 100,
      deliverySettings: { enabled: true, delivery_fee: 80, free_threshold: 2000 },
      paymentSettings: {
        bkash_enabled: true,
        nagad_enabled: true,
        cod_enabled: true,
        bkash_number: "",
        nagad_number: "",
        prepaid_badge_text: "",
        prepayment_discount_type: "percentage",
        prepayment_discount_value: 10,
        bkash_gateway_enabled: false,
      },
      paymentMethod: "bkash_manual",
    });

    expect(pricing.deliveryFee).toBe(80);
    expect(pricing.paymentDiscount).toBe(100);
    expect(pricing.grandTotal).toBe(880);
  });

  it("turns prepaid free-delivery offers into a zero delivery fee", () => {
    const pricing = getStorefrontPricing({
      subtotal: 1200,
      deliverySettings: { enabled: true, delivery_fee: 80, delivery_fee_outside: 150, free_threshold: 2000 },
      paymentSettings: {
        bkash_enabled: true,
        nagad_enabled: false,
        cod_enabled: true,
        bkash_number: "",
        nagad_number: "",
        prepaid_badge_text: "",
        prepayment_discount_type: "free_delivery",
        prepayment_discount_value: 0,
        bkash_gateway_enabled: false,
      },
      paymentMethod: "bkash",
      location: "secondary",
    });

    expect(pricing.originalDeliveryFee).toBe(150);
    expect(pricing.deliveryFee).toBe(0);
    expect(pricing.paymentDiscount).toBe(150);
    expect(pricing.qualifiesForPrepaidFreeDelivery).toBe(true);
    expect(pricing.grandTotal).toBe(1200);
  });

  it("normalizes delivery defaults without inventing preview-only keys", () => {
    const deliverySettings = getNormalizedDeliverySettings(null);

    expect(deliverySettings.delivery_fee).toBe(80);
    expect(deliverySettings.delivery_fee_outside).toBe(150);
    expect(deliverySettings.free_threshold).toBe(2000);
  });
});
