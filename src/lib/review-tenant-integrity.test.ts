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

test("restore validation precedes operation claim and the single transactional mutation", () => {
  const preflightSource = readFileSync(
    path.resolve(root, "src/app/api/store-backups/restore/preflight/route.ts"),
    "utf8",
  );
  const commitSource = readFileSync(
    path.resolve(root, "src/app/api/store-backups/restore/commit/route.ts"),
    "utf8",
  );
  const restoreSource = readFileSync(path.resolve(root, "src/lib/store-backup-restore.ts"), "utf8");

  const manifestValidation = preflightSource.indexOf("validateRestoreManifest(body.manifest)");
  const preflightNormalize = preflightSource.indexOf("normalizeStoreRestorePlan(manifest, options, {");
  const preflightValidate = preflightSource.indexOf("assertNormalizedRestorePlanConstraints(dryPlan as Record<string, unknown>)");
  const createOperation = preflightSource.indexOf('rpc("create_store_restore_operation"');

  for (const position of [manifestValidation, preflightNormalize, preflightValidate, createOperation]) {
    assert.notEqual(position, -1);
  }
  assert.ok(manifestValidation < preflightNormalize);
  assert.ok(preflightNormalize < preflightValidate);
  assert.ok(preflightValidate < createOperation);

  const commitNormalize = commitSource.indexOf("normalizeStoreRestorePlan(manifest, options, {");
  const commitValidate = commitSource.indexOf("assertNormalizedRestorePlanConstraints(plan);");
  const claimOperation = commitSource.indexOf('rpc("claim_store_restore_operation"');
  const transactionalRestore = commitSource.indexOf('rpc("restore_store_backup_transactional"');

  for (const position of [commitNormalize, commitValidate, claimOperation, transactionalRestore]) {
    assert.notEqual(position, -1);
  }
  assert.ok(commitNormalize < commitValidate);
  assert.ok(commitValidate < claimOperation);
  assert.ok(claimOperation < transactionalRestore);
  assert.equal((commitSource.match(/rpc\("restore_store_backup_transactional"/g) ?? []).length, 1);

  assert.match(restoreSource, /validateRequiredReferences\(manifest\.data\)/);
  assert.match(restoreSource, /rows\(data,"product_reviews"\)[\s\S]*productIds\.has/);
  assert.match(restoreSource, /function requireMapped\(/);
  assert.doesNotMatch(restoreSource, /product(?:Id)?Map\.get\(row\.product_id\) \?\? row\.product_id/);
});
