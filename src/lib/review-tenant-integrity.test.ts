import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

test("product reviews enforce product/order store consistency in the database", () => {
  const migration = readFileSync(
    path.resolve(root, "supabase/migrations/20260827161000_enforce_product_review_tenant_consistency.sql"),
    "utf8",
  );

  assert.match(migration, /FOREIGN KEY \(product_id, store_id\)[\s\S]*REFERENCES public\.products\(id, store_id\)/);
  assert.match(migration, /FOREIGN KEY \(order_id, store_id\)[\s\S]*REFERENCES public\.orders\(id, store_id\)/);
});

test("backup review preflight runs before destructive target clearing and remapping has no source-id fallback", () => {
  const source = readFileSync(path.resolve(root, "src/components/admin/StoreBackupManager.tsx"), "utf8");
  const preflight = source.indexOf("assertBackupReviewReferences(parsedPackage.data)");
  const clearTarget = source.indexOf("await clearTargetStore(targetStore.id)");

  assert.notEqual(preflight, -1);
  assert.notEqual(clearTarget, -1);
  assert.ok(preflight < clearTarget);
  assert.doesNotMatch(source, /productIdMap\.get\(row\.product_id\) \?\? row\.product_id/);
});
