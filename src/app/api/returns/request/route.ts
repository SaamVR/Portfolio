import { getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { jsonNoStore } from "@/lib/http/cache-control";
import { rateLimit } from "@/lib/rate-limit";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const bangladeshPhonePattern = /^01[3-9]\d{8}$/;
const allowedRequestTypes = new Set(["return", "exchange", "refund"]);
const openReturnStatuses = ["requested", "approved", "received", "refunded"];
const maxBodyBytes = 8_192;

type ExistingReturnRequest = {
  id: string;
  rma_code?: string | null;
  status?: string | null;
};

function getClientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function readText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export function normalizeBangladeshPhone(value: unknown) {
  const digits = readText(value, 40).replace(/\D/g, "");

  if (digits.startsWith("00880") && digits.length === 15) {
    return `0${digits.slice(5)}`;
  }

  if (digits.startsWith("880") && digits.length === 13) {
    return `0${digits.slice(3)}`;
  }

  if (digits.startsWith("1") && digits.length === 10) {
    return `0${digits}`;
  }

  return digits;
}

function createRmaCode() {
  return `RMA-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
}

function duplicateRequestResponse(existingRequest: ExistingReturnRequest) {
  return jsonNoStore(
    {
      error: "A return or refund request for this order is already being reviewed.",
      request: {
        id: existingRequest.id,
        rmaCode: existingRequest.rma_code ?? null,
        status: existingRequest.status ?? "requested",
      },
    },
    { status: 409 },
  );
}

async function findOrderForReturn(
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
  storeId: string,
  orderNumber: string,
) {
  return supabaseAdmin
    .from("orders")
    .select("id, customer_phone, status")
    .eq("store_id", storeId)
    .eq("order_number", orderNumber)
    .maybeSingle();
}

async function findOpenReturnRequest(
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
  storeId: string,
  orderId: string,
) {
  return supabaseAdmin
    .from("store_return_requests")
    .select("id, rma_code, status")
    .eq("store_id", storeId)
    .eq("order_id", orderId)
    .in("status", openReturnStatuses)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

async function insertReturnRequest(
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
  payload: Record<string, unknown>,
) {
  return supabaseAdmin
    .from("store_return_requests")
    .insert(payload)
    .select("id, rma_code, status")
    .single();
}

export const customerReturnRouteDeps = {
  rateLimit,
  getSupabaseAdminClient,
  findOrderForReturn,
  findOpenReturnRequest,
  insertReturnRequest,
  createRmaCode,
};

export async function POST(req: Request) {
  try {
    const limit = await customerReturnRouteDeps.rateLimit(`customer_return:${getClientIp(req)}`, {
      limit: 8,
      windowMs: 60_000,
    });

    if (!limit.success) {
      return jsonNoStore(
        { error: "Too many return requests. Please wait a minute and try again." },
        { status: 429 },
      );
    }

    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, "utf8") > maxBodyBytes) {
      return jsonNoStore({ error: "Return request is too large." }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody || "{}") as Record<string, unknown>;
    } catch {
      return jsonNoStore({ error: "Invalid return request." }, { status: 400 });
    }

    const storeId = readText(body.storeId, 80);
    const orderNumber = readText(body.orderNumber, 80).toUpperCase();
    const submittedPhone = normalizeBangladeshPhone(body.customerPhone);
    const requestType = readText(body.requestType, 30).toLowerCase();
    const reason = readText(body.reason, 500);
    const customerNote = readText(body.customerNote, 1000);

    if (!uuidPattern.test(storeId) || !orderNumber || !bangladeshPhonePattern.test(submittedPhone)) {
      return jsonNoStore({ error: "Please enter a valid order number and Bangladeshi mobile number." }, { status: 400 });
    }

    if (!allowedRequestTypes.has(requestType) || reason.length < 3) {
      return jsonNoStore({ error: "Choose a request type and add a short reason." }, { status: 400 });
    }

    const supabaseAdmin = customerReturnRouteDeps.getSupabaseAdminClient();
    const { data: order, error: orderError } = await customerReturnRouteDeps.findOrderForReturn(
      supabaseAdmin,
      storeId,
      orderNumber,
    );

    if (orderError) {
      console.error("Customer return order verification failed:", orderError);
      return jsonNoStore({ error: "Unable to verify this order right now." }, { status: 500 });
    }

    const storedPhone = normalizeBangladeshPhone(order?.customer_phone);
    const orderIsEligible = order?.status === "delivered";

    // Deliberately keep all lookup/eligibility failures identical so an
    // anonymous caller cannot enumerate order numbers, phones, or statuses.
    if (!order?.id || storedPhone !== submittedPhone || !orderIsEligible) {
      return jsonNoStore(
        { error: "We could not verify an eligible delivered order with those details." },
        { status: 400 },
      );
    }

    const { data: existingRequest, error: existingError } = await customerReturnRouteDeps.findOpenReturnRequest(
      supabaseAdmin,
      storeId,
      order.id,
    );

    if (existingError) {
      console.error("Customer return duplicate check failed:", existingError);
      return jsonNoStore({ error: "Unable to submit this request right now." }, { status: 500 });
    }

    if (existingRequest?.id) {
      return duplicateRequestResponse(existingRequest);
    }

    const rmaCode = customerReturnRouteDeps.createRmaCode();
    const { data: createdRequest, error: insertError } = await customerReturnRouteDeps.insertReturnRequest(
      supabaseAdmin,
      {
        store_id: storeId,
        order_id: order.id,
        request_type: requestType,
        status: "requested",
        reason,
        customer_note: customerNote || null,
        requested_amount: 0,
        approved_amount: 0,
        refund_mode: null,
        courier_status: requestType === "refund" ? "not_required" : "pickup_pending",
        rma_code: rmaCode,
        created_by: null,
        metadata: {
          source: "storefront_return_form",
        },
      },
    );

    if (insertError) {
      // The partial unique index is the final concurrency guard. If another
      // request wins the race after our pre-check, return that case instead of
      // surfacing a server error or creating a duplicate open case.
      if ((insertError as { code?: string }).code === "23505") {
        const { data: racedRequest } = await customerReturnRouteDeps.findOpenReturnRequest(
          supabaseAdmin,
          storeId,
          order.id,
        );
        if (racedRequest?.id) {
          return duplicateRequestResponse(racedRequest);
        }
      }

      console.error("Customer return request insert failed:", insertError);
      return jsonNoStore({ error: "Unable to submit this request right now." }, { status: 500 });
    }

    if (!createdRequest?.id) {
      return jsonNoStore({ error: "Unable to submit this request right now." }, { status: 500 });
    }

    return jsonNoStore(
      {
        ok: true,
        request: {
          id: createdRequest.id,
          rmaCode: createdRequest.rma_code ?? rmaCode,
          status: createdRequest.status ?? "requested",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Customer return request failed:", error);
    return jsonNoStore({ error: "Unable to submit this request right now." }, { status: 500 });
  }
}
