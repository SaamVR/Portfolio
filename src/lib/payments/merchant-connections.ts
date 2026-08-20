import {
  getPaymentProviderServerAdapter,
  maskPaymentText,
  safePaymentObject,
  type PaymentConnectionRow,
  type PaymentConnectionStatus,
} from "@/lib/payments/provider-server";

export type BkashConnectionStatus = PaymentConnectionStatus;
export type BkashPaymentConnectionRow = PaymentConnectionRow & { provider: "bkash" };

export const safeObject = safePaymentObject;
export const maskText = maskPaymentText;

function requireBkashAdapter() {
  const adapter = getPaymentProviderServerAdapter("bkash");
  if (!adapter) {
    throw new Error("bKash payment adapter is not registered");
  }
  return adapter;
}

// Compatibility facade for existing callers. Provider-specific behavior now
// lives behind the payment adapter registry rather than in this central file.
export function splitBkashConnectionSettings(rawSettings: unknown) {
  return requireBkashAdapter().splitConnectionSettings(rawSettings);
}

export function hasCompleteBkashSecrets(secretPayload: unknown) {
  return requireBkashAdapter().hasCompleteSecrets(secretPayload);
}

export function buildBkashConnectionResponse(row: BkashPaymentConnectionRow | null) {
  return requireBkashAdapter().buildConnectionResponse(row);
}
