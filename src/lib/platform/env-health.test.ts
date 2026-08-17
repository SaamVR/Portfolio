import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { getProductionEnvironmentIssues } from "./env-health";

const managed = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_CMS_ROOT_DOMAIN",
  "STOREFRONT_SEARCH_WEBHOOK_SECRET",
  "NOTIFICATION_JOBS_TRANSPORT",
  "NOTIFICATION_PROCESSOR_SECRET",
  "ORDER_BACKGROUND_JOBS_TRANSPORT",
  "CART_RECOVERY_PROCESSOR_SECRET",
  "ANALYTICS_ID_HASH_SALT",
] as const;

const original = Object.fromEntries(managed.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of managed) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function clearManagedEnv() {
  for (const key of managed) delete process.env[key];
}

test("missing core production credentials are launch-critical", () => {
  clearManagedEnv();
  process.env.NOTIFICATION_JOBS_TRANSPORT = "inline";
  process.env.ORDER_BACKGROUND_JOBS_TRANSPORT = "inline";

  const issues = getProductionEnvironmentIssues();
  const criticalIds = issues.filter((issue) => issue.severity === "critical").map((issue) => issue.id);

  assert.ok(criticalIds.includes("env-supabase-url"));
  assert.ok(criticalIds.includes("env-supabase-public-key"));
  assert.ok(criticalIds.includes("env-supabase-service-role"));
});

test("legacy Supabase anon key remains an accepted public-key fallback", () => {
  clearManagedEnv();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy-public-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
  process.env.STOREFRONT_SEARCH_WEBHOOK_SECRET = "search-secret";
  process.env.NOTIFICATION_JOBS_TRANSPORT = "inline";
  process.env.ORDER_BACKGROUND_JOBS_TRANSPORT = "inline";
  process.env.ANALYTICS_ID_HASH_SALT = "dedicated-salt";

  const issues = getProductionEnvironmentIssues();
  assert.equal(issues.some((issue) => issue.id === "env-supabase-public-key"), false);
});

test("deferred notification processing requires its processor secret", () => {
  clearManagedEnv();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "public-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
  process.env.STOREFRONT_SEARCH_WEBHOOK_SECRET = "search-secret";
  process.env.NOTIFICATION_JOBS_TRANSPORT = "queue";
  process.env.ORDER_BACKGROUND_JOBS_TRANSPORT = "inline";
  process.env.ANALYTICS_ID_HASH_SALT = "dedicated-salt";

  const issues = getProductionEnvironmentIssues();
  assert.ok(issues.some((issue) => issue.id === "env-notification-processor-secret" && issue.severity === "critical"));
});
