export type PaymentAttemptClaim = {
  attempt_id?: string | null;
  attempt_state?: string | null;
  claimed?: boolean | null;
  provider_transaction_id?: string | null;
  order_number?: string | null;
};

export type ProviderProbe =
  | { kind: "completed"; trxId: string; evidence: Record<string, unknown> }
  | { kind: "pending"; evidence: Record<string, unknown> }
  | { kind: "failed"; evidence: Record<string, unknown> }
  | { kind: "unknown"; reason: string; evidence: Record<string, unknown> };

export type PaymentExecutionResult =
  | { kind: "success"; trxId: string; orderNumber: string; idempotent: boolean }
  | { kind: "processing"; message: string }
  | { kind: "stale"; state: string; message: string }
  | { kind: "failed"; message: string }
  | { kind: "reconciliation_required"; message: string };

export type BkashExecutionLifecycleDeps = {
  claim: () => Promise<PaymentAttemptClaim>;
  executeProvider: () => Promise<ProviderProbe>;
  queryProvider: () => Promise<ProviderProbe>;
  finalize: (attemptId: string, trxId: string, evidence: Record<string, unknown>) => Promise<{
    finalized: boolean;
    attemptState: string;
    orderNumber: string;
    trxId: string;
  }>;
  markReconciliation: (attemptId: string, reason: string, evidence: Record<string, unknown>) => Promise<void>;
  failExecution: (attemptId: string, reason: string, evidence: Record<string, unknown>) => Promise<void>;
};

async function finalizeCompleted(
  deps: BkashExecutionLifecycleDeps,
  attemptId: string,
  probe: Extract<ProviderProbe, { kind: "completed" }>,
): Promise<PaymentExecutionResult> {
  try {
    const result = await deps.finalize(attemptId, probe.trxId, probe.evidence);
    if (result.finalized) {
      return {
        kind: "success",
        trxId: result.trxId,
        orderNumber: result.orderNumber,
        idempotent: false,
      };
    }

    await deps.markReconciliation(
      attemptId,
      `provider_success_not_finalized:${result.attemptState}`,
      probe.evidence,
    );
    return {
      kind: "reconciliation_required",
      message: "Payment completed at bKash but local confirmation requires reconciliation.",
    };
  } catch (error) {
    const reason = error instanceof Error && error.message.trim()
      ? `provider_success_persistence_failure:${error.message.trim()}`
      : "provider_success_persistence_failure";
    try {
      await deps.markReconciliation(attemptId, reason, probe.evidence);
    } catch {
      // The durable attempt remains in executing. The database expiry worker
      // promotes stale execute claims to reconciliation_required.
    }
    return {
      kind: "reconciliation_required",
      message: "Payment completed at bKash but local confirmation requires reconciliation.",
    };
  }
}

export async function runBkashExecutionLifecycle(
  deps: BkashExecutionLifecycleDeps,
): Promise<PaymentExecutionResult> {
  const claim = await deps.claim();
  const state = String(claim.attempt_state ?? "missing");
  const attemptId = typeof claim.attempt_id === "string" ? claim.attempt_id : "";

  if (state === "succeeded" && claim.provider_transaction_id && claim.order_number) {
    return {
      kind: "success",
      trxId: claim.provider_transaction_id,
      orderNumber: claim.order_number,
      idempotent: true,
    };
  }

  if (!attemptId) {
    return { kind: "stale", state, message: "Payment session is not bound to this order." };
  }

  if (state === "reconciliation_required") {
    const probe = await deps.queryProvider();
    if (probe.kind === "completed") {
      return finalizeCompleted(deps, attemptId, probe);
    }

    if (probe.kind === "failed") {
      await deps.failExecution(attemptId, "provider_reconciled_final_failure", probe.evidence);
      return {
        kind: "failed",
        message: "bKash confirmed that the payment failed. The order reservation was released.",
      };
    }

    // An earlier execute crossed the irreversible boundary. An Initiated/pending
    // query is explicitly not terminal, so never release scarce resources from it.
    const reason = probe.kind === "unknown"
      ? `reconciliation_query_unknown:${probe.reason}`
      : "reconciliation_query_pending";
    await deps.markReconciliation(attemptId, reason, probe.evidence);
    return {
      kind: "reconciliation_required",
      message: "Payment status is still being reconciled. Do not submit another payment.",
    };
  }

  if (state === "executing" && claim.claimed !== true) {
    return {
      kind: "processing",
      message: "This payment is already being processed. Do not submit another payment.",
    };
  }

  if (claim.claimed !== true) {
    return {
      kind: "stale",
      state,
      message: state === "expired"
        ? "This payment session expired. Return to checkout to start a fresh payment."
        : "This payment session is no longer executable.",
    };
  }

  let executeProbe: ProviderProbe;
  try {
    executeProbe = await deps.executeProvider();
  } catch (error) {
    const reason = error instanceof Error && error.message.trim()
      ? `execute_transport_unknown:${error.message.trim()}`
      : "execute_transport_unknown";
    await deps.markReconciliation(attemptId, reason, {});
    return {
      kind: "reconciliation_required",
      message: "bKash execution returned an uncertain result. Do not submit another payment while it is reconciled.",
    };
  }

  if (executeProbe.kind === "completed") {
    return finalizeCompleted(deps, attemptId, executeProbe);
  }

  if (executeProbe.kind === "unknown") {
    await deps.markReconciliation(attemptId, `execute_unknown:${executeProbe.reason}`, executeProbe.evidence);
    return {
      kind: "reconciliation_required",
      message: "bKash execution returned an uncertain result. Do not submit another payment while it is reconciled.",
    };
  }

  // Failed/pending Execute responses are not sufficient release authority by
  // themselves. Query Payment once; only a terminal provider failure may free
  // stock/coupon capacity. This never calls Execute a second time.
  let queryProbe: ProviderProbe;
  try {
    queryProbe = await deps.queryProvider();
  } catch (error) {
    const reason = error instanceof Error && error.message.trim()
      ? `post_execute_query_unknown:${error.message.trim()}`
      : "post_execute_query_unknown";
    await deps.markReconciliation(attemptId, reason, executeProbe.evidence);
    return {
      kind: "reconciliation_required",
      message: "The payment result is uncertain and requires reconciliation. Do not submit another payment.",
    };
  }

  if (queryProbe.kind === "completed") {
    return finalizeCompleted(deps, attemptId, queryProbe);
  }

  if (queryProbe.kind === "failed") {
    await deps.failExecution(attemptId, "provider_final_failure", queryProbe.evidence);
    return {
      kind: "failed",
      message: "bKash reported a final payment failure. The order reservation was released.",
    };
  }

  const reason = queryProbe.kind === "unknown"
    ? `post_execute_query_unknown:${queryProbe.reason}`
    : "post_execute_query_pending";
  await deps.markReconciliation(attemptId, reason, queryProbe.evidence);
  return {
    kind: "reconciliation_required",
    message: "The payment result is not terminal and requires reconciliation. Do not submit another payment.",
  };
}
