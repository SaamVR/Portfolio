import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("preflight completes server validation before creating the durable operation", () => {
  const route = source("src/app/api/store-backups/restore/preflight/route.ts");
  const dryNormalize = route.indexOf("normalizeStoreRestorePlan(");
  const createOperation = route.indexOf('rpc("create_store_restore_operation"');
  assert.ok(dryNormalize >= 0, "preflight must perform a normalization dry run");
  assert.ok(createOperation > dryNormalize, "durable preflight operation must be created only after zero-write validation");
  assert.match(route, /\["owner",\s*"admin"\]/);
  assert.match(route, /Custom-domain ownership is not portable through backups/);
});

test("commit verifies and normalizes before the running claim, then calls one destructive RPC", () => {
  const route = source("src/app/api/store-backups/restore/commit/route.ts");
  const storageVerification = route.indexOf("Staged restore media is missing or incomplete");
  const normalize = route.indexOf("normalizeStoreRestorePlan(");
  const planValidation = route.indexOf("assertNormalizedRestorePlanConstraints(plan)");
  const claim = route.indexOf('rpc("claim_store_restore_operation"');
  const mutation = route.indexOf('rpc("restore_store_backup_transactional"');
  assert.ok(storageVerification >= 0);
  assert.ok(normalize > storageVerification);
  assert.ok(planValidation > normalize);
  assert.ok(claim > planValidation, "normalization errors must not create a false running operation");
  assert.ok(mutation > claim);
  assert.equal(route.match(/rpc\("restore_store_backup_transactional"/g)?.length, 1);
});

test("ambiguous commit outcomes retain staged media instead of compensating it", () => {
  const route = source("src/app/api/store-backups/restore/commit/route.ts");
  const firstAmbiguous = route.indexOf("Restore RPC transport failed with ambiguous outcome");
  const secondAmbiguous = route.indexOf("Restore RPC returned an ambiguous transport error");
  const structuredFailureCleanup = route.lastIndexOf("cleanupFailedRestore(");
  assert.ok(firstAmbiguous >= 0 && secondAmbiguous > firstAmbiguous);
  assert.ok(structuredFailureCleanup > secondAmbiguous, "media cleanup must happen only after a structured non-commit result");
  const ambiguousRegion = route.slice(firstAmbiguous, structuredFailureCleanup);
  assert.doesNotMatch(ambiguousRegion, /cleanupFailedRestore\(/);
});

test("restore media uses direct signed storage allocation and has no proxy fallback", () => {
  const route = source("src/app/api/store-backups/restore/media/route.ts");
  assert.match(route, /allocate_store_restore_media/);
  assert.match(route, /createSignedUploadUrl/);
  assert.doesNotMatch(route, /proxy-upload|cloudinary/i);
  assert.match(route, /\["owner",\s*"admin"\]/);
});

test("reconciliation is post-commit, whole-store, and never replays DB restore", () => {
  const route = source("src/app/api/store-backups/restore/reconcile/route.ts");
  const helper = source("src/lib/storefront/storefront-restore-reconciliation.ts");
  assert.match(route, /\["committed",\s*"reconciliation_required"\]/);
  assert.match(route, /resetStorefrontSearchDocumentsForStore/);
  assert.doesNotMatch(route, /restore_store_backup_transactional|claim_store_restore_operation/);
  assert.match(helper, /filter_by/);
  assert.match(helper, /store_id:=/);
  assert.match(helper, /upsertStorefrontSearchDocuments\(storeId\)/);
});

test("portable export does not serialize active invite/provider/object identities", () => {
  const manager = source("src/components/admin/StoreBackupManager.tsx");
  assert.match(manager, /delete row\.invite_code/);
  assert.match(manager, /delete row\.provider_subscription_id/);
  assert.match(manager, /delete portable\.publicId/);
  assert.match(manager, /delete portable\.uploadedBy/);
});
