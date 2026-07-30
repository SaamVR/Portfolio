import { NextResponse } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";
import { normalizeCartRecoverySettings } from "@/lib/admin/merchant-growth-settings";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeId, settings } = await req.json();
    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
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
      .select("id, contact_email, contact_phone, status, recovery_stage, next_contact_at, recovery_coupon_code")
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
      const hasContactPath = Boolean(lead.contact_email || lead.contact_phone);
      return hasContactPath && touches < normalized.maxTouchesPerLead;
    });

    if (dueLeads.length === 0) {
      return NextResponse.json({ queuedCount: 0 });
    }

    const queuedAt = new Date();
    const nextContactAt = new Date(queuedAt.getTime() + normalized.cooldownHours * 60 * 60 * 1000).toISOString();
    const inserts = dueLeads.map((lead: any) => {
      const preferredChannel = normalized.preferredChannel === "smart"
        ? (lead.contact_phone ? "whatsapp" : "email")
        : normalized.preferredChannel;
      const couponCode = lead.recovery_coupon_code || `${normalized.couponPrefix}-${lead.id.slice(0, 6).toUpperCase()}`;

      return {
        store_id: storeId,
        lead_id: lead.id,
        channel: preferredChannel,
        template_key: "recovery-sequence",
        status: "queued",
        retry_count: 0,
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
      .insert(inserts);
    if (insertError) throw insertError;

    for (const lead of dueLeads) {
      const couponCode = lead.recovery_coupon_code || `${normalized.couponPrefix}-${lead.id.slice(0, 6).toUpperCase()}`;
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
