import { send } from "@vercel/queue";
import { getSupabaseAdminClient } from "@/lib/api/supabase-route";

export type NotificationDeliveryPayload = Record<string, unknown>;
export type ClaimedNotificationEvent = {
  id: string;
  store_id: string | null;
  order_id: string | null;
  template_name: string;
  recipient: string | null;
  channel: string;
  metadata: Record<string, unknown> | null;
  retry_count: number | null;
  status: string;
};

export type NotificationQueueMessage = {
  type: "notification_delivery";
  payload: NotificationDeliveryPayload;
};

const NOTIFICATION_DELIVERY_QUEUE_TOPIC = "notification-delivery-events";

export const notificationDeliveryQueueDeps = {
  getTransportMode: () => process.env.NOTIFICATION_JOBS_TRANSPORT?.trim().toLowerCase() ?? "inline",
  getSupabaseAdminClient,
  send,
  fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
};

function shouldUseNotificationQueue() {
  return notificationDeliveryQueueDeps.getTransportMode() === "queue";
}

function getNotificationServiceConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server credentials are not configured");
  }

  return {
    supabaseUrl,
    serviceRoleKey,
  };
}

function buildIdempotencyKey(payload: NotificationDeliveryPayload) {
  const existingEventId = typeof payload.existingEventId === "string" ? payload.existingEventId : null;
  const templateName = typeof payload.templateName === "string" ? payload.templateName : "notification";
  const recipient = typeof payload.to === "string"
    ? payload.to
    : typeof payload.customer_phone === "string"
      ? payload.customer_phone
      : "unknown";
  const retryCount = typeof payload.retryCount === "number" ? payload.retryCount : 0;

  return existingEventId
    ? `notification-retry:${existingEventId}:${retryCount}`
    : `notification-send:${templateName}:${recipient}`;
}

export async function sendNotificationDeliveryInline(payload: NotificationDeliveryPayload) {
  const { supabaseUrl, serviceRoleKey } = getNotificationServiceConfig();

  return notificationDeliveryQueueDeps.fetch(
    `${supabaseUrl}/functions/v1/send-email`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(payload),
    },
  );
}

function asObject(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export function getRetryPayload(event: ClaimedNotificationEvent) {
  const metadata = asObject(event.metadata);
  const storedPayload = asObject(metadata.retry_payload);
  return {
    ...storedPayload,
    templateName: storedPayload.templateName ?? event.template_name,
    store_id: storedPayload.store_id ?? event.store_id,
    order_id: storedPayload.order_id ?? event.order_id,
    to: storedPayload.to ?? (event.channel === "email" ? event.recipient : undefined),
    customer_phone: storedPayload.customer_phone ?? (event.channel === "sms" ? event.recipient : undefined),
    existingEventId: event.id,
    retryCount: (event.retry_count ?? 0) + 1,
  };
}

function isTransientDeliveryFailure(message: string, status: number) {
  return status === 429 || status >= 500 || /429|5\d\d|timeout|timed out|temporary|temporarily|network|fetch failed|unavailable|connection/i.test(message);
}

async function markProcessingFailure(event: ClaimedNotificationEvent, message: string, status: number) {
  const supabaseAdmin = notificationDeliveryQueueDeps.getSupabaseAdminClient();
  const retryCount = Math.max(0, Number(event.retry_count ?? 0)) + 1;
  const transient = isTransientDeliveryFailure(message, status);
  const deadLetter = transient && retryCount >= 3;

  const nextRetryAt = transient && !deadLetter
    ? new Date(Date.now() + (retryCount <= 1 ? 5 : retryCount === 2 ? 15 : 60) * 60_000).toISOString()
    : null;

  await supabaseAdmin
    .from("email_events")
    .update({
      status: deadLetter ? "dead_letter" : transient ? "retrying" : "failed",
      error: message,
      retry_count: retryCount,
      delivery_status: transient ? "deferred" : "unknown",
      next_retry_at: nextRetryAt,
      dead_lettered_at: deadLetter ? new Date().toISOString() : null,
      processing_started_at: null,
      processing_token: null,
      last_attempt_at: new Date().toISOString(),
    })
    .eq("id", event.id);
}

export async function dispatchNotificationDelivery(payload: NotificationDeliveryPayload) {
  if (shouldUseNotificationQueue()) {
    try {
      await notificationDeliveryQueueDeps.send(
        NOTIFICATION_DELIVERY_QUEUE_TOPIC,
        {
          type: "notification_delivery",
          payload,
        } satisfies NotificationQueueMessage,
        {
          idempotencyKey: buildIdempotencyKey(payload),
          retentionSeconds: 3600,
        },
      );

      return { mode: "queue" as const };
    } catch (error) {
      console.error("Notification queue publish failed, falling back to inline execution:", error);
    }
  }

  const response = await sendNotificationDeliveryInline(payload);
  return {
    mode: "inline" as const,
    response,
  };
}

export async function processNotificationQueueMessage(message: NotificationQueueMessage) {
  const response = await sendNotificationDeliveryInline(message.payload);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `Notification delivery failed with status ${response.status}`);
  }
}

export async function claimDueNotificationEvents(limit = 25, leaseMinutes = 10) {
  const supabaseAdmin = notificationDeliveryQueueDeps.getSupabaseAdminClient();
  const { data, error } = await (supabaseAdmin as any).rpc("claim_due_email_events", {
    _limit: limit,
    _lease_minutes: leaseMinutes,
  });

  if (error) {
    throw error;
  }

  return (Array.isArray(data) ? data : []) as ClaimedNotificationEvent[];
}

export async function processDueNotificationEvents(limit = 25, leaseMinutes = 10) {
  const claimed = await claimDueNotificationEvents(limit, leaseMinutes);
  let dispatched = 0;
  let failed = 0;

  for (const event of claimed) {
    try {
      const response = await sendNotificationDeliveryInline(getRetryPayload(event));
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        await markProcessingFailure(event, body || `Notification delivery failed with status ${response.status}`, response.status);
        failed += 1;
        continue;
      }

      dispatched += 1;
    } catch (error) {
      await markProcessingFailure(
        event,
        error instanceof Error ? error.message : "Notification delivery failed",
        503,
      );
      failed += 1;
    }
  }

  return {
    claimed: claimed.length,
    dispatched,
    failed,
  };
}
