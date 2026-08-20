import { describe, expect, it } from "@/test/test-utils";
import {
  buildCustomerOrderStatusTemplateRequest,
  isCustomerWhatsAppOrderStatus,
  resolveCustomerWhatsAppConfig,
  triggerWhatsAppOrderStatusNotify,
  type WhatsAppOrderStatusPayload,
} from "@/lib/cms/whatsapp-order-status-notify";

function createSupabaseMock(options?: {
  shipment?: {
    tracking_number?: string | null;
    consignment_id?: string | null;
    provider?: string | null;
    status?: string | null;
  } | null;
}) {
  const deliveryEvents: Record<string, unknown>[] = [];
  const defaultShipment = {
    tracking_number: "TRK-7788",
    consignment_id: "CN-7788",
    provider: "steadfast",
    status: "booked",
  };
  const shipment = options?.shipment === undefined ? defaultShipment : options.shipment;

  return {
    deliveryEvents,
    client: {
      from(table: string) {
        if (table === "stores") {
          const chain: any = {
            select: () => chain,
            eq: () => chain,
            maybeSingle: async () => ({
              data: { name: "ThreadBD", slug: "threadbd" },
              error: null,
            }),
          };
          return chain;
        }

        if (table === "order_shipments") {
          const chain: any = {
            select: () => chain,
            eq: () => chain,
            order: () => chain,
            limit: () => chain,
            maybeSingle: async () => ({
              data: shipment,
              error: null,
            }),
          };
          return chain;
        }

        if (table === "email_events") {
          return {
            insert: async (row: Record<string, unknown>) => {
              deliveryEvents.push(row);
              return { error: null };
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    },
  };
}

const samplePayload: WhatsAppOrderStatusPayload = {
  store_id: "store_123",
  order_id: "ord_abc789",
  order_number: "10042",
  customer_name: "Tanvir Hossain",
  customer_phone: "01711223344",
  status: "shipped",
};

const configuredEnv = {
  NEXT_PUBLIC_APP_URL: "https://ezcomo.shop",
  WHATSAPP_CLOUD_ACCESS_TOKEN: "test-token",
  WHATSAPP_CLOUD_PHONE_NUMBER_ID: "123456789",
  WHATSAPP_CUSTOMER_ORDER_STATUS_TEMPLATE_NAME: "ezcomo_order_status_update",
  WHATSAPP_CUSTOMER_ORDER_STATUS_TEMPLATE_LANGUAGE: "en_US",
  WHATSAPP_GRAPH_API_VERSION: "v25.0",
  WHATSAPP_DEFAULT_COUNTRY_CODE: "880",
};

describe("whatsapp-order-status-notify helper", () => {
  it("only sends customer notifications for meaningful customer-facing states", () => {
    expect(isCustomerWhatsAppOrderStatus("confirmed")).toBe(true);
    expect(isCustomerWhatsAppOrderStatus("shipped")).toBe(true);
    expect(isCustomerWhatsAppOrderStatus("delivered")).toBe(true);
    expect(isCustomerWhatsAppOrderStatus("cancelled")).toBe(true);
    expect(isCustomerWhatsAppOrderStatus("processing")).toBe(false);
    expect(isCustomerWhatsAppOrderStatus("pending")).toBe(false);
  });

  it("resolves customer template configuration independently from the merchant template", () => {
    const config = resolveCustomerWhatsAppConfig(configuredEnv);

    expect(config?.templateName).toBe("ezcomo_order_status_update");
    expect(config?.templateLanguage).toBe("en_US");
    expect(config?.graphVersion).toBe("v25.0");
  });

  it("builds the documented five-parameter customer utility template", () => {
    const config = resolveCustomerWhatsAppConfig(configuredEnv);
    if (!config) throw new Error("Expected customer WhatsApp test config");

    const request = buildCustomerOrderStatusTemplateRequest({
      payload: { ...samplePayload, status: "shipped" },
      recipient: "8801711223344",
      config,
      storeName: "ThreadBD",
      trackingReference: "TRK-7788",
      trackingUrl: "https://ezcomo.shop/stores/threadbd/track-order",
    });

    expect(request.to).toBe("8801711223344");
    expect(request.template.name).toBe("ezcomo_order_status_update");
    expect(request.template.components[0].parameters.length).toBe(5);
    expect(request.template.components[0].parameters[0].text).toBe("ThreadBD");
    expect(request.template.components[0].parameters[1].text).toBe("#10042");
    expect(request.template.components[0].parameters[2].text).toBe("Shipped");
    expect(request.template.components[0].parameters[3].text).toBe("TRK-7788");
    expect(request.template.components[0].parameters[4].text).toBe("https://ezcomo.shop/stores/threadbd/track-order");
  });

  it("skips processing status without touching provider or database delivery state", async () => {
    let requestCount = 0;
    const result = await triggerWhatsAppOrderStatusNotify(
      {
        from() {
          throw new Error("Database should not be touched for unsupported status");
        },
      },
      { ...samplePayload, status: "processing" },
      {
        env: configuredEnv,
        fetchImpl: async () => {
          requestCount += 1;
          throw new Error("Fetch should not run for unsupported status");
        },
      },
    );

    expect(result.status).toBe("skipped");
    expect(requestCount).toBe(0);
  });

  it("reports missing customer template configuration as skipped instead of falsely sent", async () => {
    const supabase = createSupabaseMock();
    let requestCount = 0;

    const result = await triggerWhatsAppOrderStatusNotify(supabase.client, samplePayload, {
      env: {
        NEXT_PUBLIC_APP_URL: "https://ezcomo.shop",
        WHATSAPP_CLOUD_ACCESS_TOKEN: "test-token",
        WHATSAPP_CLOUD_PHONE_NUMBER_ID: "123456789",
      },
      fetchImpl: async () => {
        requestCount += 1;
        throw new Error("Fetch should not run without customer template configuration");
      },
    });

    expect(result.status).toBe("skipped");
    expect(requestCount).toBe(0);
    expect(supabase.deliveryEvents.at(-1)?.status).toBe("skipped");
    expect(supabase.deliveryEvents.at(-1)?.template_name).toBe("whatsapp-customer-order-status");
  });

  it("sends the status template with storefront tracking context and records Meta wamid", async () => {
    const supabase = createSupabaseMock();
    let requestedUrl = "";
    let requestBody: any = null;

    const result = await triggerWhatsAppOrderStatusNotify(supabase.client, samplePayload, {
      env: configuredEnv,
      fetchImpl: async (input, init) => {
        requestedUrl = String(input);
        requestBody = JSON.parse(String(init?.body || "{}"));
        return new Response(JSON.stringify({ messages: [{ id: "wamid.status-test" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });

    expect(result).toEqual({
      status: "sent",
      provider: "meta-cloud",
      recipient: "8801711223344",
      providerMessageId: "wamid.status-test",
    });
    expect(requestedUrl).toBe("https://graph.facebook.com/v25.0/123456789/messages");
    expect(requestBody.template.components[0].parameters[3].text).toBe("TRK-7788");
    expect(requestBody.template.components[0].parameters[4].text).toBe("https://ezcomo.shop/stores/threadbd/track-order");
    expect(supabase.deliveryEvents.at(-1)?.status).toBe("sent");
    expect(supabase.deliveryEvents.at(-1)?.provider_message_id).toBe("wamid.status-test");
  });

  it("falls back to a neutral tracking reference when no courier shipment exists", async () => {
    const supabase = createSupabaseMock({ shipment: null });
    let requestBody: any = null;

    await triggerWhatsAppOrderStatusNotify(supabase.client, samplePayload, {
      env: configuredEnv,
      fetchImpl: async (_input, init) => {
        requestBody = JSON.parse(String(init?.body || "{}"));
        return new Response(JSON.stringify({ messages: [{ id: "wamid.no-shipment" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });

    expect(requestBody.template.components[0].parameters[3].text).toBe("Not available");
  });

  it("surfaces Meta failures so the background queue can retry and incidents can be recorded", async () => {
    const supabase = createSupabaseMock();
    let caught: unknown = null;

    try {
      await triggerWhatsAppOrderStatusNotify(supabase.client, samplePayload, {
        env: configuredEnv,
        fetchImpl: async () => new Response(JSON.stringify({
          error: { message: "Customer status template is not approved", code: 132001 },
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      });
    } catch (error) {
      caught = error;
    }

    expect(caught instanceof Error).toBe(true);
    expect((caught as Error).message).toBe("Customer status template is not approved");
    expect(supabase.deliveryEvents.at(-1)?.status).toBe("failed");
  });
});
