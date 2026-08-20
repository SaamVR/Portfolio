import { after } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";
import { isCustomerWhatsAppOrderStatus } from "@/lib/cms/whatsapp-order-status-notify";
import { jsonNoStore } from "@/lib/http/cache-control";
import {
  dispatchOrderCancelledBackgroundJobs,
  dispatchOrderStatusChangedBackgroundJobs,
} from "@/lib/orders/order-background-queue";

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
      return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, storeId, status } = await req.json();
    if (!orderId || !storeId || !status) {
      return jsonNoStore({ error: "Missing orderId, storeId, or status" }, { status: 400 });
    }

    const supabaseAdmin = orderStatusRouteDeps.getSupabaseAdminClient();
    const authorized = await orderStatusRouteDeps.canManageStore(
      supabaseAdmin,
      storeId,
      user.id,
      ["owner", "admin", "editor"],
    );
    if (!authorized) {
      return jsonNoStore({ error: "Forbidden" }, { status: 403 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, store_id, order_number, status, total, payment_method, user_id, customer_name, customer_phone")
      .eq("id", orderId)
      .eq("store_id", storeId)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) {
      return jsonNoStore({ error: "Order not found" }, { status: 404 });
    }

    const previousStatus = String(order.status);
    const requestedStatus = String(status);

    if (!canTransition(previousStatus, requestedStatus)) {
      return jsonNoStore(
        { error: `Cannot move order from ${order.status} to ${requestedStatus}` },
        { status: 400 },
      );
    }

    // A repeated PATCH for the current state is a successful no-op. It must not
    // emit a duplicate customer notification or cancellation revenue event.
    if (previousStatus === requestedStatus) {
      return jsonNoStore({ success: true, status: requestedStatus, changed: false });
    }

    // Compare-and-set the current status. If two requests race, only the first
    // transition wins and therefore only one background notification is emitted.
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: requestedStatus })
      .eq("id", orderId)
      .eq("store_id", storeId)
      .eq("status", previousStatus)
      .select("id")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updatedOrder) {
      return jsonNoStore(
        { error: "Order status changed while this update was being processed. Refresh and try again." },
        { status: 409 },
      );
    }

    if (requestedStatus === "cancelled" || isCustomerWhatsAppOrderStatus(requestedStatus)) {
      after(async () => {
        const tasks: Promise<unknown>[] = [];

        if (requestedStatus === "cancelled") {
          tasks.push(dispatchOrderCancelledBackgroundJobs({
            revenueEventRow: {
              store_id: storeId,
              order_id: orderId,
              customer_id: order.user_id ?? null,
              event_type: "cancellation",
              gross_amount: Number(order.total ?? 0),
              refund_amount: Number(order.total ?? 0),
              net_amount: 0,
              currency_code: "BDT",
              payment_method: order.payment_method ?? null,
              status: requestedStatus,
              metadata: {
                previous_status: previousStatus,
              },
            },
            supabaseAdmin,
          }));
        }

        if (isCustomerWhatsAppOrderStatus(requestedStatus)) {
          tasks.push(dispatchOrderStatusChangedBackgroundJobs({
            notification: {
              store_id: storeId,
              order_id: orderId,
              order_number: order.order_number ?? undefined,
              customer_name: order.customer_name ?? "Customer",
              customer_phone: order.customer_phone ?? "",
              status: requestedStatus,
            },
            supabaseAdmin,
          }));
        }

        await Promise.allSettled(tasks);
      });
    }

    return jsonNoStore({ success: true, status: requestedStatus, changed: true });
  } catch (error) {
    console.error("Order status update error:", error);
    return jsonNoStore({ error: "Failed to update order status" }, { status: 500 });
  }
}
