import { NextResponse } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";
import { normalizeCartRecoverySettings } from "@/lib/admin/merchant-growth-settings";
import { isRecoveryCouponUsable, normalizeRecoveryCouponCode } from "@/lib/cart-recovery/recovery-coupon";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxQueueBodyBytes = 16_000;

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > maxQueueBodyBytes) {
      return NextResponse.json({ error: "Recovery queue payload is too large" }, { status: 413 });
    }

    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, "utf8") > maxQueueBodyBytes) {
      return NextResponse.json({ error: "Recovery queue payload is too large" }, { status: 413 });
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

    const storeId = typeof body.storeId === "string" ? body.storeId.trim() : "";
    const settings = body.settings;
    if (!uuidPattern.test(storeId)) {
      return NextResponse.json({ error: "Invalid storeId" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const authorized = await canManageStore(supabaseAdmin, storeId, user.id, ["owner", "admin", "editor"]);
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const normalized = normalizeCartRecoverySettings(settings);
    const nowIso = new Date().toISOString();
    const { data: leads, error: leadError } = await (supabaseAdmin as any)
      .from("store_cart_recovery_leads")
      .select("id, contact_email, contact_phone, status, recovery_stage, next_contact_at, recovery_coupon_code, cart_value")
      .eq("store_id", storeId)
      .eq("contact_consent_status", "accepted")
      .in("status", ["abandoned", "contacted", "active"])
      .lte("next_contact_at", nowIso)
      .order("next_contact_at", { ascending: true })
      .limit(normalized.dailyQueueLimit);

    if (leadError) throw leadError;

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ queuedCount: 0 });
    }

    const leadIds = leads.map((lead: { id: string }) => lead.id);
    const { data: existingMessages, error: messageError } = await (supabaseAdmin as any)
      .from("store_cart_recovery_messages")
      .select("lead_id, retry_count")
      .eq("store_id", storeId)
      .in("lead_id", leadIds);

    if (messageError) throw messageError;

    const touchCounts = new Map<string, number>();
    for (const message of existingMessages ?? []) {
      const count = touchCounts.get(message.lead_id) ?? 0;
      touchCounts.set(message.lead_id, count + 1);
    }

    const dueLeads = (leads ?? []).filter((lead: any) => {
      const touches = touchCounts.get(lead.id) ?? 0;
      const hasDeliverableEmail = Boolean(lead.contact_email);
      return hasDeliverableEmail && touches < normalized.maxTouchesPerLead;
    });

    if (dueLeads.length === 0) {
      return NextResponse.json({ queuedCount: 0 });
    }

    const candidateCodes = Array.from(new Set(
      dueLeads
        .map((lead: any) => normalizeRecoveryCouponCode(lead.recovery_coupon_code))
        .filter((code): code is string => Boolean(code)),
    ));
    const couponByCode = new Map<string, Record<string, unknown>>();

    if (candidateCodes.length > 0) {
      const { data: coupons, error: couponError } = await (supabaseAdmin as any)
        .from("coupon_codes")
        .select("code, is_active, expires_at, max_uses, uses_count, min_order")
        .eq("store_id", storeId)
        .in("code", candidateCodes);
      if (couponError) throw couponError;

      for (const coupon of coupons ?? []) {
        const code = normalizeRecoveryCouponCode(coupon.code);
        if (code) couponByCode.set(code, coupon);
      }
    }

    const queuedAt = new Date();
    const nextContactAt = new Date(queuedAt.getTime() + normalized.cooldownHours * 60 * 60 * 1000).toISOString();
    const queuedLeads = dueLeads.map((lead: any) => {
      const candidateCode = normalizeRecoveryCouponCode(lead.recovery_coupon_code);
      const coupon = candidateCode ? couponByCode.get(candidateCode) : null;
      const couponCode = candidateCode && isRecoveryCouponUsable(coupon, lead.cart_value, queuedAt.getTime())
        ? candidateCode
        : null;
      return { lead, couponCode };
    });

    const inserts = queuedLeads.map(({ lead, couponCode }) => {
      return {
        store_id: storeId,
        lead_id: lead.id,
        channel: "email",
        template_key: "recovery-sequence",
        status: "queued",
        retry_count: 0,
        scheduled_for: lead.next_contact_at,
        next_retry_at: null,
        coupon_code: couponCode,
        metadata: {
          queued_by: user.id,
          queue_reason: "due_follow_up",
        },
      };
    });

    const { error: insertError } = await (supabaseAdmin as any)
      .from("store_cart_recovery_messages")
      .upsert(inserts, {
        onConflict: "store_id,lead_id,scheduled_for",
        ignoreDuplicates: true,
      });
    if (insertError) throw insertError;

    for (const { lead, couponCode } of queuedLeads) {
      const { error: updateError } = await (supabaseAdmin as any)
        .from("store_cart_recovery_leads")
        .update({
          status: "contacted",
          recovery_stage: "sequence",
          last_contact_at: queuedAt.toISOString(),
          next_contact_at: nextContactAt,
          recovery_coupon_code: couponCode,
        })
        .eq("id", lead.id)
        .eq("store_id", storeId);
      if (updateError) throw updateError;
    }

    return NextResponse.json({ queuedCount: dueLeads.length, nextContactAt });
  } catch (error) {
    console.error("Cart recovery queue error:", error);
    return NextResponse.json({ error: "Failed to queue recovery follow-ups" }, { status: 500 });
  }
}
