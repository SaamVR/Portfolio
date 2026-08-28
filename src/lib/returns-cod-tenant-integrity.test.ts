import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

test("returns and COD enforce order/store consistency in the database", () => {
  const migration = readFileSync(
    path.resolve(root, "supabase/migrations/20260828203000_returns_cod_order_store_tenant_consistency.sql"),
    "utf8",
  );
  assert.match(migration, /store_return_requests[\s\S]*FOREIGN KEY \(order_id, store_id\)[\s\S]*REFERENCES public\.orders\(id, store_id\)[\s\S]*ON DELETE CASCADE/);
  assert.match(migration, /store_cod_reconciliation_entries[\s\S]*FOREIGN KEY \(order_id, store_id\)[\s\S]*REFERENCES public\.orders\(id, store_id\)[\s\S]*ON DELETE SET NULL \(order_id\)/);
  assert.equal((migration.match(/VALIDATE CONSTRAINT/g) ?? []).length, 2);
});

test("returns workspace snapshots origin store and clears stale store state", () => {
  const source = readFileSync(path.resolve(root, "src/views/admin/ReturnsOperations.tsx"), "utf8");
  assert.match(source, /previousStoreIdRef/);
  assert.match(source, /previousStoreId !== activeStoreId/);
  assert.match(source, /orders\.find\(\(entry\) => entry\.id === selectedOrderId\)/);
  assert.match(source, /deliveredCodOrders\.find\(\(entry\) => entry\.id === codOrderId\)/);
  assert.match(source, /queryKey: \["returns-ops", variables\.storeId\]/);
  assert.match(source, /activeStoreIdRef\.current === variables\.storeId/);
  assert.match(source, /storeId: activeStoreId/);
});
