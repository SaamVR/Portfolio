import { triggerWhatsAppOrderNotify } from "@/lib/cms/whatsapp-order-notify";

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

export async function runOrderCreatedBackgroundJobs(args: RunOrderCreatedBackgroundJobsArgs) {
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

  return Promise.allSettled(tasks);
}

export async function runOrderCancelledBackgroundJobs(args: RunOrderCancelledBackgroundJobsArgs) {
  return Promise.allSettled([
    insertRevenueEvent({
      row: args.revenueEventRow,
      supabaseAdmin: args.supabaseAdmin,
    }),
  ]);
}
