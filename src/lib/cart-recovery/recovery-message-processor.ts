import { notificationDeliveryQueueDeps, sendNotificationDeliveryInline } from "@/lib/notifications/notification-delivery-queue";

type ClaimedRecoveryMessage = {
  id: string;
  store_id: string;
  lead_id: string;
  channel: "email" | "whatsapp";
  template_key: string;
  status: string;
  retry_count: number;
  contact_email: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  store_name: string | null;
  store_slug: string | null;
  coupon_code: string | null;
  cart_value: number | null;
  item_count: number | null;
  metadata: Record<string, unknown> | null;
};

export const recoveryMessageProcessorDeps = {
  getSupabaseAdminClient: notificationDeliveryQueueDeps.getSupabaseAdminClient,
  sendNotificationDeliveryInline,
};

function asObject(value: unknown) {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function isTransientDeliveryFailure(message: string, status: number) {
  return status === 429 || status >= 500 || /429|5\d\d|timeout|timed out|temporary|temporarily|network|fetch failed|unavailable|connection/i.test(message);
}

function buildRecoveryEmailPayload(message: ClaimedRecoveryMessage) {
  const metadata = asObject(message.metadata);
  const itemSummary = typeof metadata.item_summary === "string" ? metadata.item_summary : undefined;

  return {
    to: message.contact_email,
    customer_email: message.contact_email,
    customer_name: message.contact_name ?? "Customer",
    store_id: message.store_id,
    storeName: message.store_name,
    storeSlug: message.store_slug,
    templateName: "cart-recovery",
    couponCode: message.coupon_code,
    cartValue: Number(message.cart_value ?? 0),
    itemCount: Number(message.item_count ?? 0),
    itemSummary,
    metadata: {
      source: "cart_recovery_processor",
      recoveryMessageId: message.id,
      recoveryLeadId: message.lead_id,
    },
  };
}

async function updateRecoveryMessage(
  messageId: string,
  storeId: string,
  updates: Record<string, unknown>,
) {
  const supabaseAdmin = recoveryMessageProcessorDeps.getSupabaseAdminClient();
  const updateQuery = (supabaseAdmin as any)
    .from("store_cart_recovery_messages")
    .update(updates)
    .eq("id", messageId);

  if (typeof updateQuery?.eq === "function") {
    await updateQuery.eq("store_id", storeId);
    return;
  }

  await updateQuery;
}

async function markRecoveryMessageSent(message: ClaimedRecoveryMessage) {
  await updateRecoveryMessage(message.id, message.store_id, {
    status: "sent",
    sent_at: new Date().toISOString(),
    error_message: null,
    next_retry_at: null,
    provider: message.channel === "email" ? "send-email" : null,
    processing_started_at: null,
    processing_token: null,
  });
}

async function markRecoveryMessageSkipped(message: ClaimedRecoveryMessage, reason: string) {
  await updateRecoveryMessage(message.id, message.store_id, {
    status: "skipped",
    error_message: reason,
    next_retry_at: null,
    processing_started_at: null,
    processing_token: null,
  });
}

async function markRecoveryMessageFailure(message: ClaimedRecoveryMessage, reason: string, status: number) {
  const retryCount = Math.max(0, Number(message.retry_count ?? 0)) + 1;
  const transient = isTransientDeliveryFailure(reason, status);
  const deadLetter = transient && retryCount >= 3;
  const nextRetryAt = transient && !deadLetter
    ? new Date(Date.now() + (retryCount <= 1 ? 5 : retryCount === 2 ? 15 : 60) * 60_000).toISOString()
    : null;

  await updateRecoveryMessage(message.id, message.store_id, {
    status: deadLetter ? "dead_letter" : transient ? "retrying" : "failed",
    error_message: reason,
    retry_count: retryCount,
    next_retry_at: nextRetryAt,
    processing_started_at: null,
    processing_token: null,
  });
}

export async function claimDueRecoveryMessages(limit = 25, leaseMinutes = 10) {
  const supabaseAdmin = recoveryMessageProcessorDeps.getSupabaseAdminClient();
  const { data, error } = await (supabaseAdmin as any).rpc("claim_due_cart_recovery_messages", {
    _limit: limit,
    _lease_minutes: leaseMinutes,
  });

  if (error) {
    throw error;
  }

  return (Array.isArray(data) ? data : []) as ClaimedRecoveryMessage[];
}

export async function processDueRecoveryMessages(limit = 25, leaseMinutes = 10) {
  const claimed = await claimDueRecoveryMessages(limit, leaseMinutes);
  let dispatched = 0;
  let skipped = 0;
  let failed = 0;

  for (const message of claimed) {
    if (message.channel === "whatsapp") {
      await markRecoveryMessageSkipped(message, "Automated WhatsApp recovery delivery is not configured yet.");
      skipped += 1;
      continue;
    }

    if (!message.contact_email) {
      await markRecoveryMessageSkipped(message, "No recovery email address is available for this lead.");
      skipped += 1;
      continue;
    }

    try {
      const response = await recoveryMessageProcessorDeps.sendNotificationDeliveryInline(buildRecoveryEmailPayload(message));
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        await markRecoveryMessageFailure(message, body || `Recovery delivery failed with status ${response.status}`, response.status);
        failed += 1;
        continue;
      }

      await markRecoveryMessageSent(message);
      dispatched += 1;
    } catch (error) {
      await markRecoveryMessageFailure(
        message,
        error instanceof Error ? error.message : "Recovery delivery failed",
        503,
      );
      failed += 1;
    }
  }

  return {
    claimed: claimed.length,
    dispatched,
    skipped,
    failed,
  };
}
