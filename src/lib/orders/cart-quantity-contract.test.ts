import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const migration = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260914212000_bound_cart_item_quantity.sql"),
  "utf8",
);

test("persisted cart quantities match the checkout line contract", () => {
  assert.match(migration, /CHECK \(quantity BETWEEN 1 AND 99\)/i);
  assert.match(migration, /quantity < 1 OR quantity > 99/i);
  assert.match(migration, /cart_items_quantity_range/i);
});
