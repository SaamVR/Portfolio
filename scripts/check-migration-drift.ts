import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  compareMigrationDrift,
  isRepositoryMigrationFile,
  migrationDriftHasErrors,
  type MigrationException,
  type MigrationExceptionClassification,
} from "../src/lib/migration-drift";

type LedgerSnapshot = {
  captured_at?: string;
  source?: string;
  project_ref?: string;
  applied_names: string[];
};

type DriftPolicy = {
  exceptions: MigrationException[];
};

const root = process.cwd();
const migrationsDirectory = path.resolve(root, "supabase/migrations");
const ledgerPath = path.resolve(
  root,
  process.env.MIGRATION_LEDGER_FILE ?? "supabase/production-migration-ledger.json",
);
const policyPath = path.resolve(
  root,
  process.env.MIGRATION_DRIFT_POLICY_FILE ?? "supabase/migration-drift-policy.json",
);

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function assertLedger(value: LedgerSnapshot) {
  if (!value || !Array.isArray(value.applied_names) || value.applied_names.some((name) => typeof name !== "string" || !name.trim())) {
    throw new Error("Production migration ledger must contain a non-empty string array at applied_names.");
  }
}

function isClassification(value: unknown): value is MigrationExceptionClassification {
  return value === "non-production" || value === "pending-production";
}

function assertPolicy(value: DriftPolicy) {
  if (!value || !Array.isArray(value.exceptions)) {
    throw new Error("Migration drift policy must contain an exceptions array.");
  }

  for (const exception of value.exceptions) {
    if (
      !exception ||
      typeof exception.name !== "string" ||
      !exception.name.trim() ||
      !isClassification(exception.classification) ||
      typeof exception.reason !== "string" ||
      !exception.reason.trim()
    ) {
      throw new Error("Every migration exception requires name, classification, and reason.");
    }
  }
}

function printNames(title: string, values: string[]) {
  if (values.length === 0) return;
  console.log(`\n${title}`);
  for (const value of values) console.log(`  - ${value}`);
}

async function main() {
  const [repositoryFiles, ledger, policy] = await Promise.all([
    readdir(migrationsDirectory),
    readJson<LedgerSnapshot>(ledgerPath),
    readJson<DriftPolicy>(policyPath),
  ]);

  assertLedger(ledger);
  assertPolicy(policy);

  const result = compareMigrationDrift(repositoryFiles, ledger.applied_names, policy.exceptions);

  console.log("Production migration drift guard");
  console.log(`  repo migrations: ${repositoryFiles.filter(isRepositoryMigrationFile).length}`);
  console.log(`  applied migration names: ${new Set(ledger.applied_names).size}`);
  if (ledger.captured_at) console.log(`  ledger captured: ${ledger.captured_at}`);

  if (result.allowedMissing.length > 0) {
    console.log("\nExplicitly classified repository migrations not applied to production");
    for (const exception of result.allowedMissing) {
      console.log(`  - ${exception.name} [${exception.classification}]: ${exception.reason}`);
    }
  }

  printNames("ERROR: unclassified repository migrations missing from production", result.missing);
  printNames("Historical production-only migration names (informational)", result.productionOnly);
  printNames(
    "ERROR: stale migration exceptions that no longer match a repository migration",
    result.staleExceptions.map((exception) => exception.name),
  );
  printNames(
    "ERROR: pending-production exceptions already applied; update the ledger snapshot and remove the exception",
    result.resolvedPendingExceptions.map((exception) => exception.name),
  );
  printNames(
    "ERROR: non-production exceptions unexpectedly present in production",
    result.unexpectedlyAppliedNonProduction.map((exception) => exception.name),
  );

  if (migrationDriftHasErrors(result)) {
    process.exitCode = 1;
    return;
  }

  console.log("\nMigration drift guard passed.");
}

main().catch((error) => {
  console.error("Migration drift guard could not run:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
