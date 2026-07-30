import { NextResponse } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";
import {
  buildCourierConnectionKey,
  buildCourierConnectionResponse,
  safeObject,
  splitCourierSettings,
  type CourierConnectionRow,
  type CourierCredentialRow,
} from "@/lib/couriers/server";
import { courierProviders, type CourierProvider } from "@/lib/couriers/shared";

export const courierConnectionsRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
};

function fromCourierCredentials(client: any) {
  return client.from("store_courier_credentials_secure");
}

async function requireCourierManager(req: Request, storeId: string) {
  const user = await courierConnectionsRouteDeps.getAuthenticatedUser(req);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabaseAdmin = courierConnectionsRouteDeps.getSupabaseAdminClient();
  const authorized = await courierConnectionsRouteDeps.canManageStore(
    supabaseAdmin,
    storeId,
    user.id,
    ["owner", "admin", "editor"],
  );
  if (!authorized) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabaseAdmin, userId: user.id };
}

function isCourierProvider(value: unknown): value is CourierProvider {
  return typeof value === "string" && courierProviders.includes(value as CourierProvider);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get("storeId")?.trim() ?? "";
    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

    const guard = await requireCourierManager(req, storeId);
    if ("error" in guard) return guard.error;

    const { supabaseAdmin } = guard;
    const [{ data: connections, error: connectionsError }, { data: credentials, error: credentialsError }] = await Promise.all([
      (supabaseAdmin as any)
        .from("store_courier_connections")
        .select("id, store_id, provider, connection_key, zone_label, service_area_name, status, display_name, supports_cod, supports_city_delivery, settings, last_sync_at, last_error, created_at, updated_at")
        .eq("store_id", storeId)
        .order("updated_at", { ascending: false }),
      fromCourierCredentials(supabaseAdmin as any)
        .select("connection_id, store_id, provider, secret_payload")
        .eq("store_id", storeId),
    ]);

    if (connectionsError) throw connectionsError;
    if (credentialsError) throw credentialsError;

    const secretByConnection = new Map(
      ((credentials ?? []) as CourierCredentialRow[]).map((row) => [row.connection_id, safeObject(row.secret_payload)]),
    );

    return NextResponse.json({
      connections: ((connections ?? []) as CourierConnectionRow[]).map((row) =>
        buildCourierConnectionResponse(row, secretByConnection.get(row.id) ?? {}),
      ),
    });
  } catch (error) {
    console.error("Courier connections load error:", error);
    return NextResponse.json({ error: "Failed to load courier connections" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const storeId = typeof body?.storeId === "string" ? body.storeId.trim() : "";
    const provider = body?.provider;

    if (!storeId || !isCourierProvider(provider)) {
      return NextResponse.json({ error: "Missing storeId or provider" }, { status: 400 });
    }

    const guard = await requireCourierManager(req, storeId);
    if ("error" in guard) return guard.error;

    const { supabaseAdmin, userId } = guard;
    const { publicSettings, secretSettings } = splitCourierSettings(provider, body?.settings);
    const connectionKey = buildCourierConnectionKey(provider, body?.settings);

    const { data: connection, error: connectionError } = await (supabaseAdmin as any)
      .from("store_courier_connections")
      .insert({
        store_id: storeId,
        provider,
        connection_key: connectionKey,
        zone_label: typeof publicSettings.zone_label === "string" ? publicSettings.zone_label : null,
        service_area_name: typeof publicSettings.service_area_name === "string" ? publicSettings.service_area_name : null,
        status: typeof body?.status === "string" ? body.status : "draft",
        display_name: typeof body?.displayName === "string" ? body.displayName.trim() || null : null,
        supports_cod: body?.supportsCod !== false,
        supports_city_delivery: body?.supportsCityDelivery !== false,
        settings: publicSettings,
        created_by: userId,
      })
      .select("id, store_id, provider, connection_key, zone_label, service_area_name, status, display_name, supports_cod, supports_city_delivery, settings, last_sync_at, last_error, created_at, updated_at")
      .single();

    if (connectionError) throw connectionError;

    const { data: existingCredential, error: credentialReadError } = await fromCourierCredentials(supabaseAdmin as any)
      .select("connection_id, secret_payload")
      .eq("connection_id", connection.id)
      .maybeSingle();
    if (credentialReadError) throw credentialReadError;

    const mergedSecretPayload = {
      ...safeObject(existingCredential?.secret_payload),
      ...secretSettings,
    };

    const { error: credentialWriteError } = await fromCourierCredentials(supabaseAdmin as any)
      .upsert(
        {
          connection_id: connection.id,
          store_id: storeId,
          provider,
          secret_payload: mergedSecretPayload,
          created_by: userId,
          updated_by: userId,
        },
        { onConflict: "connection_id" },
      );
    if (credentialWriteError) throw credentialWriteError;

    return NextResponse.json({
      success: true,
      connection: buildCourierConnectionResponse(connection as CourierConnectionRow, mergedSecretPayload),
    });
  } catch (error) {
    console.error("Courier connection save error:", error);
    return NextResponse.json({ error: "Failed to save courier connection" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const storeId = typeof body?.storeId === "string" ? body.storeId.trim() : "";
    const connectionId = typeof body?.connectionId === "string" ? body.connectionId.trim() : "";

    if (!storeId || !connectionId) {
      return NextResponse.json({ error: "Missing storeId or connectionId" }, { status: 400 });
    }

    const guard = await requireCourierManager(req, storeId);
    if ("error" in guard) return guard.error;

    const { supabaseAdmin, userId } = guard;
    const { data: existingConnection, error: existingConnectionError } = await (supabaseAdmin as any)
      .from("store_courier_connections")
      .select("id, store_id, provider, connection_key, zone_label, service_area_name, status, display_name, supports_cod, supports_city_delivery, settings, last_sync_at, last_error, created_at, updated_at")
      .eq("id", connectionId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (existingConnectionError) throw existingConnectionError;
    if (!existingConnection) {
      return NextResponse.json({ error: "Courier connection not found" }, { status: 404 });
    }

    const { publicSettings, secretSettings } = splitCourierSettings(existingConnection.provider, body?.settings);

    const { data: existingCredential, error: credentialReadError } = await fromCourierCredentials(supabaseAdmin as any)
      .select("connection_id, secret_payload")
      .eq("connection_id", connectionId)
      .maybeSingle();
    if (credentialReadError) throw credentialReadError;

    const mergedSecretPayload = {
      ...safeObject(existingCredential?.secret_payload),
      ...secretSettings,
    };

    const { data: updatedConnection, error: updateError } = await (supabaseAdmin as any)
      .from("store_courier_connections")
      .update({
        status: typeof body?.status === "string" ? body.status : existingConnection.status,
        zone_label: typeof publicSettings.zone_label === "string" ? publicSettings.zone_label : existingConnection.zone_label,
        service_area_name: typeof publicSettings.service_area_name === "string" ? publicSettings.service_area_name : existingConnection.service_area_name,
        display_name:
          typeof body?.displayName === "string"
            ? body.displayName.trim() || null
            : existingConnection.display_name,
        supports_cod:
          typeof body?.supportsCod === "boolean"
            ? body.supportsCod
            : existingConnection.supports_cod,
        supports_city_delivery:
          typeof body?.supportsCityDelivery === "boolean"
            ? body.supportsCityDelivery
            : existingConnection.supports_city_delivery,
        settings: body?.settings ? publicSettings : existingConnection.settings,
      })
      .eq("id", connectionId)
      .eq("store_id", storeId)
      .select("id, store_id, provider, connection_key, zone_label, service_area_name, status, display_name, supports_cod, supports_city_delivery, settings, last_sync_at, last_error, created_at, updated_at")
      .single();
    if (updateError) throw updateError;

    const { error: credentialWriteError } = await fromCourierCredentials(supabaseAdmin as any)
      .upsert(
        {
          connection_id: connectionId,
          store_id: storeId,
          provider: existingConnection.provider,
          secret_payload: mergedSecretPayload,
          updated_by: userId,
        },
        { onConflict: "connection_id" },
      );
    if (credentialWriteError) throw credentialWriteError;

    return NextResponse.json({
      success: true,
      connection: buildCourierConnectionResponse(updatedConnection as CourierConnectionRow, mergedSecretPayload),
    });
  } catch (error) {
    console.error("Courier connection update error:", error);
    return NextResponse.json({ error: "Failed to update courier connection" }, { status: 500 });
  }
}
