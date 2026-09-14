import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260914214000_tenant_owned_reference_consistency.sql",
);
const migration = readFileSync(migrationPath, "utf8");

test("shipments and revenue events cannot reference another store's order", () => {
  assert.match(migration, /order_shipments_order_store_fkey/i);
  assert.match(migration, /store_revenue_events_order_store_fkey/i);
  assert.match(
    migration,
    /FOREIGN KEY\s*\(order_id,\s*store_id\)\s*REFERENCES public\.orders\(id,\s*store_id\)\s*ON DELETE CASCADE/i,
  );
});

test("analytics preserves store attribution when referenced commerce rows are deleted", () => {
  assert.match(migration, /store_analytics_events_order_store_fkey/i);
  assert.match(migration, /store_analytics_events_product_store_fkey/i);
  assert.match(migration, /ON DELETE SET NULL \(order_id\)/i);
  assert.match(migration, /ON DELETE SET NULL \(product_id\)/i);
});

test("tenant reference migration fails closed on historical cross-store drift", () => {
  assert.match(migration, /o\.store_id IS DISTINCT FROM s\.store_id/i);
  assert.match(migration, /o\.store_id IS DISTINCT FROM r\.store_id/i);
  assert.match(migration, /o\.store_id IS DISTINCT FROM a\.store_id/i);
  assert.match(migration, /p\.store_id IS DISTINCT FROM a\.store_id/i);
  assert.match(migration, /cannot enforce tenant-owned reference consistency/i);
});
