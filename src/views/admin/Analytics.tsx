import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2 } from "lucide-react";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import StoreAnalyticsReport from "@/components/admin/StoreAnalyticsReport";
import { EMPTY_ANALYTICS_REPORT, fetchAuthoritativeAnalyticsReport, labelAnalyticsStoreSummaries } from "@/lib/analytics/report-client";
import { downloadAnalyticsSummaryCsv } from "@/lib/analytics/export";
import { getAnalyticsPresetLabel, resolveAnalyticsDateRangePair, type AnalyticsDatePreset } from "@/lib/analytics/date-range";
import { analyticsPrivacySettingsKey, normalizeAnalyticsPrivacySettings, type AnalyticsPrivacySettings } from "@/lib/admin/merchant-growth-settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AnalyticsPage() {
  const { activeStoreId, storeMemberships } = useAuth();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<"active" | "all">("active");
  const [datePreset, setDatePreset] = useState<AnalyticsDatePreset>("last_30_days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [privacySettings, setPrivacySettings] = useState<AnalyticsPrivacySettings>(normalizeAnalyticsPrivacySettings(null));
  const membershipStoreIds = useMemo(
    () => Array.from(new Set(storeMemberships.map((membership) => membership.storeId).filter(Boolean))),
    [storeMemberships],
  );
  const scopedStoreIds = scope === "all"
    ? membershipStoreIds
    : (activeStoreId ? [activeStoreId] : []);

  const { data: stores = [] } = useQuery({
    queryKey: ["analytics-scope-stores", membershipStoreIds],
    enabled: membershipStoreIds.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("stores")
        .select("id, name, slug")
        .in("id", membershipStoreIds)
        .order("name");

      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; slug: string }>;
    },
  });

  const activeStore = stores.find((store) => store.id === activeStoreId) ?? null;
  const storeLabels = useMemo(
    () => Object.fromEntries(stores.map((store) => [store.id, `${store.name} (/${store.slug})`])),
    [stores],
  );
  const dateRangePair = useMemo(
    () => resolveAnalyticsDateRangePair(datePreset, customStart, customEnd),
    [customEnd, customStart, datePreset],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["store-analytics-report", scope, scopedStoreIds, dateRangePair.current.startIso, dateRangePair.current.endIso, dateRangePair.previous.startIso, dateRangePair.previous.endIso],
    enabled: scopedStoreIds.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [current, previous, privacySettingsRow] = await Promise.all([
        fetchAuthoritativeAnalyticsReport(scopedStoreIds, dateRangePair.current.startIso, dateRangePair.current.endIso),
        fetchAuthoritativeAnalyticsReport(scopedStoreIds, dateRangePair.previous.startIso, dateRangePair.previous.endIso),
        activeStoreId
          ? supabase.from("site_settings").select("value").eq("store_id", activeStoreId).eq("key", analyticsPrivacySettingsKey).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (privacySettingsRow.error) throw privacySettingsRow.error;
      return {
        current,
        previous,
        privacySettings: normalizeAnalyticsPrivacySettings(privacySettingsRow.data?.value),
      };
    },
  });

  const report = data?.current.summary ?? EMPTY_ANALYTICS_REPORT;
  const previousReport = data?.previous.summary ?? EMPTY_ANALYTICS_REPORT;
  const storeSummaries = useMemo(
    () => labelAnalyticsStoreSummaries(data?.current.storeSummaries ?? [], storeLabels),
    [data?.current.storeSummaries, storeLabels],
  );
  const canShowCombined = membershipStoreIds.length > 1;
  const anomalyCards = useMemo(() => {
    const cards: Array<{ label: string; detail: string }> = [];
    if (previousReport.visitors > 0 && report.visitors <= previousReport.visitors * 0.5) {
      cards.push({
        label: "Traffic drop",
        detail: `Visitors fell from ${previousReport.visitors} to ${report.visitors} in the current window.`,
      });
    }
    if (report.zeroResultSearches[0] && report.zeroResultSearches[0].value >= Math.max(3, privacySettings.anomalySensitivity / 5)) {
      cards.push({
        label: "Search demand mismatch",
        detail: `"${report.zeroResultSearches[0].label}" is showing repeated zero-result demand.`,
      });
    }
    if (report.checkoutStarts > 0 && report.checkoutCompletionRate < 0.35) {
      cards.push({
        label: "Checkout leakage",
        detail: `Only ${Math.round(report.checkoutCompletionRate * 100)}% of checkout starts are completing.`,
      });
    }
    return cards;
  }, [previousReport.visitors, privacySettings.anomalySensitivity, report.checkoutCompletionRate, report.checkoutStarts, report.visitors, report.zeroResultSearches]);

  useEffect(() => {
    if (data?.privacySettings) {
      setPrivacySettings(data.privacySettings);
    }
  }, [data?.privacySettings]);

  const savePrivacyMutation = useMutation({
    mutationFn: async () => {
      if (!activeStoreId) return;
      const normalized = normalizeAnalyticsPrivacySettings(privacySettings);
      const { error: upsertError } = await supabase
        .from("site_settings")
        .upsert({ store_id: activeStoreId, key: analyticsPrivacySettingsKey, value: normalized as any }, { onConflict: "store_id,key" });
      if (upsertError) throw upsertError;
    },
    onSuccess: async () => {
      toast.success("Analytics privacy controls saved.");
      await queryClient.invalidateQueries({ queryKey: ["store-analytics-report"] });
    },
  });

  if (!activeStoreId && membershipStoreIds.length === 0) {
    return (
      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>Select a store first to open its analytics report.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading analytics report...
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle>Analytics unavailable</CardTitle>
          <CardDescription>We could not load the analytics report right now.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Analytics privacy controls</CardTitle>
            <CardDescription>Keep merchant reporting useful without losing consent, retention, or operator ownership.</CardDescription>
          </CardHeader>
          <div className="grid gap-4 px-6 pb-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Consent banner required</Label>
              <div className="flex h-10 items-center rounded-md border border-border bg-background px-3">
                <Switch checked={privacySettings.consentBannerRequired} onCheckedChange={(checked) => setPrivacySettings((prev) => ({ ...prev, consentBannerRequired: checked }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Allow visitor/session identifiers</Label>
              <div className="flex h-10 items-center rounded-md border border-border bg-background px-3">
                <Switch checked={privacySettings.allowVisitorIdentifiers} onCheckedChange={(checked) => setPrivacySettings((prev) => ({ ...prev, allowVisitorIdentifiers: checked }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Retention days</Label>
              <Input value={privacySettings.retentionDays} onChange={(event) => setPrivacySettings((prev) => ({ ...prev, retentionDays: Number(event.target.value) || 180 }))} />
            </div>
            <div className="space-y-2">
              <Label>Scheduled report cadence</Label>
              <Select value={privacySettings.scheduledReportCadence} onValueChange={(value) => setPrivacySettings((prev) => ({ ...prev, scheduledReportCadence: value as AnalyticsPrivacySettings["scheduledReportCadence"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Report recipient</Label>
              <Input value={privacySettings.reportRecipient} onChange={(event) => setPrivacySettings((prev) => ({ ...prev, reportRecipient: event.target.value }))} placeholder="merchant@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Anomaly sensitivity</Label>
              <Input value={privacySettings.anomalySensitivity} onChange={(event) => setPrivacySettings((prev) => ({ ...prev, anomalySensitivity: Number(event.target.value) || 20 }))} />
            </div>
          </div>
          <div className="px-6 pb-6">
            <Button type="button" onClick={() => savePrivacyMutation.mutate()} disabled={savePrivacyMutation.isPending}>
              {savePrivacyMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save privacy controls
            </Button>
          </div>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Merchant intelligence watchlist</CardTitle>
            <CardDescription>What deserves attention before traffic or orders scale harder.</CardDescription>
          </CardHeader>
          <div className="space-y-3 px-6 pb-6">
            {anomalyCards.length > 0 ? anomalyCards.map((card) => (
              <div key={card.label} className="rounded-xl border border-border bg-background/60 p-4">
                <p className="text-sm font-semibold text-foreground">{card.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{card.detail}</p>
              </div>
            )) : (
              <div className="rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
                No high-signal anomaly is firing in this window. Keep watching zero-result searches, checkout completion, and source quality as volume grows.
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/50 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Reporting scope</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {scope === "all"
              ? "Combined analytics across every store you can manage."
              : `Focused analytics for ${activeStore?.name ?? "the selected store"}.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={scope === "active" ? "default" : "outline"} onClick={() => setScope("active")}>
            This Store
          </Button>
          {canShowCombined ? (
            <Button type="button" variant={scope === "all" ? "default" : "outline"} onClick={() => setScope("all")}>
              All My Stores
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Date range</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {scope === "all" ? "Export or compare combined store data" : "Filter this store report by time window"}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => downloadAnalyticsSummaryCsv(
              `analytics-${scope}-${datePreset}-${new Date().toISOString().slice(0, 10)}.csv`,
              report,
              scope === "all" ? storeSummaries : [],
            )}
            disabled={!data?.current}
          >
            Export CSV
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["today", "last_7_days", "last_30_days", "this_month", "custom"] as AnalyticsDatePreset[]).map((preset) => (
            <Button
              key={preset}
              type="button"
              variant={datePreset === preset ? "default" : "outline"}
              onClick={() => setDatePreset(preset)}
            >
              {getAnalyticsPresetLabel(preset)}
            </Button>
          ))}
        </div>
        {datePreset === "custom" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-foreground">
              <span>Start date</span>
              <input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="grid gap-2 text-sm text-foreground">
              <span>End date</span>
              <input
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              />
            </label>
          </div>
        ) : null}
      </div>

      {report.sessions === 0 && report.pageViews === 0 && report.purchases === 0 ? (
        <AdminEmptyState
          icon={BarChart3}
          title="No analytics data yet"
          description={scope === "all" ? "Your combined store analytics are still empty for this time window." : "This store has not produced storefront analytics for this time window yet."}
          helper="Traffic, search, product views, cart events, checkout starts, and purchases will begin filling this report once people browse the storefront."
          actions={[
            activeStoreId ? { label: "Open launch readiness", href: `/admin/launch?storeId=${encodeURIComponent(activeStoreId)}` } : undefined,
            activeStoreId ? { label: "Preview store", href: `/admin/onboarding?storeId=${encodeURIComponent(activeStoreId)}&guide=continue`, variant: "outline" } : undefined,
          ].filter(Boolean) as Array<{ label: string; href: string; variant?: "default" | "outline" }>}
        />
      ) : null}

      <StoreAnalyticsReport
        title="Analytics"
        description={scope === "all"
          ? `${getAnalyticsPresetLabel(datePreset)} of combined traffic, discovery intent, product interest, and conversion behavior across all of your stores.`
          : `${getAnalyticsPresetLabel(datePreset)} of traffic, discovery intent, product interest, and conversion behavior for the active store.`}
        report={report}
        previousReport={previousReport}
        storeSummaries={scope === "all" ? storeSummaries : []}
        storeSummaryTitle="Store Comparison"
        storeSummaryDescription="See which of your stores are earning traffic, intent, and purchases inside the same 30-day window."
      />
    </div>
  );
}
