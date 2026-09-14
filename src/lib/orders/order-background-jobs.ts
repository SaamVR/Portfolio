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
  return (supabaseAdmin as any).from("store_analytics_events").insert(truthfulRows);
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

  const recoveryLeadQuery = (supabaseAdmin as any)
    .from("store_cart_recovery_leads")
    .select("id, recovered_revenue")
    .eq("store_id", storeId)
    .in("status", ["active", "abandoned", "contacted"])
    .order("updated_at", { ascending: false })
    .limit(1);

  const { data: matchingRecoveryLead } = customerPhone
    ? await recoveryLeadQuery.eq("contact_phone", customerPhone).maybeSingle()
    : await recoveryLeadQuery.eq("contact_email", customerEmail).maybeSingle();

  if (!matchingRecoveryLead?.id) {
    return null;
  }

  return (supabaseAdmin as any)
    .from("store_cart_recovery_leads")
    .update({
      status: "recovered",
      recovery_stage: "recovered",
      recovered_order_id: orderId,
      // An order being placed proves recovery of the checkout, not collection of
      // revenue. Settlement lifecycle code may attribute revenue later.
      recovered_revenue: 0,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", matchingRecoveryLead.id)
    .eq("store_id", storeId);
}

function resultError(result: PromiseSettledResult<unknown>) {
  if (result.status === "rejected") {
    return result.reason instanceof Error ? result.reason.message : String(result.reason || "Unknown rejection");
  }
  const value = result.value as { error?: unknown } | null | undefined;
  if (!value?.error) return null;
  if (value.error instanceof Error) return value.error.message;
  if (typeof value.error === "object" && value.error && "message" in value.error) {
    return String((value.error as { message?: unknown }).message || "Unknown background error");
  }
  return String(value.error);
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
  // Order creation may notify, record order-created funnel events, and close a
  // recovery lead. It must not create purchase/revenue truth before collection.
  const taskNames = ["merchant-notification", "analytics", "cart-recovery"];
  const tasks = [
    triggerWhatsAppOrderNotify(args.supabaseAdmin, args.notification),
    insertAnalyticsEvents({
      purchaseEventRows: args.purchaseEventRows,
      supabaseAdmin: args.supabaseAdmin,
    }),
    markRecoveryLeadRecovered({
      customerEmail: args.customerEmail,
      customerPhone: args.customerPhone,
      orderId: args.recoveryOrderId,
      recoveredRevenue: args.recoveredRevenue,
      storeId: args.storeId,
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
  void args.revenueEventRow;
  return Promise.allSettled([]);
}
