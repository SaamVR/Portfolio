import type { PublicPaymentSettings } from "@/hooks/usePublicPaymentSettings";
import { isPrepaidStorefrontPaymentMethod } from "@/lib/payments/provider-registry";

export interface StorefrontDeliverySettings {
  enabled?: boolean;
  primary_zone_label?: string;
  secondary_zone_label?: string;
  delivery_fee?: number;
  delivery_fee_outside?: number;
  free_threshold?: number;
}

export type StorefrontLocation = "primary" | "secondary";
export type StorefrontPaymentMethod = string;

export interface StorefrontPricingInput {
  subtotal: number;
  couponDiscount?: number;
  deliverySettings?: StorefrontDeliverySettings | null;
  paymentSettings?: PublicPaymentSettings | null;
  paymentMethod?: StorefrontPaymentMethod;
  location?: StorefrontLocation;
}

export interface StorefrontPricingResult {
  subtotal: number;
  couponDiscount: number;
  deliveryFee: number;
  originalDeliveryFee: number;
  paymentDiscount: number;
  orderDiscountAmount: number;
  paymentDiscountLabel: string | null;
  totalDiscount: number;
  grandTotal: number;
  freeDeliveryThreshold: number;
  amountToFreeDelivery: number;
  qualifiesForThresholdFreeDelivery: boolean;
  qualifiesForPrepaidFreeDelivery: boolean;
}

const DEFAULT_FREE_THRESHOLD = 2000;
const DEFAULT_PRIMARY_DELIVERY_FEE = 80;
const DEFAULT_SECONDARY_DELIVERY_FEE = 150;

function sanitizeMoney(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

function normalizeFreeDeliveryThreshold(value: number | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_FREE_THRESHOLD;
  }

  return sanitizeMoney(value);
}

function isPrepaidMethod(paymentMethod?: StorefrontPaymentMethod, paymentSettings?: PublicPaymentSettings | null) {
  if (!paymentMethod) return false;
  if (isPrepaidStorefrontPaymentMethod(paymentMethod)) return true;
  return Boolean(paymentSettings?.gateway_providers?.some((provider) => provider.payment_method === paymentMethod));
}

export function getNormalizedDeliverySettings(
  deliverySettings?: StorefrontDeliverySettings | null,
): Required<Pick<StorefrontDeliverySettings, "enabled" | "delivery_fee" | "delivery_fee_outside" | "free_threshold">> & StorefrontDeliverySettings {
  return {
    enabled: deliverySettings?.enabled ?? true,
    primary_zone_label: deliverySettings?.primary_zone_label,
    secondary_zone_label: deliverySettings?.secondary_zone_label,
    delivery_fee: sanitizeMoney(deliverySettings?.delivery_fee ?? DEFAULT_PRIMARY_DELIVERY_FEE),
    delivery_fee_outside: sanitizeMoney(deliverySettings?.delivery_fee_outside ?? DEFAULT_SECONDARY_DELIVERY_FEE),
    free_threshold: normalizeFreeDeliveryThreshold(deliverySettings?.free_threshold),
  };
}

export function getStorefrontPricing({
  subtotal,
  couponDiscount = 0,
  deliverySettings,
  paymentSettings,
  paymentMethod,
  location = "primary",
}: StorefrontPricingInput): StorefrontPricingResult {
  const normalizedSubtotal = sanitizeMoney(subtotal);
  const normalizedCouponDiscount = Math.min(sanitizeMoney(couponDiscount), normalizedSubtotal);
  const normalizedDelivery = getNormalizedDeliverySettings(deliverySettings);
  const qualifiesForThresholdFreeDelivery =
    normalizedDelivery.enabled && normalizedSubtotal >= normalizedDelivery.free_threshold;
  const originalDeliveryFee = !normalizedDelivery.enabled
    ? 0
    : qualifiesForThresholdFreeDelivery
      ? 0
      : location === "secondary"
        ? normalizedDelivery.delivery_fee_outside
        : normalizedDelivery.delivery_fee;

  let paymentDiscount = 0;
  let orderDiscountAmount = 0;
  let paymentDiscountLabel: string | null = null;
  const prepaidSelected = isPrepaidMethod(paymentMethod, paymentSettings);

  if (prepaidSelected && paymentSettings) {
    switch (paymentSettings.prepayment_discount_type) {
      case "percentage":
        paymentDiscount = Math.min(
          sanitizeMoney((normalizedSubtotal * paymentSettings.prepayment_discount_value) / 100),
          normalizedSubtotal,
        );
        orderDiscountAmount = paymentDiscount;
        paymentDiscountLabel = paymentDiscount > 0 ? "Prepaid discount" : null;
        break;
      case "fixed":
        paymentDiscount = Math.min(sanitizeMoney(paymentSettings.prepayment_discount_value), normalizedSubtotal);
        orderDiscountAmount = paymentDiscount;
        paymentDiscountLabel = paymentDiscount > 0 ? "Prepaid discount" : null;
        break;
      case "free_delivery":
        paymentDiscount = originalDeliveryFee;
        orderDiscountAmount = 0;
        paymentDiscountLabel = paymentDiscount > 0 ? "Prepaid free delivery" : null;
        break;
      default:
        paymentDiscount = 0;
        orderDiscountAmount = 0;
        paymentDiscountLabel = null;
        break;
    }
  }

  const qualifiesForPrepaidFreeDelivery =
    prepaidSelected
    && paymentSettings?.prepayment_discount_type === "free_delivery"
    && originalDeliveryFee > 0;
  const deliveryFee = qualifiesForPrepaidFreeDelivery ? 0 : originalDeliveryFee;
  const totalDiscount = Math.min(
    normalizedSubtotal + originalDeliveryFee,
    normalizedCouponDiscount + orderDiscountAmount + (qualifiesForPrepaidFreeDelivery ? originalDeliveryFee : 0),
  );
  const grandTotal = Math.max(0, normalizedSubtotal + deliveryFee - normalizedCouponDiscount - orderDiscountAmount);

  return {
    subtotal: normalizedSubtotal,
    couponDiscount: normalizedCouponDiscount,
    deliveryFee,
    originalDeliveryFee,
    paymentDiscount,
    orderDiscountAmount,
    paymentDiscountLabel,
    totalDiscount,
    grandTotal,
    freeDeliveryThreshold: normalizedDelivery.free_threshold,
    amountToFreeDelivery: Math.max(0, normalizedDelivery.free_threshold - normalizedSubtotal),
    qualifiesForThresholdFreeDelivery,
    qualifiesForPrepaidFreeDelivery,
  };
}
