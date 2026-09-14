import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdminClient, loadStorePlanState } from "@/lib/api/supabase-route";
import { rateLimit } from "@/lib/rate-limit";
import { canExposePublicStorefront } from "@/lib/storefront-public-access";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxBodyBytes = 18_000;
const maxMetadataBytes = 6_000;

type RecoveryStatus = "accepted" | "declined" | "unknown";

export const cartRecoveryLeadRouteDeps = {
  loadStorePlanState,
  getSupabaseAdminClient,
  getAuthenticatedUser,
  rateLimit,
};

function readText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function readMoney(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount));
}

function readInteger(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount));
}

function getClientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

function jsonSize(value: unknown) {
  return Buffer.byteLength(JSON.stringify(value ?? {}), "utf8");
}

function hashRecoveryIdentifier(storeId: string, value: string) {
  const salt = process.env.ANALYTICS_ID_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "commerce-engine-recovery";
  return createHash("sha256").update(`${salt}:${storeId}:${value}`).digest("hex");
}

export async function POST(req: Request) {
  try {
    const limit = await cartRecoveryLeadRouteDeps.rateLimit(`cart_recovery:${getClientIp(req)}`, {
      limit: 45,
      windowMs: 60_000,
    });

    if (!limit.success) {
      return NextResponse.json({ error: "Too many cart recovery updates" }, { status: 429 });
    }

    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, "utf8") > maxBodyBytes) {
      return NextResponse.json({ error: "Recovery payload is too large" }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawBody || "{}");
      body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    const storeId = readText(body?.storeId, 80);
    if (!uuidPattern.test(storeId)) {
      return NextResponse.json({ error: "Invalid store" }, { status: 400 });
    }

    const visitorIdRaw = readText(body?.visitorId, 160);
    const sessionIdRaw = readText(body?.sessionId, 160);
    const leadStage = readText(body?.recoveryStage, 20) || "cart";
    const requestedConsentStatus = readText(body?.contactConsentStatus, 16);
    const consentStatus = (["accepted", "declined", "unknown"].includes(requestedConsentStatus)
      ? requestedConsentStatus
      : "unknown") as RecoveryStatus;
    const cartSnapshot = Array.isArray(body?.cartSnapshot) ? body.cartSnapshot.slice(0, 30) : [];
    const metadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};

    if (!visitorIdRaw && !sessionIdRaw) {
      return NextResponse.json({ error: "Missing recovery identifiers" }, { status: 400 });
    }

    if (jsonSize(metadata) > maxMetadataBytes || jsonSize(cartSnapshot) > maxMetadataBytes) {
      return NextResponse.json({ error: "Recovery payload is too large" }, { status: 413 });
    }

    const supabaseAdmin = cartRecoveryLeadRouteDeps.getSupabaseAdminClient();
    const authUser = await cartRecoveryLeadRouteDeps.getAuthenticatedUser(req);

    const { data: storePlanState, error: storePlanError } = await cartRecoveryLeadRouteDeps.loadStorePlanState(
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
      return NextResponse.json({ error: "Storefront is not available" }, { status: 404 });
    }

    const productIds = cartSnapshot
      .map((item) => readText((item as Record<string, unknown>)?.productId, 80))
      .filter((id) => uuidPattern.test(id));

    if (productIds.length > 0) {
      const { data: products, error: productsError } = await supabaseAdmin
        .from("products")
        .select("id")
        .eq("store_id", storeId)
        .in("id", productIds);

      if (productsError) throw productsError;

      const validProductIds = new Set((products ?? []).map((product) => product.id));
      if (productIds.some((id) => !validProductIds.has(id))) {
        return NextResponse.json({ error: "Cart snapshot contains products outside this store" }, { status: 400 });
      }
    }

    const visitorId = visitorIdRaw ? hashRecoveryIdentifier(storeId, visitorIdRaw) : null;
    const sessionId = sessionIdRaw ? hashRecoveryIdentifier(storeId, sessionIdRaw) : null;
    const canStoreContact = consentStatus === "accepted";
    const contact = body?.contact && typeof body.contact === "object" ? body.contact as Record<string, unknown> : {};
    const contactName = canStoreContact ? readText(contact.name, 100) || null : null;
    const contactEmail = canStoreContact ? readText(contact.email, 180) || null : null;
    const contactPhone = canStoreContact ? readText(contact.phone, 30) || null : null;
    const attribution = body?.attribution && typeof body.attribution === "object" ? body.attribution as Record<string, unknown> : {};

    let leadQuery = supabaseAdmin
      .from("store_cart_recovery_leads")
      .select("id, status, marketing_opt_out_at, last_contact_at, contact_name, contact_email, contact_phone, recovered_order_id, recovered_revenue")
      .eq("store_id", storeId)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (authUser?.id) {
      leadQuery = leadQuery.eq("user_id", authUser.id);
    } else if (sessionId) {
      leadQuery = leadQuery.eq("session_id", sessionId);
    } else {
      leadQuery = leadQuery.eq("visitor_id", visitorId);
    }

    const { data: existingLead, error: existingLeadError } = await leadQuery.maybeSingle();
    if (existingLeadError) {
      throw existingLeadError;
    }

    const now = new Date().toISOString();
    const subtotal = readMoney(body?.cartValue);
    const itemCount = readInteger(body?.itemCount) || cartSnapshot.reduce((sum, item) => {
      const quantity = Number((item as Record<string, unknown>)?.quantity ?? 0);
      return sum + (Number.isFinite(quantity) ? Math.max(0, Math.round(quantity)) : 0);
    }, 0);

    const nextContactAt = consentStatus === "accepted"
      ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      : null;

    const leadPayload = {
      store_id: storeId,
      user_id: authUser?.id ?? null,
      visitor_id: visitorId,
      session_id: sessionId,
      contact_name: contactName ?? existingLead?.contact_name ?? null,
      contact_email: contactEmail ?? existingLead?.contact_email ?? null,
      contact_phone: contactPhone ?? existingLead?.contact_phone ?? null,
      contact_capture_source: readText(body?.contactCaptureSource, 20) || leadStage || "cart",
      contact_consent_status: consentStatus,
      cart_snapshot: cartSnapshot,
      cart_value: subtotal,
      item_count: itemCount,
      status: existingLead?.marketing_opt_out_at ? "opted_out" : (itemCount > 0 ? "abandoned" : "active"),
      abandonment_window_minutes: 60,
      recovery_stage: leadStage === "checkout" ? "checkout" : "cart",
      abandoned_at: itemCount > 0 ? now : null,
      last_activity_at: now,
      next_contact_at: existingLead?.marketing_opt_out_at ? null : nextContactAt,
      attribution_source: readText(attribution.source, 120) || null,
      attribution_medium: readText(attribution.medium, 120) || null,
      attribution_campaign: readText(attribution.campaign, 160) || null,
      metadata,
    };

    const write = existingLead?.id
      ? await supabaseAdmin
          .from("store_cart_recovery_leads")
          .update(leadPayload)
          .eq("id", existingLead.id)
          .eq("store_id", storeId)
          .select("id")
          .maybeSingle()
      : await supabaseAdmin
          .from("store_cart_recovery_leads")
          .insert(leadPayload)
          .select("id")
          .maybeSingle();

    if (write.error) {
      throw write.error;
    }

    return NextResponse.json({ ok: true, leadId: write.data?.id ?? existingLead?.id ?? null });
  } catch (error) {
    console.error("Cart recovery lead route error:", error);
    return NextResponse.json({ error: "Failed to save recovery lead" }, { status: 500 });
  }
}
