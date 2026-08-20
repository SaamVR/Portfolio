import type { ProviderManifest } from "@/lib/integrations/provider-contract";

type RecordValue = Record<string, unknown>;

export type PaymentProviderManifest = ProviderManifest & {
  category: "payment";
  checkoutMode: "redirect" | "manual" | "offline";
  paymentMethod: string;
  connectionRequired: boolean;
  checkoutLabel: string;
  checkoutDescription: string;
};

export type PaymentConnectionStatus = "draft" | "connected" | "revoked";

export type PaymentConnectionRow = {
  id: string;
  store_id: string;
  provider: string;
  status: PaymentConnectionStatus;
  public_metadata: RecordValue | null;
  secret_payload: RecordValue | null;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
};

export type PaymentConnectionSplitResult = {
  publicMetadata: RecordValue;
  secretPayload: RecordValue;
};

export type PaymentProviderConnectionAdapter = {
  splitConnectionSettings: (rawSettings: unknown) => PaymentConnectionSplitResult;
  hasCompleteSecrets: (secretPayload: unknown) => boolean;
  buildConnectionResponse: (row: PaymentConnectionRow | null) => Record<string, unknown>;
  incompleteConnectionMessage: string;
};

export type PaymentCheckoutRequest = {
  providerId: string;
  storeId: string;
  orderNumber: string;
  amount: number;
};

export type PaymentCheckoutResult = {
  providerId: string;
  redirectUrl: string;
};

export type PaymentCallbackStatus = "success" | "cancelled" | "error";

export type PaymentCallbackRequest = {
  providerId: string;
  params: Record<string, string | null | undefined>;
};

export type PaymentCallbackResult = {
  providerId: string;
  status: PaymentCallbackStatus;
  message: string;
  orderNumber?: string;
  storeId?: string;
};

export type PaymentCheckoutRuntimeDeps = {
  invokeFunction: (
    functionName: string,
    body: Record<string, unknown>,
  ) => Promise<{ data?: Record<string, unknown> | null; error?: { message?: string } | null }>;
};

export type PaymentProviderCheckoutAdapter = {
  initializeRedirectCheckout: (
    deps: PaymentCheckoutRuntimeDeps,
    request: PaymentCheckoutRequest,
  ) => Promise<PaymentCheckoutResult>;
  handleRedirectCallback: (
    deps: PaymentCheckoutRuntimeDeps,
    request: PaymentCallbackRequest,
  ) => Promise<PaymentCallbackResult>;
};

export type PaymentProviderPlugin = {
  manifest: PaymentProviderManifest;
  connection: PaymentProviderConnectionAdapter;
  checkout?: PaymentProviderCheckoutAdapter;
};

export function safePaymentObject(value: unknown): RecordValue {
  return typeof value === "object" && value !== null ? value as RecordValue : {};
}

export function readPaymentText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export function pickPaymentSecret(value: unknown) {
  const text = readPaymentText(value, 2000);
  return text ? text : undefined;
}

export function maskPaymentText(value: string) {
  if (!value) return null;
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}
