import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const authoritySql = readFileSync(
  "supabase/migrations/20260914140000_lock_store_invoice_client_authority_308.sql",
  "utf8",
);
const replaySql = readFileSync(
  "supabase/migrations/20260914140500_manual_bkash_transaction_replay_guard_314.sql",
  "utf8",
);

test("#308 removes browser invoice mutation authority while preserving managed reads", () => {
  assert.match(authoritySql, /DROP POLICY IF EXISTS "Store managers can create invoices"/);
  assert.match(authoritySql, /DROP POLICY IF EXISTS "Store managers can update invoices"/);
  assert.match(authoritySql, /REVOKE ALL PRIVILEGES ON TABLE public\.store_invoices FROM anon, authenticated/);
  assert.match(authoritySql, /GRANT SELECT ON TABLE public\.store_invoices TO authenticated/);
  assert.match(authoritySql, /store_invoice_server_authority_required/);
});

test("#314 fails closed on ambiguous history and enforces global normalized uniqueness", () => {
  assert.match(replaySql, /manual_bkash_transaction_reconciliation_required/);
  assert.match(replaySql, /Do not auto-delete paid invoices/);
  assert.match(replaySql, /upper\(btrim\(provider_invoice_id\)\)/);
  assert.match(
    replaySql,
    /CREATE UNIQUE INDEX IF NOT EXISTS store_invoices_bkash_manual_provider_transaction_uidx/,
  );
  assert.match(replaySql, /WHERE provider = 'bkash_manual'/);
  assert.match(replaySql, /store_invoices_bkash_manual_identity_required/);
  assert.match(replaySql, /provider_invoice_id ~ '\^\[A-Z0-9\]\+\$'/);
});

test("#308 also protects the legacy stores.plan entitlement fallback", () => {
  assert.match(authoritySql, /store_plan_server_authority_required/);
  assert.match(authoritySql, /IF NEW\.plan IS DISTINCT FROM 'free'/);
  assert.match(authoritySql, /IF NEW\.plan IS DISTINCT FROM OLD\.plan/);
  assert.match(authoritySql, /BEFORE UPDATE OF plan ON public\.stores/);
});
