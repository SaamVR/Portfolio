import { getPaymentProviderPlugin } from "@/lib/payments/provider-registry";
import { captureRedirectCheckoutRecoveryState } from "@/lib/payments/redirect-checkout-recovery";
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

const checkoutRecoveryGuidance = "Your order is reserved. Retry the same payment method to continue.";

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

  try {
    const result = await adapter.initializeRedirectCheckout(deps, request);

    // The caller clears the completed checkout source just before leaving for
    // the provider. Preserve both possible browser sources first so a provider
    // cancellation/failure can return the shopper to the exact pre-redirect
    // cart or Buy Now state without creating another authoritative order.
    captureRedirectCheckoutRecoveryState(request.storeId, request.orderNumber);
    return result;
  } catch (error) {
    const providerMessage = error instanceof Error && error.message.trim()
      ? error.message.trim()
      : "Payment initialization failed.";

    if (providerMessage.includes(checkoutRecoveryGuidance)) {
      throw error;
    }

    throw new Error(`${providerMessage} ${checkoutRecoveryGuidance}`, { cause: error });
  }
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
