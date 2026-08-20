export interface BkashOrderPaymentContext {
  store_id: string;
  total: number;
  status: string;
  payment_method: string;
  notes?: string | null;
}

export interface BkashProviderPaymentResult {
  merchantInvoiceNumber?: unknown;
  amount?: unknown;
  currency?: unknown;
  transactionStatus?: unknown;
  trxID?: unknown;
}

function readRequiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`bKash response did not include ${field}`);
  }

  return value.trim();
}

export function assertBkashOrderAwaitingPayment(
  order: BkashOrderPaymentContext | null | undefined,
) {
  if (!order) {
    throw new Error("Order could not be found for payment");
  }

  if (order.payment_method !== "bkash") {
    throw new Error("Order is not configured for bKash payment");
  }

  if (order.status !== "pending") {
    throw new Error("Order is no longer awaiting bKash payment");
  }
}

export function assertBkashProviderPaymentMatchesOrder(
  order: BkashOrderPaymentContext,
  expectedOrderNumber: string,
  payment: BkashProviderPaymentResult,
  options: { requireCompleted?: boolean } = {},
) {
  const invoiceNumber = readRequiredString(payment.merchantInvoiceNumber, "merchantInvoiceNumber");
  if (invoiceNumber !== expectedOrderNumber) {
    throw new Error("Payment invoice did not match the expected order");
  }

  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || Math.abs(amount - Number(order.total)) > 0.01) {
    throw new Error("Payment amount did not match the authoritative order total");
  }

  const currency = readRequiredString(payment.currency, "currency").toUpperCase();
  if (currency !== "BDT") {
    throw new Error("Payment currency did not match the order currency");
  }

  if (options.requireCompleted) {
    const transactionStatus = readRequiredString(payment.transactionStatus, "transactionStatus");
    if (transactionStatus.toLowerCase() !== "completed") {
      throw new Error("bKash payment was not completed");
    }

    readRequiredString(payment.trxID, "trxID");
  }
}

export function appendBkashPaymentNote(existingNotes: string | null | undefined, trxId: string) {
  const paymentNote = `Paid via bKash. TrxID: ${trxId.trim()}`;
  const existing = existingNotes?.trim();

  if (!existing) {
    return paymentNote;
  }

  if (existing.includes(paymentNote)) {
    return existing;
  }

  return `${existing} | ${paymentNote}`;
}
