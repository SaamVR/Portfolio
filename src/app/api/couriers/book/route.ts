import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canManageStore,
  getAuthenticatedUser,
  getSupabaseAdminClient,
} from "@/lib/api/supabase-route";
import {
  type CourierBookingInput,
  type CourierConnectionRow,
  type CourierCredentialRow,
  type CourierOrderRow,
} from "@/lib/couriers/server";
import {
  getCourierProviderServerAdapter,
  safeCourierProviderObject,
} from "@/lib/couriers/provider-server";
import { isCourierOperationallyConfigured } from "@/lib/couriers/shared";
import {
  getRequestId,
  recordCaughtIncident,
  recordPlatformIncident,
  sanitizeIncidentText,
} from "@/lib/platform/incident-logger";

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

const bookableOrderStatuses = new Set(["confirmed", "processing"]);

export type CourierBookingClaim = {
  shipment_id: string;
  status: string;
  claimed: boolean;
  attempt_token: string | null;
  tracking_number: string | null;
  consignment_id: string | null;
};

export function getCourierBookingClaimResponse(claim: CourierBookingClaim) {
  if (claim.claimed) return null;
  if (claim.status === "booked" || claim.status === "picked_up" || claim.status === "in_transit" || claim.status === "delivered") {
    return {
      status: 200,
      body: {
        success: true,
        reused: true,
        shipment: {
          id: claim.shipment_id,
          status: claim.status,
          tracking_number: claim.tracking_number,
          consignment_id: claim.consignment_id,
        },
      },
    };
  }
  if (claim.status === "booking") {
    return { status: 409, body: { error: "Courier booking is already in progress for this order and connection." } };
  }
  if (claim.status === "reconciliation_required") {
    return { status: 409, body: { error: "This courier booking requires reconciliation before another provider booking can be attempted." } };
  }
  return { status: 409, body: { error: "A courier booking already exists for this order and connection. Use an explicit rebook workflow instead." } };
}

export async function POST(req: Request) {
  let incidentAdmin: SupabaseClient | null = null;
  let incidentContext: { storeId: string; orderId: string; connectionId: string } | null = null;

  try {
    const user = await courierBookingRouteDeps.getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    incidentAdmin = supabaseAdmin;
    incidentContext = { storeId, orderId, connectionId };

    const [{ data: order, error: orderError }, { data: connection, error: connectionError }, { data: credential, error: credentialError }] = await Promise.all([
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
        .eq("store_id", storeId)
        .maybeSingle(),
    ]);

    if (orderError) throw orderError;
    if (connectionError) throw connectionError;
    if (credentialError) throw credentialError;
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!connection) return NextResponse.json({ error: "Courier connection not found" }, { status: 404 });
    if (!isCourierOperationallyConfigured(String(connection.status) as "draft" | "configured" | "disabled" | "connected")) {
      return NextResponse.json(
        { error: connection.status === "disabled" ? "This courier connection is disabled" : "Configure this courier connection before booking." },
        { status: 400 },
      );
    }
    if (!bookableOrderStatuses.has(String(order.status))) {
      return NextResponse.json(
        { error: "Confirm the order before courier booking. Delivered, shipped, cancelled, or unconfirmed orders cannot be booked." },
        { status: 409 },
      );
    }

    const adapter = getCourierProviderServerAdapter(connection.provider);
    if (!adapter || adapter.manifest.runtimeStatus !== "active" || !adapter.book) {
      return NextResponse.json(
        { error: `${connection.provider} automated booking is not active. Use a manual courier connection or install its provider adapter.` },
        { status: 400 },
      );
    }
    if (credential && credential.provider !== connection.provider) {
      return NextResponse.json({ error: "Courier credential/provider mismatch" }, { status: 409 });
    }

    const bookingInput = safeCourierProviderObject(body?.booking) as CourierBookingInput;
    const now = courierBookingRouteDeps.now();
    const bookingRequestId = typeof body?.bookingRequestId === "string" && body.bookingRequestId.trim()
      ? body.bookingRequestId.trim().slice(0, 200)
      : `order:${orderId}:connection:${connectionId}`;

    const claimResult = await (supabaseAdmin as any).rpc("claim_courier_booking", {
      p_store_id: storeId,
      p_order_id: orderId,
      p_connection_id: connectionId,
      p_provider: connection.provider,
      p_booking_request_id: bookingRequestId,
      p_actor_id: user.id,
      p_now: now,
    });
    if (claimResult.error) throw claimResult.error;
    const claim = Array.isArray(claimResult.data) ? claimResult.data[0] as CourierBookingClaim | undefined : undefined;
    if (!claim?.shipment_id) throw new Error("Courier booking claim did not return a shipment");

    const existingResponse = getCourierBookingClaimResponse(claim);
    if (existingResponse) return NextResponse.json(existingResponse.body, { status: existingResponse.status });
    if (!claim.attempt_token) throw new Error("Courier booking claim is missing an attempt token");

    let bookingResult;
    try {
      bookingResult = await adapter.book({
        deps: { fetch: courierBookingRouteDeps.fetch, now: courierBookingRouteDeps.now },
        order: order as CourierOrderRow,
        connection: connection as CourierConnectionRow,
        credential: credential as CourierCredentialRow | null,
        booking: bookingInput,
      });
    } catch (providerError) {
      const providerMessage = sanitizeIncidentText(providerError, 500) || "Courier booking failed";
      const failed = await (supabaseAdmin as any).rpc("fail_courier_booking", {
        p_shipment_id: claim.shipment_id,
        p_attempt_token: claim.attempt_token,
        p_error: providerMessage,
        p_reconciliation_required: true,
        p_now: now,
      });
      if (failed.error) console.error("Failed to persist courier reconciliation state:", sanitizeIncidentText(failed.error));
      await (supabaseAdmin as any)
        .from("store_courier_connections")
        .update({ last_error: { message: providerMessage, provider: connection.provider, failed_at: now } })
        .eq("id", connectionId)
        .eq("store_id", storeId);
      await recordPlatformIncident(supabaseAdmin as any, {
        fingerprint: "courier-booking-reconciliation-required",
        severity: "warning",
        source: "courier_booking",
        title: "Courier booking requires reconciliation",
        message: providerMessage,
        route: "/api/couriers/book",
        storeId,
        requestId: getRequestId(req),
        metadata: { orderId, connectionId, shipmentId: claim.shipment_id, provider: connection.provider },
      });
      return NextResponse.json({ error: providerMessage, reconciliationRequired: true }, { status: 409 });
    }

    const bookingPayload = bookingResult.requestPayload;
    const cashCollectionAmount =
      typeof bookingPayload.amount_to_collect === "number"
        ? bookingPayload.amount_to_collect
        : typeof bookingPayload.amountToCollect === "number"
          ? bookingPayload.amountToCollect
          : /cod/i.test(order.payment_method) ? order.total : 0;
    const shippingFee = typeof bookingPayload.shippingFee === "number" ? bookingPayload.shippingFee : order.delivery_fee;

    const finalized = await (supabaseAdmin as any).rpc("finalize_courier_booking", {
      p_shipment_id: claim.shipment_id,
      p_attempt_token: claim.attempt_token,
      p_tracking_number: bookingResult.trackingNumber,
      p_consignment_id: bookingResult.consignmentId,
      p_recipient_name: order.customer_name,
      p_recipient_phone: order.customer_phone,
      p_destination_city: order.shipping_city,
      p_destination_address: order.shipping_address,
      p_cash_collection_amount: cashCollectionAmount,
      p_shipping_fee: shippingFee,
      p_booking_payload: bookingPayload,
      p_provider_payload: bookingResult.responsePayload,
      p_now: now,
    });

    if (finalized.error) {
      const reconcile = await (supabaseAdmin as any).rpc("fail_courier_booking", {
        p_shipment_id: claim.shipment_id,
        p_attempt_token: claim.attempt_token,
        p_error: "Provider booking succeeded but local finalization failed",
        p_reconciliation_required: true,
        p_now: now,
      });
      if (reconcile.error) console.error("Failed to mark courier booking for reconciliation:", sanitizeIncidentText(reconcile.error));
      await recordPlatformIncident(supabaseAdmin as any, {
        fingerprint: "courier-booking-finalization-failed",
        severity: "critical",
        source: "courier_booking",
        title: "Courier provider booking succeeded but local finalization failed",
        message: String(finalized.error.message || "Courier booking finalization failed"),
        route: "/api/couriers/book",
        storeId,
        requestId: getRequestId(req),
        metadata: { orderId, connectionId, shipmentId: claim.shipment_id, provider: connection.provider },
      });
      return NextResponse.json({ error: "Courier booking requires reconciliation", reconciliationRequired: true }, { status: 500 });
    }

    const connectionUpdate = await (supabaseAdmin as any)
      .from("store_courier_connections")
      .update({ last_sync_at: now, last_error: null })
      .eq("id", connectionId)
      .eq("store_id", storeId);
    if (connectionUpdate.error) console.error("Courier connection sync metadata update failed:", sanitizeIncidentText(connectionUpdate.error));

    if (String(order.status) === "confirmed") {
      const orderUpdate = await (supabaseAdmin as any)
        .from("orders")
        .update({ status: "processing" })
        .eq("id", orderId)
        .eq("store_id", storeId);
      if (orderUpdate.error) console.error("Order processing status update failed after courier booking:", sanitizeIncidentText(orderUpdate.error));
    }

    const shipment = finalized.data;
    return NextResponse.json({
      success: true,
      shipment: shipment ? {
        id: shipment.id,
        status: shipment.status,
        provider: shipment.provider,
        tracking_number: shipment.tracking_number,
        consignment_id: shipment.consignment_id,
      } : { id: claim.shipment_id, status: "booked", provider: connection.provider },
      orderStatus: String(order.status) === "confirmed" ? "processing" : order.status,
    });
  } catch (error) {
    if (incidentAdmin && incidentContext) {
      await recordCaughtIncident(incidentAdmin, {
        fingerprint: "courier-booking-processing-failed",
        severity: "warning",
        source: "courier_booking",
        title: "Courier booking failed unexpectedly after authorization",
        error,
        route: "/api/couriers/book",
        storeId: incidentContext.storeId,
        requestId: getRequestId(req),
        metadata: {
          order_id: incidentContext.orderId,
          connection_id: incidentContext.connectionId,
        },
      });
    }
    console.error("Courier booking error:", sanitizeIncidentText(error));
    return NextResponse.json({ error: "Failed to book courier shipment" }, { status: 500 });
  }
}
