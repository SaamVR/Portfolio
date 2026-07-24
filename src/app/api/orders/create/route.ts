import { NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { rateLimit } from "@/lib/rate-limit";
import { triggerWhatsAppOrderNotify } from "@/lib/cms/whatsapp-order-notify";
import { normalizeOrderItems } from "@/lib/cms/order-input";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedPaymentMethods = new Set(["bkash", "bkash_manual", "nagad", "cod"]);

function getClientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function readText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function readMoney(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount));
}

function mapOrderError(message: string) {
  if (/cart|client_request_id|coupon|invalid|items|product|quantity|stock|required/i.test(message)) {
    return { message, status: 400 };
  }

  return { message: "Failed to create order", status: 500 };
}

export async function POST(req: Request) {
  try {
    const limit = rateLimit(`order_create:${getClientIp(req)}`, {
      limit: 12,
      windowMs: 60_000,
    });

    if (!limit.success) {
      return NextResponse.json({ error: "Too many order attempts. Please wait a minute." }, { status: 429 });
    }

    const body = await req.json();
    const storeId = readText(body?.storeId, 80);
    const idempotencyKey = readText(body?.idempotencyKey, 120);
    const paymentMethod = readText(body?.paymentMethod, 30);
    const customerName = readText(body?.customerName, 100);
    const customerPhone = readText(body?.customerPhone, 30);
    const customerEmail = readText(body?.customerEmail, 180);
    const shippingAddress = readText(body?.shippingAddress, 500);
    const shippingCity = readText(body?.shippingCity, 100);

    if (!uuidPattern.test(storeId)) {
      return NextResponse.json({ error: "Invalid store" }, { status: 400 });
    }

    if (!idempotencyKey) {
      return NextResponse.json({ error: "Missing idempotency key" }, { status: 400 });
    }

    if (!customerName || !customerPhone || !shippingAddress || !shippingCity) {
      return NextResponse.json({ error: "Missing required customer or shipping fields" }, { status: 400 });
    }

    if (!allowedPaymentMethods.has(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const items = normalizeOrderItems(body?.items);
    const user = await getAuthenticatedUser(req);
    const supabaseAdmin = getSupabaseAdminClient();

    const { data, error } = await (supabaseAdmin as any).rpc("create_store_order_with_stock", {
      _store_id: storeId,
      _client_request_id: idempotencyKey,
      _user_id: user?.id ?? null,
      _items: items,
      _delivery_fee: readMoney(body?.deliveryFee),
      _discount_amount: readMoney(body?.discountAmount),
      _customer_name: customerName,
      _customer_phone: customerPhone,
      _customer_email: customerEmail || null,
      _shipping_address: shippingAddress,
      _shipping_city: shippingCity,
      _payment_method: paymentMethod,
      _notes: readText(body?.notes, 1000) || null,
      _coupon_code: readText(body?.couponCode, 80) || null,
    });

    if (error) {
      const mapped = mapOrderError(error.message || "");
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }

    const order = Array.isArray(data) ? data[0] : data;
    if (!order?.order_number) {
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // Fail-safe WhatsApp order notification for merchant
    void triggerWhatsAppOrderNotify(supabaseAdmin, {
      store_id: storeId,
      order_id: order.id,
      order_number: order.order_number,
      customer_name: customerName,
      customer_phone: customerPhone,
      shipping_address: shippingAddress,
      shipping_city: shippingCity,
      total: Number(order.total ?? 0),
      items: order.items || items,
    });

    return NextResponse.json({ order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create order";
    const mapped = mapOrderError(message);
    console.error("Order create error:", error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
