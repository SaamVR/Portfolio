import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || Deno.env.get("NEXT_PUBLIC_APP_URL") || "https://ezcomo.shop";

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
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  shipping_city: string;
  total: number;
  items?: OrderItemPayload[];
}

function formatWhatsAppMessage(payload: WhatsAppNotifyPayload, adminLink: string): string {
  const orderRef = payload.order_number ? `#${payload.order_number}` : payload.order_id;
  const itemsText = Array.isArray(payload.items) && payload.items.length > 0
    ? payload.items
        .map((item) => {
          const name = item.name || item.product_name || item.title || "Item";
          const size = item.size ? ` (${item.size})` : "";
          const qty = item.quantity ?? 1;
          const price = item.price != null ? ` - ৳${item.price * qty}` : "";
          return `• ${qty}x ${name}${size}${price}`;
        })
        .join("\n")
    : "• Order items";

  const address = [payload.shipping_address, payload.shipping_city].filter(Boolean).join(", ");

  return (
    `📦 *NEW ORDER RECEIVED*\n\n` +
    `*Order Number:* ${orderRef}\n` +
    `*Customer:* ${payload.customer_name} (${payload.customer_phone})\n\n` +
    `*Items:*\n${itemsText}\n\n` +
    `*Total:* ৳${payload.total}\n` +
    `*Delivery Address:* ${address}\n\n` +
    `🔗 *Admin Link:* ${adminLink}`
  );
}

function generateWaMeUrl(phoneNumber: string, message: string): string {
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: WhatsAppNotifyPayload = await req.json();

    if (!payload.store_id || !payload.order_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing store_id or order_id" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch store's whatsapp_support setting
    const { data: settingsRow, error: settingsError } = await supabase
      .from("site_settings")
      .select("value")
      .eq("store_id", payload.store_id)
      .eq("key", "whatsapp_support")
      .maybeSingle();

    if (settingsError) {
      console.error("[WhatsApp Notify] Error reading site_settings:", settingsError.message);
    }

    const whatsappSettings = settingsRow?.value as { enabled?: boolean; number?: string; message?: string } | undefined;

    if (!whatsappSettings || whatsappSettings.enabled === false || !whatsappSettings.number) {
      console.log("[WhatsApp Notify] WhatsApp support disabled or number missing for store:", payload.store_id);
      return new Response(
        JSON.stringify({ success: true, status: "skipped", reason: "WhatsApp support not enabled or number missing" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanNumber = whatsappSettings.number.replace(/\D/g, "");
    if (!cleanNumber) {
      return new Response(
        JSON.stringify({ success: true, status: "skipped", reason: "Invalid phone number digits" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Build admin link and message template
    const adminLink = `${APP_BASE_URL}/admin/orders`;
    const message = formatWhatsAppMessage(payload, adminLink);
    const waMeUrl = generateWaMeUrl(cleanNumber, message);

    // 3. Log notification event into email_events (fail-safe)
    try {
      await supabase.from("email_events").insert({
        store_id: payload.store_id,
        order_id: payload.order_id,
        template_name: "whatsapp-merchant-order-notify",
        recipient: cleanNumber,
        channel: "whatsapp",
        status: "sent",
        provider: "wa.me",
        metadata: {
          whatsapp_url: waMeUrl,
          order_number: payload.order_number,
          customer_name: payload.customer_name,
          customer_phone: payload.customer_phone,
          total: payload.total,
        },
      });
    } catch (logErr) {
      console.error("[WhatsApp Notify] Failed to log event:", logErr);
    }

    console.log(`[WhatsApp Notify] Formatted wa.me URL for merchant (${cleanNumber}): ${waMeUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        status: "sent",
        provider: "wa.me",
        recipient: cleanNumber,
        whatsapp_url: waMeUrl,
        message,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[WhatsApp Notify] Exception encountered (fail-safe):", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
