import { describe, expect, it } from "@/test/test-utils";
import {
  dispatchOrderStatusChangedBackgroundJobs,
  orderBackgroundQueueDeps,
  processOrderBackgroundQueueMessage,
  type OrderBackgroundQueueMessage,
} from "@/lib/orders/order-background-queue";

function buildStatusArgs() {
  return {
    notification: {
      store_id: "store-1",
      order_id: "order-1",
      order_number: "1001",
      customer_name: "Buyer",
      customer_phone: "01700000000",
      status: "shipped",
    },
    supabaseAdmin: { kind: "inline-admin" },
  };
}

describe("order status background queue dispatcher", () => {
  it("uses the status notifier inline when queue transport is disabled", async () => {
    const originalMode = orderBackgroundQueueDeps.getTransportMode;
    const originalNotify = orderBackgroundQueueDeps.triggerWhatsAppOrderStatusNotify;
    const notifications: unknown[] = [];

    orderBackgroundQueueDeps.getTransportMode = () => "inline";
    orderBackgroundQueueDeps.triggerWhatsAppOrderStatusNotify = (async (client, payload) => {
      notifications.push({ client, payload });
      return {
        status: "sent",
        provider: "meta-cloud",
        recipient: "8801700000000",
        providerMessageId: "wamid.inline",
      };
    }) as typeof orderBackgroundQueueDeps.triggerWhatsAppOrderStatusNotify;

    try {
      const result = await dispatchOrderStatusChangedBackgroundJobs(buildStatusArgs());

      expect(result.mode).toBe("inline");
      expect(notifications).toHaveLength(1);
      expect((notifications[0] as any).client.kind).toBe("inline-admin");
      expect((notifications[0] as any).payload.status).toBe("shipped");
    } finally {
      orderBackgroundQueueDeps.getTransportMode = originalMode;
      orderBackgroundQueueDeps.triggerWhatsAppOrderStatusNotify = originalNotify;
    }
  });

  it("publishes a durable status event with order-and-status idempotency", async () => {
    const originalMode = orderBackgroundQueueDeps.getTransportMode;
    const originalSend = orderBackgroundQueueDeps.send;
    const sentMessages: Array<{
      topic: string;
      message: OrderBackgroundQueueMessage;
      options: { idempotencyKey?: string };
    }> = [];

    orderBackgroundQueueDeps.getTransportMode = () => "queue";
    orderBackgroundQueueDeps.send = (async (topic, message, options) => {
      sentMessages.push({
        topic,
        message: message as OrderBackgroundQueueMessage,
        options: options as { idempotencyKey?: string },
      });
      return { messageId: "msg_status_1" };
    }) as typeof orderBackgroundQueueDeps.send;

    try {
      const result = await dispatchOrderStatusChangedBackgroundJobs(buildStatusArgs());

      expect(result.mode).toBe("queue");
      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0]?.topic).toBe("order-background-events");
      expect(sentMessages[0]?.message.type).toBe("order_status_changed");
      expect(sentMessages[0]?.options.idempotencyKey).toBe("order-status:order-1:shipped");
    } finally {
      orderBackgroundQueueDeps.getTransportMode = originalMode;
      orderBackgroundQueueDeps.send = originalSend;
    }
  });

  it("processes queued status messages with a fresh admin client", async () => {
    const originalAdmin = orderBackgroundQueueDeps.getSupabaseAdminClient;
    const originalNotify = orderBackgroundQueueDeps.triggerWhatsAppOrderStatusNotify;
    const notifications: unknown[] = [];

    orderBackgroundQueueDeps.getSupabaseAdminClient = () => ({ kind: "queue-admin" }) as never;
    orderBackgroundQueueDeps.triggerWhatsAppOrderStatusNotify = (async (client, payload) => {
      notifications.push({ client, payload });
      return {
        status: "sent",
        provider: "meta-cloud",
        recipient: "8801700000000",
        providerMessageId: "wamid.queue",
      };
    }) as typeof orderBackgroundQueueDeps.triggerWhatsAppOrderStatusNotify;

    try {
      await processOrderBackgroundQueueMessage({
        type: "order_status_changed",
        payload: {
          notification: buildStatusArgs().notification,
        },
      });

      expect(notifications).toHaveLength(1);
      expect((notifications[0] as any).client.kind).toBe("queue-admin");
      expect((notifications[0] as any).payload.order_id).toBe("order-1");
    } finally {
      orderBackgroundQueueDeps.getSupabaseAdminClient = originalAdmin;
      orderBackgroundQueueDeps.triggerWhatsAppOrderStatusNotify = originalNotify;
    }
  });
});
