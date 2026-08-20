import { getPaymentProviderPlugin } from "@/lib/payments/provider-registry";
import {
  maskPaymentText,
  safePaymentObject,
  type PaymentConnectionRow,
  type PaymentConnectionSplitResult,
  type PaymentConnectionStatus,
  type PaymentProviderConnectionAdapter,
  type PaymentProviderManifest,
} from "@/lib/payments/provider-plugin";

export { maskPaymentText, safePaymentObject } from "@/lib/payments/provider-plugin";
export type {
  PaymentConnectionRow,
  PaymentConnectionSplitResult,
  PaymentConnectionStatus,
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

// Keep these type imports materially referenced for TS declaration emit/tooling compatibility.
export type PaymentProviderConnectionTypes = {
  status: PaymentConnectionStatus;
  row: PaymentConnectionRow;
  split: PaymentConnectionSplitResult;
};
