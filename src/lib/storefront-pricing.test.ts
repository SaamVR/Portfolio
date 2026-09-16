import { describe, expect, it } from "@/test/test-utils";
import { getNormalizedDeliverySettings, getStorefrontPricing, resolveStorefrontDeliveryLocation } from "@/lib/storefront-pricing";

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

  it("prices digital checkout through the same engine without double-counting prepaid discounts", () => {
    const pricing = getStorefrontPricing({
      subtotal: 1000,
      couponDiscount: 100,
      deliverySettings: { enabled: false, delivery_fee: 80, free_threshold: 2000 },
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

    expect(pricing.deliveryFee).toBe(0);
    expect(pricing.couponDiscount).toBe(100);
    expect(pricing.orderDiscountAmount).toBe(100);
    expect(pricing.paymentDiscount).toBe(100);
    expect(pricing.grandTotal).toBe(800);
  });

  it("does not create a discount from a free-delivery offer when fulfillment is already delivery-free", () => {
    const pricing = getStorefrontPricing({
      subtotal: 1200,
      deliverySettings: { enabled: false, delivery_fee: 80, delivery_fee_outside: 150, free_threshold: 2000 },
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
    });

    expect(pricing.originalDeliveryFee).toBe(0);
    expect(pricing.paymentDiscount).toBe(0);
    expect(pricing.orderDiscountAmount).toBe(0);
    expect(pricing.grandTotal).toBe(1200);
  });

  it("normalizes delivery defaults without inventing preview-only keys", () => {
    const deliverySettings = getNormalizedDeliverySettings(null);

    expect(deliverySettings.delivery_fee).toBe(80);
    expect(deliverySettings.delivery_fee_outside).toBe(150);
    expect(deliverySettings.free_threshold).toBe(2000);
  });

  it("treats a legacy zero free-delivery threshold as not configured", () => {
    const deliverySettings = getNormalizedDeliverySettings({
      enabled: true,
      delivery_fee: 80,
      delivery_fee_outside: 150,
      free_threshold: 0,
    });

    expect(deliverySettings.free_threshold).toBe(2000);

    const pricing = getStorefrontPricing({
      subtotal: 1000,
      deliverySettings,
      location: "primary",
    });

    expect(pricing.qualifiesForThresholdFreeDelivery).toBe(false);
    expect(pricing.deliveryFee).toBe(80);
  });
  it("derives the primary delivery zone only from explicit normalized city aliases", () => {
    const settings = getNormalizedDeliverySettings({
      enabled: true,
      primary_zone_aliases: [" Dhaka ", "ঢাকা"],
      delivery_fee: 80,
      delivery_fee_outside: 150,
    });

    expect(resolveStorefrontDeliveryLocation(settings, "DHAKA")).toBe("primary");
    expect(resolveStorefrontDeliveryLocation(settings, "  ঢাকা  ")).toBe("primary");
    expect(resolveStorefrontDeliveryLocation(settings, "Chattogram")).toBe("secondary");
  });

  it("fails safe to the extended zone when no merchant city membership is configured", () => {
    const settings = getNormalizedDeliverySettings({ enabled: true, primary_zone_aliases: [] });
    expect(resolveStorefrontDeliveryLocation(settings, "Dhaka")).toBe("secondary");
    expect(resolveStorefrontDeliveryLocation(settings, "")).toBe("secondary");
  });

});
