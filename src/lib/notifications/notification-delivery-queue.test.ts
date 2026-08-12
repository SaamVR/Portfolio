import { describe, expect, it } from "@/test/test-utils";
import {
  dispatchNotificationDelivery,
  notificationDeliveryQueueDeps,
  processNotificationQueueMessage,
} from "@/lib/notifications/notification-delivery-queue";

describe("notification delivery queue dispatcher", () => {
  it("sends inline when queue transport is disabled", async () => {
    const originalMode = notificationDeliveryQueueDeps.getTransportMode;
    const originalFetch = notificationDeliveryQueueDeps.fetch;
    const calls: Array<{ url: string; init?: RequestInit }> = [];

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    notificationDeliveryQueueDeps.getTransportMode = () => "inline";
    notificationDeliveryQueueDeps.fetch = (async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as typeof notificationDeliveryQueueDeps.fetch;

    try {
      const result = await dispatchNotificationDelivery({
        templateName: "merchant-order-alert",
        to: "alerts@example.com",
      });

      expect(result.mode).toBe("inline");
      expect(calls).toHaveLength(1);
    } finally {
      notificationDeliveryQueueDeps.getTransportMode = originalMode;
      notificationDeliveryQueueDeps.fetch = originalFetch;
    }
  });

  it("publishes queue messages when queue transport is enabled", async () => {
    const originalMode = notificationDeliveryQueueDeps.getTransportMode;
    const originalSend = notificationDeliveryQueueDeps.send;
    const sent: Array<{ topic: string }> = [];

    notificationDeliveryQueueDeps.getTransportMode = () => "queue";
    notificationDeliveryQueueDeps.send = (async (topic, _message, options) => {
      void options;
      sent.push({ topic });
      return { messageId: "msg_1" };
    }) as typeof notificationDeliveryQueueDeps.send;

    try {
      const result = await dispatchNotificationDelivery({
        templateName: "merchant-order-alert",
        existingEventId: "event_1",
        retryCount: 2,
        to: "alerts@example.com",
      });

      expect(result.mode).toBe("queue");
      expect(sent).toHaveLength(1);
      expect(sent[0]?.topic).toBe("notification-delivery-events");
    } finally {
      notificationDeliveryQueueDeps.getTransportMode = originalMode;
      notificationDeliveryQueueDeps.send = originalSend;
    }
  });

  it("processes queued notifications through the server-side delivery path", async () => {
    const originalFetch = notificationDeliveryQueueDeps.fetch;
    const calls: Array<{ url: string; init?: RequestInit }> = [];

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    notificationDeliveryQueueDeps.fetch = (async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as typeof notificationDeliveryQueueDeps.fetch;

    try {
      await processNotificationQueueMessage({
        type: "notification_delivery",
        payload: {
          templateName: "merchant-order-alert",
          to: "alerts@example.com",
        },
      });

      expect(calls).toHaveLength(1);
    } finally {
      notificationDeliveryQueueDeps.fetch = originalFetch;
    }
  });
});
