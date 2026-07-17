import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  to?: string;
  templateName: string;
  storeName?: string;
  storeSlug?: string;
  
  // Order specifics
  order_id?: string;
  store_id?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_name?: string;
  total?: number;
  status?: string;
}

interface DispatchResult {
  status: "sent" | "skipped" | "failed";
  provider?: string;
  providerMessageId?: string;
  error?: string;
}

const templates: Record<string, (data: Payload) => { subject: string; html: string }> = {
  "welcome": (data) => ({
    subject: `Welcome to EZComo, ${data.storeName}!`,
    html: `<p>Hi there,</p><p>Welcome to EZComo! Your store <strong>${data.storeName}</strong> has been created.</p>`,
  }),
  "store-published": (data) => ({
    subject: `Your store ${data.storeName} is live!`,
    html: `<p>Congratulations!</p><p>Your store <strong>${data.storeName}</strong> is now published.</p>`,
  }),
  "payment-reminder": (data) => ({
    subject: `Action Required: Payment reminder for ${data.storeName}`,
    html: `<p>Hi there,</p><p>Your subscription for <strong>${data.storeName}</strong> is past due.</p>`,
  }),
  "inactivity-warning": (data) => ({
    subject: `We miss you! Update your store ${data.storeName}`,
    html: `<p>Hi there,</p><p>We noticed you haven't logged in or updated <strong>${data.storeName}</strong> in a while.</p>`,
  }),
  "deletion-notice": (data) => ({
    subject: `Notice: Store Deletion Schedule for ${data.storeName}`,
    html: `<p>Hi there,</p><p>Your store <strong>${data.storeName}</strong> is scheduled for deletion soon due to inactivity.</p>`,
  }),
  
  // New Order Templates
  "order-receipt": (data) => ({
    subject: `Order Confirmation #${data.order_id}`,
    html: `<p>Hi ${data.customer_name},</p><p>Thank you for your order! We have received your order #${data.order_id} for a total of ৳${data.total}. We will notify you once it ships.</p>`,
  }),
  "order-shipped": (data) => ({
    subject: `Your order #${data.order_id} has been shipped!`,
    html: `<p>Hi ${data.customer_name},</p><p>Great news! Your order #${data.order_id} is on its way to you.</p>`,
  }),
  "order-delivered": (data) => ({
    subject: `Your order #${data.order_id} has been delivered!`,
    html: `<p>Hi ${data.customer_name},</p><p>Your order #${data.order_id} has been marked as delivered. Enjoy!</p>`,
  }),
  "order-cancelled": (data) => ({
    subject: `Your order #${data.order_id} was cancelled`,
    html: `<p>Hi ${data.customer_name},</p><p>We're sorry to inform you that your order #${data.order_id} has been cancelled.</p>`,
  })
};

// Helper to send SMS via GreenWeb
async function sendGreenWebSMS(apiKey: string, to: string, message: string): Promise<DispatchResult> {
  try {
    const res = await fetch("http://api.greenweb.com.bd/api.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token: apiKey,
        to: to,
        message: message,
      }),
    });
    const text = await res.text();
    console.log(`[GreenWeb SMS] Response: ${text}`);
    if (!res.ok) {
      return { status: "failed", provider: "greenweb", error: text };
    }
    return { status: "sent", provider: "greenweb", providerMessageId: text };
  } catch (err) {
    console.error("[GreenWeb SMS] Error:", err);
    return { status: "failed", provider: "greenweb", error: err instanceof Error ? err.message : String(err) };
  }
}

// Helper to send Email via Resend
async function sendResendEmail(to: string, subject: string, html: string): Promise<DispatchResult> {
  if (!RESEND_API_KEY) {
    console.log("[Email] No RESEND_API_KEY configured. Skipping:", subject);
    return { status: "skipped", provider: "resend", error: "RESEND_API_KEY is not configured" };
  }
  
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: Deno.env.get("EMAIL_FROM") || "EZComo <noreply@ezcomo.shop>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("Resend API error:", error);
    return { status: "failed", provider: "resend", error };
  }

  const data = await res.json().catch(() => null);
  return { status: "sent", provider: "resend", providerMessageId: data?.id };
}

async function logNotificationEvent(
  supabase: ReturnType<typeof createClient>,
  payload: Payload,
  channel: "email" | "sms",
  recipient: string | undefined,
  result: DispatchResult,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await supabase.from("email_events").insert({
    store_id: payload.store_id || null,
    order_id: payload.order_id || null,
    template_name: payload.templateName,
    recipient: recipient || null,
    channel,
    status: result.status,
    provider: result.provider || null,
    provider_message_id: result.providerMessageId || null,
    error: result.error || null,
    metadata: {
      storeName: payload.storeName,
      storeSlug: payload.storeSlug,
      customerName: payload.customer_name,
      total: payload.total,
      ...metadata,
    },
  });

  if (error) {
    console.error("[Notification Log] Failed to write email_events row:", error.message);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: Payload = await req.json();

    if (!payload.templateName) {
      throw new Error("Missing required field: templateName");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Is this a store lifecycle email or an order transactional email?
    const isOrderNotification = payload.templateName.startsWith("order-");

    if (!isOrderNotification) {
      // Legacy lifecycle email handling
      if (!payload.to) throw new Error("Missing 'to' for lifecycle email");
      
      const templateFn = templates[payload.templateName];
      if (!templateFn) throw new Error(`Invalid template name: ${payload.templateName}`);
      
      const { subject, html } = templateFn(payload);
      const result = await sendResendEmail(payload.to, subject, html);
      await logNotificationEvent(supabase, payload, "email", payload.to, result, { subject });
      
      return new Response(JSON.stringify({ success: true, message: "Lifecycle Email sent" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // -----------------------------------------------------
    // Order Transactional Notifications Logic
    // -----------------------------------------------------
    if (!payload.store_id || !payload.order_id) {
      throw new Error("Missing store_id or order_id for order notification");
    }

    // 1. Fetch Store Notification Settings
    const { data: settingsRow } = await supabase
      .from("site_settings")
      .select("value")
      .eq("store_id", payload.store_id)
      .eq("key", "notification_settings")
      .maybeSingle();

    const notifSettings = settingsRow?.value || {};
    
    // Default to true if not explicitly disabled
    const emailReceiptsEnabled = notifSettings.email_receipts !== false;
    const smsEnabled = notifSettings.sms_enabled === true;
    const smsApiKey = notifSettings.sms_api_key;

    // 2. Dispatch Customer Emails
    if (emailReceiptsEnabled && payload.customer_email) {
      const templateFn = templates[payload.templateName];
      if (templateFn) {
        const { subject, html } = templateFn(payload);
        const result = await sendResendEmail(payload.customer_email, subject, html);
        await logNotificationEvent(supabase, payload, "email", payload.customer_email, result, { subject });
      }
    } else {
      await logNotificationEvent(
        supabase,
        payload,
        "email",
        payload.customer_email,
        { status: "skipped", provider: "resend", error: emailReceiptsEnabled ? "Missing customer email" : "Email receipts disabled" },
      );
    }

    // 3. Dispatch SMS Notifications
    if (smsEnabled && smsApiKey && payload.customer_phone) {
      let smsMessage = "";
      
      if (payload.templateName === "order-receipt") {
        smsMessage = notifSettings.sms_template_received || "Hi {customer_name}, your order #{order_id} is confirmed!";
      } else if (payload.templateName === "order-shipped") {
        smsMessage = notifSettings.sms_template_shipped || "Hi {customer_name}, your order #{order_id} has been shipped!";
      } else if (payload.templateName === "order-delivered") {
        smsMessage = "Hi {customer_name}, your order #{order_id} has been delivered!";
      }
      
      if (smsMessage) {
        // Replace dynamic variables
        smsMessage = smsMessage
          .replace(/{customer_name}/g, payload.customer_name || "Customer")
          .replace(/{order_id}/g, payload.order_id);
          
        const result = await sendGreenWebSMS(smsApiKey, payload.customer_phone, smsMessage);
        await logNotificationEvent(supabase, payload, "sms", payload.customer_phone, result);
      }
    } else {
      await logNotificationEvent(
        supabase,
        payload,
        "sms",
        payload.customer_phone,
        { status: "skipped", provider: "greenweb", error: smsEnabled ? "Missing SMS API key or customer phone" : "SMS disabled" },
      );
    }

    return new Response(JSON.stringify({ success: true, message: "Order notifications dispatched" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Function error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
