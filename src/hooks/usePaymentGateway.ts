import { useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getPaymentProviderManifest,
  listPaymentProviderManifests,
  type PaymentProviderManifest,
} from "@/lib/payments/provider-registry";

export type PaymentConnectionSummary = {
  id?: string;
  provider: string;
  configured: boolean;
  status: "draft" | "configured" | "revoked";
  verificationStatus: "not_checked" | "verified" | "failed";
  verificationAvailable: boolean;
  verificationError: Record<string, unknown> | null;
  lastVerificationAt: string | null;
  lastVerifiedAt: string | null;
  metadata: Record<string, unknown>;
  updatedAt: string | null;
  revokedAt: string | null;
};

export type BkashConnectionSummary = PaymentConnectionSummary & { provider: "bkash" };
export type PaymentProviderDraft = Record<string, string | number | boolean | null>;

const paymentProviderManifests = listPaymentProviderManifests()
  .filter((provider) => provider.runtimeStatus !== "disabled");

const legacyPaymentSecretKeys = new Set([
  "bkash_app_key",
  "bkash_app_secret",
  "bkash_username",
  "bkash_password",
  "bkash_is_live",
]);

const providerSecretKeys = new Set(
  paymentProviderManifests.flatMap((provider) =>
    provider.fields.filter((field) => field.scope === "secret").map((field) => field.key),
  ),
);

function defaultFieldValue(field: PaymentProviderManifest["fields"][number]) {
  if (field.defaultValue !== undefined && field.defaultValue !== null) return field.defaultValue;
  if (field.kind === "boolean") return false;
  return "";
}

function createProviderDraft(manifest: PaymentProviderManifest): PaymentProviderDraft {
  return Object.fromEntries(manifest.fields.map((field) => [field.key, defaultFieldValue(field)]));
}

function createInitialProviderDrafts() {
  return Object.fromEntries(
    paymentProviderManifests.map((manifest) => [manifest.id, createProviderDraft(manifest)]),
  ) as Record<string, PaymentProviderDraft>;
}

export function scrubPaymentSettings(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([key]) =>
      !legacyPaymentSecretKeys.has(key) && !providerSecretKeys.has(key),
    ),
  );
}

export function usePaymentGateway({
  activeStoreId,
  accessToken,
  enabled = true,
}: {
  activeStoreId: string | null;
  accessToken: string | null | undefined;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [providerDrafts, setProviderDrafts] = useState<Record<string, PaymentProviderDraft>>(createInitialProviderDrafts);

  const connectionQueries = useQueries({
    queries: paymentProviderManifests.map((manifest) => ({
      queryKey: ["payment-connection", manifest.id, activeStoreId],
      queryFn: async (): Promise<PaymentConnectionSummary> => {
        if (!activeStoreId || !accessToken) {
          throw new Error(`Please sign in again before loading ${manifest.label} connection status.`);
        }
        const response = await fetch(
          `/api/payment-connections/${encodeURIComponent(manifest.id)}?storeId=${encodeURIComponent(activeStoreId)}`,
          { headers: { authorization: `Bearer ${accessToken}` } },
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || `Failed to load ${manifest.label} connection status`);
        return data.connection as PaymentConnectionSummary;
      },
      enabled: Boolean(activeStoreId && accessToken && enabled && manifest.runtimeStatus === "active"),
    })),
  });

  const connections = Object.fromEntries(
    paymentProviderManifests.map((manifest, index) => [
      manifest.id,
      connectionQueries[index]?.data as PaymentConnectionSummary | undefined,
    ]),
  ) as Record<string, PaymentConnectionSummary | undefined>;

  const loadingByProvider = Object.fromEntries(
    paymentProviderManifests.map((manifest, index) => [manifest.id, Boolean(connectionQueries[index]?.isLoading)]),
  ) as Record<string, boolean>;

  const updateProviderDraft = (provider: string, key: string, value: string | number | boolean | null) => {
    if (!getPaymentProviderManifest(provider)) return;
    setProviderDrafts((previous) => ({
      ...previous,
      [provider]: { ...(previous[provider] ?? {}), [key]: value },
    }));
  };

  const replaceProviderDraft = (provider: string, draft: PaymentProviderDraft) => {
    if (!getPaymentProviderManifest(provider)) return;
    setProviderDrafts((previous) => ({ ...previous, [provider]: draft }));
  };

  const resetSecretDraftFields = (manifest: PaymentProviderManifest) => {
    setProviderDrafts((previous) => {
      const current = previous[manifest.id] ?? createProviderDraft(manifest);
      return {
        ...previous,
        [manifest.id]: Object.fromEntries(
          manifest.fields.map((field) => [
            field.key,
            field.scope === "secret" ? defaultFieldValue(field) : current[field.key] ?? defaultFieldValue(field),
          ]),
        ),
      };
    });
  };

  const saveProviderConnection = async (provider: string, rotate = false) => {
    if (!activeStoreId || !accessToken) return;
    const manifest = getPaymentProviderManifest(provider);
    if (!manifest || manifest.runtimeStatus !== "active") {
      toast.error("This payment provider is not active.");
      return;
    }

    setSavingAction(`${provider}_${rotate ? "rotate" : "connect"}`);
    try {
      const response = await fetch(`/api/payment-connections/${encodeURIComponent(provider)}`, {
        method: rotate ? "PATCH" : "PUT",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          storeId: activeStoreId,
          settings: providerDrafts[provider] ?? createProviderDraft(manifest),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `Failed to save ${manifest.label} connection`);

      resetSecretDraftFields(manifest);
      await queryClient.invalidateQueries({ queryKey: ["payment-connection", provider, activeStoreId] });
      queryClient.invalidateQueries({ queryKey: ["public_payment_settings", activeStoreId] });
      toast.success(rotate ? `${manifest.label} credentials updated; verification reset` : `${manifest.label} credentials configured`);
    } catch (error: any) {
      toast.error(error?.message || `Failed to save ${manifest.label} connection`);
    } finally {
      setSavingAction(null);
    }
  };

  const revokeProviderConnection = async (provider: string) => {
    if (!activeStoreId || !accessToken) return;
    const manifest = getPaymentProviderManifest(provider);
    if (!manifest || manifest.runtimeStatus !== "active") return;

    setSavingAction(`${provider}_revoke`);
    try {
      const response = await fetch(
        `/api/payment-connections/${encodeURIComponent(provider)}?storeId=${encodeURIComponent(activeStoreId)}`,
        { method: "DELETE", headers: { authorization: `Bearer ${accessToken}` } },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `Failed to revoke ${manifest.label} connection`);
      await queryClient.invalidateQueries({ queryKey: ["payment-connection", provider, activeStoreId] });
      queryClient.invalidateQueries({ queryKey: ["public_payment_settings", activeStoreId] });
      toast.success(`${manifest.label} gateway revoked`);
    } catch (error: any) {
      toast.error(error?.message || `Failed to revoke ${manifest.label} connection`);
    } finally {
      setSavingAction(null);
    }
  };

  const bkashManifest = getPaymentProviderManifest("bkash");
  const bkashConnectionDraft = providerDrafts.bkash ?? (bkashManifest ? createProviderDraft(bkashManifest) : {});

  return {
    providerManifests: paymentProviderManifests,
    providerDrafts,
    connections,
    loadingByProvider,
    updateProviderDraft,
    replaceProviderDraft,
    saveProviderConnection,
    revokeProviderConnection,
    savingAction,
    scrubPaymentSettings,
    bkashConnectionDraft,
    setBkashConnectionDraft: (updater: PaymentProviderDraft | ((draft: PaymentProviderDraft) => PaymentProviderDraft)) => {
      const current = providerDrafts.bkash ?? {};
      replaceProviderDraft("bkash", typeof updater === "function" ? updater(current) : updater);
    },
    bkashConnection: connections.bkash as BkashConnectionSummary | undefined,
    bkashConnectionLoading: loadingByProvider.bkash ?? false,
    refetchBkashConnection: async () => {
      await queryClient.invalidateQueries({ queryKey: ["payment-connection", "bkash", activeStoreId] });
    },
    saveBkashConnection: (rotate = false) => saveProviderConnection("bkash", rotate),
    revokeBkashConnection: () => revokeProviderConnection("bkash"),
  };
}
