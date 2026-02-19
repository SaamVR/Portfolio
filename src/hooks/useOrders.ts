import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

export function useMyOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
    enabled: !!user,
  });
}

export function useAllOrders() {
  return useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });
}

function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TBD-${date}-${rand}`;
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (order: {
      user_id?: string | null;
      items: Order["items"];
      subtotal: number;
      total: number;
      customer_name: string;
      customer_phone: string;
      customer_email?: string;
      shipping_address: string;
      shipping_city: string;
      payment_method: string;
      notes?: string;
    }) => {
      const orderNumber = generateOrderNumber();
      const payload = {
        user_id: order.user_id || null,
        items: order.items as unknown as Record<string, unknown>[],
        subtotal: order.subtotal,
        total: order.total,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        customer_email: order.customer_email || null,
        shipping_address: order.shipping_address,
        shipping_city: order.shipping_city,
        payment_method: order.payment_method,
        notes: order.notes || null,
        order_number: orderNumber,
      };
      const { error } = await supabase
        .from("orders")
        .insert(payload as any);
      if (error) throw error;
      return { order_number: orderNumber } as unknown as Order;
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status } as Record<string, unknown>)
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });
}
