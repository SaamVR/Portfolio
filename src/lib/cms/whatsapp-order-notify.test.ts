import { describe, expect, it } from "@/test/test-utils";
import {
  formatWhatsAppMessage,
  generateWaMeUrl,
  triggerWhatsAppOrderNotify,
  type WhatsAppNotifyPayload,
} from "@/lib/cms/whatsapp-order-notify";

describe("whatsapp-order-notify edge function helper", () => {
  const samplePayload: WhatsAppNotifyPayload = {
    store_id: "store_123",
    order_id: "ord_abc789",
    order_number: "10042",
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

  it("formats the WhatsApp merchant notification message with all required order details", () => {
    const adminLink = "https://app.ezcomo.shop/admin/orders";
    const message = formatWhatsAppMessage(samplePayload, adminLink);

    expect(message.includes("*Order Number:* #10042")).toBe(true);
    expect(message.includes("*Customer:* Tanvir Hossain (01711223344)")).toBe(true);
    expect(message.includes("• 1x Premium Panjabi (L) - ৳2500")).toBe(true);
    expect(message.includes("• 1x Cotton Pajama (L) - ৳950")).toBe(true);
    expect(message.includes("*Total:* ৳3450")).toBe(true);
    expect(message.includes("*Delivery Address:* Flat 4B, House 12, Road 5, Dhanmondi, Dhaka")).toBe(true);
    expect(message.includes(`🔗 *Admin Link:* ${adminLink}`)).toBe(true);
  });

  it("generates wa.me click-to-chat URL with sanitized recipient digits", () => {
    const rawNumber = "+880 1711-223344";
    const text = "Hello merchant";
    const url = generateWaMeUrl(rawNumber, text);

    expect(url).toBe("https://wa.me/8801711223344?text=Hello%20merchant");
  });

  it("ensures triggerWhatsAppOrderNotify is fail-safe when Edge Function invocation rejects", async () => {
    const failingSupabaseMock = {
      functions: {
        invoke: async () => {
          throw new Error("Network timeout or function crash");
        },
      },
    };

    let errorThrown = false;
    try {
      await triggerWhatsAppOrderNotify(failingSupabaseMock, samplePayload);
    } catch {
      errorThrown = true;
    }

    expect(errorThrown).toBe(false);
  });
});
