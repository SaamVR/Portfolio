import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { hasCompleteBkashSecrets } from "@/lib/payments/merchant-connections";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export const storePaymentSettingsRouteDeps = {
  getSupabaseAdminClient,
};

export async function GET(req: Request) {
  const storeId = new URL(req.url).searchParams.get("storeId")?.trim() ?? "";

  if (!uuidPattern.test(storeId)) {
    return NextResponse.json({ error: "Invalid store" }, { status: 400 });
  }

  try {
    const supabaseAdmin = storePaymentSettingsRouteDeps.getSupabaseAdminClient();
    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id, is_published")
      .eq("id", storeId)
      .maybeSingle();

    if (storeError) throw storeError;
    if (!store?.is_published) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const [{ data, error }, { data: connection, error: connectionError }] = await Promise.all([
      supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("store_id", storeId)
      .eq("key", "payment_settings")
        .maybeSingle(),
      (supabaseAdmin as any)
        .from("store_payment_connections_secure")
        .select("status, secret_payload")
        .eq("store_id", storeId)
        .eq("provider", "bkash")
        .maybeSingle(),
    ]);

    if (error) throw error;
    if (connectionError) throw connectionError;

    const value = (data?.value ?? {}) as Record<string, unknown>;
    const bkashGatewayEnabled = connection?.status === "connected" && hasCompleteBkashSecrets(connection.secret_payload);
    return NextResponse.json({
      bkash_enabled: asBoolean(value.bkash_enabled),
      nagad_enabled: asBoolean(value.nagad_enabled),
      cod_enabled: asBoolean(value.cod_enabled, true),
      bkash_number: asString(value.bkash_number),
      nagad_number: asString(value.nagad_number),
      prepaid_badge_text: asString(value.prepaid_badge_text, ""),
      prepayment_discount_type: asString(value.prepayment_discount_type, "none"),
      prepayment_discount_value: asNumber(value.prepayment_discount_value),
      bkash_gateway_enabled: bkashGatewayEnabled,
    });
  } catch (error) {
    console.error("Public payment settings error:", error);
    return NextResponse.json({ error: "Failed to load payment settings" }, { status: 500 });
  }
}
