"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  Database,
  ExternalLink,
  GitBranch,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Store,
} from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Severity = "critical" | "warning" | "prewarning" | "info";
type ProviderState = "healthy" | "warning" | "failing" | "unknown" | "unconfigured";

type OpsStatus = {
  generatedAt: string;
  score: number;
  alerts: Array<{
    id: string;
    severity: Severity;
    title: string;
    detail: string;
    action: string;
    href?: string;
  }>;
  metrics: {
    stores: number | null;
    failedNotifications24h: number;
    pendingNotifications24h: number;
    failedInvoices24h: number;
    stalePendingInvoices: number;
    atRiskStores: number;
    pendingDeleteStores: number;
  };
  providers: Array<{
    id: string;
    label: string;
    state: ProviderState;
    detail: string;
    checkedAt: string;
  }>;
  recent: {
    failedNotifications: Array<Record<string, any>>;
    problemInvoices: Array<Record<string, any>>;
    lifecycleIssues: Array<Record<string, any>>;
    auditLogs: Array<Record<string, any>>;
  };
  sourceErrors: string[];
};

const FULL_PLATFORM_ROLES = new Set(["admin", "super_admin"]);

function severityBadge(severity: Severity) {
  if (severity === "critical") return <Badge variant="destructive">Critical</Badge>;
  if (severity === "warning") return <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">Warning</Badge>;
  if (severity === "prewarning") return <Badge variant="secondary">Pre-warning</Badge>;
  return <Badge variant="outline">Info</Badge>;
}

function providerBadge(state: ProviderState) {
  if (state === "healthy") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Healthy</Badge>;
  if (state === "failing") return <Badge variant="destructive">Failing</Badge>;
  if (state === "warning") return <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">Pending</Badge>;
  if (state === "unconfigured") return <Badge variant="outline">Not connected</Badge>;
  return <Badge variant="secondary">Unknown</Badge>;
}

function scoreTone(score: number) {
  if (score >= 90) return "text-emerald-600";
  if (score >= 70) return "text-amber-600";
  return "text-destructive";
}

function formatTime(value: unknown) {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function PlatformOperationsHub() {
  const { session, platformRole, loading: authLoading } = useAuth();
  const allowed = Boolean(platformRole && FULL_PLATFORM_ROLES.has(platformRole));

  const query = useQuery({
    queryKey: ["platform-ops-status"],
    enabled: Boolean(session?.access_token && allowed),
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 20_000,
    queryFn: async () => {
      const response = await fetch("/api/platform/ops-status", {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || `Operations status failed with HTTP ${response.status}`);
      }
      return payload as OpsStatus;
    },
  });

  if (authLoading || !allowed) return null;

  if (query.isLoading) {
    return (
      <Card className="border-border bg-card/50">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading live platform operations status...
        </CardContent>
      </Card>
    );
  }

  if (query.error || !query.data) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> Operations hub unavailable</CardTitle>
          <CardDescription>{query.error instanceof Error ? query.error.message : "The live status API could not be loaded."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => query.refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const data = query.data;
  const criticalCount = data.alerts.filter((alert) => alert.severity === "critical").length;
  const warningCount = data.alerts.filter((alert) => alert.severity === "warning").length;
  const prewarningCount = data.alerts.filter((alert) => alert.severity === "prewarning").length;

  return (
    <section className="space-y-5" aria-label="Platform operations hub">
      <Card className="border-border bg-card/60">
        <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Activity className="h-6 w-6 text-primary" />
              Live operations & launch safety
            </CardTitle>
            <CardDescription className="mt-2 max-w-3xl">
              Centralized health, deployment, billing, lifecycle, notification, and audit signals. This panel refreshes every minute and surfaces critical errors, warnings, and pre-warnings before they become customer-facing incidents.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-border bg-background/70 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Safety score</p>
              <p className={`text-3xl font-bold ${scoreTone(data.score)}`}>{data.score}</p>
            </div>
            <Button variant="outline" size="icon" onClick={() => query.refetch()} disabled={query.isFetching} title="Refresh now">
              {query.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={data.score} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Critical</p>
              <p className="mt-1 text-2xl font-bold text-destructive">{criticalCount}</p>
              <p className="text-xs text-muted-foreground">Launch/deploy blockers.</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Warnings</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{warningCount}</p>
              <p className="text-xs text-muted-foreground">Needs operator attention.</p>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Pre-warnings</p>
              <p className="mt-1 text-2xl font-bold">{prewarningCount}</p>
              <p className="text-xs text-muted-foreground">Early signals before failure.</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Last refreshed {formatTime(data.generatedAt)}.</p>
        </CardContent>
      </Card>

      {data.alerts.length > 0 ? (
        <Card className={criticalCount > 0 ? "border-destructive/30 bg-destructive/5" : "border-amber-500/20 bg-amber-500/5"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Operator notices</CardTitle>
            <CardDescription>Each notice includes the recommended next action instead of only reporting an error code.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.alerts.map((alert) => (
              <div key={alert.id} className="rounded-xl border border-border bg-background/80 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {severityBadge(alert.severity)}
                      <p className="font-semibold text-foreground">{alert.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.detail}</p>
                    <p className="text-sm"><span className="font-medium">Recommended action:</span> {alert.action}</p>
                  </div>
                  {alert.href ? (
                    <a href={alert.href} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                      Open related control <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="flex items-center gap-3 p-5 text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            No launch-blocking or early-warning signals are currently detected.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {data.providers.map((provider) => (
          <Card key={provider.id} className="border-border bg-card/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{provider.label}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{provider.detail}</p>
                </div>
                {provider.id === "supabase" ? <Database className="h-4 w-4 text-muted-foreground" /> : provider.id === "github" ? <GitBranch className="h-4 w-4 text-muted-foreground" /> : <Activity className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="mt-4">{providerBadge(provider.state)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Card className="border-border bg-card/50"><CardContent className="p-5"><Store className="h-4 w-4 text-muted-foreground" /><p className="mt-3 text-2xl font-bold">{data.metrics.stores ?? "—"}</p><p className="text-xs text-muted-foreground">Stores</p></CardContent></Card>
        <Card className="border-border bg-card/50"><CardContent className="p-5"><CreditCard className="h-4 w-4 text-muted-foreground" /><p className="mt-3 text-2xl font-bold">{data.metrics.failedInvoices24h}</p><p className="text-xs text-muted-foreground">Failed invoices · 24h</p></CardContent></Card>
        <Card className="border-border bg-card/50"><CardContent className="p-5"><Clock3 className="h-4 w-4 text-muted-foreground" /><p className="mt-3 text-2xl font-bold">{data.metrics.stalePendingInvoices}</p><p className="text-xs text-muted-foreground">Payments pending &gt;30m</p></CardContent></Card>
        <Card className="border-border bg-card/50"><CardContent className="p-5"><AlertTriangle className="h-4 w-4 text-muted-foreground" /><p className="mt-3 text-2xl font-bold">{data.metrics.failedNotifications24h}</p><p className="text-xs text-muted-foreground">Failed notifications · 24h</p></CardContent></Card>
        <Card className="border-border bg-card/50"><CardContent className="p-5"><ShieldAlert className="h-4 w-4 text-muted-foreground" /><p className="mt-3 text-2xl font-bold">{data.metrics.atRiskStores}</p><p className="text-xs text-muted-foreground">At-risk stores</p></CardContent></Card>
        <Card className="border-border bg-card/50"><CardContent className="p-5"><ShieldAlert className="h-4 w-4 text-muted-foreground" /><p className="mt-3 text-2xl font-bold">{data.metrics.pendingDeleteStores}</p><p className="text-xs text-muted-foreground">Pending deletion</p></CardContent></Card>
      </div>

      {data.sourceErrors.length > 0 ? (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader><CardTitle className="text-base">Telemetry source warnings</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {data.sourceErrors.map((error) => <p key={error}>{error}</p>)}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Billing & lifecycle watchlist</CardTitle>
            <CardDescription>Recent states most likely to need manual reconciliation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Problem invoices</p>
              <div className="space-y-2">
                {data.recent.problemInvoices.slice(0, 6).map((invoice) => (
                  <div key={String(invoice.id)} className="rounded-lg border border-border bg-background/60 p-3 text-xs">
                    <div className="flex items-center justify-between gap-3"><span className="font-medium">{invoice.status || "unknown"}</span><span className="text-muted-foreground">{formatTime(invoice.updated_at || invoice.created_at)}</span></div>
                    <p className="mt-1 text-muted-foreground">Store {String(invoice.store_id || "—")} · {String(invoice.provider || "provider unknown")}</p>
                  </div>
                ))}
                {data.recent.problemInvoices.length === 0 ? <p className="text-xs text-muted-foreground">No recent failed or pending invoices.</p> : null}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Lifecycle risks</p>
              <div className="space-y-2">
                {data.recent.lifecycleIssues.slice(0, 6).map((item) => (
                  <div key={String(item.store_id)} className="rounded-lg border border-border bg-background/60 p-3 text-xs">
                    <div className="flex items-center justify-between gap-3"><span className="font-medium">{item.lifecycle_status || "unknown"}</span><span className="text-muted-foreground">{formatTime(item.updated_at)}</span></div>
                    <p className="mt-1 text-muted-foreground">Store {String(item.store_id || "—")}</p>
                  </div>
                ))}
                {data.recent.lifecycleIssues.length === 0 ? <p className="text-xs text-muted-foreground">No at-risk or pending-delete stores.</p> : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Recent platform audit activity</CardTitle>
            <CardDescription>Operator actions are visible here so you do not need to query the database manually.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Actor</TableHead><TableHead>Target</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.recent.auditLogs.slice(0, 12).map((log) => (
                  <TableRow key={String(log.id)}>
                    <TableCell className="whitespace-nowrap text-xs">{formatTime(log.created_at)}</TableCell>
                    <TableCell className="text-xs font-medium">{String(log.action || "—")}</TableCell>
                    <TableCell className="text-xs">{String(log.actor_email || log.actor_id || "—")}</TableCell>
                    <TableCell className="text-xs">{String(log.target_type || "—")} {String(log.target_id || "")}</TableCell>
                  </TableRow>
                ))}
                {data.recent.auditLogs.length === 0 ? <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">No audit activity returned.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
