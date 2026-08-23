import test, { afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import {
  POST,
  customerReturnRouteDeps,
  normalizeBangladeshPhone,
} from "@/app/api/returns/request/route";

const storeId = "10000000-0000-4000-8000-000000000001";
const orderId = "10000000-0000-4000-8000-000000000002";

function buildRequest(overrides: Record<string, unknown> = {}) {
  return new Request("https://example.com/api/returns/request", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.10",
    },
    body: JSON.stringify({
      storeId,
      orderNumber: "ORD-1001",
      customerPhone: "01700000000",
      requestType: "return",
      reason: "Item arrived damaged",
      customerNote: "Outer box was crushed.",
      ...overrides,
    }),
  });
}

function mockBaseDeps(options?: {
  order?: { id: string; customer_phone: string; status: string } | null;
  orderError?: { message: string } | null;
  existing?: { id: string; rma_code: string | null; status: string } | null;
  existingError?: { message: string } | null;
}) {
  mock.method(customerReturnRouteDeps, "rateLimit", async () => ({ success: true } as never));
  mock.method(customerReturnRouteDeps, "getSupabaseAdminClient", () => ({} as never));
  mock.method(customerReturnRouteDeps, "findOrderForReturn", async () => ({
    data: options?.order === undefined
      ? { id: orderId, customer_phone: "+8801700000000", status: "delivered" }
      : options.order,
    error: options?.orderError ?? null,
  }) as never);
  mock.method(customerReturnRouteDeps, "findOpenReturnRequest", async () => ({
    data: options?.existing ?? null,
    error: options?.existingError ?? null,
  }) as never);
  mock.method(customerReturnRouteDeps, "createRmaCode", () => "RMA-ABC12345");
}

afterEach(() => {
  mock.restoreAll();
});

describe("customer return request endpoint", () => {
  test("normalizes common Bangladesh phone formats", () => {
    assert.equal(normalizeBangladeshPhone("+880 1700-000000"), "01700000000");
    assert.equal(normalizeBangladeshPhone("00880 1700-000000"), "01700000000");
    assert.equal(normalizeBangladeshPhone("01700 000000"), "01700000000");
    assert.equal(normalizeBangladeshPhone("1700000000"), "01700000000");
  });

  test("fails generically when order details do not verify", async () => {
    mockBaseDeps({ order: null });
    let insertCount = 0;
    mock.method(customerReturnRouteDeps, "insertReturnRequest", async () => {
      insertCount += 1;
      return { data: null, error: null } as never;
    });

    const response = await POST(buildRequest());
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.error, /could not verify an eligible delivered order/i);
    assert.equal(insertCount, 0);
  });

  test("does not reveal whether a matching order exists when the phone is wrong", async () => {
    mockBaseDeps();
    let duplicateCheckCount = 0;
    mock.method(customerReturnRouteDeps, "findOpenReturnRequest", async () => {
      duplicateCheckCount += 1;
      return { data: null, error: null } as never;
    });
    mock.method(customerReturnRouteDeps, "insertReturnRequest", async () => ({ data: null, error: null }) as never);

    const response = await POST(buildRequest({ customerPhone: "01800000000" }));
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.error, /could not verify an eligible delivered order/i);
    assert.equal(duplicateCheckCount, 0);
  });

  test("only accepts delivered orders", async () => {
    mockBaseDeps({
      order: { id: orderId, customer_phone: "01700000000", status: "shipped" },
    });
    mock.method(customerReturnRouteDeps, "insertReturnRequest", async () => ({ data: null, error: null }) as never);

    const response = await POST(buildRequest());
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.error, /could not verify an eligible delivered order/i);
  });

  test("reuses an existing open case instead of creating a duplicate", async () => {
    mockBaseDeps({
      existing: { id: "return-existing", rma_code: "RMA-EXISTING", status: "approved" },
    });
    let insertCount = 0;
    mock.method(customerReturnRouteDeps, "insertReturnRequest", async () => {
      insertCount += 1;
      return { data: null, error: null } as never;
    });

    const response = await POST(buildRequest());
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.equal(body.request.rmaCode, "RMA-EXISTING");
    assert.equal(body.request.status, "approved");
    assert.equal(insertCount, 0);
  });

  test("returns the winning open case when a concurrent insert hits the unique guard", async () => {
    mock.method(customerReturnRouteDeps, "rateLimit", async () => ({ success: true } as never));
    mock.method(customerReturnRouteDeps, "getSupabaseAdminClient", () => ({} as never));
    mock.method(customerReturnRouteDeps, "findOrderForReturn", async () => ({
      data: { id: orderId, customer_phone: "01700000000", status: "delivered" },
      error: null,
    }) as never);
    let lookupCount = 0;
    mock.method(customerReturnRouteDeps, "findOpenReturnRequest", async () => {
      lookupCount += 1;
      return lookupCount === 1
        ? ({ data: null, error: null } as never)
        : ({ data: { id: "return-race", rma_code: "RMA-RACE", status: "requested" }, error: null } as never);
    });
    mock.method(customerReturnRouteDeps, "insertReturnRequest", async () => ({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    }) as never);
    mock.method(customerReturnRouteDeps, "createRmaCode", () => "RMA-LOSER");

    const response = await POST(buildRequest());
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.equal(body.request.id, "return-race");
    assert.equal(body.request.rmaCode, "RMA-RACE");
    assert.equal(body.request.status, "requested");
    assert.equal(lookupCount, 2);
  });

  test("creates a requested case without granting customer refund authority", async () => {
    mockBaseDeps();
    const insertedPayloads: Record<string, unknown>[] = [];
    mock.method(customerReturnRouteDeps, "insertReturnRequest", async (_admin: unknown, payload: Record<string, unknown>) => {
      insertedPayloads.push(payload);
      return {
        data: { id: "return-new", rma_code: "RMA-ABC12345", status: "requested" },
        error: null,
      } as never;
    });

    const response = await POST(buildRequest());
    assert.equal(response.status, 201);
    assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0, must-revalidate");
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.request.rmaCode, "RMA-ABC12345");
    assert.equal(body.request.status, "requested");

    assert.equal(insertedPayloads.length, 1);
    const insertedPayload = insertedPayloads[0];
    assert.ok(insertedPayload);
    assert.equal(insertedPayload.store_id, storeId);
    assert.equal(insertedPayload.order_id, orderId);
    assert.equal(insertedPayload.status, "requested");
    assert.equal(insertedPayload.requested_amount, 0);
    assert.equal(insertedPayload.approved_amount, 0);
    assert.equal(insertedPayload.refund_mode, null);
    assert.equal(insertedPayload.created_by, null);
    assert.deepEqual(insertedPayload.metadata, { source: "storefront_return_form" });
  });

  test("rate limits anonymous submissions before any order lookup", async () => {
    mock.method(customerReturnRouteDeps, "rateLimit", async () => ({ success: false } as never));
    let lookupCount = 0;
    mock.method(customerReturnRouteDeps, "findOrderForReturn", async () => {
      lookupCount += 1;
      return { data: null, error: null } as never;
    });

    const response = await POST(buildRequest());
    assert.equal(response.status, 429);
    assert.equal(lookupCount, 0);
  });

  test("rejects oversized bodies before creating a service-role client", async () => {
    mock.method(customerReturnRouteDeps, "rateLimit", async () => ({ success: true } as never));
    let adminCalled = false;
    mock.method(customerReturnRouteDeps, "getSupabaseAdminClient", () => {
      adminCalled = true;
      return {} as never;
    });

    const response = await POST(buildRequest({ reason: "x".repeat(9_000) }));
    assert.equal(response.status, 413);
    assert.equal(adminCalled, false);
  });
});
