import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const migration = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260914213500_lock_direct_order_mutations.sql"),
  "utf8",
);

test("shopper and merchant clients cannot mutate orders directly", () => {
  assert.match(migration, /DROP POLICY IF EXISTS "Store managers can manage orders"/i);
  assert.match(migration, /DROP POLICY IF EXISTS "Store staff can update store orders"/i);
  assert.match(
    migration,
    /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.orders FROM anon, authenticated/i,
  );
  assert.match(migration, /GRANT SELECT ON TABLE public\.orders TO anon, authenticated/i);
});

test("order mutation lock-down fails closed if another write policy survives", () => {
  assert.match(migration, /cmd IN \('ALL', 'INSERT', 'UPDATE', 'DELETE'\)/i);
  assert.match(migration, /orders still exposes % direct client write policies/i);
});
