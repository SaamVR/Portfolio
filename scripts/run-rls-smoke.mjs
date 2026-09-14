import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const sqlFiles = [
  path.join(repoRoot, "supabase", "migrations", "rls_smoke_can_manage_store.sql"),
  path.join(repoRoot, "supabase", "migrations", "rls_smoke_cross_tenant.sql"),
  path.join(repoRoot, "supabase", "migrations", "storefront_routine_acl_smoke.sql"),
  path.join(repoRoot, "supabase", "migrations", "platform_incidents_smoke.sql"),
  path.join(repoRoot, "supabase", "migrations", "order_checkout_safety_smoke.sql"),
  path.join(repoRoot, "supabase", "migrations", "order_authority_smoke.sql"),
  path.join(repoRoot, "supabase", "migrations", "provider_plugin_smoke.sql"),
  path.join(repoRoot, "supabase", "migrations", "order_checkout_recovery_smoke.sql"),
  path.join(repoRoot, "supabase", "migrations", "commerce_hardening_smoke.sql"),
  path.join(repoRoot, "supabase", "migrations", "tenant_reference_consistency_smoke.sql"),
];

const databaseUrl =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

for (const sqlFile of sqlFiles) {
  if (!existsSync(sqlFile)) {
    console.error(`RLS smoke SQL not found: ${sqlFile}`);
    process.exit(1);
  }

  const sqlFileArg = path.relative(repoRoot, sqlFile);
  console.log(`Running RLS smoke: ${sqlFileArg}`);

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

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

process.exit(0);
