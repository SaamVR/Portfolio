import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_SECRET_KEYS = Deno.env.get("SUPABASE_SECRET_KEYS") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "EZComo <noreply@ezcomo.shop>";
const MAX_RETRY_ATTEMPTS = 3;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getTrustedMachineKeys() {
  const trustedKeys = new Set<string>();
  if (SUPABASE_SERVICE_ROLE_KEY) {
    trustedKeys.add(SUPABASE_SERVICE_ROLE_KEY);
  }

  if (SUPABASE_SECRET_KEYS) {
    try {
      const parsedKeys = JSON.parse(SUPABASE_SECRET_KEYS) as Record<string, string>;
      for (const key of Object.values(parsedKeys)) {
        if (key) trustedKeys.add(key);
      }
    } catch (error) {
      console.error("[Auth] Failed to parse SUPABASE_SECRET_KEYS:", error);
    }
  }

  return trustedKeys;
}

function getSupabaseAdminKey() {
  const trustedKeys = getTrustedMachineKeys();
  return trustedKeys.values().next().value ?? "";
}

function isTrustedServiceRequest(req: Request) {
  const apiKey = req.headers.get("apikey");
  const authorization = req.headers.get("authorization");
  const trustedKeys = getTrustedMachineKeys();

  if (apiKey && trustedKeys.has(apiKey)) {
    return true;
  }

  if (authorization?.startsWith("Bearer ")) {
    return trustedKeys.has(authorization.slice("Bearer ".length));
  }

  return false;
}

interface Payload {
  to?: string;
  templateName: string;
  storeName?: string;
  storeSlug?: string;
  metadata?: Record<string, unknown>;
  couponCode?: string | null;
  cartValue?: number;
  itemCount?: number;

  order_id?: string;
  store_id?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_name?: string;
  total?: number;
  status?: string;
  existingEventId?: string;
  retryCount?: number;
}

interface DispatchResult {
  status: "sent" | "skipped" | "failed";
  provider?: string;
  providerMessageId?: string;
  error?: string;
  deliveryStatus?: "accepted" | "delivered" | "bounced" | "deferred" | "unknown";
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const templates: Record<string, (data: Payload) => { subject: string; html: string }> = {
  welcome: (data) => ({
    subject: `Welcome to ${data.storeName}`,
    html: `<p>Hi there,</p><p><strong>${data.storeName}</strong> is ready to send store updates.</p>`,
  }),
  "store-published": (data) => ({
    subject: `Your store ${data.storeName} is live!`,
    html: `<p>Congratulations!</p><p>Your store <strong>${data.storeName}</strong> is now published.</p>`,
  }),
  "payment-reminder": (data) => ({
    subject: `Action required for ${data.storeName}`,
    html: `<p>Hi there,</p><p>Your subscription for <strong>${data.storeName}</strong> is past due.</p>`,
  }),
  "inactivity-warning": (data) => ({
    subject: `We miss you at ${data.storeName}`,
    html: `<p>Hi there,</p><p>We noticed you haven't updated <strong>${data.storeName}</strong> recently.</p>`,
  }),
  "cart-recovery": (data) => {
    const storeName = escapeHtml(data.storeName || "this store");
    const customerName = escapeHtml(data.customer_name || "Customer");
    const couponCode = typeof data.couponCode === "string" && data.couponCode.trim()
      ? escapeHtml(data.couponCode.trim())
      : null;
    const itemCount = Number.isFinite(Number(data.itemCount)) ? Math.max(0, Math.round(Number(data.itemCount))) : 0;
    const cartValue = Number.isFinite(Number(data.cartValue)) ? Math.max(0, Math.round(Number(data.cartValue))) : 0;
    const cartSummary = itemCount > 0
      ? `<p>Your cart has ${itemCount} item${itemCount === 1 ? "" : "s"}${cartValue > 0 ? ` worth BDT ${cartValue.toLocaleString("en-BD")}` : ""}.</p>`
      : "<p>Your cart is still waiting for you.</p>";
    const couponLine = couponCode
      ? `<p>If you still want these items, use coupon <strong>${couponCode}</strong> at checkout. Eligibility is rechecked when you order.</p>`
      : "";

    return {
      subject: "Your cart is still waiting",
      html: `<p>Hi ${customerName},</p><p>You left items at <strong>${storeName}</strong>.</p>${cartSummary}${couponLine}`,
    };
  },
  "deletion-notice": (data) => ({
    subject: `Deletion notice for ${data.storeName}`,
    html: `<p>Hi there,</p><p>Your store <strong>${data.storeName}</strong> is scheduled for deletion soon due to inactivity.</p>`,
  }),
  "test-customer-receipt": (data) => ({
    subject: `Order confirmation #${data.order_id ?? "TEST-1001"}`,
    html: `<p>Hi ${data.customer_name ?? "Customer"},</p><p>Your sample order #${data.order_id ?? "TEST-1001"} with <strong>${data.storeName}</strong> is confirmed for ৳${data.total ?? 1290}.</p>`,
  }),
  "merchant-order-alert": (data) => ({
    subject: `New order alert for ${data.storeName}`,
    html: `<p>Merchant alert:</p><p>A new order #${data.order_id ?? "TEST-1001"} just came in for <strong>${data.storeName}</strong>.</p>`,
  }),
  "order-receipt": (data) => ({
    subject: `Order confirmation #${data.order_id}`,
    html: `<p>Hi ${data.customer_name},</p><p>Thank you for your order! We received order #${data.order_id} for a total of ৳${data.total}. We will notify you once it ships.</p>`,
  }),
  "order-shipped": (data) => ({
    subject: `Your order #${data.order_id} has been shipped`,
    html: `<p>Hi ${data.customer_name},</p><p>Your order #${data.order_id} from <strong>${data.storeName}</strong> is now on the way.</p>`,
  }),
  "order-delivered": (data) => ({
    subject: `Your order #${data.order_id} has been delivered`,
    html: `<p>Hi ${data.customer_name},</p><p>Your order #${data.order_id} has been marked as delivered. Enjoy.</p>`,
  }),
  "order-cancelled": (data) => ({
    subject: `Your order #${data.order_id} was cancelled`,
    html: `<p>Hi ${data.customer_name},</p><p>We're sorry, but order #${data.order_id} was cancelled.</p>`,
  }),
};

function buildSmsMessage(payload: Payload, notifSettings: Record<string, unknown>) {
  let smsMessage = "";

  if (payload.templateName === "order-receipt" || payload.templateName === "test-customer-receipt") {
    smsMessage = typeof notifSettings.sms_template_received === "string"
      ? notifSettings.sms_template_received
      : "Hi {customer_name}, your order #{order_id} is confirmed!";
  } else if (payload.templateName === "order-shipped") {
    smsMessage = typeof notifSettings.sms_template_shipped === "string"
      ? notifSettings.sms_template_shipped
      : "Hi {customer_name}, your order #{order_id} has been shipped!";
  } else if (payload.templateName === "order-delivered") {
    smsMessage = "Hi {customer_name}, your order #{order_id} has been delivered!";
  }

  return smsMessage
    .replace(/{customer_name}/g, payload.customer_name || "Customer")
    .replace(/{order_id}/g, payload.order_id || "TEST-1001");
}

function getRetryDelayMinutes(retryCount: number) {
  if (retryCount <= 1) return 5;
  if (retryCount === 2) return 15;
  return 60;
}

function isTransientFailure(error?: string) {
  if (!error) return false;
  return /429|5\d\d|timeout|timed out|temporary|temporarily|network|fetch failed|unavailable|connection/i.test(error);
}

function withRetryStatus(result: DispatchResult, retryCount: number) {
  if (result.status !== "failed") {
    return {
      status: result.status === "sent" ? "sent" : "skipped",
      nextRetryAt: null,
      deadLetteredAt: null,
    } as const;
  }

  if (!isTransientFailure(result.error)) {
    return {
      status: "failed",
      nextRetryAt: null,
      deadLetteredAt: null,
    } as const;
  }

  if (retryCount >= MAX_RETRY_ATTEMPTS) {
    return {
      status: "dead_letter",
      nextRetryAt: null,
      deadLetteredAt: new Date().toISOString(),
    } as const;
  }

  return {
    status: "retrying",
    nextRetryAt: new Date(Date.now() + getRetryDelayMinutes(retryCount) * 60_000).toISOString(),
    deadLetteredAt: null,
  } as const;
}

async function sendGreenWebSMS(apiKey: string, to: string, message: string): Promise<DispatchResult> {
  try {
    const res = await fetch("http://api.greenweb.com.bd/api.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token: apiKey,
        to,
        message,
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      return { status: "failed", provider: "greenweb", error: text, deliveryStatus: "deferred" };
    }
    return { status: "sent", provider: "greenweb", providerMessageId: text, deliveryStatus: "accepted" };
  } catch (err) {
    return {
      status: "failed",
      provider: "greenweb",
      error: err instanceof Error ? err.message : String(err),
      deliveryStatus: "deferred",
    };
  }
}

async function sendResendEmail(to: string, subject: string, html: string): Promise<DispatchResult> {
  if (!RESEND_API_KEY) {
    return { status: "skipped", provider: "resend", error: "RESEND_API_KEY is not configured", deliveryStatus: "unknown" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    return { status: "failed", provider: "resend", error, deliveryStatus: "deferred" };
  }

  const data = await res.json().catch(() => null);
  return { status: "sent", provider: "resend", providerMessageId: data?.id, deliveryStatus: "accepted" };
}

async function writeNotificationEvent(
  supabase: ReturnType<typeof createClient>,
  payload: Payload,
  channel: "email" | "sms",
  recipient: string | undefined,
  result: DispatchResult,
  metadata: Record<string, unknown> = {},
) {
  const retryCount = Math.max(Number(payload.retryCount ?? 0), 0);
  const retryState = withRetryStatus(result, retryCount);
  const eventWrite = {
    store_id: payload.store_id || null,
    order_id: payload.order_id || null,
    template_name: payload.templateName,
    recipient: recipient || null,
    channel,
    status: retryState.status,
    delivery_status:
      retryState.status === "dead_letter"
        ? "deferred"
        : result.deliveryStatus || (retryState.status === "delivered" ? "delivered" : null),
    provider: result.provider || null,
    provider_message_id: result.providerMessageId || null,
    error: result.error || null,
    retry_count: retryCount,
    next_retry_at: retryState.nextRetryAt,
    last_attempt_at: new Date().toISOString(),
    delivered_at:
      retryState.status === "delivered" || result.deliveryStatus === "delivered"
        ? new Date().toISOString()
        : null,
    bounced_at:
      retryState.status === "bounced" || result.deliveryStatus === "bounced"
        ? new Date().toISOString()
        : null,
    dead_lettered_at: retryState.deadLetteredAt,
    metadata: {
      storeName: payload.storeName,
      storeSlug: payload.storeSlug,
      customerName: payload.customer_name,
      total: payload.total,
      retry_payload: {
        ...payload,
        metadata: undefined,
      },
      ...payload.metadata,
      ...metadata,
    },
  };

  if (payload.existingEventId) {
    const { error } = await supabase
      .from("email_events")
      .update(eventWrite)
      .eq("id", payload.existingEventId);
    if (error) {
      console.error("[Notification Log] Failed to update email_events row:", error.message);
    }
    return;
  }

  const { error } = await supabase.from("email_events").insert(eventWrite);
  if (error) {
    console.error("[Notification Log] Failed to write email_events row:", error.message);
  }
}

async function fetchStoreNotificationContext(supabase: ReturnType<typeof createClient>, storeId: string) {
  const [{ data: settingsRow }, { data: storeRow }] = await Promise.all([
    supabase
      .from("site_settings")
      .select("value")
      .eq("store_id", storeId)
      .eq("key", "notification_settings")
      .maybeSingle(),
    supabase
      .from("stores")
      .select("id, name, slug, owner_id")
      .eq("id", storeId)
      .maybeSingle(),
  ]);

  return {
    notifSettings: (settingsRow?.value ?? {}) as Record<string, unknown>,
    store: storeRow as { id: string; name: string; slug: string; owner_id?: string | null } | null,
  };
}

async function sendLifecycleEmail(
  supabase: ReturnType<typeof createClient>,
  payload: Payload,
) {
  if (!payload.to) {
    throw new Error("Missing 'to' for lifecycle email");
  }

  const templateFn = templates[payload.templateName];
  if (!templateFn) throw new Error(`Invalid template name: ${payload.templateName}`);

  const { subject, html } = templateFn(payload);
  const result = await sendResendEmail(payload.to, subject, html);
  await writeNotificationEvent(supabase, payload, "email", payload.to, result, { subject });
}

async function sendMerchantOrderAlert(
  supabase: ReturnType<typeof createClient>,
  payload: Payload,
  ownerId: string | null | undefined,
) {
  if (!ownerId) return;

  const { data, error } = await supabase.auth.admin.getUserById(ownerId);
  if (error || !data.user?.email) {
    await writeNotificationEvent(
      supabase,
      { ...payload, templateName: "merchant-order-alert" },
      "email",
      undefined,
      { status: "failed", provider: "resend", error: "Merchant alert recipient unavailable", deliveryStatus: "unknown" },
    );
    return;
  }

  const { subject, html } = templates["merchant-order-alert"]({
    ...payload,
    templateName: "merchant-order-alert",
  });
  const result = await sendResendEmail(data.user.email, subject, html);
  await writeNotificationEvent(
    supabase,
    { ...payload, templateName: "merchant-order-alert" },
    "email",
    data.user.email,
    result,
    { subject, recipientType: "merchant_alert" },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isTrustedServiceRequest(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload: Payload = await req.json();

    if (!payload.templateName) {
      throw new Error("Missing required field: templateName");
    }

    const supabaseAdminKey = getSupabaseAdminKey();
    if (!SUPABASE_URL || !supabaseAdminKey) {
      throw new Error("Supabase admin credentials are not configured");
    }

    const supabase = createClient(SUPABASE_URL, supabaseAdminKey);
    const isOrderNotification =
      payload.templateName.startsWith("order-") ||
      payload.templateName === "test-customer-receipt";

    if (!isOrderNotification && payload.templateName !== "merchant-order-alert") {
      await sendLifecycleEmail(supabase, payload);
      return new Response(JSON.stringify({ success: true, message: "Lifecycle email sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!payload.store_id) {
      throw new Error("Missing store_id for notification dispatch");
    }

    const { notifSettings, store } = await fetchStoreNotificationContext(supabase, payload.store_id);
    const emailReceiptsEnabled = notifSettings.email_receipts !== false;
    const emailAlertsEnabled = notifSettings.email_alerts !== false;
    const smsEnabled = notifSettings.sms_enabled === true;
    const smsApiKey = typeof notifSettings.sms_api_key === "string" ? notifSettings.sms_api_key : "";

    if (payload.templateName === "merchant-order-alert") {
      await sendMerchantOrderAlert(supabase, {
        ...payload,
        storeName: payload.storeName ?? store?.name,
        storeSlug: payload.storeSlug ?? store?.slug,
      }, store?.owner_id);

      return new Response(JSON.stringify({ success: true, message: "Merchant alert dispatched" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enrichedPayload = {
      ...payload,
      storeName: payload.storeName ?? store?.name,
      storeSlug: payload.storeSlug ?? store?.slug,
    };

    if (emailReceiptsEnabled && payload.customer_email) {
      const templateFn = templates[payload.templateName];
      if (templateFn) {
        const { subject, html } = templateFn(enrichedPayload);
        const result = await sendResendEmail(payload.customer_email, subject, html);
        await writeNotificationEvent(supabase, enrichedPayload, "email", payload.customer_email, result, { subject });
      }
    } else {
      await writeNotificationEvent(
        supabase,
        enrichedPayload,
        "email",
        payload.customer_email,
        {
          status: "skipped",
          provider: "resend",
          error: emailReceiptsEnabled ? "Missing customer email" : "Email receipts disabled",
          deliveryStatus: "unknown",
        },
      );
    }

    if (emailAlertsEnabled && payload.templateName === "order-receipt") {
      await sendMerchantOrderAlert(supabase, enrichedPayload, store?.owner_id);
    }

    if (smsEnabled && smsApiKey && payload.customer_phone) {
      const smsMessage = buildSmsMessage(enrichedPayload, notifSettings);
      if (smsMessage) {
        const result = await sendGreenWebSMS(smsApiKey, payload.customer_phone, smsMessage);
        await writeNotificationEvent(supabase, enrichedPayload, "sms", payload.customer_phone, result, { smsMessage });
      }
    } else {
      await writeNotificationEvent(
        supabase,
        enrichedPayload,
        "sms",
        payload.customer_phone,
        {
          status: "skipped",
          provider: "greenweb",
          error: smsEnabled ? "Missing SMS API key or customer phone" : "SMS disabled",
          deliveryStatus: "unknown",
        },
      );
    }

    return new Response(JSON.stringify({ success: true, message: "Order notifications dispatched" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Function error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
