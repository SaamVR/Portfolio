import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260914205500_storefront_manual_payment_replay_guard.sql",
);
const migration = readFileSync(migrationPath, "utf8");

test("storefront manual payment claims are globally replay-safe", () => {
  assert.match(
    migration,
    /PRIMARY KEY\s*\(provider,\s*normalized_reference\)/i,
    "provider + transaction reference must be globally unique rather than tenant-scoped",
  );
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(migration, /manual payment transaction id is required/i);
  assert.match(migration, /invalid manual payment transaction id: already used/i);
  assert.match(migration, /AFTER INSERT ON public\.orders/i);
});

test("manual payment claims use canonical provider namespaces", () => {
  assert.match(migration, /provider text NOT NULL CHECK \(provider IN \('bkash', 'nagad'\)\)/i);
  assert.match(migration, /WHEN 'bkash_manual' THEN 'bkash'/i);
  assert.match(migration, /WHEN 'nagad' THEN 'nagad'/i);
});

test("consumed manual payment identities survive store and order deletion", () => {
  assert.match(migration, /REFERENCES public\.stores\(id\) ON DELETE SET NULL/i);
  assert.match(migration, /REFERENCES public\.orders\(id\) ON DELETE SET NULL/i);
  assert.equal(/ON DELETE CASCADE/i.test(migration), false);
});

test("storefront manual payment migration reconciles historical claims before enforcing new writes", () => {
  assert.match(migration, /existing duplicate provider\/reference/i);
  assert.match(migration, /INSERT INTO public\.storefront_manual_payment_claims/i);
  assert.match(migration, /bkash_manual/);
  assert.match(migration, /nagad/);
  assert.match(migration, /ON CONFLICT \(provider, normalized_reference\) DO NOTHING/i);
});
