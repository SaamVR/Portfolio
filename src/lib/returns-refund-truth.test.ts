import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(path.resolve(process.cwd(), "src/views/admin/ReturnsOperations.tsx"), "utf8");
const migration = readFileSync(path.resolve(process.cwd(), "supabase/migrations/20260914221000_harden_return_refund_recordkeeping.sql"), "utf8");

test("returns workspace presents refunds as external recordkeeping, not settlement execution", () => {
  assert.match(source, /does not move refund money from this screen/i);
  assert.match(source, /External settlement \/ refund reference/);
  assert.match(source, /Refund recorded externally/);
  assert.match(source, /does not execute the refund/);
});

test("unsupported store credit cannot be selected for new refund cases", () => {
  assert.equal(source.includes('<SelectItem value="store_credit">'), false);
  assert.match(source, /Legacy store-credit mode is unsupported/);
});

test("refund resolution requires an external settlement reference", () => {
  assert.match(source, /requiresSettlementEvidence/);
  assert.match(source, /Record the external refund or settlement reference before marking this case resolved/);
  assert.match(source, /internalNote: settlementNote \|\| null/);
});


test("refund recordkeeping truth is enforced in the database", () => {
  assert.match(migration, /refund_mode IN \('original_payment', 'cod_cash', 'manual_transfer'\)/);
  assert.equal(migration.includes("'store_credit'::text"), false);
  assert.match(migration, /store_return_requests_settlement_evidence_check/);
  assert.match(migration, /return\/refund amount exceeds authoritative order total/);
  assert.match(migration, /trg_enforce_return_amount_within_order_total/);
});
