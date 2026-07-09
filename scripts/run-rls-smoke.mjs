import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const sqlFile = path.join(repoRoot, "supabase", "migrations", "rls_smoke_can_manage_store.sql");

const databaseUrl =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!existsSync(sqlFile)) {
  console.error(`RLS smoke SQL not found: ${sqlFile}`);
  process.exit(1);
}

if (!databaseUrl) {
  console.error(
    "Missing database connection string. Set SUPABASE_DB_URL, DATABASE_URL, POSTGRES_URL, or POSTGRES_PRISMA_URL.",
  );
  process.exit(1);
}

const result = spawnSync(
  "psql",
  ["-v", "ON_ERROR_STOP=1", "-f", sqlFile, databaseUrl],
  {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (result.error) {
  if (result.error.code === "ENOENT") {
    console.error("psql was not found on PATH. Install PostgreSQL client tools or add psql to PATH.");
  } else {
    console.error(result.error.message);
  }
  process.exit(1);
}

process.exit(result.status ?? 1);
