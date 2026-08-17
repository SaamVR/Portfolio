export type EnvironmentIssue = {
  id: string;
  severity: "critical" | "warning" | "prewarning";
  title: string;
  detail: string;
  action: string;
};

function has(name: string) {
  return Boolean(process.env[name]?.trim());
}

export function getProductionEnvironmentIssues(): EnvironmentIssue[] {
  const issues: EnvironmentIssue[] = [];

  if (!has("NEXT_PUBLIC_SUPABASE_URL")) {
    issues.push({
      id: "env-supabase-url",
      severity: "critical",
      title: "Supabase URL is missing",
      detail: "The application cannot reliably authenticate or reach its primary database without NEXT_PUBLIC_SUPABASE_URL.",
      action: "Set NEXT_PUBLIC_SUPABASE_URL in the production environment before serving customers.",
    });
  }

  if (!has("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") && !has("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
    issues.push({
      id: "env-supabase-public-key",
      severity: "critical",
      title: "Supabase public key is missing",
      detail: "Neither the publishable key nor the legacy anon-key fallback is configured.",
      action: "Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (preferred) before launch.",
    });
  }

  if (!has("SUPABASE_SERVICE_ROLE_KEY")) {
    issues.push({
      id: "env-supabase-service-role",
      severity: "critical",
      title: "Supabase service-role key is missing",
      detail: "Trusted server routes that perform billing, admin, lifecycle, and operational work require the service-role key.",
      action: "Set SUPABASE_SERVICE_ROLE_KEY only in server-side production environment variables.",
    });
  }

  if (!has("NEXT_PUBLIC_APP_URL") && !has("NEXT_PUBLIC_CMS_ROOT_DOMAIN")) {
    issues.push({
      id: "env-platform-url",
      severity: "warning",
      title: "Canonical platform URL is not explicit",
      detail: "Redirects, billing callbacks, and generated links should resolve from an explicit production platform origin.",
      action: "Set NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_CMS_ROOT_DOMAIN to the production CMS origin.",
    });
  }

  if (!has("STOREFRONT_SEARCH_WEBHOOK_SECRET")) {
    issues.push({
      id: "env-search-webhook-secret",
      severity: "warning",
      title: "Storefront search synchronization is disabled",
      detail: "The search webhook intentionally fails closed when its shared secret is missing.",
      action: "Set STOREFRONT_SEARCH_WEBHOOK_SECRET if storefront search indexing is enabled in production.",
    });
  }

  if (process.env.NOTIFICATION_JOBS_TRANSPORT?.trim() !== "inline" && !has("NOTIFICATION_PROCESSOR_SECRET")) {
    issues.push({
      id: "env-notification-processor-secret",
      severity: "critical",
      title: "Notification processor secret is missing",
      detail: "Deferred notification processing is configured but its processor authentication secret is absent.",
      action: "Set NOTIFICATION_PROCESSOR_SECRET or switch notification processing back to inline mode.",
    });
  }

  if (process.env.ORDER_BACKGROUND_JOBS_TRANSPORT?.trim() !== "inline" && !has("CART_RECOVERY_PROCESSOR_SECRET")) {
    issues.push({
      id: "env-cart-processor-secret",
      severity: "warning",
      title: "Cart recovery processor secret may be missing",
      detail: "Background processing is enabled and cart-recovery queue processing requires an authenticated processor path.",
      action: "Verify CART_RECOVERY_PROCESSOR_SECRET is configured for the production background worker.",
    });
  }

  if (!has("ANALYTICS_ID_HASH_SALT")) {
    issues.push({
      id: "env-analytics-hash-salt",
      severity: "prewarning",
      title: "Analytics hashing uses a fallback salt",
      detail: "Analytics identifiers currently fall back to another server secret when ANALYTICS_ID_HASH_SALT is absent.",
      action: "Set a dedicated ANALYTICS_ID_HASH_SALT so analytics pseudonymization is independently rotatable.",
    });
  }

  return issues;
}
