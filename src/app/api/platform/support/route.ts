import { createHash, createHmac, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { rateLimit } from "@/lib/rate-limit";
import { getRequestId, recordPlatformIncident } from "@/lib/platform/incident-logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORT_WINDOW_MS = 60 * 60_000;
const SUPPORT_REQUESTER_LIMIT = 8;
const SUPPORT_EMAIL_LIMIT = 5;

const supportTopicValues = [
  "pre_sales",
  "billing_subscription",
  "account_access",
  "privacy_data",
  "abuse_security",
  "other",
] as const;

const topicLabels: Record<(typeof supportTopicValues)[number], string> = {
  pre_sales: "Pre-sales question",
  billing_subscription: "Billing or subscription",
  account_access: "Account or access",
  privacy_data: "Privacy or data request",
  abuse_security: "Abuse or security report",
  other: "Other platform question",
};

const supportSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  topic: z.enum(supportTopicValues),
  message: z.string().trim().min(10).max(3000),
  website: z.string().max(200).optional().default(""),
});

type LimitResult = { success: boolean; reset: number };

function getSupportRequestIp(req: Request) {
  const forwarded = req.headers.get("x-vercel-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first ? first.slice(0, 64) : null;
}

function hashSupportLimiterValue(
  value: string,
  secret = process.env.SUPPORT_RATE_LIMIT_SALT
    || process.env.CONTACT_RATE_LIMIT_SALT
    || process.env.SUPABASE_SERVICE_ROLE_KEY,
) {
  if (secret) return createHmac("sha256", secret).update(value).digest("hex");
  return createHash("sha256").update(`platform-support-v1:${value}`).digest("hex");
}

function blockedResponse(result: LimitResult) {
  if (result.success) return null;
  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Too many support requests sent recently", retryAfter },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export const platformSupportRouteDeps = {
  getSupabaseAdminClient,
  rateLimit,
  recordPlatformIncident,
};

export async function POST(req: Request) {
  try {
    const parsed = supportSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid support request" }, { status: 400 });
    }

    const { name, email, topic, message, website } = parsed.data;
    if (website) {
      return NextResponse.json({ success: true, referenceId: "recorded" }, { status: 201 });
    }

    const requesterHash = hashSupportLimiterValue(getSupportRequestIp(req) || "unknown");
    const emailHash = hashSupportLimiterValue(email);

    const requesterLimit = await platformSupportRouteDeps.rateLimit(`platform-support:requester:${requesterHash}`, {
      limit: SUPPORT_REQUESTER_LIMIT,
      windowMs: SUPPORT_WINDOW_MS,
    });
    const requesterBlocked = blockedResponse(requesterLimit);
    if (requesterBlocked) return requesterBlocked;

    const emailLimit = await platformSupportRouteDeps.rateLimit(`platform-support:email:${emailHash}`, {
      limit: SUPPORT_EMAIL_LIMIT,
      windowMs: SUPPORT_WINDOW_MS,
    });
    const emailBlocked = blockedResponse(emailLimit);
    if (emailBlocked) return emailBlocked;

    const referenceId = `SUP-${randomUUID()}`;
    const persisted = await platformSupportRouteDeps.recordPlatformIncident(
      platformSupportRouteDeps.getSupabaseAdminClient(),
      {
        fingerprint: `public-support:${referenceId}`,
        severity: topic === "abuse_security" ? "warning" : "info",
        source: "public_support",
        title: `Public support: ${topicLabels[topic]}`,
        message,
        route: "/support",
        requestId: getRequestId(req),
        metadata: {
          reference_id: referenceId,
          requester_name: name,
          requester_email: email,
          topic,
          submitted_at: new Date().toISOString(),
        },
      },
    );

    if (!persisted) {
      return NextResponse.json({ error: "Could not record support request" }, { status: 500 });
    }

    return NextResponse.json({ success: true, referenceId }, { status: 201 });
  } catch (error) {
    console.error("Platform support submission failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: "Could not record support request" }, { status: 500 });
  }
}
