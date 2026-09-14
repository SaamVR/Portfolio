import test from "node:test";
import assert from "node:assert/strict";
import {
  getPaymentCheckoutRuntimeAdapter,
  handleRedirectPaymentCallback,
  initializeRedirectPayment,
} from "@/lib/payments/checkout-runtime";

test("bKash redirect checkout is resolved through the payment runtime registry", async () => {
  let invokedName = "";
  let invokedBody: Record<string, unknown> | null = null;

  const result = await initializeRedirectPayment(
    {
      invokeFunction: async (functionName, body) => {
        invokedName = functionName;
        invokedBody = body;
        return {
          data: {
            success: true,
            bkashURL: "https://sandbox.payment.example/redirect",
          },
          error: null,
        };
      },
    },
    {
      providerId: "bkash",
      storeId: "store_1",
      orderNumber: "ORD-1001",
      amount: 1490,
    },
  );

  assert.equal(invokedName, "bkash-payment");
  assert.deepEqual(invokedBody, {
    action: "create",
    order_id: "ORD-1001",
    amount: 1490,
    store_id: "store_1",
  });
  assert.deepEqual(result, {
    providerId: "bkash",
    redirectUrl: "https://sandbox.payment.example/redirect",
  });
});

test("bKash callback execution is dispatched through the same provider runtime", async () => {
  let invokedName = "";
  let invokedBody: Record<string, unknown> | null = null;

  const result = await handleRedirectPaymentCallback(
    {
      invokeFunction: async (functionName, body) => {
        invokedName = functionName;
        invokedBody = body;
        return {
          data: {
            success: true,
            order_number: "ORD-1001",
            trxID: "TRX-1",
          },
          error: null,
        };
      },
    },
    {
      providerId: "bkash",
      params: {
        paymentID: "payment-1",
        status: "success",
        order_id: "ORD-1001",
        store_id: "store_1",
      },
    },
  );

  assert.equal(invokedName, "bkash-payment");
  assert.deepEqual(invokedBody, {
    action: "execute",
    paymentID: "payment-1",
    order_id: "ORD-1001",
    store_id: "store_1",
  });
  assert.deepEqual(result, {
    providerId: "bkash",
    status: "success",
    message: "Payment successful! Redirecting to confirmation page...",
    orderNumber: "ORD-1001",
    storeId: "store_1",
  });
});

test("provider cancellation without payment identity does not guess which reservation to release", async () => {
  let invokeCount = 0;
  const result = await handleRedirectPaymentCallback(
    {
      invokeFunction: async () => {
        invokeCount += 1;
        return { data: null, error: null };
      },
    },
    {
      providerId: "bkash",
      params: {
        status: "cancel",
        order_id: "ORD-1001",
        store_id: "store_1",
      },
    },
  );

  assert.equal(invokeCount, 0);
  assert.equal(result.status, "cancelled");
  assert.equal(result.storeId, "store_1");
  assert.equal(result.retryable, false);
});

test("provider failure without payment identity does not guess which reservation to release", async () => {
  let invokeCount = 0;
  const result = await handleRedirectPaymentCallback(
    {
      invokeFunction: async () => {
        invokeCount += 1;
        return { data: null, error: null };
      },
    },
    {
      providerId: "bkash",
      params: {
        status: "failure",
        order_id: "ORD-1001",
        store_id: "store_1",
      },
    },
  );

  assert.equal(invokeCount, 0);
  assert.equal(result.status, "error");
  assert.equal(result.retryable, false);
});


test("bound provider cancellation releases the exact reservation and is not retryable", async () => {
  let invokedBody: Record<string, unknown> | null = null;
  const result = await handleRedirectPaymentCallback(
    {
      invokeFunction: async (_functionName, body) => {
        invokedBody = body;
        return {
          data: { success: true, reservation_released: true, attempt_state: "cancelled", order_status: "cancelled" },
          error: null,
        };
      },
    },
    {
      providerId: "bkash",
      params: {
        paymentID: "payment-1",
        status: "cancel",
        order_id: "ORD-1001",
        store_id: "store_1",
      },
    },
  );

  assert.deepEqual(invokedBody, {
    action: "release",
    paymentID: "payment-1",
    order_id: "ORD-1001",
    store_id: "store_1",
    reason: "provider_cancelled",
  });
  assert.equal(result.status, "cancelled");
  assert.equal(result.reservationReleased, true);
  assert.equal(result.retryable, false);
});

test("bound provider final failure releases the exact reservation and is not retryable", async () => {
  let invokedBody: Record<string, unknown> | null = null;
  const result = await handleRedirectPaymentCallback(
    {
      invokeFunction: async (_functionName, body) => {
        invokedBody = body;
        return {
          data: { success: true, reservation_released: true, attempt_state: "failed", order_status: "cancelled" },
          error: null,
        };
      },
    },
    {
      providerId: "bkash",
      params: {
        paymentID: "payment-1",
        status: "failure",
        order_id: "ORD-1001",
        store_id: "store_1",
      },
    },
  );

  assert.deepEqual(invokedBody, {
    action: "release",
    paymentID: "payment-1",
    order_id: "ORD-1001",
    store_id: "store_1",
    reason: "provider_failed",
  });
  assert.equal(result.status, "error");
  assert.equal(result.reservationReleased, true);
  assert.equal(result.retryable, false);
});


test("concurrent execute loser is processing and never advertised as retry-safe", async () => {
  const result = await handleRedirectPaymentCallback(
    {
      invokeFunction: async () => ({
        data: {
          success: false,
          payment_processing: true,
          retryable: false,
          error: "This payment is already being processed. Do not submit another payment.",
        },
        error: null,
      }),
    },
    {
      providerId: "bkash",
      params: {
        paymentID: "payment-1",
        status: "success",
        order_id: "ORD-1001",
        store_id: "store_1",
      },
    },
  );

  assert.equal(result.status, "error");
  assert.equal(result.paymentProcessing, true);
  assert.equal(result.retryable, false);
});

test("settlement verification errors are not declared retry-safe", async () => {
  const result = await handleRedirectPaymentCallback(
    {
      invokeFunction: async () => ({
        data: { success: false, error: "Payment succeeded but order confirmation failed" },
        error: null,
      }),
    },
    {
      providerId: "bkash",
      params: {
        paymentID: "payment-1",
        status: "success",
        order_id: "ORD-1001",
        store_id: "store_1",
      },
    },
  );

  assert.equal(result.status, "error");
  assert.equal(result.retryable, false);
  assert.match(result.message, /order confirmation failed/i);
});

test("inactive or unknown checkout providers fail closed", async () => {
  assert.equal(getPaymentCheckoutRuntimeAdapter("stripe"), null);

  await assert.rejects(
    initializeRedirectPayment(
      {
        invokeFunction: async () => ({ data: null, error: null }),
      },
      {
        providerId: "stripe",
        storeId: "store_1",
        orderNumber: "ORD-1001",
        amount: 1490,
      },
    ),
    /not available for redirect checkout/i,
  );

  const callback = await handleRedirectPaymentCallback(
    { invokeFunction: async () => ({ data: null, error: null }) },
    { providerId: "stripe", params: {} },
  );
  assert.equal(callback.status, "error");
});

test("provider initialization failures preserve the provider error and tell shoppers how to recover", async () => {
  await assert.rejects(
    initializeRedirectPayment(
      {
        invokeFunction: async () => ({
          data: { success: false, error: "Provider rejected payment initialization" },
          error: null,
        }),
      },
      {
        providerId: "bkash",
        storeId: "store_1",
        orderNumber: "ORD-1001",
        amount: 1490,
      },
    ),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /Provider rejected payment initialization/);
      assert.match(error.message, /order is reserved/i);
      assert.match(error.message, /retry the same payment method/i);
      return true;
    },
  );
});
