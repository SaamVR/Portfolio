import { triggerWhatsAppOrderNotify } from "@/lib/cms/whatsapp-order-notify";
import { recordPlatformIncident } from "@/lib/platform/incident-logger";

type SupabaseAdminClient = any;
type OrderNotificationPayload = Parameters<typeof triggerWhatsAppOrderNotify>[1];

type OrderAnalyticsInsertPayload = {
  purchaseEventRows: unknown[];
  supabaseAdmin: SupabaseAdminClient;
};

type OrderRevenueInsertPayload = {
  row: Record<string, unknown>;
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

type OrderCancellationRevenuePayload = {
  row: Record<string, unknown>;
  supabaseAdmin: SupabaseAdminClient;
};

export type RunOrderCreatedBackgroundJobsArgs = {
  customerEmail: string;
  customerPhone: string;
  notification: OrderNotificationPayload;
  purchaseEventRows: unknown[];
  recoveryOrderId: string;
  revenueEventRow: Record<string, unknown>;
  recoveredRevenue: number;
  storeId: string;
  supabaseAdmin: SupabaseAdminClient;
};

export type RunOrderCancelledBackgroundJobsArgs = {
  revenueEventRow: Record<string, unknown>;
  supabaseAdmin: SupabaseAdminClient;
};

async function insertAnalyticsEvents({
  purchaseEventRows,
  supabaseAdmin,
}: OrderAnalyticsInsertPayload) {
  if (purchaseEventRows.length === 0) {
    return null;
  }

  return (supabaseAdmin as any).from("store_analytics_events").insert(purchaseEventRows);
}

async function insertRevenueEvent({
  row,
  supabaseAdmin,
}: OrderRevenueInsertPayload | OrderCancellationRevenuePayload) {
  return (supabaseAdmin as any).from("store_revenue_events").insert(row);
}

async function markRecoveryLeadRecovered({
  customerEmail,
  customerPhone,
  orderId,
  recoveredRevenue,
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
      recovered_revenue: recoveredRevenue,
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
  const taskNames = ["merchant-notification", "analytics", "revenue", "cart-recovery"];
  const tasks = [
    triggerWhatsAppOrderNotify(args.supabaseAdmin, args.notification),
    insertAnalyticsEvents({
      purchaseEventRows: args.purchaseEventRows,
      supabaseAdmin: args.supabaseAdmin,
    }),
    insertRevenueEvent({
      row: args.revenueEventRow,
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
  const results = await Promise.allSettled([
    insertRevenueEvent({
      row: args.revenueEventRow,
      supabaseAdmin: args.supabaseAdmin,
    }),
  ]);
  const storeId = typeof args.revenueEventRow.store_id === "string" ? args.revenueEventRow.store_id : null;
  await reportBackgroundFailures(args.supabaseAdmin, storeId, "cancelled", ["revenue"], results);
  return results;
}
