import {
  normalizeWhatsAppRecipient,
  resolveWhatsAppCloudConfig,
} from "@/lib/cms/whatsapp-order-notify";

export const CUSTOMER_WHATSAPP_ORDER_STATUSES = [
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type CustomerWhatsAppOrderStatus = typeof CUSTOMER_WHATSAPP_ORDER_STATUSES[number];

export interface WhatsAppOrderStatusPayload {
  store_id: string;
  order_id: string;
  order_number?: string;
  customer_name: string;
  customer_phone: string;
  status: string;
}

type EnvLike = Record<string, string | undefined>;

type TriggerOrderStatusOptions = {
  env?: EnvLike;
  fetchImpl?: typeof fetch;
};

type CustomerWhatsAppConfig = NonNullable<ReturnType<typeof resolveWhatsAppCloudConfig>>;

type CustomerStatusDeliveryResult =
  | {
      status: "sent";
      provider: "meta-cloud";
      recipient: string;
      providerMessageId: string;
    }
  | {
      status: "skipped";
      provider: "meta-cloud";
      reason: string;
      recipient?: string;
    };

function readRuntimeEnv(): EnvLike {
  return typeof process !== "undefined" ? process.env : {};
}

function trimEnv(value: string | undefined) {
  return value?.trim() || "";
}

function clampText(value: string, maxLength: number) {
  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, Math.max(0, maxLength - 1))}…`;
}

function getPublicBaseUrl(env: EnvLike) {
  return (
    trimEnv(env.NEXT_PUBLIC_APP_URL)
    || trimEnv(env.NEXT_PUBLIC_SITE_URL)
    || trimEnv(env.SITE_URL)
    || "https://ezcomo.shop"
  ).replace(/\/$/, "");
}

export function isCustomerWhatsAppOrderStatus(status: string): status is CustomerWhatsAppOrderStatus {
  return CUSTOMER_WHATSAPP_ORDER_STATUSES.includes(status as CustomerWhatsAppOrderStatus);
}

export function formatCustomerOrderStatusLabel(status: CustomerWhatsAppOrderStatus) {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
  }
}

export function resolveCustomerWhatsAppConfig(
  env: EnvLike = readRuntimeEnv(),
): CustomerWhatsAppConfig | null {
  const templateName = trimEnv(env.WHATSAPP_CUSTOMER_ORDER_STATUS_TEMPLATE_NAME);
  if (!templateName) return null;

  return resolveWhatsAppCloudConfig({
    ...env,
    WHATSAPP_MERCHANT_ORDER_TEMPLATE_NAME: templateName,
    WHATSAPP_MERCHANT_ORDER_TEMPLATE_LANGUAGE:
      trimEnv(env.WHATSAPP_CUSTOMER_ORDER_STATUS_TEMPLATE_LANGUAGE) || "en_US",
  });
}

async function loadStoreContext(supabaseClient: any, storeId: string) {
  const { data, error } = await supabaseClient
    .from("stores")
    .select("name, slug")
    .eq("id", storeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load store for customer notification");
  }

  return {
    name: typeof data?.name === "string" && data.name.trim() ? data.name.trim() : "EZComo Store",
    slug: typeof data?.slug === "string" ? data.slug.trim() : "",
  };
}

async function loadLatestShipmentContext(supabaseClient: any, storeId: string, orderId: string) {
  try {
    const { data, error } = await supabaseClient
      .from("order_shipments")
      .select("tracking_number, consignment_id, provider, status")
      .eq("store_id", storeId)
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[WhatsApp Order Status] Could not load shipment context:", error);
      return null;
    }

    return data as {
      tracking_number?: string | null;
      consignment_id?: string | null;
      provider?: string | null;
      status?: string | null;
    } | null;
  } catch (error) {
    console.warn("[WhatsApp Order Status] Could not load shipment context:", error);
    return null;
  }
}

export function buildCustomerOrderStatusTemplateRequest(input: {
  payload: WhatsAppOrderStatusPayload & { status: CustomerWhatsAppOrderStatus };
  recipient: string;
  config: CustomerWhatsAppConfig;
  storeName: string;
  trackingReference: string;
  trackingUrl: string;
}) {
  const orderRef = input.payload.order_number ? `#${input.payload.order_number}` : input.payload.order_id;
  const parameters = [
    input.storeName,
    orderRef,
    formatCustomerOrderStatusLabel(input.payload.status),
    input.trackingReference,
    input.trackingUrl,
  ];

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: input.recipient,
    type: "template",
    template: {
      name: input.config.templateName,
      language: {
        code: input.config.templateLanguage,
      },
      components: [
        {
          type: "body",
          parameters: parameters.map((text) => ({
            type: "text",
            text: clampText(String(text), 1000),
          })),
        },
      ],
    },
  };
}

async function logCustomerStatusDelivery(
  supabaseClient: any,
  payload: WhatsAppOrderStatusPayload,
  event: {
    status: "sent" | "skipped" | "failed";
    recipient?: string;
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
      template_name: "whatsapp-customer-order-status",
      recipient: event.recipient || null,
      channel: "whatsapp",
      status: event.status,
      provider: "meta-cloud",
      provider_message_id: event.providerMessageId || null,
      error: event.error || null,
      metadata: {
        order_number: payload.order_number || null,
        order_status: payload.status,
        ...event.metadata,
      },
    });

    if (error) {
      console.error("[WhatsApp Order Status] Failed to record delivery event:", error);
    }
  } catch (error) {
    console.error("[WhatsApp Order Status] Failed to record delivery event:", error);
  }
}

export async function triggerWhatsAppOrderStatusNotify(
  supabaseClient: any,
  payload: WhatsAppOrderStatusPayload,
  options: TriggerOrderStatusOptions = {},
): Promise<CustomerStatusDeliveryResult> {
  if (!isCustomerWhatsAppOrderStatus(payload.status)) {
    return {
      status: "skipped",
      provider: "meta-cloud",
      reason: `Order status ${payload.status} does not require a customer WhatsApp notification`,
    };
  }

  const env = options.env ?? readRuntimeEnv();
  const fetchImpl = options.fetchImpl ?? fetch;
  const config = resolveCustomerWhatsAppConfig(env);
  const defaultCountryCode = trimEnv(env.WHATSAPP_DEFAULT_COUNTRY_CODE) || "880";
  const recipient = normalizeWhatsAppRecipient(payload.customer_phone, defaultCountryCode);

  if (!recipient) {
    const reason = "Customer WhatsApp number has no usable digits";
    await logCustomerStatusDelivery(supabaseClient, payload, {
      status: "skipped",
      error: reason,
    });
    return { status: "skipped", provider: "meta-cloud", reason };
  }

  if (!config) {
    const reason = "Customer order-status WhatsApp template is not configured; no automatic message was sent";
    await logCustomerStatusDelivery(supabaseClient, payload, {
      status: "skipped",
      recipient,
      error: reason,
    });
    return {
      status: "skipped",
      provider: "meta-cloud",
      reason,
      recipient,
    };
  }

  const [store, shipment] = await Promise.all([
    loadStoreContext(supabaseClient, payload.store_id),
    loadLatestShipmentContext(supabaseClient, payload.store_id, payload.order_id),
  ]);

  const trackingReference = shipment?.tracking_number?.trim()
    || shipment?.consignment_id?.trim()
    || "Not available";
  const trackingUrl = store.slug
    ? `${getPublicBaseUrl(env)}/stores/${encodeURIComponent(store.slug)}/track-order`
    : getPublicBaseUrl(env);

  const requestBody = buildCustomerOrderStatusTemplateRequest({
    payload: { ...payload, status: payload.status },
    recipient,
    config,
    storeName: store.name,
    trackingReference,
    trackingUrl,
  });

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
    await logCustomerStatusDelivery(supabaseClient, payload, {
      status: "failed",
      recipient,
      error: message,
      metadata: {
        template_name: config.templateName,
        tracking_reference: trackingReference,
      },
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
    await logCustomerStatusDelivery(supabaseClient, payload, {
      status: "failed",
      recipient,
      error: message,
      metadata: {
        template_name: config.templateName,
        http_status: response.status,
        provider_error_code: responsePayload?.error?.code ?? null,
        provider_error_subcode: responsePayload?.error?.error_subcode ?? null,
        tracking_reference: trackingReference,
      },
    });
    throw new Error(message);
  }

  await logCustomerStatusDelivery(supabaseClient, payload, {
    status: "sent",
    recipient,
    providerMessageId,
    metadata: {
      template_name: config.templateName,
      template_language: config.templateLanguage,
      tracking_reference: trackingReference,
      tracking_url: trackingUrl,
    },
  });

  return {
    status: "sent",
    provider: "meta-cloud",
    recipient,
    providerMessageId,
  };
}
