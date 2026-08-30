import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/api/supabase-route";
import {
  getRequestId,
  recordCaughtIncident,
  recordPlatformIncident,
  sanitizeIncidentText,
} from "@/lib/platform/incident-logger";

type BillingWebhookEventResult = {
  outcome?: string | null;
  duplicate?: boolean | null;
  invoice_status?: string | null;
  store_id?: string | null;
  incident_reason?: string | null;
};

type BillingWebhookPayload = {
  eventId: string;
  eventType: "payment.success" | "payment.failed";
  provider: string;
  invoiceId: string;
  paymentMethod: string | null;
  providerInvoiceId: string | null;
  providerSubscriptionId: string | null;
  occurredAt: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function applyBillingWebhookEvent(
  supabaseAdmin: SupabaseClient,
  payload: BillingWebhookPayload,
) {
  const { data, error } = await supabaseAdmin.rpc("apply_billing_webhook_event", {
    p_provider: payload.provider,
    p_event_id: payload.eventId,
    p_event_type: payload.eventType,
    p_invoice_id: payload.invoiceId,
    p_payment_method: payload.paymentMethod,
    p_provider_invoice_id: payload.providerInvoiceId,
    p_provider_subscription_id: payload.providerSubscriptionId,
    p_occurred_at: payload.occurredAt,
  });

  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as BillingWebhookEventResult | null;
  if (!row?.outcome) throw new Error("Billing webhook transaction returned no outcome");
  return row;
}

export const billingWebhookRouteDeps = {
  getSupabaseAdminClient,
  applyBillingWebhookEvent,
  recordPlatformIncident,
  recordCaughtIncident,
  getRequestId,
  sanitizeIncidentText,
};

export function isAuthorizedWebhook(req: Request) {
  const expectedSecret = process.env.BILLING_WEBHOOK_SECRET;
  const providedSecret = req.headers.get("x-commerce-webhook-secret");
  if (!expectedSecret || !providedSecret) return false;

  const expectedBuffer = Buffer.from(expectedSecret, "utf8");
  const providedBuffer = Buffer.from(providedSecret, "utf8");
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseBillingWebhookPayload(body: unknown): BillingWebhookPayload | null | "unhandled" {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const eventType = optionalText(record.type);
  if (eventType !== "payment.success" && eventType !== "payment.failed") return "unhandled";

  const data = record.data && typeof record.data === "object"
    ? record.data as Record<string, unknown>
    : {};
  const eventId = optionalText(record.event_id) ?? optionalText(record.id) ?? optionalText(data.event_id);
  const provider = optionalText(record.provider) ?? optionalText(data.provider);
  const invoiceId = optionalText(data.invoice_id);
  if (!eventId || !provider || !invoiceId || !UUID_PATTERN.test(invoiceId)) return null;

  const occurredAtRaw = optionalText(record.occurred_at) ?? optionalText(data.occurred_at);
  const occurredAt = occurredAtRaw && !Number.isNaN(Date.parse(occurredAtRaw)) ? occurredAtRaw : null;

  return {
    eventId,
    eventType,
    provider,
    invoiceId,
    paymentMethod: optionalText(data.payment_method),
    providerInvoiceId: optionalText(data.provider_invoice_id),
    providerSubscriptionId: optionalText(data.provider_subscription_id),
    occurredAt,
  };
}

export async function POST(req: Request) {
  let incidentClient: SupabaseClient | null = null;
  let incidentPayload: BillingWebhookPayload | null = null;

  try {
    if (!isAuthorizedWebhook(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = parseBillingWebhookPayload(await req.json());
    if (parsed === "unhandled") {
      return NextResponse.json({ message: "Unhandled webhook event type" }, { status: 200 });
    }
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid webhook payload: event_id, provider, and a valid invoice_id are required" },
        { status: 400 },
      );
    }

    const supabaseAdmin = billingWebhookRouteDeps.getSupabaseAdminClient();
    incidentClient = supabaseAdmin;
    incidentPayload = parsed;
    const result = await billingWebhookRouteDeps.applyBillingWebhookEvent(supabaseAdmin, parsed);

    if (result.incident_reason) {
      await billingWebhookRouteDeps.recordPlatformIncident(supabaseAdmin, {
        fingerprint: `billing-webhook-${result.incident_reason}`,
        severity: "warning",
        source: "billing-webhook",
        title: "Billing settlement event required reconciliation",
        message: result.incident_reason,
        route: "/api/billing/webhook",
        storeId: result.store_id ?? null,
        requestId: billingWebhookRouteDeps.getRequestId(req),
        metadata: {
          event_type: parsed.eventType,
          provider: parsed.provider,
          invoice_id: parsed.invoiceId,
          outcome: result.outcome,
        },
      });
    }

    if (result.outcome === "rejected") {
      const status = result.incident_reason === "invoice_not_found" ? 404 : 409;
      return NextResponse.json({ error: "Webhook event rejected", reason: result.incident_reason }, { status });
    }

    if (result.duplicate) {
      return NextResponse.json({ success: true, duplicate: true, outcome: result.outcome });
    }

    if (result.outcome === "ignored_paid_failure" || result.outcome === "ignored_already_paid") {
      return NextResponse.json({ success: true, ignored: true, outcome: result.outcome });
    }

    return NextResponse.json({ success: true, outcome: result.outcome });
  } catch (error) {
    if (incidentClient && incidentPayload) {
      await billingWebhookRouteDeps.recordCaughtIncident(incidentClient, {
        fingerprint: "billing-webhook-processing-failed",
        severity: "warning",
        source: "billing-webhook",
        title: "Billing webhook processing failed unexpectedly",
        error,
        route: "/api/billing/webhook",
        requestId: billingWebhookRouteDeps.getRequestId(req),
        metadata: {
          event_type: incidentPayload.eventType,
          provider: incidentPayload.provider,
          invoice_id: incidentPayload.invoiceId,
        },
      });
    }
    console.error("Webhook processing error:", billingWebhookRouteDeps.sanitizeIncidentText(error, 1_000));
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
