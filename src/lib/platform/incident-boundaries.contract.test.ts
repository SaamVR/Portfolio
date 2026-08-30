import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("billing unexpected incidents are armed only after a valid authorized event reaches processing", () => {
  const route = source("src/app/api/billing/webhook/route.ts");
  const authorization = route.indexOf("if (!isAuthorizedWebhook(req))");
  const payloadContext = route.indexOf("incidentPayload = parsed;");
  const incident = route.indexOf("billing-webhook-processing-failed");
  assert.ok(authorization >= 0);
  assert.ok(payloadContext > authorization);
  assert.ok(incident > payloadContext);
});

test("courier unexpected incidents are armed only after store authorization", () => {
  const route = source("src/app/api/couriers/book/route.ts");
  const forbidden = route.indexOf("if (!authorized)");
  const context = route.indexOf("incidentContext = { storeId, orderId, connectionId };");
  const incident = route.indexOf("courier-booking-processing-failed");
  assert.ok(forbidden >= 0);
  assert.ok(context > forbidden);
  assert.ok(incident > context);
});

test("store deletion incident is emitted only around the authorized transactional command", () => {
  const route = source("src/app/api/stores/delete/route.ts");
  const transaction = route.indexOf("deleteStoreRouteDeps.runDeleteStoreTransaction(supabaseAdmin");
  const incident = route.indexOf("store-delete-transaction-failed");
  assert.ok(transaction >= 0);
  assert.ok(incident > transaction);
  assert.doesNotMatch(route.slice(0, transaction), /store-delete-transaction-failed/);
});

test("store restore incidents distinguish ambiguous outcomes from rollback-safe failures", () => {
  const route = source("src/app/api/store-backups/restore/commit/route.ts");
  const transaction = route.indexOf('rpc("restore_store_backup_transactional"');
  const ambiguous = route.indexOf("store-restore-outcome-ambiguous");
  const rolledBack = route.indexOf("store-restore-transaction-rolled-back");
  assert.ok(transaction >= 0);
  assert.ok(ambiguous > transaction);
  assert.ok(rolledBack > transaction);
  assert.match(route, /severity:\s*"critical"[\s\S]*store-restore-outcome-ambiguous|store-restore-outcome-ambiguous[\s\S]*severity:\s*"critical"/);
});

test("restore reconciliation incidents are gated on an already committed restore", () => {
  const route = source("src/app/api/store-backups/restore/reconcile/route.ts");
  const committedContext = route.indexOf("committedStoreId = operation.target_store_id;");
  const incident = route.indexOf("store-restore-reconciliation-required");
  assert.ok(committedContext >= 0);
  assert.ok(incident > committedContext);
});

test("touched high-signal routes sanitize runtime log errors", () => {
  for (const path of [
    "src/app/api/billing/webhook/route.ts",
    "src/app/api/couriers/book/route.ts",
    "src/app/api/stores/delete/route.ts",
    "src/app/api/store-backups/restore/commit/route.ts",
    "src/app/api/store-backups/restore/reconcile/route.ts",
  ]) {
    const route = source(path);
    assert.match(route, /sanitizeIncidentText/);
  }
});
