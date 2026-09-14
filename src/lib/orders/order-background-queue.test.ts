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
    purchaseEventRows: [
      {
        store_id: "store-1",
        order_id: "order-1",
        event_name: "purchase",
        value: 1200,
        metadata: { payment_method: "bkash" },
      },
      {
        store_id: "store-1",
        order_id: "order-1",
        product_id: "product-1",
        event_name: "purchase_item",
        value: 1200,
        metadata: { productName: "Example" },
      },
    ],
    recoveryOrderId: "order-1",
    revenueEventRow: {
      order_id: "order-1",
      store_id: "store-1",
      event_type: "sale",
      net_amount: 1200,
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
  it("falls back to inline execution with truthful order-created semantics", async () => {
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
      const run = createdRuns[0] as ReturnType<typeof buildCreatedArgs>;
      expect(run.purchaseEventRows.map((row) => row.event_name)).toEqual([
        "order_created",
        "order_created_item",
      ]);
      expect(run.recoveredRevenue).toBe(0);
      expect(run.revenueEventRow).toEqual({
        store_id: "store-1",
        order_id: "order-1",
        lifecycle_truth: "order_created_unsettled",
      });
    } finally {
      orderBackgroundQueueDeps.getTransportMode = originalMode;
      orderBackgroundQueueDeps.send = originalSend;
      orderBackgroundQueueDeps.runOrderCreatedBackgroundJobs = originalRunCreated;
    }
  });

  it("publishes truthful order-created payloads when queue transport is enabled", async () => {
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
      const result = await dispatchOrderCreatedBackgroundJobs(buildCreatedArgs());

      expect(result.mode).toBe("queue");
      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0]?.topic).toBe("order-background-events");
      expect(sentMessages[0]?.message.type).toBe("order_created");
      if (sentMessages[0]?.message.type !== "order_created") {
        throw new Error("Expected order_created queue message");
      }
      expect(sentMessages[0].message.payload.purchaseEventRows.map((row) => (row as { event_name?: string }).event_name)).toEqual([
        "order_created",
        "order_created_item",
      ]);
      expect(sentMessages[0].message.payload.recoveredRevenue).toBe(0);
      expect(sentMessages[0].message.payload.revenueEventRow).toEqual({
        store_id: "store-1",
        order_id: "order-1",
        lifecycle_truth: "order_created_unsettled",
      });
    } finally {
      orderBackgroundQueueDeps.getTransportMode = originalMode;
      orderBackgroundQueueDeps.send = originalSend;
    }
  });

  it("publishes a cancellation queue message when queue transport is enabled", async () => {
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
      return Promise.allSettled([]);
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
