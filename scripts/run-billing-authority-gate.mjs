import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const mode = process.argv[2];
const files = {
  preflight: path.join(repoRoot, "supabase", "tests", "billing_authority_preflight.sql"),
  postdeploy: path.join(repoRoot, "supabase", "tests", "billing_authority_postdeploy.sql"),
};

if (!(mode in files)) {
  console.error("Usage: node scripts/run-billing-authority-gate.mjs <preflight|postdeploy>");
  process.exit(2);
}

const sqlFile = files[mode];
if (!existsSync(sqlFile)) {
  console.error(`Billing authority gate SQL not found: ${sqlFile}`);
  process.exit(1);
}

const databaseUrl =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;
const sqlFileArg = path.relative(repoRoot, sqlFile);

console.log(`Running billing authority ${mode} gate: ${sqlFileArg}`);

const result = databaseUrl
  ? spawnSync(
      process.platform === "win32" ? "psql.exe" : "psql",
      ["-v", "ON_ERROR_STOP=1", "-f", sqlFile, databaseUrl],
      { cwd: repoRoot, stdio: "inherit" },
    )
  : process.platform === "win32"
    ? spawnSync(
        "cmd.exe",
        ["/d", "/s", "/c", `supabase.cmd db query --linked --file ${sqlFileArg}`],
        { cwd: repoRoot, stdio: "inherit" },
      )
    : spawnSync(
        "supabase",
        ["db", "query", "--linked", "--file", sqlFileArg],
        { cwd: repoRoot, stdio: "inherit" },
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
