import { handleCallback } from "@vercel/queue";
import {
  processNotificationQueueMessage,
  type NotificationQueueMessage,
} from "@/lib/notifications/notification-delivery-queue";

export const POST = handleCallback<NotificationQueueMessage>(
  async (message) => {
    await processNotificationQueueMessage(message);
  },
  {
    visibilityTimeoutSeconds: 600,
    retry: (_error, metadata) => {
      if (metadata.deliveryCount >= 5) {
        return { acknowledge: true };
      }

      return {
        afterSeconds: Math.min(300, 2 ** metadata.deliveryCount * 5),
      };
    },
  },
);
