import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || Deno.env.get("NEXT_PUBLIC_APP_URL") || "https://ezcomo.shop").replace(/\/$/, "");
const WHATSAPP_CLOUD_ACCESS_TOKEN = Deno.env.get("WHATSAPP_CLOUD_ACCESS_TOKEN")?.trim() ?? "";
const WHATSAPP_CLOUD_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_CLOUD_PHONE_NUMBER_ID")?.trim() ?? "";
const WHATSAPP_MERCHANT_ORDER_TEMPLATE_NAME = Deno.env.get("WHATSAPP_MERCHANT_ORDER_TEMPLATE_NAME")?.trim() ?? "";
const WHATSAPP_MERCHANT_ORDER_TEMPLATE_LANGUAGE = Deno.env.get("WHATSAPP_MERCHANT_ORDER_TEMPLATE_LANGUAGE")?.trim() || "en_US";
const WHATSAPP_GRAPH_API_VERSION = /^v\d+\.\d+$/.test(Deno.env.get("WHATSAPP_GRAPH_API_VERSION")?.trim() ?? "")
  ? Deno.env.get("WHATSAPP_GRAPH_API_VERSION")!.trim()
  : "v25.0";
const WHATSAPP_DEFAULT_COUNTRY_CODE = (Deno.env.get("WHATSAPP_DEFAULT_COUNTRY_CODE")?.trim() || "880").replace(/\D/g, "") || "880";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItemPayload {
  name?: string;
  product_name?: string;
  title?: string;
  size?: string;
  quantity?: number;
  price?: number;
}

interface WhatsAppNotifyPayload {
  store_id: string;
  order_id: string;
  order_number?: string;
  store_name?: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  shipping_city: string;
  total: number;
  items?: OrderItemPayload[];
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeRecipient(phoneNumber: string) {
  const raw = phoneNumber.trim();
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (raw.startsWith("+") || raw.startsWith("00")) return digits;
  if (digits.startsWith("0") && digits.length >= 10) {
    return `${WHATSAPP_DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
  }
  return digits;
}

function clampText(value: string, maxLength = 1000) {
  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, maxLength - 1)}…`;
}

function summarizeItems(items: OrderItemPayload[] | undefined) {
  if (!Array.isArray(items) || items.length === 0) return "Order items";
  return clampText(items.map((item) => {
    const name = item.name || item.product_name || item.title || "Item";
    const size = item.size ? ` (${item.size})` : "";
    return `${Math.max(1, Number(item.quantity ?? 1))}x ${name}${size}`;
  }).join(", "), 900);
}

async function logDelivery(
  supabase: ReturnType<typeof createClient>,
  payload: WhatsAppNotifyPayload,
  event: {
    status: "sent" | "skipped" | "failed";
    recipient?: string;
    provider: string;
    providerMessageId?: string;
    error?: string;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    const { error } = await supabase.from("email_events").insert({
      store_id: payload.store_id,
      order_id: payload.order_id,
      template_name: "whatsapp-merchant-order-notify",
      recipient: event.recipient || null,
      channel: "whatsapp",
      status: event.status,
      provider: event.provider,
      provider_message_id: event.providerMessageId || null,
      error: event.error || null,
      metadata: {
        order_number: payload.order_number || null,
        ...event.metadata,
      },
    });
    if (error) console.error("[WhatsApp Notify] Failed to log event:", error.message);
  } catch (error) {
    console.error("[WhatsApp Notify] Failed to log event:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: WhatsAppNotifyPayload = await req.json();
    if (!payload.store_id || !payload.order_id) {
      return jsonResponse({ success: false, error: "Missing store_id or order_id" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: settingsRow, error: settingsError } = await supabase
      .from("site_settings")
      .select("value")
      .eq("store_id", payload.store_id)
      .eq("key", "whatsapp_support")
      .maybeSingle();

    if (settingsError) {
      throw new Error(settingsError.message || "Failed to load merchant WhatsApp settings");
    }

    const whatsappSettings = settingsRow?.value as { enabled?: boolean; number?: string } | undefined;
    if (!whatsappSettings || whatsappSettings.enabled === false || !whatsappSettings.number?.trim()) {
      await logDelivery(supabase, payload, {
        status: "skipped",
        provider: "meta-cloud",
        error: "WhatsApp support is disabled or no merchant number is configured",
      });
      return jsonResponse({ success: true, status: "skipped", reason: "WhatsApp support is disabled or number missing" });
    }

    const recipient = normalizeRecipient(whatsappSettings.number);
    if (!recipient) {
      await logDelivery(supabase, payload, {
        status: "skipped",
        provider: "meta-cloud",
        error: "Merchant WhatsApp number has no usable digits",
      });
      return jsonResponse({ success: true, status: "skipped", reason: "Invalid merchant WhatsApp number" });
    }

    if (!WHATSAPP_CLOUD_ACCESS_TOKEN || !WHATSAPP_CLOUD_PHONE_NUMBER_ID || !WHATSAPP_MERCHANT_ORDER_TEMPLATE_NAME) {
      const reason = "WhatsApp Cloud API is not configured; no automatic message was sent";
      await logDelivery(supabase, payload, {
        status: "skipped",
        recipient,
        provider: "meta-cloud",
        error: reason,
      });
      return jsonResponse({ success: true, status: "skipped", recipient, reason });
    }

    const orderRef = payload.order_number ? `#${payload.order_number}` : payload.order_id;
    const address = [payload.shipping_address, payload.shipping_city].filter(Boolean).join(", ") || "Not provided";
    const adminLink = `${APP_BASE_URL}/admin/orders`;
    const parameters = [
      payload.store_name || "EZComo Store",
      orderRef,
      payload.customer_name,
      payload.customer_phone,
      summarizeItems(payload.items),
      `BDT ${Number(payload.total || 0).toLocaleString("en-US")}`,
      address,
      adminLink,
    ];

    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_GRAPH_API_VERSION}/${encodeURIComponent(WHATSAPP_CLOUD_PHONE_NUMBER_ID)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_CLOUD_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "template",
          template: {
            name: WHATSAPP_MERCHANT_ORDER_TEMPLATE_NAME,
            language: { code: WHATSAPP_MERCHANT_ORDER_TEMPLATE_LANGUAGE },
            components: [{
              type: "body",
              parameters: parameters.map((text) => ({ type: "text", text: clampText(String(text)) })),
            }],
          },
        }),
      },
    );

    const responsePayload = await response.json().catch(() => null) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string; code?: number; error_subcode?: number };
    } | null;
    const providerMessageId = responsePayload?.messages?.[0]?.id?.trim();

    if (!response.ok || !providerMessageId) {
      const message = responsePayload?.error?.message || `WhatsApp Cloud API returned HTTP ${response.status}`;
      await logDelivery(supabase, payload, {
        status: "failed",
        recipient,
        provider: "meta-cloud",
        error: message,
        metadata: {
          template_name: WHATSAPP_MERCHANT_ORDER_TEMPLATE_NAME,
          http_status: response.status,
          provider_error_code: responsePayload?.error?.code ?? null,
          provider_error_subcode: responsePayload?.error?.error_subcode ?? null,
        },
      });
      return jsonResponse({ success: false, status: "failed", error: message }, 502);
    }

    await logDelivery(supabase, payload, {
      status: "sent",
      recipient,
      provider: "meta-cloud",
      providerMessageId,
      metadata: {
        template_name: WHATSAPP_MERCHANT_ORDER_TEMPLATE_NAME,
        template_language: WHATSAPP_MERCHANT_ORDER_TEMPLATE_LANGUAGE,
      },
    });

    return jsonResponse({
      success: true,
      status: "sent",
      provider: "meta-cloud",
      recipient,
      provider_message_id: providerMessageId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown WhatsApp notification error";
    console.error("[WhatsApp Notify] Exception:", message);
    return jsonResponse({ success: false, status: "failed", error: message }, 500);
  }
});
