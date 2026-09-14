import { triggerWhatsAppOrderNotify } from "@/lib/cms/whatsapp-order-notify";
import { recordPlatformIncident } from "@/lib/platform/incident-logger";

type SupabaseAdminClient = any;
type OrderNotificationPayload = Parameters<typeof triggerWhatsAppOrderNotify>[1];

type OrderAnalyticsInsertPayload = {
  purchaseEventRows: unknown[];
  supabaseAdmin: SupabaseAdminClient;
};

type OrderRecoveryPayload = {
  customerEmail: string;
  customerPhone: string;
  orderId: string;
  recoveredRevenue: number;
  storeId: string;
  supabaseAdmin: SupabaseAdminClient;
};

export type RunOrderCreatedBackgroundJobsArgs = {
  customerEmail: string;
  customerPhone: string;
  notification: OrderNotificationPayload;
  /**
   * Legacy wire name retained so queued messages created by the current order route
   * stay compatible. These rows are normalized to order_created/order_created_item
   * before persistence; order creation is not purchase/settlement authority.
   */
  purchaseEventRows: unknown[];
  recoveryOrderId: string;
  /**
   * Legacy queue payload retained for compatibility only. Order creation must not
   * write revenue truth before payment/collection authority is established.
   */
  revenueEventRow: Record<string, unknown>;
  recoveredRevenue: number;
  storeId: string;
  supabaseAdmin: SupabaseAdminClient;
};

export type RunOrderCancelledBackgroundJobsArgs = {
  /**
   * Retained for queue compatibility. Cancellation alone does not prove that a
   * settled payment was refunded, so no revenue/refund event is written here.
   */
  revenueEventRow: Record<string, unknown>;
  supabaseAdmin: SupabaseAdminClient;
};

function asAnalyticsRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function errorCode(value: unknown) {
  return value && typeof value === "object" && "code" in value
    ? String((value as { code?: unknown }).code ?? "")
    : "";
}

function errorMessage(value: unknown) {
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object" && "message" in value) {
    return String((value as { message?: unknown }).message ?? "Unknown background error");
  }
  return String(value || "Unknown background error");
}

export function normalizeOrderCreatedAnalyticsRows(rows: unknown[]) {
  return rows.map((row) => {
    const record = asAnalyticsRecord(row);
    if (!record) return row;

    const eventName = typeof record.event_name === "string" ? record.event_name : "";
    if (eventName !== "purchase" && eventName !== "purchase_item") {
      return row;
    }

    return {
      ...record,
      event_name: eventName === "purchase" ? "order_created" : "order_created_item",
      metadata: {
        ...(asAnalyticsRecord(record.metadata) ?? {}),
        lifecycle_truth: "order_created_unsettled",
      },
    };
  });
}

async function insertAnalyticsEvents({
  purchaseEventRows,
  supabaseAdmin,
}: OrderAnalyticsInsertPayload) {
  if (purchaseEventRows.length === 0) {
    return null;
  }

  const truthfulRows = normalizeOrderCreatedAnalyticsRows(purchaseEventRows);
  const result = await (supabaseAdmin as any).from("store_analytics_events").insert(truthfulRows);
  // The #326 sink identity makes duplicate queue delivery a successful no-op.
  if (errorCode(result?.error) === "23505") {
    return { ...result, error: null, duplicate: true };
  }
  return result;
}

async function markRecoveryLeadRecovered({
  customerEmail,
  customerPhone,
  orderId,
  storeId,
  supabaseAdmin,
}: OrderRecoveryPayload) {
  if (!customerPhone && !customerEmail) {
    return null;
  }

  const findRecoveryLead = async (column: "contact_phone" | "contact_email", value: string) => {
    const lookup = await (supabaseAdmin as any)
      .from("store_cart_recovery_leads")
      .select("id, recovered_revenue")
      .eq("store_id", storeId)
      .in("status", ["active", "abandoned", "contacted"])
      .eq(column, value)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookup?.error) {
      throw new Error(errorMessage(lookup.error));
    }
    return lookup?.data ?? null;
  };

  let matchingRecoveryLead = customerPhone
    ? await findRecoveryLead("contact_phone", customerPhone)
    : null;

  // #322 intentionally stops persisting browser-supplied phone authority. An
  // authenticated recovery lead can therefore have only its account email even
  // though the eventual order has a phone number. Fall back to that email rather
  // than silently leaving the converted lead in the recovery campaign.
  if (!matchingRecoveryLead?.id && customerEmail) {
    matchingRecoveryLead = await findRecoveryLead("contact_email", customerEmail);
  }

  if (!matchingRecoveryLead?.id) {
    return null;
  }

  const update = await (supabaseAdmin as any)
    .from("store_cart_recovery_leads")
    .update({
      status: "recovered",
      recovery_stage: "recovered",
      recovered_order_id: orderId,
      // An order being placed proves recovery of the checkout, not collection of
      // revenue. Settlement lifecycle code may attribute revenue later.
      recovered_revenue: 0,
      last_activity_at: new Date().toISOString(),
      next_contact_at: null,
    })
    .eq("id", matchingRecoveryLead.id)
    .eq("store_id", storeId);

  if (update?.error) {
    throw new Error(errorMessage(update.error));
  }

  return update;
}

async function claimMerchantOrderNotification(args: RunOrderCreatedBackgroundJobsArgs) {
  const result = await (args.supabaseAdmin as any)
    .from("email_events")
    .insert({
      store_id: args.storeId,
      order_id: args.recoveryOrderId,
      template_name: "order-created-merchant-notify-claim",
      recipient: null,
      channel: "whatsapp",
      status: "processing",
      provider: "order-background",
      retry_count: 0,
      metadata: {
        authority: "best_effort_notification_claim",
      },
    })
    .select("id")
    .maybeSingle();

  if (errorCode(result?.error) === "23505") {
    return null;
  }
  if (result?.error) {
    throw new Error(errorMessage(result.error));
  }
  if (!result?.data?.id) {
    throw new Error("Merchant notification claim was not persisted");
  }
  return String(result.data.id);
}

async function finishMerchantOrderNotificationClaim(
  supabaseAdmin: SupabaseAdminClient,
  claimId: string,
  updates: Record<string, unknown>,
) {
  const result = await (supabaseAdmin as any)
    .from("email_events")
    .update({
      ...updates,
      last_attempt_at: new Date().toISOString(),
      processing_started_at: null,
      processing_token: null,
    })
    .eq("id", claimId);

  if (result?.error) {
    throw new Error(errorMessage(result.error));
  }
}

async function runMerchantNotificationBestEffort(args: RunOrderCreatedBackgroundJobsArgs) {
  const claimId = await claimMerchantOrderNotification(args);
  if (!claimId) {
    return { status: "skipped", reason: "duplicate order-created notification delivery" };
  }

  try {
    const result = await triggerWhatsAppOrderNotify(args.supabaseAdmin, args.notification);
    await finishMerchantOrderNotificationClaim(args.supabaseAdmin, claimId, {
      status: result.status === "sent" ? "sent" : "skipped",
      provider: result.provider,
      provider_message_id: result.status === "sent" ? result.providerMessageId : null,
      error: result.status === "skipped" ? result.reason : null,
      recipient: "recipient" in result ? result.recipient ?? null : null,
    });
    return result;
  } catch (error) {
    try {
      await finishMerchantOrderNotificationClaim(args.supabaseAdmin, claimId, {
        status: "failed",
        error: errorMessage(error),
      });
    } catch (claimError) {
      console.error("Failed to persist merchant notification claim outcome:", claimError);
    }
    throw error;
  }
}

function resultError(result: PromiseSettledResult<unknown>) {
  if (result.status === "rejected") {
    return errorMessage(result.reason);
  }
  const value = result.value as { error?: unknown } | null | undefined;
  if (!value?.error) return null;
  return errorMessage(value.error);
}

async function reportBackgroundFailures(
  supabaseAdmin: SupabaseAdminClient,
  storeId: string | null,
  scope: string,
  names: string[],
  results: PromiseSettledResult<unknown>[],
) {
  await Promise.all(results.map(async (result, index) => {
    const message = resultError(result);
    if (!message) return;
    const taskName = names[index] || `task-${index}`;
    await recordPlatformIncident(supabaseAdmin, {
      fingerprint: `orders.background.${scope}.${taskName}`,
      severity: taskName === "merchant-notification" ? "warning" : "prewarning",
      source: "orders",
      title: `Order background task failed: ${taskName}`,
      message,
      route: scope === "created" ? "/api/orders/create" : "/api/orders/cancel",
      storeId,
      metadata: { task: taskName, scope },
    });
  }));
}

export async function runOrderCreatedBackgroundJobs(args: RunOrderCreatedBackgroundJobsArgs) {
  // Cart-recovery closure is retry-required: a failed mutation can otherwise
  // leave an already-converted shopper in the abandoned-cart campaign. Run it
  // before any best-effort side effect so a retry cannot duplicate those effects.
  try {
    await markRecoveryLeadRecovered({
      customerEmail: args.customerEmail,
      customerPhone: args.customerPhone,
      orderId: args.recoveryOrderId,
      recoveredRevenue: args.recoveredRevenue,
      storeId: args.storeId,
      supabaseAdmin: args.supabaseAdmin,
    });
  } catch (error) {
    await recordPlatformIncident(args.supabaseAdmin, {
      fingerprint: "orders.background.created.cart-recovery-retry-required",
      severity: "warning",
      source: "orders",
      title: "Retry-required order recovery mutation failed",
      message: errorMessage(error),
      route: "/api/orders/create",
      storeId: args.storeId,
      metadata: { task: "cart-recovery", scope: "created", retryRequired: true },
    });
    throw error;
  }

  // Merchant notification and order-created analytics are explicitly best-effort.
  // Durable sink identities prevent duplicate queue deliveries from duplicating
  // provider sends or funnel rows, but their failure never changes order truth.
  const taskNames = ["merchant-notification", "analytics"];
  const tasks = [
    runMerchantNotificationBestEffort(args),
    insertAnalyticsEvents({
      purchaseEventRows: args.purchaseEventRows,
      supabaseAdmin: args.supabaseAdmin,
    }),
  ];

  const results = await Promise.allSettled(tasks);
  await reportBackgroundFailures(args.supabaseAdmin, args.storeId, "created", taskNames, results);
  return results;
}

export async function runOrderCancelledBackgroundJobs(args: RunOrderCancelledBackgroundJobsArgs) {
  // Cancellation is operational state, not evidence that money was collected or
  // refunded. Provider/manual settlement authority must write financial events.
  // There is therefore no retry-required financial side effect in this runner.
  void args.revenueEventRow;
  return Promise.allSettled([]);
}
