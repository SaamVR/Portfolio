import { NextResponse } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";
import { formatCourierConnectionLabel, type CourierProvider } from "@/lib/couriers/shared";

export const courierShipmentsRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get("storeId")?.trim() ?? "";
    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

    const user = await courierShipmentsRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = courierShipmentsRouteDeps.getSupabaseAdminClient();
    const authorized = await courierShipmentsRouteDeps.canManageStore(
      supabaseAdmin,
      storeId,
      user.id,
      ["owner", "admin", "editor"],
    );
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await (supabaseAdmin as any)
      .from("order_shipments")
      .select("id, order_id, provider, courier_connection_id, status, tracking_number, consignment_id, created_at, delivered_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const connectionIds = Array.from(
      new Set(
        (data ?? [])
          .map((row: Record<string, unknown>) => (typeof row.courier_connection_id === "string" ? row.courier_connection_id : null))
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const connectionRows = connectionIds.length > 0
      ? await (supabaseAdmin as any)
          .from("store_courier_connections")
          .select("id, provider, display_name, zone_label, service_area_name")
          .eq("store_id", storeId)
          .in("id", connectionIds)
      : { data: [], error: null };

    if (connectionRows.error) throw connectionRows.error;

    const connectionMap = new Map(
      ((connectionRows.data ?? []) as Array<Record<string, unknown>>).map((row) => {
        const connection = {
          id: String(row.id),
          provider: String(row.provider) as CourierProvider,
          displayName: typeof row.display_name === "string" ? row.display_name : null,
          zoneLabel: typeof row.zone_label === "string" ? row.zone_label : null,
          serviceAreaName: typeof row.service_area_name === "string" ? row.service_area_name : null,
        };
        return [connection.id, connection] as const;
      }),
    );

    return NextResponse.json({
      shipments: (data ?? []).map((shipment: Record<string, unknown>) => {
        const connectionId = typeof shipment.courier_connection_id === "string" ? shipment.courier_connection_id : null;
        const connection = connectionId ? connectionMap.get(connectionId) : null;
        return {
          ...shipment,
          courier_connection_label: connection
            ? formatCourierConnectionLabel({
                provider: connection.provider,
                displayName: connection.displayName,
                zoneLabel: connection.zoneLabel,
                serviceAreaName: connection.serviceAreaName,
              })
            : null,
          zone_label: connection?.zoneLabel ?? null,
          service_area_name: connection?.serviceAreaName ?? null,
        };
      }),
    });
  } catch (error) {
    console.error("Courier shipments load error:", error);
    return NextResponse.json({ error: "Failed to load shipment activity" }, { status: 500 });
  }
}
