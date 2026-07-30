import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const sqlFile = path.join(repoRoot, "supabase", "migrations", "rls_smoke_can_manage_store.sql");
const sqlFileArg = path.relative(repoRoot, sqlFile);

const databaseUrl =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!existsSync(sqlFile)) {
  console.error(`RLS smoke SQL not found: ${sqlFile}`);
  process.exit(1);
}

const result = databaseUrl
  ? spawnSync(
      process.platform === "win32" ? "psql.exe" : "psql",
      ["-v", "ON_ERROR_STOP=1", "-f", sqlFile, databaseUrl],
      {
        cwd: repoRoot,
        stdio: "inherit",
      },
    )
  : process.platform === "win32"
    ? spawnSync(
        "cmd.exe",
        ["/d", "/s", "/c", `supabase.cmd db query --linked --file ${sqlFileArg}`],
        {
          cwd: repoRoot,
          stdio: "inherit",
        },
      )
    : spawnSync(
        "supabase",
        ["db", "query", "--linked", "--file", sqlFileArg],
        {
          cwd: repoRoot,
          stdio: "inherit",
        },
      );

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
