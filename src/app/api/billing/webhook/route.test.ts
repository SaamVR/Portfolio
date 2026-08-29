import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyBillingWebhookEvent,
  isAuthorizedWebhook,
  parseBillingWebhookPayload,
} from "./route";

const invoiceId = "11111111-1111-4111-8111-111111111111";

test("billing webhook parser requires durable event and provider identity", () => {
  assert.equal(parseBillingWebhookPayload({ type: "payment.success", data: { invoice_id: invoiceId } }), null);
  assert.equal(parseBillingWebhookPayload({ type: "customer.created", data: {} }), "unhandled");

  assert.deepEqual(parseBillingWebhookPayload({
    type: "payment.success",
    event_id: "evt_1",
    provider: "manual-webhook",
    occurred_at: "2026-08-29T08:00:00.000Z",
    data: { invoice_id: invoiceId, payment_method: "bank" },
  }), {
    eventId: "evt_1",
    eventType: "payment.success",
    provider: "manual-webhook",
    invoiceId,
    paymentMethod: "bank",
    providerInvoiceId: null,
    providerSubscriptionId: null,
    occurredAt: "2026-08-29T08:00:00.000Z",
  });
});

test("billing webhook settlement delegates to one atomic RPC", async () => {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return {
        data: [{ outcome: "applied_success", duplicate: false, invoice_status: "paid", store_id: "store_1", incident_reason: null }],
        error: null,
      };
    },
  } as unknown as SupabaseClient;

  const result = await applyBillingWebhookEvent(client, {
    eventId: "evt_1",
    eventType: "payment.success",
    provider: "manual-webhook",
    invoiceId,
    paymentMethod: "bank",
    providerInvoiceId: "payment_1",
    providerSubscriptionId: null,
    occurredAt: "2026-08-29T08:00:00.000Z",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.fn, "apply_billing_webhook_event");
  assert.equal(calls[0]?.args.p_event_id, "evt_1");
  assert.equal(calls[0]?.args.p_invoice_id, invoiceId);
  assert.equal(result.outcome, "applied_success");
});

test("billing webhook settlement surfaces transactional database failures", async () => {
  const client = {
    rpc: async () => ({ data: null, error: new Error("transaction rolled back") }),
  } as unknown as SupabaseClient;

  await assert.rejects(() => applyBillingWebhookEvent(client, {
    eventId: "evt_2",
    eventType: "payment.failed",
    provider: "manual-webhook",
    invoiceId,
    paymentMethod: null,
    providerInvoiceId: null,
    providerSubscriptionId: null,
    occurredAt: null,
  }), /transaction rolled back/);
});

test("billing webhook secret comparison remains timing-safe and fail-closed", () => {
  const previous = process.env.BILLING_WEBHOOK_SECRET;
  process.env.BILLING_WEBHOOK_SECRET = "expected-secret";
  try {
    assert.equal(isAuthorizedWebhook(new Request("https://example.test", {
      headers: { "x-commerce-webhook-secret": "expected-secret" },
    })), true);
    assert.equal(isAuthorizedWebhook(new Request("https://example.test", {
      headers: { "x-commerce-webhook-secret": "wrong-secret" },
    })), false);
    assert.equal(isAuthorizedWebhook(new Request("https://example.test")), false);
  } finally {
    if (previous === undefined) delete process.env.BILLING_WEBHOOK_SECRET;
    else process.env.BILLING_WEBHOOK_SECRET = previous;
  }
});
