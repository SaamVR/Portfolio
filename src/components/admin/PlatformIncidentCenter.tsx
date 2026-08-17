"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, CircleDot, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const FULL_PLATFORM_ROLES = new Set(["admin", "super_admin"]);
type Severity = "critical" | "warning" | "prewarning" | "info";

type Incident = {
  id: string;
  severity: Severity;
  source: string;
  title: string;
  message: string;
  route?: string | null;
  store_id?: string | null;
  request_id?: string | null;
  status: "open" | "resolved";
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at?: string | null;
};

type EnvironmentIssue = {
  id: string;
  severity: Exclude<Severity, "info">;
  title: string;
  detail: string;
  action: string;
};

type IncidentPayload = {
  generatedAt: string;
  environmentIssues: EnvironmentIssue[];
  incidents: Incident[];
};

function severityBadge(severity: Severity) {
  if (severity === "critical") return <Badge variant="destructive">Critical</Badge>;
  if (severity === "warning") return <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">Warning</Badge>;
  if (severity === "prewarning") return <Badge variant="secondary">Pre-warning</Badge>;
  return <Badge variant="outline">Info</Badge>;
}

function formatTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function PlatformIncidentCenter() {
  const { session, platformRole, loading: authLoading } = useAuth();
  const [includeResolved, setIncludeResolved] = useState(false);
  const queryClient = useQueryClient();
  const allowed = Boolean(platformRole && FULL_PLATFORM_ROLES.has(platformRole));

  const query = useQuery({
    queryKey: ["platform-incidents", includeResolved],
    enabled: Boolean(session?.access_token && allowed),
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await fetch(`/api/platform/incidents?includeResolved=${includeResolved ? "1" : "0"}&limit=75`, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Incident API failed with HTTP ${response.status}`);
      return payload as IncidentPayload;
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ incidentId, action }: { incidentId: string; action: "resolve" | "reopen" }) => {
      const response = await fetch("/api/platform/incidents", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ incidentId, action }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Incident update failed with HTTP ${response.status}`);
      return payload;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["platform-incidents"] }),
  });

  if (authLoading || !allowed) return null;

  return (
    <Card className="border-border bg-card/60">
      <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl"><ShieldAlert className="h-5 w-5 text-primary" /> Error & incident center</CardTitle>
          <CardDescription className="mt-2 max-w-3xl">
            Deduplicated application failures, configuration warnings, request correlation IDs, occurrence counts, and operator resolution state. Refreshes every 30 seconds.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={includeResolved} onCheckedChange={setIncludeResolved} /> Show resolved
          </label>
          <Button variant="outline" size="icon" onClick={() => query.refetch()} disabled={query.isFetching} title="Refresh incidents">
            {query.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {query.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading incidents...</div>
        ) : query.error || !query.data ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {query.error instanceof Error ? query.error.message : "Incident center could not be loaded."}
          </div>
        ) : (
          <>
            {query.data.environmentIssues.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /><p className="text-sm font-semibold">Configuration notices</p></div>
                {query.data.environmentIssues.map((issue) => (
                  <div key={issue.id} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex flex-wrap items-center gap-2">{severityBadge(issue.severity)}<p className="text-sm font-semibold">{issue.title}</p></div>
                    <p className="mt-2 text-sm text-muted-foreground">{issue.detail}</p>
                    <p className="mt-2 text-sm"><span className="font-medium">Action:</span> {issue.action}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Application incidents</p>
                <Badge variant="outline">{query.data.incidents.length} shown</Badge>
              </div>
              {query.data.incidents.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> No application incidents are currently open.
                </div>
              ) : query.data.incidents.map((incident) => (
                <div key={incident.id} className="rounded-xl border border-border bg-background/70 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {severityBadge(incident.severity)}
                        <Badge variant={incident.status === "resolved" ? "secondary" : "outline"}>{incident.status}</Badge>
                        <p className="font-semibold">{incident.title}</p>
                      </div>
                      <p className="text-sm text-muted-foreground break-words">{incident.message}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Source: {incident.source}</span>
                        <span>Occurrences: {incident.occurrence_count}</span>
                        <span>Last seen: {formatTime(incident.last_seen_at)}</span>
                        {incident.route ? <span>Route: {incident.route}</span> : null}
                        {incident.store_id ? <span>Store: {incident.store_id}</span> : null}
                        {incident.request_id ? <span>Request: {incident.request_id}</span> : null}
                      </div>
                    </div>
                    <Button
                      variant={incident.status === "resolved" ? "outline" : "secondary"}
                      size="sm"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ incidentId: incident.id, action: incident.status === "resolved" ? "reopen" : "resolve" })}
                      className="gap-2"
                    >
                      <CircleDot className="h-3.5 w-3.5" /> {incident.status === "resolved" ? "Reopen" : "Resolve"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
