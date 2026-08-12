import { describe, expect, it } from "@/test/test-utils";
import {
  dispatchOrderCancelledBackgroundJobs,
  dispatchOrderCreatedBackgroundJobs,
  orderBackgroundQueueDeps,
  processOrderBackgroundQueueMessage,
  type OrderBackgroundQueueMessage,
} from "@/lib/orders/order-background-queue";

function buildCreatedArgs() {
  return {
    customerEmail: "buyer@example.com",
    customerPhone: "01700000000",
    notification: {
      store_id: "store-1",
      order_id: "order-1",
      order_number: "1001",
      customer_name: "Buyer",
      customer_phone: "01700000000",
      shipping_address: "123 Street",
      shipping_city: "Dhaka",
      total: 1200,
      items: [],
    },
    purchaseEventRows: [],
    recoveryOrderId: "order-1",
    revenueEventRow: {
      order_id: "order-1",
      store_id: "store-1",
    },
    recoveredRevenue: 1200,
    storeId: "store-1",
    supabaseAdmin: { kind: "inline-admin" },
  };
}

function buildCancelledArgs() {
  return {
    revenueEventRow: {
      order_id: "order-2",
      store_id: "store-1",
    },
    supabaseAdmin: { kind: "inline-admin" },
  };
}

describe("order background queue dispatcher", () => {
  it("falls back to inline execution when queue transport is disabled", async () => {
    const createdRuns: unknown[] = [];
    const originalMode = orderBackgroundQueueDeps.getTransportMode;
    const originalSend = orderBackgroundQueueDeps.send;
    const originalRunCreated = orderBackgroundQueueDeps.runOrderCreatedBackgroundJobs;

    orderBackgroundQueueDeps.getTransportMode = () => "inline";
    orderBackgroundQueueDeps.send = (async () => {
      throw new Error("send should not be called");
    }) as typeof orderBackgroundQueueDeps.send;
    orderBackgroundQueueDeps.runOrderCreatedBackgroundJobs = (async (args) => {
      createdRuns.push(args);
      return Promise.allSettled([]);
    }) as typeof orderBackgroundQueueDeps.runOrderCreatedBackgroundJobs;

    try {
      const result = await dispatchOrderCreatedBackgroundJobs(buildCreatedArgs());

      expect(result.mode).toBe("inline");
      expect(createdRuns).toHaveLength(1);
    } finally {
      orderBackgroundQueueDeps.getTransportMode = originalMode;
      orderBackgroundQueueDeps.send = originalSend;
      orderBackgroundQueueDeps.runOrderCreatedBackgroundJobs = originalRunCreated;
    }
  });

  it("publishes a queue message when queue transport is enabled", async () => {
    const sentMessages: Array<{ topic: string; message: OrderBackgroundQueueMessage }> = [];
    const originalMode = orderBackgroundQueueDeps.getTransportMode;
    const originalSend = orderBackgroundQueueDeps.send;

    orderBackgroundQueueDeps.getTransportMode = () => "queue";
    orderBackgroundQueueDeps.send = (async (topic, message, options) => {
      void options;
      sentMessages.push({ topic, message: message as OrderBackgroundQueueMessage });
      return { messageId: "msg_1" };
    }) as typeof orderBackgroundQueueDeps.send;

    try {
      const result = await dispatchOrderCancelledBackgroundJobs(buildCancelledArgs());

      expect(result.mode).toBe("queue");
      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0]?.topic).toBe("order-background-events");
      expect(sentMessages[0]?.message.type).toBe("order_cancelled");
    } finally {
      orderBackgroundQueueDeps.getTransportMode = originalMode;
      orderBackgroundQueueDeps.send = originalSend;
    }
  });

  it("processes queued messages with a fresh admin client", async () => {
    const originalAdmin = orderBackgroundQueueDeps.getSupabaseAdminClient;
    const originalRunCancelled = orderBackgroundQueueDeps.runOrderCancelledBackgroundJobs;
    const processed: unknown[] = [];

    orderBackgroundQueueDeps.getSupabaseAdminClient = () => ({ kind: "queue-admin" }) as never;
    orderBackgroundQueueDeps.runOrderCancelledBackgroundJobs = (async (args) => {
      processed.push(args);
      return Promise.allSettled([Promise.resolve()]);
    }) as typeof orderBackgroundQueueDeps.runOrderCancelledBackgroundJobs;

    try {
      await processOrderBackgroundQueueMessage({
        type: "order_cancelled",
        payload: {
          revenueEventRow: {
            order_id: "order-2",
            store_id: "store-1",
          },
        },
      });

      expect(processed).toHaveLength(1);
      expect((processed[0] as { supabaseAdmin?: { kind?: string } }).supabaseAdmin?.kind).toBe("queue-admin");
    } finally {
      orderBackgroundQueueDeps.getSupabaseAdminClient = originalAdmin;
      orderBackgroundQueueDeps.runOrderCancelledBackgroundJobs = originalRunCancelled;
    }
  });
});
