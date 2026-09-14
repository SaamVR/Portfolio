import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdminClient, loadStorePlanState } from "@/lib/api/supabase-route";
import { rateLimit } from "@/lib/rate-limit";
import { canExposePublicStorefront } from "@/lib/storefront-public-access";
import { buildAuthoritativeRecoveryCart, normalizeRecoveryCartInput } from "@/lib/cart-recovery/recovery-cart-authority";
import {
  resolveRecoveryContactAuthority,
  type RecoveryConsentStatus,
} from "@/lib/cart-recovery/recovery-contact-authority";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxBodyBytes = 18_000;
const maxMetadataBytes = 6_000;

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
    const requestedConsent = readText(body?.contactConsentStatus, 16);
    const requestedConsentStatus = (["accepted", "declined", "unknown"].includes(requestedConsent)
      ? requestedConsent
      : "unknown") as RecoveryConsentStatus;
    const cartInput = normalizeRecoveryCartInput(body?.cartSnapshot);
    if (!cartInput) {
      return NextResponse.json({ error: "Cart snapshot contains invalid items" }, { status: 400 });
    }
    const metadata = body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? body.metadata as Record<string, unknown>
      : {};

    if (!visitorIdRaw && !sessionIdRaw) {
      return NextResponse.json({ error: "Missing recovery identifiers" }, { status: 400 });
    }

    if (jsonSize(metadata) > maxMetadataBytes || jsonSize(cartInput) > maxMetadataBytes) {
      return NextResponse.json({ error: "Recovery payload is too large" }, { status: 413 });
    }

    const supabaseAdmin = cartRecoveryLeadRouteDeps.getSupabaseAdminClient();
    const authUser = await cartRecoveryLeadRouteDeps.getAuthenticatedUser(req);
    const contactAuthority = resolveRecoveryContactAuthority({
      requestedConsentStatus,
      authUser,
    });

    if (contactAuthority.canScheduleEmail && authUser?.id) {
      const contactLimit = await cartRecoveryLeadRouteDeps.rateLimit(
        `cart_recovery_contact:${storeId}:${authUser.id}`,
        { limit: 6, windowMs: 60 * 60_000 },
      );
      if (!contactLimit.success) {
        return NextResponse.json({ error: "Too many recovery contact requests" }, { status: 429 });
      }
    }

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

    const productIds = Array.from(new Set(cartInput.map((item) => item.productId)));
    let products: Array<{ id: string; name: string; price: number; is_available: boolean }> = [];
    if (productIds.length > 0) {
      const { data, error: productsError } = await supabaseAdmin
        .from("products")
        .select("id, name, price, is_available")
        .eq("store_id", storeId)
        .in("id", productIds);

      if (productsError) throw productsError;
      products = (data ?? []) as typeof products;
    }

    const authoritativeCart = buildAuthoritativeRecoveryCart(cartInput, products);
    if (!authoritativeCart) {
      return NextResponse.json({ error: "Cart snapshot contains unavailable or outside-store products" }, { status: 400 });
    }

    const visitorId = visitorIdRaw ? hashRecoveryIdentifier(storeId, visitorIdRaw) : null;
    const sessionId = sessionIdRaw ? hashRecoveryIdentifier(storeId, sessionIdRaw) : null;
    const contact = body?.contact && typeof body.contact === "object" && !Array.isArray(body.contact)
      ? body.contact as Record<string, unknown>
      : {};
    const contactName = contactAuthority.canScheduleEmail ? readText(contact.name, 100) || null : null;
    const contactEmail = contactAuthority.contactEmail;
    // Automated WhatsApp recovery is disabled. Do not persist a browser-supplied
    // phone as future delivery authority while there is no verified phone contract.
    const contactPhone = null;
    const attribution = body?.attribution && typeof body.attribution === "object" && !Array.isArray(body.attribution)
      ? body.attribution as Record<string, unknown>
      : {};

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
    const subtotal = authoritativeCart.cartValue;
    const itemCount = authoritativeCart.itemCount;
    const cartSnapshot = authoritativeCart.snapshot;
    const nextContactAt = contactAuthority.canScheduleEmail && !existingLead?.marketing_opt_out_at
      ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      : null;

    const leadPayload = {
      store_id: storeId,
      user_id: authUser?.id ?? null,
      visitor_id: visitorId,
      session_id: sessionId,
      contact_name: contactAuthority.canScheduleEmail ? (contactName ?? existingLead?.contact_name ?? null) : null,
      contact_email: contactAuthority.canScheduleEmail ? contactEmail : null,
      contact_phone: contactPhone,
      contact_capture_source: readText(body?.contactCaptureSource, 20) || leadStage || "cart",
      contact_consent_status: contactAuthority.consentStatus,
      cart_snapshot: cartSnapshot,
      cart_value: subtotal,
      item_count: itemCount,
      status: existingLead?.marketing_opt_out_at ? "opted_out" : (itemCount > 0 ? "abandoned" : "active"),
      abandonment_window_minutes: 60,
      recovery_stage: leadStage === "checkout" ? "checkout" : "cart",
      abandoned_at: itemCount > 0 ? now : null,
      last_activity_at: now,
      next_contact_at: nextContactAt,
      attribution_source: readText(attribution.source, 120) || null,
      attribution_medium: readText(attribution.medium, 120) || null,
      attribution_campaign: readText(attribution.campaign, 160) || null,
      metadata: {
        ...metadata,
        recovery_contact_authority: contactAuthority.authority,
      },
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
