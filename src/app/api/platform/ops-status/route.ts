import { NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { buildOperationalAlerts, calculateOperationalScore } from "@/lib/platform/ops-readiness";

export const dynamic = "force-dynamic";

const FULL_PLATFORM_ADMIN_ROLES = new Set(["admin", "super_admin"]);
const REQUIRED_WORKFLOWS = ["Quality Gate", "Database Smoke", "Secret Scan", "Preview Smoke"];

type ProviderState = "healthy" | "warning" | "failing" | "unknown" | "unconfigured";

type ProviderStatus = {
  id: string;
  label: string;
  state: ProviderState;
  detail: string;
  checkedAt: string;
};

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

async function getFullPlatformAdminRole(userId: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) throw error;
  const roles = Array.isArray(data)
    ? data.map((row) => (typeof row?.role === "string" ? row.role : ""))
    : [];

  return roles.includes("super_admin")
    ? "super_admin"
    : roles.includes("admin")
      ? "admin"
      : null;
}

function unconfiguredProvider(id: string, label: string, detail: string): ProviderStatus {
  return { id, label, state: "unconfigured", detail, checkedAt: new Date().toISOString() };
}

async function readJson(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(6_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || payload?.error?.message || response.statusText || `HTTP ${response.status}`;
    throw new Error(String(message));
  }
  return payload;
}

async function fetchGitHubStatus() {
  const repo = process.env.OPS_GITHUB_REPO?.trim();
  const token = process.env.OPS_GITHUB_TOKEN?.trim();
  const branch = process.env.OPS_GITHUB_BRANCH?.trim() || "main";
  if (!repo || !token) {
    return {
      status: unconfiguredProvider("github", "GitHub CI", "Set OPS_GITHUB_REPO and OPS_GITHUB_TOKEN to show private-repository workflow status here."),
      failed: 0,
      pending: 0,
    };
  }

  try {
    const payload = await readJson(
      `https://api.github.com/repos/${encodeURIComponent(repo.split("/")[0] || "")}/${encodeURIComponent(repo.split("/")[1] || "")}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=40`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    const runs = Array.isArray(payload?.workflow_runs) ? payload.workflow_runs : [];
    const latestByName = new Map<string, any>();
    for (const run of runs) {
      if (!REQUIRED_WORKFLOWS.includes(run?.name) || latestByName.has(run.name)) continue;
      latestByName.set(run.name, run);
    }

    const requiredRuns = REQUIRED_WORKFLOWS.map((name) => latestByName.get(name)).filter(Boolean);
    const missing = REQUIRED_WORKFLOWS.length - requiredRuns.length;
    const failed = requiredRuns.filter((run) => run.status === "completed" && run.conclusion !== "success").length;
    const pending = requiredRuns.filter((run) => run.status !== "completed").length + missing;
    const state: ProviderState = failed > 0 ? "failing" : pending > 0 ? "warning" : "healthy";
    const detail = failed > 0
      ? `${failed} required workflow${failed === 1 ? " is" : "s are"} failing on ${branch}.`
      : pending > 0
        ? `${pending} required workflow${pending === 1 ? " is" : "s are"} pending or not yet observed on ${branch}.`
        : `All ${REQUIRED_WORKFLOWS.length} required workflows are green on ${branch}.`;

    return {
      status: { id: "github", label: "GitHub CI", state, detail, checkedAt: new Date().toISOString() } satisfies ProviderStatus,
      failed,
      pending,
    };
  } catch (error) {
    return {
      status: { id: "github", label: "GitHub CI", state: "unknown", detail: `GitHub status unavailable: ${error instanceof Error ? error.message : "unknown error"}`, checkedAt: new Date().toISOString() } satisfies ProviderStatus,
      failed: 0,
      pending: 0,
    };
  }
}

async function fetchVercelStatus() {
  const token = process.env.OPS_VERCEL_TOKEN?.trim();
  const projectId = process.env.OPS_VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.OPS_VERCEL_TEAM_ID?.trim();
  if (!token || !projectId) {
    return {
      status: unconfiguredProvider("vercel", "Vercel", "Set OPS_VERCEL_TOKEN and OPS_VERCEL_PROJECT_ID to show deployment status here."),
      failed: 0,
      pending: 0,
    };
  }

  try {
    const query = new URLSearchParams({ projectId, limit: "5" });
    if (teamId) query.set("teamId", teamId);
    const payload = await readJson(`https://api.vercel.com/v6/deployments?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const deployment = Array.isArray(payload?.deployments) ? payload.deployments[0] : null;
    const rawState = String(deployment?.state || deployment?.readyState || "UNKNOWN").toUpperCase();
    const failed = ["ERROR", "CANCELED"].includes(rawState) ? 1 : 0;
    const pending = ["BUILDING", "QUEUED", "INITIALIZING"].includes(rawState) ? 1 : 0;
    const state: ProviderState = failed ? "failing" : pending ? "warning" : rawState === "READY" ? "healthy" : "unknown";
    return {
      status: {
        id: "vercel",
        label: "Vercel",
        state,
        detail: deployment ? `Latest deployment state: ${rawState}.` : "No Vercel deployment was returned for this project.",
        checkedAt: new Date().toISOString(),
      } satisfies ProviderStatus,
      failed,
      pending,
    };
  } catch (error) {
    return {
      status: { id: "vercel", label: "Vercel", state: "unknown", detail: `Vercel status unavailable: ${error instanceof Error ? error.message : "unknown error"}`, checkedAt: new Date().toISOString() } satisfies ProviderStatus,
      failed: 0,
      pending: 0,
    };
  }
}

async function fetchRenderStatus() {
  const apiKey = process.env.OPS_RENDER_API_KEY?.trim();
  const serviceId = process.env.OPS_RENDER_SERVICE_ID?.trim();
  if (!apiKey || !serviceId) {
    return {
      status: unconfiguredProvider("render", "Render", "Set OPS_RENDER_API_KEY and OPS_RENDER_SERVICE_ID to show failover deployment status here."),
      failed: 0,
      pending: 0,
    };
  }

  try {
    const payload = await readJson(`https://api.render.com/v1/services/${encodeURIComponent(serviceId)}/deploys?limit=5`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    const entry = Array.isArray(payload) ? payload[0] : null;
    const deploy = entry?.deploy || entry;
    const rawState = String(deploy?.status || "unknown").toLowerCase();
    const failed = ["build_failed", "update_failed", "canceled", "deactivated"].includes(rawState) ? 1 : 0;
    const pending = ["build_in_progress", "update_in_progress", "pre_deploy_in_progress", "created", "queued"].includes(rawState) ? 1 : 0;
    const state: ProviderState = failed ? "failing" : pending ? "warning" : rawState === "live" ? "healthy" : "unknown";
    return {
      status: {
        id: "render",
        label: "Render failover",
        state,
        detail: deploy ? `Latest deploy state: ${rawState}.` : "No Render deploy was returned for this service.",
        checkedAt: new Date().toISOString(),
      } satisfies ProviderStatus,
      failed,
      pending,
    };
  } catch (error) {
    return {
      status: { id: "render", label: "Render failover", state: "unknown", detail: `Render status unavailable: ${error instanceof Error ? error.message : "unknown error"}`, checkedAt: new Date().toISOString() } satisfies ProviderStatus,
      failed: 0,
      pending: 0,
    };
  }
}

async function fetchCloudflareStatus() {
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  if (!token || !zoneId) {
    return unconfiguredProvider("cloudflare", "Cloudflare", "Cloudflare API credentials are not configured for dashboard health checks.");
  }

  try {
    const payload = await readJson(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const rawState = String(payload?.result?.status || "unknown").toLowerCase();
    return {
      id: "cloudflare",
      label: "Cloudflare",
      state: rawState === "active" ? "healthy" : "warning",
      detail: `Zone state: ${rawState}.`,
      checkedAt: new Date().toISOString(),
    } satisfies ProviderStatus;
  } catch (error) {
    return {
      id: "cloudflare",
      label: "Cloudflare",
      state: "unknown",
      detail: `Cloudflare status unavailable: ${error instanceof Error ? error.message : "unknown error"}`,
      checkedAt: new Date().toISOString(),
    } satisfies ProviderStatus;
  }
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });

    const role = await getFullPlatformAdminRole(user.id);
    if (!role || !FULL_PLATFORM_ADMIN_ROLES.has(role)) {
      return noStoreJson({ error: "Forbidden" }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const staleInvoiceCutoff = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

    const [databaseProbe, notificationResult, invoiceResult, lifecycleResult, auditResult, github, vercel, render, cloudflare] = await Promise.all([
      supabaseAdmin.from("stores").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("email_events").select("id, store_id, status, template_name, recipient, created_at").gte("created_at", since24h).order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("store_invoices").select("id, store_id, status, provider, provider_invoice_id, amount, currency, created_at, updated_at").gte("created_at", since24h).order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("store_lifecycle_states").select("store_id, lifecycle_status, updated_at, scheduled_delete_at, last_activity_at").in("lifecycle_status", ["at_risk", "pending_delete"]).order("updated_at", { ascending: false }).limit(100),
      supabaseAdmin.from("platform_audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
      fetchGitHubStatus(),
      fetchVercelStatus(),
      fetchRenderStatus(),
      fetchCloudflareStatus(),
    ]);

    const notifications = Array.isArray(notificationResult.data) ? notificationResult.data : [];
    const invoices = Array.isArray(invoiceResult.data) ? invoiceResult.data : [];
    const lifecycle = Array.isArray(lifecycleResult.data) ? lifecycleResult.data : [];
    const auditLogs = Array.isArray(auditResult.data) ? auditResult.data : [];

    const failedNotifications = notifications.filter((event) => event.status === "failed");
    const pendingNotifications = notifications.filter((event) => ["pending", "queued", "processing"].includes(String(event.status || "")));
    const failedInvoices = invoices.filter((invoice) => invoice.status === "failed");
    const stalePendingInvoices = invoices.filter((invoice) => {
      if (invoice.status !== "pending") return false;
      const timestamp = invoice.updated_at || invoice.created_at;
      return typeof timestamp === "string" && timestamp < staleInvoiceCutoff;
    });
    const atRiskStores = lifecycle.filter((row) => row.lifecycle_status === "at_risk");
    const pendingDeleteStores = lifecycle.filter((row) => row.lifecycle_status === "pending_delete");

    const providerErrors = [github.status, vercel.status, render.status, cloudflare]
      .filter((provider) => provider.state === "unknown")
      .map((provider) => provider.detail);

    const alerts = buildOperationalAlerts({
      databaseHealthy: !databaseProbe.error,
      failedNotifications24h: failedNotifications.length,
      pendingNotifications24h: pendingNotifications.length,
      failedInvoices24h: failedInvoices.length,
      stalePendingInvoices: stalePendingInvoices.length,
      atRiskStores: atRiskStores.length,
      pendingDeleteStores: pendingDeleteStores.length,
      ciFailed: github.failed,
      ciPending: github.pending,
      deploymentFailed: vercel.failed + render.failed,
      deploymentPending: vercel.pending + render.pending,
      providerErrors,
    });

    return noStoreJson({
      generatedAt: now.toISOString(),
      role,
      score: calculateOperationalScore(alerts),
      alerts,
      metrics: {
        stores: databaseProbe.count ?? null,
        failedNotifications24h: failedNotifications.length,
        pendingNotifications24h: pendingNotifications.length,
        failedInvoices24h: failedInvoices.length,
        stalePendingInvoices: stalePendingInvoices.length,
        atRiskStores: atRiskStores.length,
        pendingDeleteStores: pendingDeleteStores.length,
      },
      providers: [
        {
          id: "supabase",
          label: "Supabase",
          state: databaseProbe.error ? "failing" : "healthy",
          detail: databaseProbe.error ? `Database health query failed: ${databaseProbe.error.message}` : "Database health query succeeded.",
          checkedAt: now.toISOString(),
        },
        github.status,
        vercel.status,
        render.status,
        cloudflare,
      ],
      recent: {
        failedNotifications: failedNotifications.slice(0, 20),
        problemInvoices: invoices.filter((invoice) => invoice.status === "failed" || invoice.status === "pending").slice(0, 20),
        lifecycleIssues: lifecycle.slice(0, 20),
        auditLogs: auditLogs.slice(0, 30),
      },
      sourceErrors: [
        notificationResult.error ? `email_events: ${notificationResult.error.message}` : null,
        invoiceResult.error ? `store_invoices: ${invoiceResult.error.message}` : null,
        lifecycleResult.error ? `store_lifecycle_states: ${lifecycleResult.error.message}` : null,
        auditResult.error ? `platform_audit_logs: ${auditResult.error.message}` : null,
      ].filter(Boolean),
    });
  } catch (error) {
    console.error("Platform ops status error:", error);
    return noStoreJson({ error: "Failed to load platform operations status" }, { status: 500 });
  }
}
