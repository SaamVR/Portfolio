import { createHash } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { rateLimit } from "@/lib/rate-limit";
import { extractAttribution, inferPageType, isUuid, type AnalyticsEventName } from "@/lib/analytics/storefront-analytics";
import { jsonNoStore } from "@/lib/http/cache-control";

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
const maxBatchSize = 20;

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

type AnalyticsEventInput = Record<string, unknown>;
type AnalyticsEventRow = {
  store_id: string;
  customer_id: string | null;
  order_id: string | null;
  product_id: string | null;
  visitor_id: string | null;
  session_id: string | null;
  event_name: string;
  event_category: string;
  page_path: string | null;
  page_type: string | null;
  referrer: string | null;
  traffic_source: string | null;
  traffic_medium: string | null;
  traffic_campaign: string | null;
  traffic_term: string | null;
  traffic_content: string | null;
  search_query: string | null;
  order_number: string | null;
  quantity: number | null;
  value: number | null;
  currency_code: string;
  metadata: Record<string, unknown>;
  user_agent: string | null;
};

type BuildEventRowResult =
  | { ok: true; eventRow: AnalyticsEventRow }
  | { ok: false; error: { status: number; body: { error: string } } };

function readAnalyticsEvents(body: unknown) {
  if (Array.isArray(body)) return body.filter((value): value is AnalyticsEventInput => Boolean(value) && typeof value === "object");
  if (body && typeof body === "object" && Array.isArray((body as { events?: unknown[] }).events)) {
    return (body as { events: unknown[] }).events.filter((value): value is AnalyticsEventInput => Boolean(value) && typeof value === "object");
  }
  if (body && typeof body === "object") return [body as AnalyticsEventInput];
  return [];
}

function buildEventRow(event: AnalyticsEventInput, req: Request): BuildEventRowResult {
  const storeId = readText(event.storeId, 80);
  if (!isUuid(storeId)) {
    return { ok: false as const, error: { status: 400, body: { error: "Invalid store id" } } };
  }

  const pagePath = readText(event.pagePath, 500);
  const referrer = readText(event.referrer, 1000);
  const pageType = readText(event.pageType, 80) || inferPageType(pagePath);
  const eventName = readText(event.eventName, 80);
  if (!allowedAnalyticsEvents.has(eventName as AnalyticsEventName)) {
    return { ok: false as const, error: { status: 400, body: { error: "Unsupported analytics event" } } };
  }

  const metadata: Record<string, unknown> = event.metadata && typeof event.metadata === "object"
    ? event.metadata as Record<string, unknown>
    : {};
  if (jsonSize(metadata) > maxMetadataBytes) {
    return { ok: false as const, error: { status: 413, body: { error: "Analytics metadata is too large" } } };
  }

  const attribution = extractAttribution(
    new URLSearchParams(pagePath.split("?")[1] || ""),
    referrer,
    req.headers.get("host") || "",
  );

  return {
    ok: true as const,
    eventRow: {
      store_id: storeId,
      customer_id: isUuid(event.customerId) ? event.customerId : null,
      order_id: isUuid(event.orderId) ? event.orderId : null,
      product_id: isUuid(event.productId) ? event.productId : null,
      visitor_id: hashAnalyticsId(storeId, event.visitorId),
      session_id: hashAnalyticsId(storeId, event.sessionId),
      event_name: eventName,
      event_category: readText(event.eventCategory, 80) || "engagement",
      page_path: pagePath || null,
      page_type: pageType || null,
      referrer: referrer || null,
      traffic_source: readText(metadata.source, 120) || attribution.source || null,
      traffic_medium: readText(metadata.medium, 120) || attribution.medium || null,
      traffic_campaign: readText(metadata.campaign, 160) || attribution.campaign || null,
      traffic_term: readText(metadata.term, 160) || attribution.term || null,
      traffic_content: readText(metadata.content, 160) || attribution.content || null,
      search_query: readText(event.searchQuery, 240) || null,
      order_number: readText(event.orderNumber, 120) || null,
      quantity: readInteger(event.quantity),
      value: readInteger(event.value),
      currency_code: readText(event.currencyCode, 12) || "BDT",
      metadata,
      user_agent: readText(req.headers.get("user-agent"), 1000) || null,
    } satisfies AnalyticsEventRow,
  };
}

export async function POST(req: Request) {
  try {
    const limit = await analyticsTrackRouteDeps.rateLimit(`analytics_track:${getClientIp(req)}`, {
      limit: 120,
      windowMs: 60_000,
    });

    if (!limit.success) {
      return jsonNoStore({ error: "Too many analytics events" }, { status: 429 });
    }

    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
      return jsonNoStore({ error: "Analytics payload is too large" }, { status: 413 });
    }

    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, "utf8") > maxBodyBytes) {
      return jsonNoStore({ error: "Analytics payload is too large" }, { status: 413 });
    }

    const body = JSON.parse(rawBody || "{}");
    const events = readAnalyticsEvents(body);
    if (events.length === 0) {
      return jsonNoStore({ error: "Analytics payload is empty" }, { status: 400 });
    }
    if (events.length > maxBatchSize) {
      return jsonNoStore({ error: "Too many analytics events in one batch" }, { status: 413 });
    }

    const eventRows: AnalyticsEventRow[] = [];
    const productChecks = new Map<string, { storeId: string; productId: string }>();
    const orderChecks = new Map<string, { storeId: string; orderId: string }>();

    for (const event of events) {
      const built = buildEventRow(event, req);
      if (!built.ok) {
        return jsonNoStore(built.error.body, { status: built.error.status });
      }
      eventRows.push(built.eventRow);

      if (isUuid(event.productId)) {
        productChecks.set(`${built.eventRow.store_id}:${event.productId}`, {
          storeId: built.eventRow.store_id,
          productId: event.productId,
        });
      }

      if (isUuid(event.orderId)) {
        orderChecks.set(`${built.eventRow.store_id}:${event.orderId}`, {
          storeId: built.eventRow.store_id,
          orderId: event.orderId,
        });
      }
    }

    const supabaseAdmin = analyticsTrackRouteDeps.getSupabaseAdminClient();
    const distributedLimitOk = await checkDistributedRateLimit(
      supabaseAdmin as any,
      `${eventRows[0]?.store_id ?? "unknown"}:${getClientIp(req)}`,
    );
    if (!distributedLimitOk) {
      return jsonNoStore({ error: "Too many analytics events" }, { status: 429 });
    }

    for (const check of productChecks.values()) {
      const { data: product, error: productError } = await supabaseAdmin
        .from("products")
        .select("id")
        .eq("id", check.productId)
        .eq("store_id", check.storeId)
        .maybeSingle();
      if (productError) throw productError;
      if (!product) return jsonNoStore({ error: "Product does not belong to this store" }, { status: 400 });
    }

    for (const check of orderChecks.values()) {
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("id", check.orderId)
        .eq("store_id", check.storeId)
        .maybeSingle();
      if (orderError) throw orderError;
      if (!order) return jsonNoStore({ error: "Order does not belong to this store" }, { status: 400 });
    }

    const { error } = await (supabaseAdmin as any).from("store_analytics_events").insert(eventRows);
    if (error) {
      console.error("Analytics track insert error:", error);
      return jsonNoStore({ error: "Failed to save analytics event" }, { status: 500 });
    }

    return jsonNoStore({ ok: true, accepted: eventRows.length });
  } catch (error) {
    console.error("Analytics track route error:", error);
    return jsonNoStore({ error: "Failed to track analytics event" }, { status: 500 });
  }
}
