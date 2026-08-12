import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  buildBlockRegistrySeedRows,
  buildThemePackageSeedRows,
} from "../src/lib/cms/library-sync";

function parseEnvFile(content: string) {
  const entries: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\""))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      entries[key] = value;
    }
  }

  return entries;
}

function loadLocalEnv() {
  const envFiles = [".env.local", ".env"];

  for (const fileName of envFiles) {
    const filePath = path.resolve(process.cwd(), fileName);
    if (!existsSync(filePath)) continue;
    const parsed = parseEnvFile(readFileSync(filePath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      process.env[key] ??= value;
    }
  }
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  loadLocalEnv();

  const supabase = createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const themeRows = buildThemePackageSeedRows();
  const blockRows = buildBlockRegistrySeedRows();

  const [
    themeResult,
    blockResult,
  ] = await Promise.all([
    supabase.from("theme_packages").upsert(themeRows, { onConflict: "slug" }),
    supabase.from("block_registry_entries").upsert(blockRows, { onConflict: "block_type" }),
  ]);

  const failures = [
    ["theme_packages", themeResult.error],
    ["block_registry_entries", blockResult.error],
  ].filter(([, error]) => Boolean(error));

  if (failures.length > 0) {
    throw new Error(
      failures
        .map(([table, error]) => `${table}: ${(error as Error).message}`)
        .join("\n"),
    );
  }

  console.log(
    JSON.stringify({
      synced: {
        theme_packages: themeRows.length,
        block_registry_entries: blockRows.length,
      },
    }, null, 2),
  );
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
