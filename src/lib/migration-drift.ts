export type MigrationExceptionClassification = "non-production" | "pending-production";

export type MigrationException = {
  name: string;
  classification: MigrationExceptionClassification;
  reason: string;
};

export type MigrationDriftResult = {
  missing: string[];
  allowedMissing: MigrationException[];
  productionOnly: string[];
  staleExceptions: MigrationException[];
  resolvedPendingExceptions: MigrationException[];
  unexpectedlyAppliedNonProduction: MigrationException[];
};

const timestampPrefix = /^\d{14}_/;
const migrationFilePattern = /^(?:\d{2}|\d{14})_.+\.sql$/i;

export function isRepositoryMigrationFile(value: string) {
  const fileName = value.replace(/\\/g, "/").split("/").pop() ?? value;
  return migrationFilePattern.test(fileName);
}

export function canonicalMigrationName(value: string) {
  const fileName = value.replace(/\\/g, "/").split("/").pop() ?? value;
  return fileName.replace(/\.sql$/i, "").replace(timestampPrefix, "");
}

function sorted(values: Iterable<string>) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

export function compareMigrationDrift(
  repositoryFiles: string[],
  appliedMigrationNames: string[],
  exceptions: MigrationException[],
): MigrationDriftResult {
  const repositoryNames = new Set(
    repositoryFiles
      .filter(isRepositoryMigrationFile)
      .map(canonicalMigrationName),
  );
  const appliedNames = new Set(appliedMigrationNames.map(canonicalMigrationName));
  const exceptionByName = new Map(
    exceptions.map((exception) => [canonicalMigrationName(exception.name), exception]),
  );

  const missing: string[] = [];
  const allowedMissing: MigrationException[] = [];

  for (const migrationName of repositoryNames) {
    if (appliedNames.has(migrationName)) continue;
    const exception = exceptionByName.get(migrationName);
    if (exception) {
      allowedMissing.push(exception);
    } else {
      missing.push(migrationName);
    }
  }

  const staleExceptions = exceptions.filter(
    (exception) => !repositoryNames.has(canonicalMigrationName(exception.name)),
  );
  const resolvedPendingExceptions = exceptions.filter(
    (exception) =>
      exception.classification === "pending-production" &&
      appliedNames.has(canonicalMigrationName(exception.name)),
  );
  const unexpectedlyAppliedNonProduction = exceptions.filter(
    (exception) =>
      exception.classification === "non-production" &&
      appliedNames.has(canonicalMigrationName(exception.name)),
  );

  return {
    missing: sorted(missing),
    allowedMissing: [...allowedMissing].sort((left, right) => left.name.localeCompare(right.name)),
    productionOnly: sorted(
      [...appliedNames].filter((migrationName) => !repositoryNames.has(migrationName)),
    ),
    staleExceptions: [...staleExceptions].sort((left, right) => left.name.localeCompare(right.name)),
    resolvedPendingExceptions: [...resolvedPendingExceptions].sort((left, right) => left.name.localeCompare(right.name)),
    unexpectedlyAppliedNonProduction: [...unexpectedlyAppliedNonProduction].sort((left, right) => left.name.localeCompare(right.name)),
  };
}

export function migrationDriftHasErrors(result: MigrationDriftResult) {
  return (
    result.missing.length > 0 ||
    result.staleExceptions.length > 0 ||
    result.resolvedPendingExceptions.length > 0 ||
    result.unexpectedlyAppliedNonProduction.length > 0
  );
}
