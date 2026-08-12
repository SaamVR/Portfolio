import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";

type DomainRow = {
  hostname: string;
  store?: {
    slug?: string;
    is_published?: boolean | null;
  } | null;
};

const execFileAsync = promisify(execFile);

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const unwrapped = rawValue.replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = unwrapped;
    }
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function cloudflareKvPut(hostname: string, storeSlug: string) {
  const namespaceId = requireEnv("CLOUDFLARE_DOMAIN_ROUTING_KV_NAMESPACE_ID");
  const key = `domain:${hostname.trim().toLowerCase().replace(/\.$/, "")}`;
  const value = JSON.stringify({
    storeSlug,
    updatedAt: new Date().toISOString(),
    source: "backfill",
  });

  await execFileAsync(
    "npx.cmd",
    [
      "wrangler",
      "kv",
      "key",
      "put",
      "--namespace-id",
      namespaceId,
      key,
      value,
      "--remote",
    ],
    { cwd: process.cwd(), windowsHide: true },
  );
}

async function main() {
  const root = process.cwd();
  loadEnvFile(path.join(root, ".env.local"));
  loadEnvFile(path.join(root, ".env"));

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  requireEnv("CLOUDFLARE_DOMAIN_ROUTING_KV_NAMESPACE_ID");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase
    .from("store_domains")
    .select("hostname, store:stores!inner(slug,is_published)")
    .eq("status", "active");

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as DomainRow[];
  let synced = 0;

  for (const row of rows) {
    const storeSlug = row.store?.slug?.trim();
    const isPublished = row.store?.is_published !== false;
    if (!row.hostname || !storeSlug || !isPublished) {
      continue;
    }

    await cloudflareKvPut(row.hostname, storeSlug);
    synced += 1;
  }

  console.log(`Synced ${synced} active domain routes to Cloudflare KV.`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
