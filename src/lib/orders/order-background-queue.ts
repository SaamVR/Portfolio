import { send } from "@vercel/queue";
import { getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { triggerWhatsAppOrderStatusNotify, type WhatsAppOrderStatusPayload } from "@/lib/cms/whatsapp-order-status-notify";
import { recordCaughtIncident } from "@/lib/platform/incident-logger";
import {
  normalizeOrderCreatedAnalyticsRows,
  runOrderCancelledBackgroundJobs,
  runOrderCreatedBackgroundJobs,
  type RunOrderCancelledBackgroundJobsArgs,
  type RunOrderCreatedBackgroundJobsArgs,
} from "@/lib/orders/order-background-jobs";

type OrderCreatedQueuePayload = Omit<RunOrderCreatedBackgroundJobsArgs, "supabaseAdmin">;
type OrderCancelledQueuePayload = Omit<RunOrderCancelledBackgroundJobsArgs, "supabaseAdmin">;
type OrderStatusChangedQueuePayload = {
  notification: WhatsAppOrderStatusPayload;
};

export type DispatchOrderStatusChangedBackgroundJobsArgs = OrderStatusChangedQueuePayload & {
  supabaseAdmin: any;
};

export type OrderBackgroundQueueMessage =
  | {
      type: "order_created";
      payload: OrderCreatedQueuePayload;
    }
  | {
      type: "order_cancelled";
      payload: OrderCancelledQueuePayload;
    }
  | {
      type: "order_status_changed";
      payload: OrderStatusChangedQueuePayload;
    };

const ORDER_BACKGROUND_QUEUE_TOPIC = "order-background-events";

export const orderBackgroundQueueDeps = {
  getTransportMode: () => process.env.ORDER_BACKGROUND_JOBS_TRANSPORT?.trim().toLowerCase() ?? "inline",
  send,
  getSupabaseAdminClient,
  runOrderCreatedBackgroundJobs,
  runOrderCancelledBackgroundJobs,
  triggerWhatsAppOrderStatusNotify,
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

function makeTruthfulOrderCreatedArgs(args: RunOrderCreatedBackgroundJobsArgs): RunOrderCreatedBackgroundJobsArgs {
  return {
    ...args,
    purchaseEventRows: normalizeOrderCreatedAnalyticsRows(args.purchaseEventRows),
    // Order creation is not settlement authority. Keep the legacy payload field
    // structurally compatible without carrying a fabricated sale/refund claim.
    revenueEventRow: {
      store_id: args.storeId,
      order_id: args.recoveryOrderId,
      lifecycle_truth: "order_created_unsettled",
    },
    recoveredRevenue: 0,
  };
}

export async function dispatchOrderCreatedBackgroundJobs(args: RunOrderCreatedBackgroundJobsArgs) {
  const truthfulArgs = makeTruthfulOrderCreatedArgs(args);
  const { supabaseAdmin, ...payload } = truthfulArgs;
  const message: OrderBackgroundQueueMessage = {
    type: "order_created",
    payload,
  };
  const idempotencyKey = `order-created:${args.recoveryOrderId}`;

  if (shouldUseOrderBackgroundQueue()) {
    try {
      await enqueueOrderBackgroundMessage(message, idempotencyKey);
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

  try {
    await orderBackgroundQueueDeps.runOrderCreatedBackgroundJobs({
      ...payload,
      supabaseAdmin,
    });
    return { mode: "inline" as const };
  } catch (error) {
    // The runner only rejects for retry-required recovery-state mutation. Even
    // when normal transport is inline, hand this failure to the durable queue so
    // it is not permanently lost after an incident log.
    await recordCaughtIncident(supabaseAdmin, {
      fingerprint: "orders.background.created.inline-retry-required",
      severity: "warning",
      source: "orders",
      title: "Inline order-created recovery failed; durable retry requested",
      error,
      route: "/api/orders/create",
      storeId: args.storeId,
      metadata: { orderId: args.recoveryOrderId, retryRequired: true },
    });

    try {
      await enqueueOrderBackgroundMessage(message, idempotencyKey);
      return { mode: "queue-recovery" as const };
    } catch (queueError) {
      await recordCaughtIncident(supabaseAdmin, {
        fingerprint: "orders.queue.publish.created-recovery",
        severity: "warning",
        source: "orders",
        title: "Retry-required order-created recovery could not be queued",
        error: queueError,
        route: "/api/orders/create",
        storeId: args.storeId,
        metadata: { orderId: args.recoveryOrderId, retryRequired: true },
      });
      throw error;
    }
  }
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

async function runOrderStatusNotificationInline(args: DispatchOrderStatusChangedBackgroundJobsArgs) {
  try {
    await orderBackgroundQueueDeps.triggerWhatsAppOrderStatusNotify(
      args.supabaseAdmin,
      args.notification,
    );
  } catch (error) {
    await recordCaughtIncident(args.supabaseAdmin, {
      fingerprint: "orders.background.status.customer-whatsapp",
      severity: "warning",
      source: "orders",
      title: "Customer order-status WhatsApp notification failed",
      error,
      route: "/api/orders/status",
      storeId: args.notification.store_id,
      metadata: {
        orderId: args.notification.order_id,
        status: args.notification.status,
      },
    });
  }
}

export async function dispatchOrderStatusChangedBackgroundJobs(
  args: DispatchOrderStatusChangedBackgroundJobsArgs,
) {
  const { supabaseAdmin, ...payload } = args;
  const idempotencyKey = `order-status:${args.notification.order_id}:${args.notification.status}`;

  if (shouldUseOrderBackgroundQueue()) {
    try {
      await enqueueOrderBackgroundMessage(
        {
          type: "order_status_changed",
          payload,
        },
        idempotencyKey,
      );
      return { mode: "queue" as const };
    } catch (error) {
      await recordCaughtIncident(supabaseAdmin, {
        fingerprint: "orders.queue.publish.status-changed",
        severity: "prewarning",
        source: "orders",
        title: "Order-status queue publish failed; inline fallback used",
        error,
        route: "/api/orders/status",
        storeId: args.notification.store_id,
        metadata: {
          orderId: args.notification.order_id,
          status: args.notification.status,
        },
      });
      console.error("Order status queue publish failed, falling back to inline execution:", error);
    }
  }

  await runOrderStatusNotificationInline(args);
  return { mode: "inline" as const };
}

export async function processOrderBackgroundQueueMessage(message: OrderBackgroundQueueMessage) {
  const supabaseAdmin = orderBackgroundQueueDeps.getSupabaseAdminClient();
  const storeId = message.type === "order_created"
    ? message.payload.storeId
    : message.type === "order_cancelled"
      ? typeof message.payload.revenueEventRow.store_id === "string"
        ? message.payload.revenueEventRow.store_id
        : null
      : message.payload.notification.store_id;

  try {
    if (message.type === "order_created") {
      await orderBackgroundQueueDeps.runOrderCreatedBackgroundJobs({
        ...message.payload,
        supabaseAdmin,
      });
      return;
    }

    if (message.type === "order_cancelled") {
      await orderBackgroundQueueDeps.runOrderCancelledBackgroundJobs({
        ...message.payload,
        supabaseAdmin,
      });
      return;
    }

    await orderBackgroundQueueDeps.triggerWhatsAppOrderStatusNotify(
      supabaseAdmin,
      message.payload.notification,
    );
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
    // Preserve retry-required failure so the queue runtime can retry instead of
    // acknowledging a permanently incomplete recovery-state mutation.
    throw error;
  }
}
