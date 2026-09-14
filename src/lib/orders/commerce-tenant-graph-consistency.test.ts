import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const migration = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260914215900_commerce_tenant_graph_consistency.sql"),
  "utf8",
);

test("commerce tenant graph exposes composite parent identities", () => {
  assert.match(migration, /store_courier_connections_id_store_id_key UNIQUE \(id, store_id\)/i);
  assert.match(migration, /store_cart_recovery_leads_id_store_id_key UNIQUE \(id, store_id\)/i);
  assert.match(migration, /product_categories_id_store_id_key UNIQUE \(id, store_id\)/i);
});

test("commerce tenant graph rejects cross-store child references", () => {
  for (const constraint of [
    "order_shipments_courier_connection_store_fkey",
    "store_courier_credentials_secure_connection_store_fkey",
    "store_cart_recovery_leads_recovered_order_store_fkey",
    "store_cart_recovery_messages_lead_store_fkey",
    "product_categories_parent_store_fkey",
  ]) {
    assert.match(migration, new RegExp(`ADD CONSTRAINT ${constraint}`, "i"));
  }

  assert.match(migration, /ON DELETE SET NULL \(courier_connection_id\)/i);
  assert.match(migration, /ON DELETE SET NULL \(recovered_order_id\)/i);
  assert.match(migration, /ON DELETE SET NULL \(parent_id\)/i);
});

test("commerce tenant graph migration fails closed on historical drift", () => {
  assert.match(migration, /cannot enforce commerce tenant graph consistency/i);
  assert.match(migration, /c\.store_id IS DISTINCT FROM s\.store_id/i);
  assert.match(migration, /o\.store_id IS DISTINCT FROM l\.store_id/i);
  assert.match(migration, /l\.store_id IS DISTINCT FROM m\.store_id/i);
  assert.match(migration, /p\.store_id IS DISTINCT FROM c\.store_id/i);
});
