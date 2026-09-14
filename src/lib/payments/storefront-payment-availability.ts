import { getPaymentProviderByPaymentMethod } from "@/lib/payments/provider-registry";

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : {};
}

export function isStorefrontPaymentMethodConfigured({
  paymentMethod,
  paymentSettings,
  gatewayConnection,
}: {
  paymentMethod: string;
  paymentSettings?: unknown;
  gatewayConnection?: unknown;
}) {
  const method = paymentMethod.trim().toLowerCase();
  const settings = asRecord(paymentSettings);

  if (method === "cod") {
    return settings.cod_enabled !== false;
  }

  if (method === "bkash_manual") {
    return settings.bkash_enabled === true;
  }

  if (method === "nagad") {
    return settings.nagad_enabled === true;
  }

  const provider = getPaymentProviderByPaymentMethod(method);
  if (!provider || provider.runtimeStatus !== "active" || !provider.connectionRequired) {
    return false;
  }

  const connection = asRecord(gatewayConnection);
  return connection.provider === provider.id && connection.status === "connected";
}
