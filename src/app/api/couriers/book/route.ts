import { NextResponse } from "next/server";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";
import {
  buildManualShipmentPayload,
  createPathaoBooking,
  safeObject,
  type CourierBookingInput,
  type CourierConnectionRow,
  type CourierCredentialRow,
  type CourierOrderRow,
} from "@/lib/couriers/server";

export const courierBookingRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  canManageStore,
  fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
  now: () => new Date().toISOString(),
};

function fromCourierCredentials(client: any) {
  return client.from("store_courier_credentials_secure");
}

export async function POST(req: Request) {
  try {
    const user = await courierBookingRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const storeId = typeof body?.storeId === "string" ? body.storeId.trim() : "";
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
    const connectionId = typeof body?.connectionId === "string" ? body.connectionId.trim() : "";

    if (!storeId || !orderId || !connectionId) {
      return NextResponse.json({ error: "Missing storeId, orderId, or connectionId" }, { status: 400 });
    }

    const supabaseAdmin = courierBookingRouteDeps.getSupabaseAdminClient();
    const authorized = await courierBookingRouteDeps.canManageStore(
      supabaseAdmin,
      storeId,
      user.id,
      ["owner", "admin", "editor"],
    );
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [{ data: order, error: orderError }, { data: connection, error: connectionError }, { data: credential, error: credentialError }, { data: existingShipment, error: existingShipmentError }] = await Promise.all([
      (supabaseAdmin as any)
        .from("orders")
        .select("id, store_id, order_number, status, items, customer_name, customer_phone, shipping_address, shipping_city, payment_method, total, delivery_fee, notes")
        .eq("id", orderId)
        .eq("store_id", storeId)
        .maybeSingle(),
      (supabaseAdmin as any)
        .from("store_courier_connections")
        .select("id, store_id, provider, connection_key, zone_label, service_area_name, status, display_name, supports_cod, supports_city_delivery, settings, last_sync_at, last_error, created_at, updated_at")
        .eq("id", connectionId)
        .eq("store_id", storeId)
        .maybeSingle(),
      fromCourierCredentials(supabaseAdmin as any)
        .select("connection_id, store_id, provider, secret_payload")
        .eq("connection_id", connectionId)
        .maybeSingle(),
      (supabaseAdmin as any)
        .from("order_shipments")
        .select("id, status, provider")
        .eq("order_id", orderId)
        .eq("store_id", storeId)
        .eq("courier_connection_id", connectionId)
        .maybeSingle(),
    ]);

    if (orderError) throw orderError;
    if (connectionError) throw connectionError;
    if (credentialError) throw credentialError;
    if (existingShipmentError) throw existingShipmentError;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!connection) {
      return NextResponse.json({ error: "Courier connection not found" }, { status: 404 });
    }

    if (connection.status === "disabled") {
      return NextResponse.json({ error: "This courier connection is disabled" }, { status: 400 });
    }

    const bookingInput = safeObject(body?.booking) as CourierBookingInput;
    const now = courierBookingRouteDeps.now();
    const shipmentStatus = "booked";
    let trackingNumber: string | null = null;
    let consignmentId: string | null = null;
    let bookingPayload: Record<string, unknown>;
    let providerPayload: Record<string, unknown>;

    try {
      if (connection.provider === "manual") {
        const manualPayload = buildManualShipmentPayload(order as CourierOrderRow, connection as CourierConnectionRow, bookingInput);
        bookingPayload = manualPayload;
        providerPayload = {
          provider: "manual",
          booked_at: now,
          note: "Manual courier booking recorded by operator.",
        };
        trackingNumber = manualPayload.merchantOrderId;
      } else if (connection.provider === "pathao") {
        const pathaoResult = await createPathaoBooking(
          { fetch: courierBookingRouteDeps.fetch },
          order as CourierOrderRow,
          connection as CourierConnectionRow,
          (credential as CourierCredentialRow | null)?.secret_payload ?? {},
          bookingInput,
        );
        bookingPayload = pathaoResult.requestPayload;
        providerPayload = pathaoResult.responsePayload;
        consignmentId = pathaoResult.consignmentId ?? null;
        trackingNumber = pathaoResult.trackingNumber ?? null;
      } else {
        return NextResponse.json(
          { error: `${connection.provider} booking is not wired yet. Use manual booking for now or finish that provider adapter next.` },
          { status: 400 },
        );
      }
    } catch (providerError) {
      const providerMessage = providerError instanceof Error ? providerError.message : "Courier booking failed";
      await (supabaseAdmin as any)
        .from("store_courier_connections")
        .update({
          last_error: {
            message: providerMessage,
            provider: connection.provider,
            failed_at: now,
          },
        })
        .eq("id", connectionId)
        .eq("store_id", storeId);
      return NextResponse.json({ error: providerMessage }, { status: 400 });
    }

    const shipmentPayload = {
      order_id: order.id,
      store_id: storeId,
      courier_connection_id: connectionId,
      provider: connection.provider,
      status: shipmentStatus,
      tracking_number: trackingNumber,
      consignment_id: consignmentId,
      recipient_name: order.customer_name,
      recipient_phone: order.customer_phone,
      destination_city: order.shipping_city,
      destination_address: order.shipping_address,
      cash_collection_amount:
        typeof bookingPayload.amount_to_collect === "number"
          ? bookingPayload.amount_to_collect
          : typeof bookingPayload.amountToCollect === "number"
            ? bookingPayload.amountToCollect
            : /cod/i.test(order.payment_method) ? order.total : 0,
      shipping_fee:
        typeof bookingPayload.shippingFee === "number"
          ? bookingPayload.shippingFee
          : order.delivery_fee,
      booking_payload: bookingPayload,
      latest_provider_payload: providerPayload,
      created_by: user.id,
      booked_at: now,
    };

    const shipmentWrite = existingShipment?.id
      ? await (supabaseAdmin as any)
          .from("order_shipments")
          .update(shipmentPayload)
          .eq("id", existingShipment.id)
          .eq("store_id", storeId)
          .select("id, status, provider, tracking_number, consignment_id")
          .single()
      : await (supabaseAdmin as any)
          .from("order_shipments")
          .insert(shipmentPayload)
          .select("id, status, provider, tracking_number, consignment_id")
          .single();
    if (shipmentWrite.error) throw shipmentWrite.error;

    await Promise.all([
      (supabaseAdmin as any)
        .from("store_courier_connections")
        .update({
          last_sync_at: now,
          last_error: null,
        })
        .eq("id", connectionId)
        .eq("store_id", storeId),
      ["pending", "confirmed"].includes(String(order.status))
        ? (supabaseAdmin as any)
            .from("orders")
            .update({ status: "processing" })
            .eq("id", orderId)
            .eq("store_id", storeId)
        : Promise.resolve(),
    ]);

    return NextResponse.json({
      success: true,
      shipment: shipmentWrite.data,
      orderStatus: ["pending", "confirmed"].includes(String(order.status)) ? "processing" : order.status,
    });
  } catch (error) {
    console.error("Courier booking error:", error);
    return NextResponse.json({ error: "Failed to book courier shipment" }, { status: 500 });
  }
}
