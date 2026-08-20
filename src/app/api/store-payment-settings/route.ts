import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { listPaymentProviderManifests } from "@/lib/payments/provider-registry";
import { getPaymentProviderServerAdapter, type PaymentConnectionRow } from "@/lib/payments/provider-server";

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

    const redirectProviders = listPaymentProviderManifests().filter((manifest) =>
      manifest.runtimeStatus === "active"
      && manifest.checkoutMode === "redirect"
      && manifest.connectionRequired,
    );

    const [settingsResult, ...connectionResults] = await Promise.all([
      supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("store_id", storeId)
        .eq("key", "payment_settings")
        .maybeSingle(),
      ...redirectProviders.map((manifest) =>
        (supabaseAdmin as any)
          .from("store_payment_connections_secure")
          .select("id, store_id, provider, status, public_metadata, secret_payload, created_at, updated_at, revoked_at")
          .eq("store_id", storeId)
          .eq("provider", manifest.id)
          .maybeSingle(),
      ),
    ]);

    if (settingsResult.error) throw settingsResult.error;
    for (const result of connectionResults) {
      if (result.error) throw result.error;
    }

    const gatewayProviders = redirectProviders.flatMap((manifest, index) => {
      const connection = connectionResults[index]?.data as PaymentConnectionRow | null | undefined;
      const adapter = getPaymentProviderServerAdapter(manifest.id);
      if (
        !connection
        || connection.status !== "connected"
        || !adapter
        || !adapter.hasCompleteSecrets(connection.secret_payload)
      ) {
        return [];
      }

      return [{
        id: manifest.id,
        label: manifest.checkoutLabel,
        description: manifest.checkoutDescription,
        payment_method: manifest.paymentMethod,
        checkout_mode: manifest.checkoutMode,
      }];
    });

    const value = (settingsResult.data?.value ?? {}) as Record<string, unknown>;
    const bkashGatewayEnabled = gatewayProviders.some((provider) => provider.id === "bkash");
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
      gateway_providers: gatewayProviders,
    });
  } catch (error) {
    console.error("Public payment settings error:", error);
    return NextResponse.json({ error: "Failed to load payment settings" }, { status: 500 });
  }
}
