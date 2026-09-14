import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260914213000_product_link_tenant_consistency.sql",
);
const migration = readFileSync(migrationPath, "utf8");

test("product-linked commerce rows cannot cross store boundaries", () => {
  for (const constraint of [
    "cart_items_product_store_fkey",
    "stock_notifications_product_store_fkey",
    "product_qa_product_store_fkey",
  ]) {
    assert.match(migration, new RegExp(`ADD CONSTRAINT ${constraint}`, "i"));
  }

  assert.match(
    migration,
    /FOREIGN KEY\s*\(product_id,\s*store_id\)\s*REFERENCES public\.products\(id,\s*store_id\)/i,
  );
  assert.match(migration, /ALTER COLUMN store_id SET NOT NULL/i);
});

test("product tenant consistency migration fails closed on historical drift", () => {
  assert.match(migration, /p\.store_id IS DISTINCT FROM c\.store_id/i);
  assert.match(migration, /p\.store_id IS DISTINCT FROM s\.store_id/i);
  assert.match(migration, /p\.store_id IS DISTINCT FROM q\.store_id/i);
  assert.match(migration, /cannot enforce product tenant consistency/i);
});
