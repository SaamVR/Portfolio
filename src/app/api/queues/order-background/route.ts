import { handleCallback } from "@vercel/queue";
import {
  processOrderBackgroundQueueMessage,
  type OrderBackgroundQueueMessage,
} from "@/lib/orders/order-background-queue";

export const POST = handleCallback<OrderBackgroundQueueMessage>(
  async (message) => {
    await processOrderBackgroundQueueMessage(message);
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
