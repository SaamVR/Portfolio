import { getPaymentProviderPlugin } from "@/lib/payments/provider-registry";
import {
  isPaymentOperationallyConfigured,
  maskPaymentText,
  normalizePaymentConnectionStatus,
  safePaymentObject,
  type ConnectionVerificationStatus,
  type PaymentConnectionRow,
  type PaymentConnectionSplitResult,
  type PaymentConnectionStatus,
  type PaymentProviderConnectionAdapter,
  type PaymentProviderManifest,
  type PaymentStoredConnectionStatus,
} from "@/lib/payments/provider-plugin";

export {
  isPaymentOperationallyConfigured,
  maskPaymentText,
  normalizePaymentConnectionStatus,
  safePaymentObject,
} from "@/lib/payments/provider-plugin";
export type {
  ConnectionVerificationStatus,
  PaymentConnectionRow,
  PaymentConnectionSplitResult,
  PaymentConnectionStatus,
  PaymentStoredConnectionStatus,
} from "@/lib/payments/provider-plugin";

export type PaymentProviderServerAdapter = PaymentProviderConnectionAdapter & {
  manifest: PaymentProviderManifest;
};

export function getPaymentProviderServerAdapter(provider: unknown): PaymentProviderServerAdapter | null {
  const plugin = getPaymentProviderPlugin(provider);
  if (!plugin) return null;

  return {
    manifest: plugin.manifest,
    ...plugin.connection,
  };
}

export function requirePaymentProviderServerAdapter(provider: unknown) {
  const adapter = getPaymentProviderServerAdapter(provider);
  if (!adapter || adapter.manifest.runtimeStatus !== "active") {
    throw new Error("Unsupported or inactive payment provider");
  }
  return adapter;
}

export type PaymentProviderConnectionTypes = {
  status: PaymentConnectionStatus;
  storedStatus: PaymentStoredConnectionStatus;
  verificationStatus: ConnectionVerificationStatus;
  row: PaymentConnectionRow;
  split: PaymentConnectionSplitResult;
};

void isPaymentOperationallyConfigured;
void normalizePaymentConnectionStatus;
