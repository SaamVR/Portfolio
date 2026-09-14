import assert from "node:assert/strict";
import { describe, it } from "@/test/test-utils";
import {
  runBkashExecutionLifecycle,
  type BkashExecutionLifecycleDeps,
  type PaymentAttemptClaim,
  type ProviderProbe,
} from "../../../supabase/functions/bkash-payment/lifecycle.ts";

function completed(trxId = "TRX-1"): ProviderProbe {
  return { kind: "completed", trxId, evidence: { transactionStatus: "Completed", trxID: trxId } };
}

function pending(): ProviderProbe {
  return { kind: "pending", evidence: { transactionStatus: "Initiated" } };
}

function failed(): ProviderProbe {
  return { kind: "failed", evidence: { transactionStatus: "Failed" } };
}

function deps(overrides: Partial<BkashExecutionLifecycleDeps> = {}): BkashExecutionLifecycleDeps {
  return {
    claim: async () => ({ attempt_id: "attempt-1", attempt_state: "executing", claimed: true, order_number: "ORDER-1" }),
    executeProvider: async () => completed(),
    queryProvider: async () => completed(),
    finalize: async (_attemptId, trxId) => ({ finalized: true, attemptState: "succeeded", orderNumber: "ORDER-1", trxId }),
    markReconciliation: async () => undefined,
    failExecution: async () => undefined,
    ...overrides,
  };
}

describe("bKash irreversible execution lifecycle", () => {
  it("allows only one simultaneous claimant to cross provider execute", async () => {
    let state = "created";
    let executeCalls = 0;
    let releaseExecute!: () => void;
    const executeGate = new Promise<void>((resolve) => { releaseExecute = resolve; });

    const sharedClaim = async (): Promise<PaymentAttemptClaim> => {
      if (state === "created") {
        state = "executing";
        return { attempt_id: "attempt-1", attempt_state: "executing", claimed: true, order_number: "ORDER-1" };
      }
      return { attempt_id: "attempt-1", attempt_state: state, claimed: false, order_number: "ORDER-1" };
    };

    const shared = deps({
      claim: sharedClaim,
      executeProvider: async () => {
        executeCalls += 1;
        await executeGate;
        return completed();
      },
      finalize: async (_attemptId, trxId) => {
        state = "succeeded";
        return { finalized: true, attemptState: state, orderNumber: "ORDER-1", trxId };
      },
    });

    const winner = runBkashExecutionLifecycle(shared);
    const loser = await runBkashExecutionLifecycle(shared);
    assert.equal(loser.kind, "processing");
    assert.equal(executeCalls, 1);
    releaseExecute();
    assert.equal((await winner).kind, "success");
    assert.equal(executeCalls, 1);
  });

  it("rejects an unbound second payment ID without executing it", async () => {
    let executeCalls = 0;
    const result = await runBkashExecutionLifecycle(deps({
      claim: async () => ({ attempt_state: "unbound", claimed: false }),
      executeProvider: async () => { executeCalls += 1; return completed(); },
    }));

    assert.equal(result.kind, "stale");
    assert.equal(executeCalls, 0);
  });

  it("turns timeout-after-provider-call into reconciliation and never re-executes on retry", async () => {
    let executeCalls = 0;
    let reconciliationMarks = 0;
    const first = await runBkashExecutionLifecycle(deps({
      executeProvider: async () => {
        executeCalls += 1;
        throw new Error("socket timeout");
      },
      markReconciliation: async () => { reconciliationMarks += 1; },
    }));
    assert.equal(first.kind, "reconciliation_required");
    assert.equal(executeCalls, 1);
    assert.equal(reconciliationMarks, 1);

    const second = await runBkashExecutionLifecycle(deps({
      claim: async () => ({ attempt_id: "attempt-1", attempt_state: "reconciliation_required", claimed: false, order_number: "ORDER-1" }),
      executeProvider: async () => { executeCalls += 1; return completed(); },
      queryProvider: async () => completed("TRX-TIMEOUT"),
    }));
    assert.equal(second.kind, "success");
    assert.equal(executeCalls, 1);
  });

  it("persists reconciliation intent when local finalization fails after provider success", async () => {
    let reconciliationMarks = 0;
    const result = await runBkashExecutionLifecycle(deps({
      finalize: async () => { throw new Error("database unavailable"); },
      markReconciliation: async () => { reconciliationMarks += 1; },
    }));

    assert.equal(result.kind, "reconciliation_required");
    assert.equal(reconciliationMarks, 1);
  });

  it("makes duplicate successful callbacks idempotent without another provider call", async () => {
    let executeCalls = 0;
    const result = await runBkashExecutionLifecycle(deps({
      claim: async () => ({
        attempt_id: "attempt-1",
        attempt_state: "succeeded",
        claimed: false,
        provider_transaction_id: "TRX-DONE",
        order_number: "ORDER-1",
      }),
      executeProvider: async () => { executeCalls += 1; return completed(); },
    }));

    assert.deepEqual(result, { kind: "success", trxId: "TRX-DONE", orderNumber: "ORDER-1", idempotent: true });
    assert.equal(executeCalls, 0);
  });

  it("rejects stale sessions without provider execution", async () => {
    let executeCalls = 0;
    const result = await runBkashExecutionLifecycle(deps({
      claim: async () => ({ attempt_id: "attempt-1", attempt_state: "expired", claimed: false, order_number: "ORDER-1" }),
      executeProvider: async () => { executeCalls += 1; return completed(); },
    }));

    assert.equal(result.kind, "stale");
    assert.equal(executeCalls, 0);
  });

  it("releases a definitive provider failure only after Query Payment reports a terminal failure", async () => {
    let failedCalls = 0;
    const result = await runBkashExecutionLifecycle(deps({
      executeProvider: async () => failed(),
      queryProvider: async () => failed(),
      failExecution: async () => { failedCalls += 1; },
    }));

    assert.equal(result.kind, "failed");
    assert.equal(failedCalls, 1);
  });

  it("does not release when Query Payment still reports Initiated", async () => {
    let failedCalls = 0;
    let marked = 0;
    const result = await runBkashExecutionLifecycle(deps({
      executeProvider: async () => failed(),
      queryProvider: async () => pending(),
      failExecution: async () => { failedCalls += 1; },
      markReconciliation: async () => { marked += 1; },
    }));

    assert.equal(result.kind, "reconciliation_required");
    assert.equal(failedCalls, 0);
    assert.equal(marked, 1);
  });

  it("releases a reconciliation attempt once Query Payment later proves terminal failure", async () => {
    let failedCalls = 0;
    const result = await runBkashExecutionLifecycle(deps({
      claim: async () => ({ attempt_id: "attempt-1", attempt_state: "reconciliation_required", claimed: false, order_number: "ORDER-1" }),
      queryProvider: async () => failed(),
      failExecution: async () => { failedCalls += 1; },
    }));

    assert.equal(result.kind, "failed");
    assert.equal(failedCalls, 1);
  });

  it("keeps an Initiated reconciliation attempt quarantined", async () => {
    let failedCalls = 0;
    let marked = 0;
    const result = await runBkashExecutionLifecycle(deps({
      claim: async () => ({ attempt_id: "attempt-1", attempt_state: "reconciliation_required", claimed: false, order_number: "ORDER-1" }),
      queryProvider: async () => pending(),
      failExecution: async () => { failedCalls += 1; },
      markReconciliation: async () => { marked += 1; },
    }));

    assert.equal(result.kind, "reconciliation_required");
    assert.equal(failedCalls, 0);
    assert.equal(marked, 1);
  });
});
