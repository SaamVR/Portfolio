import { send } from "@vercel/queue";
import { getSupabaseAdminClient } from "@/lib/api/supabase-route";
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

  if (shouldUseOrderBackgroundQueue()) {
    try {
      await enqueueOrderBackgroundMessage(
        {
          type: "order_cancelled",
          payload,
        },
        `order-cancelled:${String(args.revenueEventRow.order_id ?? "unknown")}`,
      );
      return { mode: "queue" as const };
    } catch (error) {
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
}
