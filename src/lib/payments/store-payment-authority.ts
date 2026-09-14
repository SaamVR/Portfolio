import {
  getPaymentProviderByPaymentMethod,
  isPrepaidStorefrontPaymentMethod,
} from "@/lib/payments/provider-registry";
import { getPaymentProviderServerAdapter, type PaymentConnectionRow } from "@/lib/payments/provider-server";

export type StorePaymentAuthority = {
  allowed: boolean;
  paymentMethod: string;
  providerId: string | null;
  prepaidEligible: boolean;
  reason: string | null;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function enabled(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function nonEmptyText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export async function resolveStorePaymentAuthority(
  supabaseAdmin: any,
  storeId: string,
  requestedMethod: string,
): Promise<StorePaymentAuthority> {
  const paymentMethod = requestedMethod.trim().toLowerCase();
  const { data: settingsRow, error: settingsError } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("store_id", storeId)
    .eq("key", "payment_settings")
    .maybeSingle();

  if (settingsError) throw settingsError;
  const settings = asObject(settingsRow?.value);

  if (paymentMethod === "cod") {
    const allowed = enabled(settings.cod_enabled, true);
    return {
      allowed,
      paymentMethod,
      providerId: null,
      prepaidEligible: false,
      reason: allowed ? null : "Cash on Delivery is disabled for this store",
    };
  }

  if (paymentMethod === "bkash_manual") {
    const allowed = enabled(settings.bkash_enabled) && nonEmptyText(settings.bkash_number);
    return {
      allowed,
      paymentMethod,
      providerId: null,
      prepaidEligible: allowed,
      reason: allowed ? null : "Manual bKash payment is disabled or not configured for this store",
    };
  }

  if (paymentMethod === "nagad") {
    const allowed = enabled(settings.nagad_enabled) && nonEmptyText(settings.nagad_number);
    return {
      allowed,
      paymentMethod,
      providerId: null,
      prepaidEligible: allowed,
      reason: allowed ? null : "Nagad payment is disabled or not configured for this store",
    };
  }

  const provider = getPaymentProviderByPaymentMethod(paymentMethod);
  if (!provider || provider.runtimeStatus !== "active") {
    return {
      allowed: false,
      paymentMethod,
      providerId: null,
      prepaidEligible: false,
      reason: "Payment method is not supported",
    };
  }

  if (!provider.connectionRequired) {
    return {
      allowed: true,
      paymentMethod,
      providerId: provider.id,
      prepaidEligible: isPrepaidStorefrontPaymentMethod(paymentMethod),
      reason: null,
    };
  }

  const { data: connection, error: connectionError } = await supabaseAdmin
    .from("store_payment_connections_secure")
    .select("id, store_id, provider, status, public_metadata, secret_payload, created_at, updated_at, revoked_at")
    .eq("store_id", storeId)
    .eq("provider", provider.id)
    .maybeSingle();

  if (connectionError) throw connectionError;
  const adapter = getPaymentProviderServerAdapter(provider.id);
  const row = connection as PaymentConnectionRow | null;
  const allowed = Boolean(
    row
    && row.status === "connected"
    && !row.revoked_at
    && adapter
    && adapter.hasCompleteSecrets(row.secret_payload),
  );

  return {
    allowed,
    paymentMethod,
    providerId: provider.id,
    prepaidEligible: allowed && isPrepaidStorefrontPaymentMethod(paymentMethod),
    reason: allowed ? null : `${provider.label} is not connected for this store`,
  };
}
