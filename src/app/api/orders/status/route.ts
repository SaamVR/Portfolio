import { NextResponse } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";

export const orderStatusRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
};

const allowedTransitions: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

function canTransition(from: string, to: string) {
  if (from === to) return true;
  return (allowedTransitions[from] ?? []).includes(to);
}

export async function PATCH(req: Request) {
  try {
    const user = await orderStatusRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, storeId, status } = await req.json();
    if (!orderId || !storeId || !status) {
      return NextResponse.json({ error: "Missing orderId, storeId, or status" }, { status: 400 });
    }

    const supabaseAdmin = orderStatusRouteDeps.getSupabaseAdminClient();
    const authorized = await orderStatusRouteDeps.canManageStore(
      supabaseAdmin,
      storeId,
      user.id,
      ["owner", "admin", "editor"],
    );
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, store_id, status, total, payment_method, user_id")
      .eq("id", orderId)
      .eq("store_id", storeId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!canTransition(String(order.status), status)) {
      return NextResponse.json(
        { error: `Cannot move order from ${order.status} to ${status}` },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .eq("store_id", storeId);

    if (updateError) throw updateError;

    if (status === "cancelled") {
      void (supabaseAdmin as any).from("store_revenue_events").insert({
        store_id: storeId,
        order_id: orderId,
        customer_id: order.user_id ?? null,
        event_type: "cancellation",
        gross_amount: Number(order.total ?? 0),
        refund_amount: Number(order.total ?? 0),
        net_amount: 0,
        currency_code: "BDT",
        payment_method: order.payment_method ?? null,
        status,
        metadata: {
          previous_status: order.status,
        },
      });
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Order status update error:", error);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}
