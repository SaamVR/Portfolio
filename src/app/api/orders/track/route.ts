import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { rateLimit } from "@/lib/rate-limit";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxBodyBytes = 4_096;
const genericLookupError = "Unable to verify order";

export const orderTrackRouteDeps = {
  getSupabaseAdminClient,
  rateLimit,
};

function readText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function getClientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

export function normalizeTrackingPhone(value: unknown) {
  const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  if (digits.startsWith("00880") && digits.length === 15) {
    return `0${digits.slice(5)}`;
  }
  if (digits.startsWith("880") && digits.length === 13) {
    return `0${digits.slice(3)}`;
  }
  if (digits.startsWith("1") && digits.length === 10) {
    return `0${digits}`;
  }
  return digits;
}

function readMoney(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
}

function readQuantity(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(1, Math.round(amount)) : 1;
}

function sanitizeItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      name: readText(record.name, 180) || "Item",
      price: readMoney(record.price),
      size: readText(record.size, 120) || "Free Size",
      quantity: readQuantity(record.quantity),
    };
  });
}

function noStoreJson(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  try {
    const limit = await orderTrackRouteDeps.rateLimit(`order_track:${getClientIp(req)}`, {
      limit: 12,
      windowMs: 60_000,
    });

    if (!limit.success) {
      return noStoreJson({ error: "Too many tracking attempts" }, 429);
    }

    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, "utf8") > maxBodyBytes) {
      return noStoreJson({ error: "Tracking request is too large" }, 413);
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody || "{}") as Record<string, unknown>;
    } catch {
      return noStoreJson({ error: "Invalid tracking details" }, 400);
    }

    const storeId = readText(body.storeId, 80);
    const orderNumber = readText(body.orderNumber, 80).toUpperCase();
    const phone = normalizeTrackingPhone(body.phone);

    if (!uuidPattern.test(storeId) || !orderNumber || phone.length < 8 || phone.length > 15) {
      return noStoreJson({ error: "Invalid tracking details" }, 400);
    }

    const supabaseAdmin = orderTrackRouteDeps.getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, status, items, subtotal, delivery_fee, total, payment_method, created_at, customer_phone")
      .eq("store_id", storeId)
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (error) throw error;

    if (!data || normalizeTrackingPhone(data.customer_phone) !== phone) {
      return noStoreJson({ error: genericLookupError }, 404);
    }

    return noStoreJson({
      order: {
        id: String(data.id),
        order_number: readText(data.order_number, 80),
        status: readText(data.status, 40),
        items: sanitizeItems(data.items),
        subtotal: readMoney(data.subtotal),
        delivery_fee: readMoney(data.delivery_fee),
        total: readMoney(data.total),
        payment_method: readText(data.payment_method, 40),
        created_at: readText(data.created_at, 80),
      },
    }, 200);
  } catch (error) {
    console.error("Guest order tracking error:", error);
    return noStoreJson({ error: "Unable to track order right now" }, 500);
  }
}
