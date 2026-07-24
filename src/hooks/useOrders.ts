import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";

export interface Order {
  id: string;
  order_number: string;
  status: string;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    image: string;
    size: string;
    quantity: number;
  }>;
  subtotal: number;
  delivery_fee: number;
  total: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  shipping_address: string;
  shipping_city: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

export function useMyOrders(explicitStoreId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-orders", user?.id, explicitStoreId],
    queryFn: async () => {
      if (!explicitStoreId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user!.id)
        .eq("store_id", explicitStoreId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
    enabled: !!user && !!explicitStoreId,
  });
}

export function useAllOrders(explicitStoreId?: string | null) {
  return useQuery({
    queryKey: ["admin-orders", explicitStoreId],
    queryFn: async () => {
      if (!explicitStoreId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("store_id", explicitStoreId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
    enabled: !!explicitStoreId,
  });
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: {
      idempotencyKey?: string;
      store_id?: string;
      user_id?: string | null;
      items: Order["items"];
      subtotal: number;
      delivery_fee?: number;
      discount_amount?: number;
      coupon_code?: string | null;
      total: number;
      customer_name: string;
      customer_phone: string;
      customer_email?: string;
      shipping_address: string;
      shipping_city: string;
      payment_method: string;
      notes?: string;
    }) => {
      if (!order.store_id) {
        throw new Error("No store selected");
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers,
        body: JSON.stringify({
          idempotencyKey: order.idempotencyKey || createIdempotencyKey(),
          storeId: order.store_id,
          items: order.items.map((item) => ({
            productId: item.productId,
            size: item.size,
            quantity: item.quantity,
          })),
          deliveryFee: order.delivery_fee ?? 0,
          discountAmount: order.discount_amount ?? Math.max(0, order.subtotal + (order.delivery_fee ?? 0) - order.total),
          couponCode: order.coupon_code || null,
          customerName: order.customer_name,
          customerPhone: order.customer_phone,
          customerEmail: order.customer_email || null,
          shippingAddress: order.shipping_address,
          shippingCity: order.shipping_city,
          paymentMethod: order.payment_method,
          notes: order.notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to create order");
      }

      const data = await response.json();
      return data.order as Order;
    },
    onSuccess: (_data, variables) => {
      if (variables.store_id) {
        queryClient.invalidateQueries({ queryKey: ["my-orders"] });
        queryClient.invalidateQueries({ queryKey: ["admin-orders", variables.store_id] });
        queryClient.invalidateQueries({ queryKey: ["products", variables.store_id] });
      }
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status, storeId }: { orderId: string; status: string; storeId?: string }) => {
      if (!storeId) {
        throw new Error("No active store selected");
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error("Please sign in again before updating orders");
      }

      const response = await fetch("/api/orders/status", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId, status, storeId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to update order status");
      }
    },
    onSuccess: (_data, variables) => {
      if (variables.storeId) {
        queryClient.invalidateQueries({ queryKey: ["admin-orders", variables.storeId] });
        queryClient.invalidateQueries({ queryKey: ["my-orders"] });
        queryClient.invalidateQueries({ queryKey: ["products", variables.storeId] });
      }
    },
  });
}




