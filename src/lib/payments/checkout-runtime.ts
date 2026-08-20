import { getPaymentProviderPlugin } from "@/lib/payments/provider-registry";
import type {
  PaymentCallbackRequest,
  PaymentCallbackResult,
  PaymentCallbackStatus,
  PaymentCheckoutRequest,
  PaymentCheckoutResult,
  PaymentCheckoutRuntimeDeps,
  PaymentProviderCheckoutAdapter,
} from "@/lib/payments/provider-plugin";

export type {
  PaymentCallbackRequest,
  PaymentCallbackResult,
  PaymentCallbackStatus,
  PaymentCheckoutRequest,
  PaymentCheckoutResult,
  PaymentCheckoutRuntimeDeps,
} from "@/lib/payments/provider-plugin";

export type PaymentCheckoutRuntimeAdapter = PaymentProviderCheckoutAdapter & {
  providerId: string;
};

export function getPaymentCheckoutRuntimeAdapter(providerId: unknown): PaymentCheckoutRuntimeAdapter | null {
  const plugin = getPaymentProviderPlugin(providerId);
  if (
    !plugin
    || plugin.manifest.runtimeStatus !== "active"
    || plugin.manifest.checkoutMode !== "redirect"
    || !plugin.checkout
  ) {
    return null;
  }

  return {
    providerId: plugin.manifest.id,
    ...plugin.checkout,
  };
}

export async function initializeRedirectPayment(
  deps: PaymentCheckoutRuntimeDeps,
  request: PaymentCheckoutRequest,
): Promise<PaymentCheckoutResult> {
  const adapter = getPaymentCheckoutRuntimeAdapter(request.providerId);
  if (!adapter) {
    throw new Error("This payment provider is not available for redirect checkout.");
  }

  return adapter.initializeRedirectCheckout(deps, request);
}

export async function handleRedirectPaymentCallback(
  deps: PaymentCheckoutRuntimeDeps,
  request: PaymentCallbackRequest,
): Promise<PaymentCallbackResult> {
  const adapter = getPaymentCheckoutRuntimeAdapter(request.providerId);
  if (!adapter) {
    return {
      providerId: request.providerId,
      status: "error" as PaymentCallbackStatus,
      message: "This payment provider is not available for callback verification.",
    };
  }

  return adapter.handleRedirectCallback(deps, request);
}
