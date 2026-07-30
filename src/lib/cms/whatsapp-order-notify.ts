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
  store_name?: string;
  order_label?: string;
  customer_label?: string;
  items_label?: string;
  total_label?: string;
  address_label?: string;
  option_label?: string;
  merchant_notification_title?: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  shipping_city: string;
  total: number;
  items?: OrderItemPayload[];
}

export function formatWhatsAppMessage(payload: WhatsAppNotifyPayload, adminLink: string): string {
  const orderRef = payload.order_number ? `#${payload.order_number}` : payload.order_id;
  const title = payload.merchant_notification_title || "NEW ORDER RECEIVED";
  const orderLabel = payload.order_label || "Order Number";
  const customerLabel = payload.customer_label || "Customer";
  const itemsLabel = payload.items_label || "Items";
  const totalLabel = payload.total_label || "Total";
  const addressLabel = payload.address_label || "Delivery Address";
  const optionLabel = payload.option_label || "Option";
  const itemsText = Array.isArray(payload.items) && payload.items.length > 0
    ? payload.items
        .map((item) => {
          const name = item.name || item.product_name || item.title || "Item";
          const size = item.size ? ` [${optionLabel}: ${item.size}]` : "";
          const qty = item.quantity ?? 1;
          const price = item.price != null ? ` - BDT ${item.price * qty}` : "";
          return `- ${qty}x ${name}${size}${price}`;
        })
        .join("\n")
    : "- Order items";

  const address = [payload.shipping_address, payload.shipping_city].filter(Boolean).join(", ");
  const storeLine = payload.store_name ? `*Store:* ${payload.store_name}\n` : "";

  return (
    `*${title}*\n\n` +
    storeLine +
    `*${orderLabel}:* ${orderRef}\n` +
    `*${customerLabel}:* ${payload.customer_name} (${payload.customer_phone})\n\n` +
    `*${itemsLabel}:*\n${itemsText}\n\n` +
    `*${totalLabel}:* BDT ${payload.total}\n` +
    `*${addressLabel}:* ${address}\n\n` +
    `*Admin Link:* ${adminLink}`
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
