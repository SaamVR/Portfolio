import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { BkashConnectionDraftValues } from "@/lib/validations/site-settings";

export type BkashConnectionSummary = {
  provider: "bkash";
  configured: boolean;
  status: "draft" | "connected" | "revoked";
  metadata: {
    environment: "sandbox" | "live";
    label: string;
    appKeyHint: string | null;
    usernameHint: string | null;
  };
  updatedAt: string | null;
  revokedAt: string | null;
};

const paymentSecretKeys = new Set([
  "bkash_app_key",
  "bkash_app_secret",
  "bkash_username",
  "bkash_password",
  "bkash_is_live",
]);

export function scrubPaymentSettings(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([key]) => !paymentSecretKeys.has(key)),
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

  const [bkashConnectionDraft, setBkashConnectionDraft] = useState<BkashConnectionDraftValues>({
    appKey: "",
    appSecret: "",
    username: "",
    password: "",
    isLive: false,
  });

  const {
    data: bkashConnection,
    refetch: refetchBkashConnection,
    isLoading: bkashConnectionLoading,
  } = useQuery({
    queryKey: ["payment-connection", "bkash", activeStoreId],
    queryFn: async (): Promise<BkashConnectionSummary> => {
      if (!activeStoreId || !accessToken) {
        throw new Error("Please sign in again before loading bKash connection status.");
      }

      const response = await fetch(`/api/payment-connections/bkash?storeId=${encodeURIComponent(activeStoreId)}`, {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to load bKash connection status");
      }
      return data.connection as BkashConnectionSummary;
    },
    enabled: Boolean(activeStoreId && accessToken && enabled),
  });

  const saveBkashConnection = async (rotate = false) => {
    if (!activeStoreId || !accessToken) return;

    setSavingAction(rotate ? "bkash_connection_rotate" : "bkash_connection");
    try {
      const response = await fetch("/api/payment-connections/bkash", {
        method: rotate ? "PATCH" : "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          storeId: activeStoreId,
          settings: bkashConnectionDraft,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to save bKash connection");
      }
      setBkashConnectionDraft({
        appKey: "",
        appSecret: "",
        username: "",
        password: "",
        isLive: bkashConnectionDraft.isLive,
      });
      await refetchBkashConnection();
      queryClient.invalidateQueries({ queryKey: ["public_payment_settings", activeStoreId] });
      toast.success(rotate ? "bKash credentials rotated" : "bKash gateway connected");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save bKash connection");
    } finally {
      setSavingAction(null);
    }
  };

  const revokeBkashConnection = async () => {
    if (!activeStoreId || !accessToken) return;

    setSavingAction("bkash_connection_revoke");
    try {
      const response = await fetch(`/api/payment-connections/bkash?storeId=${encodeURIComponent(activeStoreId)}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to revoke bKash connection");
      }
      await refetchBkashConnection();
      queryClient.invalidateQueries({ queryKey: ["public_payment_settings", activeStoreId] });
      toast.success("bKash gateway revoked");
    } catch (error: any) {
      toast.error(error?.message || "Failed to revoke bKash connection");
    } finally {
      setSavingAction(null);
    }
  };

  return {
    bkashConnectionDraft,
    setBkashConnectionDraft,
    bkashConnection,
    bkashConnectionLoading,
    savingAction,
    refetchBkashConnection,
    saveBkashConnection,
    revokeBkashConnection,
    scrubPaymentSettings,
  };
}
