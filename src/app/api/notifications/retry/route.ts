import { NextResponse } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";
import { dispatchNotificationDelivery } from "@/lib/notifications/notification-delivery-queue";

type RetryableEventRow = {
  id: string;
  store_id: string | null;
  template_name: string;
  recipient: string | null;
  channel: string;
  metadata: Record<string, unknown> | null;
  retry_count: number | null;
  status: string;
};

function asObject(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function getRetryPayload(event: RetryableEventRow) {
  const metadata = asObject(event.metadata);
  const storedPayload = asObject(metadata.retry_payload);
  return {
    ...storedPayload,
    templateName: storedPayload.templateName ?? event.template_name,
    store_id: storedPayload.store_id ?? event.store_id,
    to: storedPayload.to ?? (event.channel === "email" ? event.recipient : undefined),
    customer_phone: storedPayload.customer_phone ?? (event.channel === "sms" ? event.recipient : undefined),
    existingEventId: event.id,
    retryCount: (event.retry_count ?? 0) + 1,
  };
}

export const notificationRetryRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
  fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
};

export async function POST(req: Request) {
  try {
    const user = await notificationRetryRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const storeId = typeof body?.storeId === "string" ? body.storeId : "";
    const action = typeof body?.action === "string" ? body.action : "run_due";
    const eventId = typeof body?.eventId === "string" ? body.eventId : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

    const supabaseAdmin = notificationRetryRouteDeps.getSupabaseAdminClient();
    const authorized = await notificationRetryRouteDeps.canManageStore(
      supabaseAdmin,
      storeId,
      user.id,
      ["owner", "admin", "editor"],
    );

    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "escalate") {
      if (!eventId) {
        return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from("email_events")
        .update({
          operator_escalated_at: new Date().toISOString(),
          operator_escalation_reason: reason || "Merchant requested manual operator review.",
        })
        .eq("id", eventId)
        .eq("store_id", storeId);

      if (error) throw error;

      return NextResponse.json({ success: true, action: "escalated" });
    }

    const now = new Date().toISOString();
    const { data: dueEvents, error: queryError } = await supabaseAdmin
      .from("email_events")
      .select("id, store_id, template_name, recipient, channel, metadata, retry_count, status")
      .eq("store_id", storeId)
      .in("status", ["retrying", "dead_letter"])
      .or(`next_retry_at.lte.${now},status.eq.dead_letter`)
      .order("created_at", { ascending: true })
      .limit(10);

    if (queryError) throw queryError;

    const retryableEvents = ((dueEvents ?? []) as RetryableEventRow[]).filter(
      (event) => event.store_id === storeId && Boolean(event.metadata),
    );

    if (retryableEvents.length === 0) {
      return NextResponse.json({ success: true, retried: 0, message: "No due retry events found." });
    }

    const originalFetch = globalThis.fetch;
    globalThis.fetch = notificationRetryRouteDeps.fetch as typeof fetch;
    let retried = 0;
    let failed = 0;

    try {
      for (const event of retryableEvents) {
        const result = await dispatchNotificationDelivery(getRetryPayload(event));
        if (result.mode === "inline" && !result.response.ok) {
          failed += 1;
          continue;
        }
        retried += 1;
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Supabase server credentials are not configured") {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      throw error;
    } finally {
      globalThis.fetch = originalFetch;
    }

    return NextResponse.json({
      success: true,
      retried,
      failed,
    });
  } catch (error) {
    console.error("Notification retry route error:", error);
    return NextResponse.json({ error: "Failed to process notification retries" }, { status: 500 });
  }
}
