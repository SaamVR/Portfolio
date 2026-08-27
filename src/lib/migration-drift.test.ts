import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalMigrationName,
  compareMigrationDrift,
  isRepositoryMigrationFile,
  migrationDriftHasErrors,
  type MigrationException,
} from "./migration-drift";

const demoSeedException: MigrationException = {
  name: "seed_demo_blog_posts",
  classification: "non-production",
  reason: "Legacy fixed demo tenant is intentionally absent from production.",
};

test("repository migration discovery excludes rollback-only smoke SQL files", () => {
  assert.equal(isRepositoryMigrationFile("01_platform_core.sql"), true);
  assert.equal(isRepositoryMigrationFile("20260827161000_enforce_product_review_tenant_consistency.sql"), true);
  assert.equal(isRepositoryMigrationFile("order_authority_smoke.sql"), false);
  assert.equal(isRepositoryMigrationFile("rls_smoke_cross_tenant.sql"), false);
});

test("canonical migration names ignore a 14-digit filename or ledger timestamp", () => {
  assert.equal(
    canonicalMigrationName("20260816201200_fix_lifecycle_status_trigger.sql"),
    "fix_lifecycle_status_trigger",
  );
  assert.equal(
    canonicalMigrationName("20260827170221_fix_lifecycle_status_trigger"),
    "fix_lifecycle_status_trigger",
  );
  assert.equal(canonicalMigrationName("01_platform_core.sql"), "01_platform_core");
});

test("timestamp drift passes when repository and production migration names match", () => {
  const result = compareMigrationDrift(
    ["20260816201200_fix_lifecycle_status_trigger.sql"],
    ["20260827170221_fix_lifecycle_status_trigger"],
    [],
  );

  assert.deepEqual(result.missing, []);
  assert.equal(migrationDriftHasErrors(result), false);
});

test("a real repository migration missing from production fails the guard", () => {
  const result = compareMigrationDrift(
    ["20260816201200_fix_lifecycle_status_trigger.sql", "20260819181500_fix_order_discount_validation.sql"],
    ["fix_lifecycle_status_trigger"],
    [],
  );

  assert.deepEqual(result.missing, ["fix_order_discount_validation"]);
  assert.equal(migrationDriftHasErrors(result), true);
});

test("the demo-only seed is allowed only through an explicit non-production exception", () => {
  const result = compareMigrationDrift(
    ["20260816201000_seed_demo_blog_posts.sql"],
    [],
    [demoSeedException],
  );

  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.allowedMissing, [demoSeedException]);
  assert.equal(migrationDriftHasErrors(result), false);
});

test("historical production-only migrations are reported without failing", () => {
  const result = compareMigrationDrift(
    ["20260820084000_secure_store_preview_tokens.sql"],
    ["secure_store_preview_tokens", "reduce_public_role_privileges"],
    [],
  );

  assert.deepEqual(result.productionOnly, ["reduce_public_role_privileges"]);
  assert.equal(migrationDriftHasErrors(result), false);
});

test("a pending-production exception must be removed once production contains it", () => {
  const pending: MigrationException = {
    name: "future_schema_change",
    classification: "pending-production",
    reason: "Roll out immediately after merging the matching application change.",
  };
  const result = compareMigrationDrift(
    ["20260901000000_future_schema_change.sql"],
    ["20260901010101_future_schema_change"],
    [pending],
  );

  assert.deepEqual(result.resolvedPendingExceptions, [pending]);
  assert.equal(migrationDriftHasErrors(result), true);
});

test("stale exceptions and unexpectedly applied non-production migrations fail closed", () => {
  const stale: MigrationException = {
    name: "removed_migration",
    classification: "pending-production",
    reason: "Should no longer exist.",
  };
  const result = compareMigrationDrift(
    ["20260816201000_seed_demo_blog_posts.sql"],
    ["seed_demo_blog_posts"],
    [demoSeedException, stale],
  );

  assert.deepEqual(result.staleExceptions, [stale]);
  assert.deepEqual(result.unexpectedlyAppliedNonProduction, [demoSeedException]);
  assert.equal(migrationDriftHasErrors(result), true);
});
