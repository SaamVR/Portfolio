import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const sqlFile = path.join(repoRoot, "supabase", "tests", "billing_subscription_consistency.sql");
const sqlFileArg = path.relative(repoRoot, sqlFile);

const databaseUrl =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!existsSync(sqlFile)) {
  console.error(`Billing consistency SQL not found: ${sqlFile}`);
  process.exit(1);
}

let tempSqlFile = null;
let tempSqlFileArg = null;

if (!databaseUrl) {
  tempSqlFile = path.join(repoRoot, ".tmp_billing_subscription_consistency.sql");
  tempSqlFileArg = path.relative(repoRoot, tempSqlFile);
  const sanitizedSql = readFileSync(sqlFile, "utf8")
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("\\"))
    .join("\n");
  writeFileSync(tempSqlFile, sanitizedSql, "utf8");
}

const result = databaseUrl
  ? spawnSync(
      process.platform === "win32" ? "psql.exe" : "psql",
      ["-v", "ON_ERROR_STOP=1", "-f", sqlFileArg, databaseUrl],
      {
        cwd: repoRoot,
        stdio: "inherit",
      },
    )
  : process.platform === "win32"
    ? spawnSync(
        "cmd.exe",
        ["/d", "/s", "/c", `supabase.cmd db query --linked --file ${tempSqlFileArg}`],
        {
          cwd: repoRoot,
          stdio: "inherit",
        },
      )
    : spawnSync(
        "supabase",
        ["db", "query", "--linked", "--file", tempSqlFileArg],
        {
          cwd: repoRoot,
          stdio: "inherit",
        },
      );

if (tempSqlFile) {
  rmSync(tempSqlFile, { force: true });
}

if (result.error) {
  if (result.error.code === "ENOENT") {
    console.error(
      databaseUrl
        ? "psql was not found on PATH. Install PostgreSQL client tools or add psql to PATH."
        : "supabase CLI was not found on PATH.",
    );
  } else {
    console.error(result.error.message);
  }
  process.exit(1);
}

process.exit(result.status ?? 1);
