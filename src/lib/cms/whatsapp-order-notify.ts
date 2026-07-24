export interface OrderItemPayload {
  name?: string;
  product_name?: string;
  title?: string;
  size?: string;
  quantity?: number;
  price?: number;
}

export interface WhatsAppNotifyPayload {
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

export function formatWhatsAppMessage(payload: WhatsAppNotifyPayload, adminLink: string): string {
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

export function generateWaMeUrl(phoneNumber: string, message: string): string {
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
}

export async function triggerWhatsAppOrderNotify(
  supabaseClient: any,
  payload: WhatsAppNotifyPayload
): Promise<void> {
  try {
    if (!supabaseClient?.functions?.invoke) return;

    await supabaseClient.functions.invoke("whatsapp-order-notify", {
      body: payload,
    }).catch((err) => {
      console.error("[WhatsApp Notify] Edge function call error (fail-safe):", err);
    });
  } catch (err) {
    console.error("[WhatsApp Notify] Invocation exception (fail-safe):", err);
  }
}
