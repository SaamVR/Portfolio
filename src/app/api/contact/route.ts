import { createHash, createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient, loadStorePlanState } from "@/lib/api/supabase-route";
import { rateLimit } from "@/lib/rate-limit";
import { canExposePublicStorefront } from "@/lib/storefront-public-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTACT_WINDOW_MS = 60 * 60_000;
const CONTACT_REQUESTER_LIMIT = 12;
const CONTACT_EMAIL_LIMIT = 5;

const contactSchema = z.object({
  storeId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  message: z.string().trim().min(10).max(2000),
  website: z.string().max(200).optional().default(""),
});

type LimitResult = {
  success: boolean;
  reset: number;
};

export function getContactRequestIp(req: Request) {
  const forwarded = req.headers.get("x-vercel-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first ? first.slice(0, 64) : null;
}

export function hashContactLimiterValue(value: string, secret = process.env.CONTACT_RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY) {
  if (secret) {
    return createHmac("sha256", secret).update(value).digest("hex");
  }
  return createHash("sha256").update(`contact-v1:${value}`).digest("hex");
}

export function buildContactRateLimitKeys(storeId: string, email: string, requestIp: string | null) {
  const normalizedEmail = email.trim().toLowerCase();
  const requester = requestIp || "unknown";
  return {
    requester: `contact:requester:${storeId}:${hashContactLimiterValue(requester)}`,
    email: `contact:email:${storeId}:${hashContactLimiterValue(normalizedEmail)}`,
  };
}

export function buildContactRateLimitResponse(results: LimitResult[]) {
  const blocked = results.filter((result) => !result.success);
  if (blocked.length === 0) return null;

  const resetAt = Math.max(...blocked.map((result) => result.reset));
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return { retryAfter, resetAt };
}

function rateLimitResponse(result: LimitResult) {
  const details = buildContactRateLimitResponse([result]);
  if (!details) return null;
  return NextResponse.json(
    { error: "Too many messages sent recently", ...details },
    { status: 429, headers: { "Retry-After": String(details.retryAfter) } },
  );
}

export const contactRouteDeps = {
  loadStorePlanState,
  getSupabaseAdminClient,
  rateLimit,
};

export async function POST(req: Request) {
  try {
    const parsed = contactSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid contact message" }, { status: 400 });
    }

    const { storeId, name, email, message, website } = parsed.data;
    if (website) {
      return NextResponse.json({ success: true }, { status: 201 });
    }

    const supabaseAdmin = contactRouteDeps.getSupabaseAdminClient();
    const { data: storePlanState, error: storePlanError } = await contactRouteDeps.loadStorePlanState(
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

    const keys = buildContactRateLimitKeys(storeId, email, getContactRequestIp(req));
    const requesterLimit = await contactRouteDeps.rateLimit(keys.requester, {
      limit: CONTACT_REQUESTER_LIMIT,
      windowMs: CONTACT_WINDOW_MS,
    });
    const requesterBlocked = rateLimitResponse(requesterLimit);
    if (requesterBlocked) return requesterBlocked;

    const emailLimit = await contactRouteDeps.rateLimit(keys.email, {
      limit: CONTACT_EMAIL_LIMIT,
      windowMs: CONTACT_WINDOW_MS,
    });
    const emailBlocked = rateLimitResponse(emailLimit);
    if (emailBlocked) return emailBlocked;

    const { error } = await supabaseAdmin.from("contact_messages").insert({
      store_id: storeId,
      name,
      email,
      message,
    });
    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Contact submission failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
