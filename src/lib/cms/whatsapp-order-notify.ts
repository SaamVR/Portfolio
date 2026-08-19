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

type EnvLike = Record<string, string | undefined>;

type WhatsAppCloudConfig = {
  accessToken: string;
  phoneNumberId: string;
  templateName: string;
  templateLanguage: string;
  graphVersion: string;
  defaultCountryCode: string;
};

type WhatsAppDeliveryResult =
  | {
      status: "sent";
      provider: "meta-cloud";
      recipient: string;
      providerMessageId: string;
    }
  | {
      status: "skipped";
      provider: "meta-cloud" | "manual-wa-me";
      reason: string;
      recipient?: string;
      manualUrl?: string;
    };

type TriggerWhatsAppOptions = {
  env?: EnvLike;
  fetchImpl?: typeof fetch;
};

const DEFAULT_GRAPH_VERSION = "v25.0";
const DEFAULT_COUNTRY_CODE = "880";

function trimEnv(value: string | undefined) {
  return value?.trim() || "";
}

function clampText(value: string, maxLength: number) {
  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, Math.max(0, maxLength - 1))}…`;
}

function readRuntimeEnv(): EnvLike {
  return typeof process !== "undefined" ? process.env : {};
}

export function resolveWhatsAppCloudConfig(env: EnvLike = readRuntimeEnv()): WhatsAppCloudConfig | null {
  const accessToken = trimEnv(env.WHATSAPP_CLOUD_ACCESS_TOKEN);
  const phoneNumberId = trimEnv(env.WHATSAPP_CLOUD_PHONE_NUMBER_ID);
  const templateName = trimEnv(env.WHATSAPP_MERCHANT_ORDER_TEMPLATE_NAME);

  if (!accessToken || !phoneNumberId || !templateName) {
    return null;
  }

  const requestedGraphVersion = trimEnv(env.WHATSAPP_GRAPH_API_VERSION);
  const graphVersion = /^v\d+\.\d+$/.test(requestedGraphVersion)
    ? requestedGraphVersion
    : DEFAULT_GRAPH_VERSION;

  const countryCode = trimEnv(env.WHATSAPP_DEFAULT_COUNTRY_CODE).replace(/\D/g, "");

  return {
    accessToken,
    phoneNumberId,
    templateName,
    templateLanguage: trimEnv(env.WHATSAPP_MERCHANT_ORDER_TEMPLATE_LANGUAGE) || "en_US",
    graphVersion,
    defaultCountryCode: countryCode || DEFAULT_COUNTRY_CODE,
  };
}

export function normalizeWhatsAppRecipient(phoneNumber: string, defaultCountryCode = DEFAULT_COUNTRY_CODE): string {
  const raw = phoneNumber.trim();
  let digits = raw.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (raw.startsWith("+") || raw.startsWith("00")) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length >= 10) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }

  return digits;
}

function summarizeItems(items: OrderItemPayload[] | undefined, optionLabel = "Option") {
  if (!Array.isArray(items) || items.length === 0) {
    return "Order items";
  }

  return clampText(
    items
      .map((item) => {
        const name = item.name || item.product_name || item.title || "Item";
        const option = item.size ? ` (${optionLabel}: ${item.size})` : "";
        return `${Math.max(1, Number(item.quantity ?? 1))}x ${name}${option}`;
      })
      .join(", "),
    900,
  );
}

function getAdminBaseUrl(env: EnvLike) {
  return (
    trimEnv(env.NEXT_PUBLIC_APP_URL)
    || trimEnv(env.NEXT_PUBLIC_SITE_URL)
    || trimEnv(env.SITE_URL)
    || "https://ezcomo.shop"
  ).replace(/\/$/, "");
}

export function buildWhatsAppCloudTemplateRequest(
  payload: WhatsAppNotifyPayload,
  recipient: string,
  config: WhatsAppCloudConfig,
  adminLink: string,
) {
  const orderRef = payload.order_number ? `#${payload.order_number}` : payload.order_id;
  const address = [payload.shipping_address, payload.shipping_city].filter(Boolean).join(", ");
  const parameters = [
    payload.store_name || "EZComo Store",
    orderRef,
    payload.customer_name,
    payload.customer_phone,
    summarizeItems(payload.items, payload.option_label || "Option"),
    `BDT ${Number(payload.total || 0).toLocaleString("en-US")}`,
    address || "Not provided",
    adminLink,
  ];

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "template",
    template: {
      name: config.templateName,
      language: {
        code: config.templateLanguage,
      },
      components: [
        {
          type: "body",
          parameters: parameters.map((text) => ({ type: "text", text: clampText(String(text), 1000) })),
        },
      ],
    },
  };
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

async function logWhatsAppDelivery(
  supabaseClient: any,
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
  if (!supabaseClient?.from) return;

  try {
    const { error } = await supabaseClient.from("email_events").insert({
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

    if (error) {
      console.error("[WhatsApp Notify] Failed to record delivery event:", error);
    }
  } catch (error) {
    console.error("[WhatsApp Notify] Failed to record delivery event:", error);
  }
}

async function loadMerchantWhatsAppSettings(supabaseClient: any, storeId: string) {
  if (!supabaseClient?.from) {
    throw new Error("Supabase client does not support site settings lookup");
  }

  const { data, error } = await supabaseClient
    .from("site_settings")
    .select("value")
    .eq("store_id", storeId)
    .eq("key", "whatsapp_support")
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load merchant WhatsApp settings");
  }

  const value = data?.value;
  return typeof value === "object" && value
    ? value as { enabled?: boolean; number?: string }
    : null;
}

export async function triggerWhatsAppOrderNotify(
  supabaseClient: any,
  payload: WhatsAppNotifyPayload,
  options: TriggerWhatsAppOptions = {},
): Promise<WhatsAppDeliveryResult> {
  const env = options.env ?? readRuntimeEnv();
  const fetchImpl = options.fetchImpl ?? fetch;
  const settings = await loadMerchantWhatsAppSettings(supabaseClient, payload.store_id);

  if (!settings || settings.enabled === false || !settings.number?.trim()) {
    await logWhatsAppDelivery(supabaseClient, payload, {
      status: "skipped",
      provider: "meta-cloud",
      error: "WhatsApp support is disabled or no merchant number is configured",
    });
    return {
      status: "skipped",
      provider: "meta-cloud",
      reason: "WhatsApp support is disabled or no merchant number is configured",
    };
  }

  const config = resolveWhatsAppCloudConfig(env);
  const manualRecipient = normalizeWhatsAppRecipient(settings.number, trimEnv(env.WHATSAPP_DEFAULT_COUNTRY_CODE) || DEFAULT_COUNTRY_CODE);
  const adminLink = `${getAdminBaseUrl(env)}/admin/orders`;
  const manualUrl = generateWaMeUrl(manualRecipient, formatWhatsAppMessage(payload, adminLink));

  if (!config) {
    const reason = "WhatsApp Cloud API is not configured; no automatic message was sent";
    await logWhatsAppDelivery(supabaseClient, payload, {
      status: "skipped",
      recipient: manualRecipient,
      provider: "manual-wa-me",
      error: reason,
      metadata: { manual_url: manualUrl },
    });
    console.warn(`[WhatsApp Notify] ${reason}`);
    return {
      status: "skipped",
      provider: "manual-wa-me",
      reason,
      recipient: manualRecipient,
      manualUrl,
    };
  }

  const recipient = normalizeWhatsAppRecipient(settings.number, config.defaultCountryCode);
  if (!recipient) {
    const reason = "Merchant WhatsApp number has no usable digits";
    await logWhatsAppDelivery(supabaseClient, payload, {
      status: "skipped",
      provider: "meta-cloud",
      error: reason,
    });
    return { status: "skipped", provider: "meta-cloud", reason };
  }

  const requestBody = buildWhatsAppCloudTemplateRequest(payload, recipient, config, adminLink);
  let response: Response;
  try {
    response = await fetchImpl(
      `https://graph.facebook.com/${config.graphVersion}/${encodeURIComponent(config.phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "WhatsApp Cloud API request failed";
    await logWhatsAppDelivery(supabaseClient, payload, {
      status: "failed",
      recipient,
      provider: "meta-cloud",
      error: message,
      metadata: { template_name: config.templateName },
    });
    throw error;
  }

  const responsePayload = await response.json().catch(() => null) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string; code?: number; error_subcode?: number };
  } | null;
  const providerMessageId = responsePayload?.messages?.[0]?.id?.trim();

  if (!response.ok || !providerMessageId) {
    const message = responsePayload?.error?.message || `WhatsApp Cloud API returned HTTP ${response.status}`;
    await logWhatsAppDelivery(supabaseClient, payload, {
      status: "failed",
      recipient,
      provider: "meta-cloud",
      error: message,
      metadata: {
        template_name: config.templateName,
        http_status: response.status,
        provider_error_code: responsePayload?.error?.code ?? null,
        provider_error_subcode: responsePayload?.error?.error_subcode ?? null,
      },
    });
    throw new Error(message);
  }

  await logWhatsAppDelivery(supabaseClient, payload, {
    status: "sent",
    recipient,
    provider: "meta-cloud",
    providerMessageId,
    metadata: {
      template_name: config.templateName,
      template_language: config.templateLanguage,
    },
  });

  return {
    status: "sent",
    provider: "meta-cloud",
    recipient,
    providerMessageId,
  };
}
