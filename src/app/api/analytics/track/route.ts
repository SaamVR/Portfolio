import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { rateLimit } from "@/lib/rate-limit";
import { extractAttribution, inferPageType, isUuid, type AnalyticsEventName } from "@/lib/analytics/storefront-analytics";

const allowedAnalyticsEvents = new Set<AnalyticsEventName | "purchase_item">([
  "page_view",
  "view_item",
  "quick_view_open",
  "search",
  "tag_click",
  "search_result_click",
  "filter_used",
  "sort_changed",
  "add_to_cart",
  "remove_from_cart",
  "cart_quantity_changed",
  "clear_cart",
  "view_cart",
  "begin_checkout",
  "purchase",
  "purchase_item",
  "track_order_search",
  "track_order_result",
  "add_to_wishlist",
  "remove_from_wishlist",
]);

const maxBodyBytes = 12_000;
const maxMetadataBytes = 4_096;

export const analyticsTrackRouteDeps = {
  getSupabaseAdminClient,
  rateLimit,
};

function getClientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

function readText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function readInteger(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed);
}

function jsonSize(value: unknown) {
  return Buffer.byteLength(JSON.stringify(value ?? {}), "utf8");
}

function hashAnalyticsId(storeId: string, value: unknown) {
  const text = readText(value, 160);
  if (!text) return null;
  const salt = process.env.ANALYTICS_ID_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "commerce-engine-analytics";
  return createHash("sha256").update(`${salt}:${storeId}:${text}`).digest("hex");
}

async function checkDistributedRateLimit(supabaseAdmin: any, identifier: string) {
  const now = new Date();
  const windowMs = 60_000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs).toISOString();
  const key = `analytics:${identifier}:${windowStart}`;
  const limit = 600;

  const { data, error } = await supabaseAdmin
    .from("store_analytics_ingestion_limits")
    .select("identifier, count, window_start")
    .eq("identifier", key)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const { error: insertError } = await supabaseAdmin
      .from("store_analytics_ingestion_limits")
      .insert({ identifier: key, window_start: windowStart, count: 1 });
    if (insertError && insertError.code !== "23505") throw insertError;
    return true;
  }

  if (Number(data.count) >= limit) return false;

  const { error: updateError } = await supabaseAdmin
    .from("store_analytics_ingestion_limits")
    .update({ count: Number(data.count) + 1, updated_at: now.toISOString() })
    .eq("identifier", key);
  if (updateError) throw updateError;
  return true;
}

export async function POST(req: Request) {
  try {
    const limit = analyticsTrackRouteDeps.rateLimit(`analytics_track:${getClientIp(req)}`, {
      limit: 120,
      windowMs: 60_000,
    });

    if (!limit.success) {
      return NextResponse.json({ error: "Too many analytics events" }, { status: 429 });
    }

    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
      return NextResponse.json({ error: "Analytics payload is too large" }, { status: 413 });
    }

    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, "utf8") > maxBodyBytes) {
      return NextResponse.json({ error: "Analytics payload is too large" }, { status: 413 });
    }

    const body = JSON.parse(rawBody || "{}");
    const storeId = readText(body?.storeId, 80);
    if (!isUuid(storeId)) {
      return NextResponse.json({ error: "Invalid store id" }, { status: 400 });
    }

    const pagePath = readText(body?.pagePath, 500);
    const referrer = readText(body?.referrer, 1000);
    const pageType = readText(body?.pageType, 80) || inferPageType(pagePath);
    const eventName = readText(body?.eventName, 80);
    if (!allowedAnalyticsEvents.has(eventName as AnalyticsEventName)) {
      return NextResponse.json({ error: "Unsupported analytics event" }, { status: 400 });
    }

    const metadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};
    if (jsonSize(metadata) > maxMetadataBytes) {
      return NextResponse.json({ error: "Analytics metadata is too large" }, { status: 413 });
    }

    const supabaseAdmin = analyticsTrackRouteDeps.getSupabaseAdminClient();
    const distributedLimitOk = await checkDistributedRateLimit(supabaseAdmin as any, `${storeId}:${getClientIp(req)}`);
    if (!distributedLimitOk) {
      return NextResponse.json({ error: "Too many analytics events" }, { status: 429 });
    }

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id, is_published")
      .eq("id", storeId)
      .maybeSingle();
    if (storeError) throw storeError;
    if (!store?.is_published) {
      return NextResponse.json({ error: "Storefront is not available for analytics" }, { status: 404 });
    }

    if (isUuid(body?.productId)) {
      const { data: product, error: productError } = await supabaseAdmin
        .from("products")
        .select("id")
        .eq("id", body.productId)
        .eq("store_id", storeId)
        .maybeSingle();
      if (productError) throw productError;
      if (!product) return NextResponse.json({ error: "Product does not belong to this store" }, { status: 400 });
    }

    if (isUuid(body?.orderId)) {
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("id", body.orderId)
        .eq("store_id", storeId)
        .maybeSingle();
      if (orderError) throw orderError;
      if (!order) return NextResponse.json({ error: "Order does not belong to this store" }, { status: 400 });
    }

    const attribution = extractAttribution(
      new URLSearchParams(pagePath.split("?")[1] || ""),
      referrer,
      req.headers.get("host") || "",
    );

    const eventRow = {
      store_id: storeId,
      customer_id: isUuid(body?.customerId) ? body.customerId : null,
      order_id: isUuid(body?.orderId) ? body.orderId : null,
      product_id: isUuid(body?.productId) ? body.productId : null,
      visitor_id: hashAnalyticsId(storeId, body?.visitorId),
      session_id: hashAnalyticsId(storeId, body?.sessionId),
      event_name: eventName,
      event_category: readText(body?.eventCategory, 80) || "engagement",
      page_path: pagePath || null,
      page_type: pageType || null,
      referrer: referrer || null,
      traffic_source: readText((metadata as Record<string, unknown>).source, 120) || attribution.source || null,
      traffic_medium: readText((metadata as Record<string, unknown>).medium, 120) || attribution.medium || null,
      traffic_campaign: readText((metadata as Record<string, unknown>).campaign, 160) || attribution.campaign || null,
      traffic_term: readText((metadata as Record<string, unknown>).term, 160) || attribution.term || null,
      traffic_content: readText((metadata as Record<string, unknown>).content, 160) || attribution.content || null,
      search_query: readText(body?.searchQuery, 240) || null,
      order_number: readText(body?.orderNumber, 120) || null,
      quantity: readInteger(body?.quantity),
      value: readInteger(body?.value),
      currency_code: readText(body?.currencyCode, 12) || "BDT",
      metadata,
      user_agent: readText(req.headers.get("user-agent"), 1000) || null,
    };

    const { error } = await (supabaseAdmin as any).from("store_analytics_events").insert(eventRow);
    if (error) {
      console.error("Analytics track insert error:", error);
      return NextResponse.json({ error: "Failed to save analytics event" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Analytics track route error:", error);
    return NextResponse.json({ error: "Failed to track analytics event" }, { status: 500 });
  }
}
