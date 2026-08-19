import { describe, expect, it } from "@/test/test-utils";
import {
  buildWhatsAppCloudTemplateRequest,
  formatWhatsAppMessage,
  generateWaMeUrl,
  normalizeWhatsAppRecipient,
  resolveWhatsAppCloudConfig,
  triggerWhatsAppOrderNotify,
  type WhatsAppNotifyPayload,
} from "@/lib/cms/whatsapp-order-notify";

function createSupabaseMock(number = "01711223344") {
  const deliveryEvents: Record<string, unknown>[] = [];

  return {
    deliveryEvents,
    client: {
      from(table: string) {
        if (table === "site_settings") {
          const chain: {
            select: () => typeof chain;
            eq: () => typeof chain;
            maybeSingle: () => Promise<{
              data: { value: { enabled: boolean; number: string } };
              error: null;
            }>;
          } = {
            select: () => chain,
            eq: () => chain,
            maybeSingle: async () => ({
              data: {
                value: {
                  enabled: true,
                  number,
                },
              },
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

describe("whatsapp-order-notify helper", () => {
  const samplePayload: WhatsAppNotifyPayload = {
    store_id: "store_123",
    order_id: "ord_abc789",
    order_number: "10042",
    store_name: "ThreadBD",
    customer_name: "Tanvir Hossain",
    customer_phone: "01711223344",
    shipping_address: "Flat 4B, House 12, Road 5, Dhanmondi",
    shipping_city: "Dhaka",
    total: 3450,
    items: [
      { name: "Premium Panjabi", size: "L", quantity: 1, price: 2500 },
      { name: "Cotton Pajama", size: "L", quantity: 1, price: 950 },
    ],
  };

  it("formats the merchant notification message with all required order details", () => {
    const adminLink = "https://ezcomo.shop/admin/orders";
    const message = formatWhatsAppMessage(samplePayload, adminLink);

    expect(message.includes("*Order Number:* #10042")).toBe(true);
    expect(message.includes("*Customer:* Tanvir Hossain (01711223344)")).toBe(true);
    expect(message.includes("- 1x Premium Panjabi [Option: L] - BDT 2500")).toBe(true);
    expect(message.includes("- 1x Cotton Pajama [Option: L] - BDT 950")).toBe(true);
    expect(message.includes("*Total:* BDT 3450")).toBe(true);
    expect(message.includes("*Delivery Address:* Flat 4B, House 12, Road 5, Dhanmondi, Dhaka")).toBe(true);
    expect(message.includes(`*Admin Link:* ${adminLink}`)).toBe(true);
  });

  it("generates wa.me click-to-chat URL with sanitized recipient digits", () => {
    const url = generateWaMeUrl("+880 1711-223344", "Hello merchant");
    expect(url).toBe("https://wa.me/8801711223344?text=Hello%20merchant");
  });

  it("normalizes local Bangladesh mobile numbers for Cloud API delivery", () => {
    expect(normalizeWhatsAppRecipient("01711-223344")).toBe("8801711223344");
    expect(normalizeWhatsAppRecipient("+8801711223344")).toBe("8801711223344");
    expect(normalizeWhatsAppRecipient("008801711223344")).toBe("8801711223344");
  });

  it("requires explicit Cloud API credentials and template configuration", () => {
    expect(resolveWhatsAppCloudConfig({})).toBe(null);

    const config = resolveWhatsAppCloudConfig({
      WHATSAPP_CLOUD_ACCESS_TOKEN: "test-token",
      WHATSAPP_CLOUD_PHONE_NUMBER_ID: "123456789",
      WHATSAPP_MERCHANT_ORDER_TEMPLATE_NAME: "ezcomo_new_order",
    });

    expect(config?.graphVersion).toBe("v25.0");
    expect(config?.templateLanguage).toBe("en_US");
    expect(config?.defaultCountryCode).toBe("880");
  });

  it("builds the approved-template request using the documented eight body parameters", () => {
    const config = resolveWhatsAppCloudConfig({
      WHATSAPP_CLOUD_ACCESS_TOKEN: "test-token",
      WHATSAPP_CLOUD_PHONE_NUMBER_ID: "123456789",
      WHATSAPP_MERCHANT_ORDER_TEMPLATE_NAME: "ezcomo_new_order",
      WHATSAPP_MERCHANT_ORDER_TEMPLATE_LANGUAGE: "en_US",
    });
    if (!config) throw new Error("Expected test config");

    const request = buildWhatsAppCloudTemplateRequest(
      samplePayload,
      "8801711223344",
      config,
      "https://ezcomo.shop/admin/orders",
    );

    expect(request.to).toBe("8801711223344");
    expect(request.type).toBe("template");
    expect(request.template.name).toBe("ezcomo_new_order");
    expect(request.template.components[0].parameters.length).toBe(8);
    expect(request.template.components[0].parameters[0].text).toBe("ThreadBD");
    expect(request.template.components[0].parameters[1].text).toBe("#10042");
  });

  it("reports missing provider configuration as skipped instead of falsely sent", async () => {
    const supabase = createSupabaseMock();
    let requestCount = 0;

    const result = await triggerWhatsAppOrderNotify(supabase.client, samplePayload, {
      env: {
        NEXT_PUBLIC_APP_URL: "https://ezcomo.shop",
      },
      fetchImpl: async () => {
        requestCount += 1;
        throw new Error("Fetch should not run without provider configuration");
      },
    });

    expect(result.status).toBe("skipped");
    expect(result.provider).toBe("manual-wa-me");
    expect(requestCount).toBe(0);
    expect(supabase.deliveryEvents.at(-1)?.status).toBe("skipped");
    expect(supabase.deliveryEvents.at(-1)?.provider).toBe("manual-wa-me");
  });

  it("marks delivery sent only after Meta returns a WhatsApp message id", async () => {
    const supabase = createSupabaseMock();
    let requestedUrl = "";
    let authorization = "";

    const result = await triggerWhatsAppOrderNotify(supabase.client, samplePayload, {
      env: {
        NEXT_PUBLIC_APP_URL: "https://ezcomo.shop",
        WHATSAPP_CLOUD_ACCESS_TOKEN: "test-token",
        WHATSAPP_CLOUD_PHONE_NUMBER_ID: "123456789",
        WHATSAPP_MERCHANT_ORDER_TEMPLATE_NAME: "ezcomo_new_order",
        WHATSAPP_GRAPH_API_VERSION: "v25.0",
      },
      fetchImpl: async (input, init) => {
        requestedUrl = String(input);
        authorization = String((init?.headers as Record<string, string>)?.Authorization || "");
        return new Response(JSON.stringify({ messages: [{ id: "wamid.test-message" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });

    expect(result).toEqual({
      status: "sent",
      provider: "meta-cloud",
      recipient: "8801711223344",
      providerMessageId: "wamid.test-message",
    });
    expect(requestedUrl).toBe("https://graph.facebook.com/v25.0/123456789/messages");
    expect(authorization).toBe("Bearer test-token");
    expect(supabase.deliveryEvents.at(-1)?.status).toBe("sent");
    expect(supabase.deliveryEvents.at(-1)?.provider_message_id).toBe("wamid.test-message");
  });

  it("surfaces configured-provider failures so the background incident reporter can record them", async () => {
    const supabase = createSupabaseMock();
    let caught: unknown = null;

    try {
      await triggerWhatsAppOrderNotify(supabase.client, samplePayload, {
        env: {
          WHATSAPP_CLOUD_ACCESS_TOKEN: "test-token",
          WHATSAPP_CLOUD_PHONE_NUMBER_ID: "123456789",
          WHATSAPP_MERCHANT_ORDER_TEMPLATE_NAME: "ezcomo_new_order",
        },
        fetchImpl: async () => new Response(JSON.stringify({
          error: { message: "Template is not approved", code: 132001 },
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      });
    } catch (error) {
      caught = error;
    }

    expect(caught instanceof Error).toBe(true);
    expect((caught as Error).message).toBe("Template is not approved");
    expect(supabase.deliveryEvents.at(-1)?.status).toBe("failed");
  });
});
