import { send } from "@vercel/queue";
import { getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { recordCaughtIncident } from "@/lib/platform/incident-logger";
import {
  runOrderCancelledBackgroundJobs,
  runOrderCreatedBackgroundJobs,
  type RunOrderCancelledBackgroundJobsArgs,
  type RunOrderCreatedBackgroundJobsArgs,
} from "@/lib/orders/order-background-jobs";

type OrderCreatedQueuePayload = Omit<RunOrderCreatedBackgroundJobsArgs, "supabaseAdmin">;
type OrderCancelledQueuePayload = Omit<RunOrderCancelledBackgroundJobsArgs, "supabaseAdmin">;

export type OrderBackgroundQueueMessage =
  | {
      type: "order_created";
      payload: OrderCreatedQueuePayload;
    }
  | {
      type: "order_cancelled";
      payload: OrderCancelledQueuePayload;
    };

const ORDER_BACKGROUND_QUEUE_TOPIC = "order-background-events";

export const orderBackgroundQueueDeps = {
  getTransportMode: () => process.env.ORDER_BACKGROUND_JOBS_TRANSPORT?.trim().toLowerCase() ?? "inline",
  send,
  getSupabaseAdminClient,
  runOrderCreatedBackgroundJobs,
  runOrderCancelledBackgroundJobs,
};

function shouldUseOrderBackgroundQueue() {
  return orderBackgroundQueueDeps.getTransportMode() === "queue";
}

async function enqueueOrderBackgroundMessage(message: OrderBackgroundQueueMessage, idempotencyKey: string) {
  return orderBackgroundQueueDeps.send(ORDER_BACKGROUND_QUEUE_TOPIC, message, {
    idempotencyKey,
    retentionSeconds: 3600,
  });
}

export async function dispatchOrderCreatedBackgroundJobs(args: RunOrderCreatedBackgroundJobsArgs) {
  const { supabaseAdmin, ...payload } = args;

  if (shouldUseOrderBackgroundQueue()) {
    try {
      await enqueueOrderBackgroundMessage(
        {
          type: "order_created",
          payload,
        },
        `order-created:${args.recoveryOrderId}`,
      );
      return { mode: "queue" as const };
    } catch (error) {
      await recordCaughtIncident(supabaseAdmin, {
        fingerprint: "orders.queue.publish.created",
        severity: "prewarning",
        source: "orders",
        title: "Order-created queue publish failed; inline fallback used",
        error,
        route: "/api/orders/create",
        storeId: args.storeId,
        metadata: { orderId: args.recoveryOrderId },
      });
      console.error("Order background queue publish failed, falling back to inline execution:", error);
    }
  }

  await orderBackgroundQueueDeps.runOrderCreatedBackgroundJobs({
    ...payload,
    supabaseAdmin,
  });
  return { mode: "inline" as const };
}

export async function dispatchOrderCancelledBackgroundJobs(args: RunOrderCancelledBackgroundJobsArgs) {
  const { supabaseAdmin, ...payload } = args;
  const orderId = String(args.revenueEventRow.order_id ?? "unknown");
  const storeId = typeof args.revenueEventRow.store_id === "string" ? args.revenueEventRow.store_id : null;

  if (shouldUseOrderBackgroundQueue()) {
    try {
      await enqueueOrderBackgroundMessage(
        {
          type: "order_cancelled",
          payload,
        },
        `order-cancelled:${orderId}`,
      );
      return { mode: "queue" as const };
    } catch (error) {
      await recordCaughtIncident(supabaseAdmin, {
        fingerprint: "orders.queue.publish.cancelled",
        severity: "prewarning",
        source: "orders",
        title: "Order-cancelled queue publish failed; inline fallback used",
        error,
        route: "/api/orders/cancel",
        storeId,
        metadata: { orderId },
      });
      console.error("Order background queue publish failed, falling back to inline execution:", error);
    }
  }

  await orderBackgroundQueueDeps.runOrderCancelledBackgroundJobs({
    ...payload,
    supabaseAdmin,
  });
  return { mode: "inline" as const };
}

export async function processOrderBackgroundQueueMessage(message: OrderBackgroundQueueMessage) {
  const supabaseAdmin = orderBackgroundQueueDeps.getSupabaseAdminClient();
  const storeId = message.type === "order_created"
    ? message.payload.storeId
    : typeof message.payload.revenueEventRow.store_id === "string"
      ? message.payload.revenueEventRow.store_id
      : null;

  try {
    if (message.type === "order_created") {
      await orderBackgroundQueueDeps.runOrderCreatedBackgroundJobs({
        ...message.payload,
        supabaseAdmin,
      });
      return;
    }

    await orderBackgroundQueueDeps.runOrderCancelledBackgroundJobs({
      ...message.payload,
      supabaseAdmin,
    });
  } catch (error) {
    await recordCaughtIncident(supabaseAdmin, {
      fingerprint: `orders.queue.consumer.${message.type}`,
      severity: "warning",
      source: "orders",
      title: `Order background queue consumer failed: ${message.type}`,
      error,
      route: "/api/queues/order-background",
      storeId,
    });
    // Preserve the failure so the queue runtime can retry instead of treating
    // the message as successfully consumed.
    throw error;
  }
}
