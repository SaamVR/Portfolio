import assert from "node:assert/strict";
import { describe, it } from "@/test/test-utils";
import {
  appendBkashPaymentNote,
  assertBkashOrderAwaitingPayment,
  assertBkashProviderPaymentMatchesOrder,
  type BkashOrderPaymentContext,
} from "../../../supabase/functions/bkash-payment/authority.ts";

const pendingBkashOrder: BkashOrderPaymentContext = {
  store_id: "store-1",
  total: 1250,
  status: "pending",
  payment_method: "bkash",
  notes: "Coupon: EID10",
  reservation_state: "reserved",
  reservation_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
};

describe("bKash payment order authority", () => {
  it("allows only pending bKash orders to enter the payment flow", () => {
    assert.doesNotThrow(() => assertBkashOrderAwaitingPayment(pendingBkashOrder));

    assert.throws(
      () => assertBkashOrderAwaitingPayment({ ...pendingBkashOrder, status: "cancelled" }),
      /Order is no longer awaiting bKash payment/,
    );

    assert.throws(
      () => assertBkashOrderAwaitingPayment({ ...pendingBkashOrder, payment_method: "cod" }),
      /Order is not configured for bKash payment/,
    );
  });

  it("matches provider invoice, amount and currency to the authoritative order", () => {
    assert.doesNotThrow(() => assertBkashProviderPaymentMatchesOrder(
      pendingBkashOrder,
      "EZ-1001",
      {
        merchantInvoiceNumber: "EZ-1001",
        amount: "1250",
        currency: "BDT",
      },
    ));

    assert.throws(
      () => assertBkashProviderPaymentMatchesOrder(
        pendingBkashOrder,
        "EZ-1001",
        { merchantInvoiceNumber: "EZ-OTHER", amount: "1250", currency: "BDT" },
      ),
      /Payment invoice did not match the expected order/,
    );

    assert.throws(
      () => assertBkashProviderPaymentMatchesOrder(
        pendingBkashOrder,
        "EZ-1001",
        { merchantInvoiceNumber: "EZ-1001", amount: "1200", currency: "BDT" },
      ),
      /Payment amount did not match the authoritative order total/,
    );

    assert.throws(
      () => assertBkashProviderPaymentMatchesOrder(
        pendingBkashOrder,
        "EZ-1001",
        { merchantInvoiceNumber: "EZ-1001", amount: "1250", currency: "USD" },
      ),
      /Payment currency did not match the order currency/,
    );
  });

  it("requires a completed provider result and transaction id before confirmation", () => {
    assert.doesNotThrow(() => assertBkashProviderPaymentMatchesOrder(
      pendingBkashOrder,
      "EZ-1001",
      {
        merchantInvoiceNumber: "EZ-1001",
        amount: "1250.00",
        currency: "BDT",
        transactionStatus: "Completed",
        trxID: "TRX123",
      },
      { requireCompleted: true },
    ));

    assert.throws(
      () => assertBkashProviderPaymentMatchesOrder(
        pendingBkashOrder,
        "EZ-1001",
        {
          merchantInvoiceNumber: "EZ-1001",
          amount: "1250",
          currency: "BDT",
          transactionStatus: "Initiated",
          trxID: "TRX123",
        },
        { requireCompleted: true },
      ),
      /bKash payment was not completed/,
    );

    assert.throws(
      () => assertBkashProviderPaymentMatchesOrder(
        pendingBkashOrder,
        "EZ-1001",
        {
          merchantInvoiceNumber: "EZ-1001",
          amount: "1250",
          currency: "BDT",
          transactionStatus: "Completed",
        },
        { requireCompleted: true },
      ),
      /bKash response did not include trxID/,
    );
  });

  it("preserves checkout notes when recording the bKash transaction", () => {
    assert.equal(
      appendBkashPaymentNote("Coupon: EID10", "TRX123"),
      "Coupon: EID10 | Paid via bKash. TrxID: TRX123",
    );
    assert.equal(appendBkashPaymentNote(null, "TRX123"), "Paid via bKash. TrxID: TRX123");
  });
});
