import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CourierConnectionRecord, ShipmentSummary } from "@/lib/couriers/shared";

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Please sign in again before updating courier settings");
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export function useCourierConnections(storeId?: string | null) {
  return useQuery({
    queryKey: ["courier-connections-secure", storeId],
    enabled: Boolean(storeId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/couriers/connections?storeId=${encodeURIComponent(storeId as string)}`, {
        headers,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to load courier connections");
      }
      const data = await response.json();
      return (data.connections ?? []) as CourierConnectionRecord[];
    },
  });
}

export function useSaveCourierConnection(storeId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!storeId) throw new Error("No active store selected");
      const headers = await getAuthHeaders();
      const response = await fetch("/api/couriers/connections", {
        method: "POST",
        headers,
        body: JSON.stringify({
          storeId,
          ...payload,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to save courier connection");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier-connections-secure", storeId] });
    },
  });
}

export function useUpdateCourierConnection(storeId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!storeId) throw new Error("No active store selected");
      const headers = await getAuthHeaders();
      const response = await fetch("/api/couriers/connections", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          storeId,
          ...payload,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to update courier connection");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier-connections-secure", storeId] });
    },
  });
}

export function useBookCourierShipment(storeId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!storeId) throw new Error("No active store selected");
      const headers = await getAuthHeaders();
      const response = await fetch("/api/couriers/book", {
        method: "POST",
        headers,
        body: JSON.stringify({
          storeId,
          ...payload,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to book courier");
      }
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["courier-connections-secure", storeId] });
      queryClient.invalidateQueries({ queryKey: ["order-shipments", storeId] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders", storeId] });
      const orderId = typeof variables.orderId === "string" ? variables.orderId : null;
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ["order-shipments-by-order", storeId, orderId] });
      }
    },
  });
}

export function useOrderShipments(storeId?: string | null) {
  return useQuery({
    queryKey: ["order-shipments", storeId],
    enabled: Boolean(storeId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/couriers/shipments?storeId=${encodeURIComponent(storeId as string)}`, {
        headers,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to load shipment activity");
      }
      const data = await response.json();
      return (data.shipments ?? []) as ShipmentSummary[];
    },
  });
}
