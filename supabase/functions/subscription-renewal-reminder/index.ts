import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { loadPlatformSiteName, loadPlatformSmsRuntime, sendPlatformSms } from "../_shared/platform-sms.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_SECRET_KEYS = Deno.env.get("SUPABASE_SECRET_KEYS") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM")?.trim() ?? "";
const PLATFORM_SITE_URL = (Deno.env.get("PLATFORM_SITE_URL") || "https://ezcomo.shop").replace(/\/$/, "");

type ReminderChannel = "email" | "sms";

interface ReminderPayload {
  templateName: string;
  channel?: ReminderChannel;
  store_id?: string;
  currentPeriodEndsAt?: string;
  renewalPath?: string;
  existingEventId?: string;
}

interface ReminderContext {
  channel: ReminderChannel;
  email: string | null;
  phone: string | null;
  storeName: string;
  currentPeriodEndsAt: string;
}

function getTrustedMachineKeys() {
  const keys = new Set<string>();
  if (SUPABASE_SERVICE_ROLE_KEY) keys.add(SUPABASE_SERVICE_ROLE_KEY);
  if (SUPABASE_SECRET_KEYS) {
    try {
      const parsed = JSON.parse(SUPABASE_SECRET_KEYS) as Record<string, string>;
      for (const value of Object.values(parsed)) if (value) keys.add(value);
    } catch (error) {
      console.error("[Auth] Failed to parse SUPABASE_SECRET_KEYS:", error);
    }
  }
  return keys;
}

function isTrustedServiceRequest(req: Request) {
  const keys = getTrustedMachineKeys();
  const apiKey = req.headers.get("apikey");
  const authorization = req.headers.get("authorization");
  if (apiKey && keys.has(apiKey)) return true;
  return Boolean(authorization?.startsWith("Bearer ") && keys.has(authorization.slice(7)));
}

function getSupabaseAdminKey() {
  return getTrustedMachineKeys().values().next().value ?? "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatExpiry(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "soon";
  return parsed.toISOString().slice(0, 10);
}

function renewalUrl(payload: ReminderPayload) {
  const path = payload.renewalPath?.startsWith("/") ? payload.renewalPath : "/admin/billing";
  return `${PLATFORM_SITE_URL}${path}`;
}

function sameInstant(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  const leftMs = new Date(left).getTime();
  const rightMs = new Date(right).getTime();
  return Number.isFinite(leftMs) && Number.isFinite(rightMs) && leftMs === rightMs;
}

async function markEvent(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  values: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("email_events")
    .update({
      ...values,
      processing_started_at: null,
      processing_token: null,
      last_attempt_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) console.error("[Renewal reminder] Could not persist event state:", error.message);
}

async function markSkipped(supabase: ReturnType<typeof createClient>, eventId: string, reason: string) {
  await markEvent(supabase, eventId, {
    status: "skipped",
    delivery_status: null,
    error: reason,
    next_retry_at: null,
  });
}

async function markSent(
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  provider: string,
  providerMessageId: string | null,
) {
  await markEvent(supabase, eventId, {
    status: "sent",
    delivery_status: "accepted",
    provider,
    provider_message_id: providerMessageId,
    error: null,
    next_retry_at: null,
  });
}

async function loadReminderContext(
  supabase: ReturnType<typeof createClient>,
  payload: ReminderPayload,
): Promise<{ context: ReminderContext | null; skipReason?: string }> {
  const eventId = payload.existingEventId!;
  const { data: event, error: eventError } = await supabase
    .from("email_events")
    .select("id, store_id, template_name, channel, status")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) throw eventError;
  if (!event) throw new Error("Renewal notification event does not exist");
  if (event.template_name !== "subscription-expiry-reminder") {
    throw new Error("Notification event template does not match renewal reminder");
  }
  if (event.status === "sent" || event.status === "delivered" || event.status === "skipped") {
    return { context: null, skipReason: "already-finalized" };
  }

  const storeId = typeof event.store_id === "string" ? event.store_id : payload.store_id;
  if (!storeId || (payload.store_id && payload.store_id !== storeId)) {
    throw new Error("Renewal notification store does not match durable event");
  }

  const channel: ReminderChannel = event.channel === "sms" ? "sms" : "email";
  if (payload.channel && payload.channel !== channel) {
    throw new Error("Renewal notification channel does not match durable event");
  }

  const [{ data: store, error: storeError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    supabase.from("stores").select("id, name, owner_id").eq("id", storeId).maybeSingle(),
    supabase
      .from("store_subscriptions")
      .select("status, auto_renew, current_period_ends_at")
      .eq("store_id", storeId)
      .maybeSingle(),
  ]);

  if (storeError) throw storeError;
  if (subscriptionError) throw subscriptionError;
  if (!store || !subscription) return { context: null, skipReason: "subscription-or-store-missing" };
  if (subscription.status !== "active" || subscription.auto_renew !== false || !subscription.current_period_ends_at) {
    return { context: null, skipReason: "renewal-reminder-no-longer-applicable" };
  }
  if (!sameInstant(payload.currentPeriodEndsAt, subscription.current_period_ends_at)) {
    return { context: null, skipReason: "renewal-period-changed" };
  }
  if (new Date(subscription.current_period_ends_at).getTime() <= Date.now()) {
    return { context: null, skipReason: "renewal-period-already-ended" };
  }

  let email: string | null = null;
  let phone: string | null = null;

  if (channel === "email") {
    if (!store.owner_id) return { context: null, skipReason: "store-owner-missing" };
    const { data: ownerData, error: ownerError } = await supabase.auth.admin.getUserById(store.owner_id);
    if (ownerError) throw ownerError;
    email = ownerData.user?.email?.trim() || null;
    if (!email) return { context: null, skipReason: "renewal-email-missing" };
  } else {
    const { data: contact, error: contactError } = await supabase
      .from("store_subscription_renewal_contacts")
      .select("renewal_phone")
      .eq("store_id", storeId)
      .maybeSingle();
    if (contactError) throw contactError;
    phone = contact?.renewal_phone?.trim() || null;
    if (!phone) return { context: null, skipReason: "renewal-sms-phone-missing" };
  }

  return {
    context: {
      channel,
      email,
      phone,
      storeName: typeof store.name === "string" && store.name.trim() ? store.name.trim() : "your store",
      currentPeriodEndsAt: subscription.current_period_ends_at,
    },
  };
}

async function sendEmail(
  supabase: ReturnType<typeof createClient>,
  payload: ReminderPayload,
  context: ReminderContext,
) {
  if (!RESEND_API_KEY) throw new Error("Platform email provider is not configured");
  if (!context.email) throw new Error("Renewal email recipient is unavailable");
  const rawStoreName = context.storeName.replace(/[\r\n]+/g, " ").slice(0, 80);
  const storeName = escapeHtml(rawStoreName);
  const expiry = escapeHtml(formatExpiry(context.currentPeriodEndsAt));
  const url = renewalUrl(payload);
  const siteName = (await loadPlatformSiteName(supabase)).replace(/[\r\n]+/g, " ").slice(0, 60);
  const from = EMAIL_FROM || `${siteName} <noreply@ezcomo.shop>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from,
      to: [context.email],
      subject: `Renewal reminder for ${rawStoreName}`,
      html: `<p>Your ${escapeHtml(siteName)} subscription for <strong>${storeName}</strong> is scheduled to expire on ${expiry}.</p><p>Renewal is currently turned off. Review billing before expiry to continue paid access.</p><p><a href="${url}">Open ${escapeHtml(siteName)} billing</a></p>`,
    }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Email provider rejected the reminder (${response.status})`);
  let providerMessageId: string | null = null;
  try {
    providerMessageId = (JSON.parse(body) as { id?: string }).id ?? null;
  } catch {
    providerMessageId = null;
  }
  return { provider: "resend", providerMessageId };
}

async function sendSms(
  supabase: ReturnType<typeof createClient>,
  payload: ReminderPayload,
  context: ReminderContext,
) {
  if (!context.phone) throw new Error("Renewal SMS recipient is unavailable");
  const runtime = await loadPlatformSmsRuntime(supabase, "transactional");
  if (!runtime) throw new Error("Platform transactional SMS is not enabled");
  const siteName = (await loadPlatformSiteName(supabase)).replace(/[\r\n]+/g, " ").slice(0, 60);
  const storeName = context.storeName.replace(/[\r\n]+/g, " ").slice(0, 60);
  const expiry = formatExpiry(context.currentPeriodEndsAt);
  const message = `${siteName}: ${storeName} subscription ${expiry} তারিখে শেষ হবে। Renewal বন্ধ আছে। Renew করতে ${renewalUrl(payload)}`;
  return sendPlatformSms({ ...runtime, to: context.phone, message });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (!isTrustedServiceRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await req.json() as ReminderPayload;
    if (payload.templateName !== "subscription-expiry-reminder") {
      return Response.json({ error: "Unsupported reminder template" }, { status: 400 });
    }
    if (!payload.existingEventId) {
      return Response.json({ error: "Missing durable notification event id" }, { status: 400 });
    }

    const adminKey = getSupabaseAdminKey();
    if (!SUPABASE_URL || !adminKey) throw new Error("Supabase admin credentials are not configured");
    const supabase = createClient(SUPABASE_URL, adminKey);
    const loaded = await loadReminderContext(supabase, payload);

    if (!loaded.context) {
      if (loaded.skipReason !== "already-finalized") {
        await markSkipped(supabase, payload.existingEventId, loaded.skipReason || "renewal-reminder-skipped");
      }
      return Response.json({ success: true, skipped: true });
    }

    const result = loaded.context.channel === "sms"
      ? await sendSms(supabase, payload, loaded.context)
      : await sendEmail(supabase, payload, loaded.context);
    await markSent(supabase, payload.existingEventId, result.provider, result.providerMessageId);

    return Response.json({ success: true, channel: loaded.context.channel });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Renewal reminder delivery failed";
    console.error("[Renewal reminder] Delivery failed:", message);
    return Response.json({ error: message }, { status: 503 });
  }
});
