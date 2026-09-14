import type { PublicPaymentSettings } from "@/hooks/usePublicPaymentSettings";
import {
  getStorefrontPricing,
  type StorefrontDeliverySettings,
} from "@/lib/storefront-pricing";

export type AuthoritativeCheckoutItem = {
  productId: string;
  quantity: number;
};

export type AuthoritativeCheckoutProduct = {
  id: string;
  price: number;
  type?: string | null;
};

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : {};
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asDiscountType(value: unknown): PublicPaymentSettings["prepayment_discount_type"] {
  return value === "percentage" || value === "fixed" || value === "free_delivery"
    ? value
    : "none";
}

function isDigitalProductType(value: unknown) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return /(digital|download|template|preset|asset|license)/.test(normalized);
}

export function resolveAuthoritativeCheckoutPricing({
  items,
  products,
  deliverySettings,
  paymentSettings,
  paymentMethod,
}: {
  items: AuthoritativeCheckoutItem[];
  products: AuthoritativeCheckoutProduct[];
  deliverySettings?: unknown;
  paymentSettings?: unknown;
  paymentMethod?: string;
}) {
  const productsById = new Map(products.map((product) => [product.id, product]));
  let subtotal = 0;
  let digitalOnly = items.length > 0;

  for (const item of items) {
    const product = productsById.get(item.productId);
    if (!product) {
      throw new Error("Cart contains a product that is unavailable");
    }

    const price = Number(product.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Cart contains invalid product pricing");
    }

    subtotal += Math.round(price) * item.quantity;
    digitalOnly = digitalOnly && isDigitalProductType(product.type);
  }

  const rawDeliverySettings = asRecord(deliverySettings);
  const normalizedDeliverySettings: StorefrontDeliverySettings = {
    enabled: digitalOnly ? false : asBoolean(rawDeliverySettings.enabled, true),
    delivery_fee: asNumber(rawDeliverySettings.delivery_fee, 80),
    delivery_fee_outside: asNumber(rawDeliverySettings.delivery_fee_outside, 150),
    free_threshold: asNumber(rawDeliverySettings.free_threshold, 2000),
  };

  const rawPaymentSettings = asRecord(paymentSettings);
  const normalizedPaymentSettings: PublicPaymentSettings = {
    bkash_enabled: asBoolean(rawPaymentSettings.bkash_enabled, false),
    nagad_enabled: asBoolean(rawPaymentSettings.nagad_enabled, false),
    cod_enabled: asBoolean(rawPaymentSettings.cod_enabled, true),
    bkash_number: "",
    nagad_number: "",
    prepaid_badge_text: "",
    prepayment_discount_type: asDiscountType(rawPaymentSettings.prepayment_discount_type),
    prepayment_discount_value: Math.max(0, asNumber(rawPaymentSettings.prepayment_discount_value, 0)),
    bkash_gateway_enabled: false,
    gateway_providers: [],
  };

  const pricing = getStorefrontPricing({
    subtotal,
    deliverySettings: normalizedDeliverySettings,
    paymentSettings: normalizedPaymentSettings,
    paymentMethod,
    location: "primary",
  });

  return {
    subtotal: pricing.subtotal,
    deliveryFee: pricing.deliveryFee,
    digitalOnly,
  };
}
