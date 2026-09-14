import { createHash, createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient, loadStorePlanState } from "@/lib/api/supabase-route";
import { rateLimit } from "@/lib/rate-limit";
import { canExposePublicStorefront } from "@/lib/storefront-public-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STOCK_REQUESTER_WINDOW_MS = 60 * 60_000;
const STOCK_REQUESTER_LIMIT = 15;
const STOCK_STORE_WINDOW_MS = 60 * 60_000;
const STOCK_STORE_LIMIT = 250;
const STOCK_PRODUCT_WINDOW_MS = 60 * 60_000;
const STOCK_PRODUCT_LIMIT = 80;
const STOCK_EMAIL_WINDOW_MS = 24 * 60 * 60_000;
const STOCK_EMAIL_LIMIT = 3;

const stockNotificationSchema = z.object({
  storeId: z.string().uuid(),
  productId: z.string().uuid(),
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  website: z.string().max(200).optional().default(""),
});

type LimitResult = { success: boolean; reset: number };

type StockTruth = {
  store_id: string | null;
  stock: number;
  is_available: boolean;
};

export function parseStockNotificationInput(input: unknown) {
  return stockNotificationSchema.safeParse(input);
}

export function isStockNotificationEligible(product: StockTruth | null | undefined, storeId: string) {
  return Boolean(
    product
    && product.store_id === storeId
    && (product.stock <= 0 || product.is_available === false),
  );
}

export function getStockNotificationRequestIp(req: Request) {
  const forwarded = req.headers.get("x-vercel-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first ? first.slice(0, 64) : null;
}

export function hashStockLimiterValue(
  value: string,
  secret = process.env.STOCK_NOTIFICATION_RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY,
) {
  if (secret) return createHmac("sha256", secret).update(value).digest("hex");
  return createHash("sha256").update(`stock-notification-v1:${value}`).digest("hex");
}

export function buildStockNotificationRateLimitKeys(
  storeId: string,
  productId: string,
  email: string,
  requestIp: string | null,
) {
  const normalizedEmail = email.trim().toLowerCase();
  return {
    requester: `stock:requester:${storeId}:${hashStockLimiterValue(requestIp || "unknown")}`,
    store: `stock:store:${storeId}`,
    product: `stock:product:${storeId}:${productId}`,
    email: `stock:email:${storeId}:${productId}:${hashStockLimiterValue(normalizedEmail)}`,
  };
}

export function buildStockNotificationRateLimitResponse(results: LimitResult[]) {
  const blocked = results.filter((result) => !result.success);
  if (blocked.length === 0) return null;
  const resetAt = Math.max(...blocked.map((result) => result.reset));
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return { retryAfter, resetAt };
}

function rateLimitResponse(result: LimitResult) {
  const details = buildStockNotificationRateLimitResponse([result]);
  if (!details) return null;
  return NextResponse.json(
    { error: "Too many notification requests", ...details },
    { status: 429, headers: { "Retry-After": String(details.retryAfter) } },
  );
}

export const stockNotificationRouteDeps = {
  loadStorePlanState,
  getSupabaseAdminClient,
  rateLimit,
};

export async function POST(req: Request) {
  try {
    const parsed = parseStockNotificationInput(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid stock notification request" }, { status: 400 });
    }

    const { storeId, productId, email, website } = parsed.data;
    if (website) return NextResponse.json({ success: true }, { status: 201 });

    const supabaseAdmin = stockNotificationRouteDeps.getSupabaseAdminClient();
    const { data: storePlanState, error: storePlanError } = await stockNotificationRouteDeps.loadStorePlanState(
      supabaseAdmin as never,
      storeId,
      { includePublished: true },
    );
    if (storePlanError) throw storePlanError;
    if (!canExposePublicStorefront({
      isPublished: storePlanState?.isPublished ?? false,
      hasSubscription: Boolean(storePlanState?.subscription),
      planLive: storePlanState?.resolved.live ?? false,
    })) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id,store_id,stock,is_available")
      .eq("id", productId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (productError) throw productError;
    if (!product?.id) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (!isStockNotificationEligible(product as StockTruth, storeId)) {
      return NextResponse.json({ error: "Product is not eligible for stock notifications" }, { status: 409 });
    }

    const keys = buildStockNotificationRateLimitKeys(storeId, productId, email, getStockNotificationRequestIp(req));
    const limits: Array<[string, { limit: number; windowMs: number }]> = [
      [keys.requester, { limit: STOCK_REQUESTER_LIMIT, windowMs: STOCK_REQUESTER_WINDOW_MS }],
      [keys.store, { limit: STOCK_STORE_LIMIT, windowMs: STOCK_STORE_WINDOW_MS }],
      [keys.product, { limit: STOCK_PRODUCT_LIMIT, windowMs: STOCK_PRODUCT_WINDOW_MS }],
      [keys.email, { limit: STOCK_EMAIL_LIMIT, windowMs: STOCK_EMAIL_WINDOW_MS }],
    ];

    for (const [key, options] of limits) {
      const limitResult = await stockNotificationRouteDeps.rateLimit(key, options);
      const blocked = rateLimitResponse(limitResult);
      if (blocked) return blocked;
    }

    const { error: insertError } = await supabaseAdmin
      .from("stock_notifications")
      .insert({ store_id: storeId, product_id: productId, email, user_id: null, notified: false });

    if (insertError && insertError.code !== "23505") throw insertError;

    return NextResponse.json(
      { success: true, duplicate: insertError?.code === "23505" },
      { status: insertError?.code === "23505" ? 200 : 201 },
    );
  } catch (error) {
    console.error("Stock notification signup failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: "Failed to save stock notification" }, { status: 500 });
  }
}
