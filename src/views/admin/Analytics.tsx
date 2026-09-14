import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2 } from "lucide-react";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import StoreAnalyticsReport from "@/components/admin/StoreAnalyticsReport";
import { EMPTY_ANALYTICS_REPORT, fetchAuthoritativeAnalyticsReport, labelAnalyticsStoreSummaries } from "@/lib/analytics/report-client";
import { downloadAnalyticsSummaryCsv } from "@/lib/analytics/export";
import { getAnalyticsPresetLabel, resolveAnalyticsDateRangePair, type AnalyticsDatePreset } from "@/lib/analytics/date-range";
import { analyticsPrivacySettingsKey, normalizeAnalyticsPrivacySettings, type AnalyticsPrivacySettings } from "@/lib/admin/merchant-growth-settings";
import { merchantNumericSettingBounds, parseBoundedIntegerDraft } from "@/lib/admin/numeric-setting-draft";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type AnalyticsNumericField = "retentionDays" | "anomalySensitivity";
type AnalyticsNumericDraft = Record<AnalyticsNumericField, string>;
type AnalyticsNumericErrors = Partial<Record<AnalyticsNumericField, string>>;

const initialPrivacySettings = normalizeAnalyticsPrivacySettings(null);

function privacyNumericDraftFromSettings(settings: AnalyticsPrivacySettings): AnalyticsNumericDraft {
  return {
    retentionDays: String(settings.retentionDays),
    anomalySensitivity: String(settings.anomalySensitivity),
  };
}

export default function AnalyticsPage() {
  const { activeStoreId, storeMemberships } = useAuth();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<"active" | "all">("active");
  const [datePreset, setDatePreset] = useState<AnalyticsDatePreset>("last_30_days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [privacySettings, setPrivacySettings] = useState<AnalyticsPrivacySettings>(initialPrivacySettings);
  const [privacyNumericDraft, setPrivacyNumericDraft] = useState<AnalyticsNumericDraft>(() => privacyNumericDraftFromSettings(initialPrivacySettings));
  const [privacyNumericErrors, setPrivacyNumericErrors] = useState<AnalyticsNumericErrors>({});
  const [privacySaveError, setPrivacySaveError] = useState<string | null>(null);
  const retentionDaysRef = useRef<HTMLInputElement>(null);
  const anomalySensitivityRef = useRef<HTMLInputElement>(null);

  const membershipStoreIds = useMemo(
    () => Array.from(new Set(storeMemberships.map((membership) => membership.storeId).filter(Boolean))),
    [storeMemberships],
  );
  const scopedStoreIds = scope === "all" ? membershipStoreIds : (activeStoreId ? [activeStoreId] : []);

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
  const hasReportData = report.sessions > 0 || report.pageViews > 0 || report.purchases > 0;

  const anomalyCards = useMemo(() => {
    const cards: Array<{ label: string; detail: string }> = [];
    if (previousReport.visitors > 0 && report.visitors <= previousReport.visitors * 0.5) {
      cards.push({ label: "Traffic drop", detail: `Visitors fell from ${previousReport.visitors} to ${report.visitors} in the current window.` });
    }
    if (report.zeroResultSearches[0] && report.zeroResultSearches[0].value >= Math.max(3, privacySettings.anomalySensitivity / 5)) {
      cards.push({ label: "Search demand mismatch", detail: `“${report.zeroResultSearches[0].label}” is showing repeated zero-result demand.` });
    }
    if (report.checkoutStarts > 0 && report.checkoutCompletionRate < 0.35) {
      cards.push({ label: "Checkout leakage", detail: `Only ${Math.round(report.checkoutCompletionRate * 100)}% of checkout starts are completing.` });
    }
    return cards;
  }, [previousReport.visitors, privacySettings.anomalySensitivity, report.checkoutCompletionRate, report.checkoutStarts, report.visitors, report.zeroResultSearches]);

  useEffect(() => {
    setPrivacyNumericErrors({});
    setPrivacySaveError(null);
  }, [activeStoreId]);

  useEffect(() => {
    if (data?.privacySettings) {
      setPrivacySettings(data.privacySettings);
      setPrivacyNumericDraft(privacyNumericDraftFromSettings(data.privacySettings));
      setPrivacyNumericErrors({});
      setPrivacySaveError(null);
    }
  }, [data?.privacySettings]);

  function updatePrivacyNumericDraft(field: AnalyticsNumericField, value: string) {
    const bounds = field === "retentionDays" ? merchantNumericSettingBounds.analyticsRetentionDays : merchantNumericSettingBounds.analyticsAnomalySensitivity;
    const result = parseBoundedIntegerDraft(value, bounds);
    setPrivacyNumericDraft((previous) => ({ ...previous, [field]: value }));
    setPrivacyNumericErrors((previous) => ({ ...previous, [field]: result.ok ? undefined : result.error }));
  }

  function validatePrivacySettings() {
    const retentionDays = parseBoundedIntegerDraft(privacyNumericDraft.retentionDays, merchantNumericSettingBounds.analyticsRetentionDays);
    const anomalySensitivity = parseBoundedIntegerDraft(privacyNumericDraft.anomalySensitivity, merchantNumericSettingBounds.analyticsAnomalySensitivity);
    const nextErrors: AnalyticsNumericErrors = {
      retentionDays: retentionDays.ok ? undefined : retentionDays.error,
      anomalySensitivity: anomalySensitivity.ok ? undefined : anomalySensitivity.error,
    };
    setPrivacyNumericErrors(nextErrors);

    if (!retentionDays.ok || !anomalySensitivity.ok) {
      if (!retentionDays.ok) retentionDaysRef.current?.focus();
      else anomalySensitivityRef.current?.focus();
      return null;
    }

    return normalizeAnalyticsPrivacySettings({
      ...privacySettings,
      retentionDays: retentionDays.value,
      anomalySensitivity: anomalySensitivity.value,
    });
  }

  const savePrivacyMutation = useMutation({
    mutationFn: async (nextSettings: AnalyticsPrivacySettings) => {
      if (!activeStoreId) return;
      const normalized = normalizeAnalyticsPrivacySettings(nextSettings);
      const { error: upsertError } = await supabase
        .from("site_settings")
        .upsert({ store_id: activeStoreId, key: analyticsPrivacySettingsKey, value: normalized as any }, { onConflict: "store_id,key" });
      if (upsertError) throw upsertError;
    },
    onMutate: () => setPrivacySaveError(null),
    onSuccess: async (_data, savedSettings) => {
      const normalized = normalizeAnalyticsPrivacySettings(savedSettings);
      setPrivacySettings(normalized);
      setPrivacyNumericDraft(privacyNumericDraftFromSettings(normalized));
      setPrivacyNumericErrors({});
      toast.success("Analytics privacy controls saved.");
      await queryClient.invalidateQueries({ queryKey: ["store-analytics-report"] });
    },
    onError: () => setPrivacySaveError("Could not save the privacy controls. Your current values are still here; review them and try again."),
  });

  function handleSavePrivacy() {
    const validated = validatePrivacySettings();
    if (validated) savePrivacyMutation.mutate(validated);
  }

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
      <div className="flex min-h-56 items-center justify-center rounded-xl border border-border bg-card/40">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />Loading analytics report…</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle>Analytics unavailable</CardTitle>
          <CardDescription>We could not load the analytics report right now. Your store data has not been changed.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Analytics</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">See what is attracting shoppers, where they drop off, and what deserves action next.</p>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Report controls</CardTitle>
          <CardDescription>Choose the store scope and time window before reading the report.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-2">
              <Label>Store scope</Label>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button type="button" className="min-h-11" variant={scope === "active" ? "default" : "outline"} onClick={() => setScope("active")}>This store</Button>
                {canShowCombined ? <Button type="button" className="min-h-11" variant={scope === "all" ? "default" : "outline"} onClick={() => setScope("all")}>All my stores</Button> : null}
              </div>
              <p className="text-xs text-muted-foreground">{scope === "all" ? "Combined analytics across every store you can manage." : `Focused on ${activeStore?.name ?? "the selected store"}.`}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full lg:w-auto"
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

          <div className="space-y-2">
            <Label>Date range</Label>
            <div className="flex flex-wrap gap-2">
              {(["today", "last_7_days", "last_30_days", "this_month", "custom"] as AnalyticsDatePreset[]).map((preset) => (
                <Button key={preset} type="button" className="min-h-11" variant={datePreset === preset ? "default" : "outline"} onClick={() => setDatePreset(preset)}>
                  {getAnalyticsPresetLabel(preset)}
                </Button>
              ))}
            </div>
          </div>

          {datePreset === "custom" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-foreground"><span>Start date</span><input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="min-h-11 rounded-md border border-border bg-background px-3 text-sm" /></label>
              <label className="grid gap-2 text-sm text-foreground"><span>End date</span><input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="min-h-11 rounded-md border border-border bg-background px-3 text-sm" /></label>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {anomalyCards.length > 0 ? (
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Needs attention</CardTitle>
            <CardDescription>High-signal changes worth checking before you dig through every chart.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {anomalyCards.map((card) => (
              <div key={card.label} className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm font-semibold text-foreground">{card.label}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{card.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {!hasReportData ? (
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
      ) : (
        <StoreAnalyticsReport
          title="Store performance"
          description={scope === "all"
            ? `${getAnalyticsPresetLabel(datePreset)} of combined traffic, discovery intent, product interest, and conversion behavior across all of your stores.`
            : `${getAnalyticsPresetLabel(datePreset)} of traffic, discovery intent, product interest, and conversion behavior for the active store.`}
          report={report}
          previousReport={previousReport}
          storeSummaries={scope === "all" ? storeSummaries : []}
          storeSummaryTitle="Store comparison"
          storeSummaryDescription="See which stores are earning traffic, intent, and purchases in the same time window."
        />
      )}

      {hasReportData && anomalyCards.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/40 p-4 text-sm leading-6 text-muted-foreground">
          No high-signal anomaly is firing in this window. Keep an eye on search demand, checkout completion, and traffic quality as volume grows.
        </div>
      ) : null}

      <details className="group overflow-hidden rounded-xl border border-border bg-card/50">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-medium text-foreground">
          <span>Analytics settings & privacy</span>
          <span className="text-xs font-normal text-muted-foreground group-open:hidden">Open settings</span>
          <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">Close settings</span>
        </summary>
        <div className="border-t border-border p-5 sm:p-6">
          <p className="mb-5 max-w-2xl text-sm leading-6 text-muted-foreground">Control consent, retention, reporting cadence, and anomaly sensitivity. These settings are secondary to reading the report, so they stay out of the main decision path.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="analytics-consent-banner-required">Consent banner required</Label>
              <div className="flex min-h-11 items-center rounded-md border border-border bg-background px-3"><Switch id="analytics-consent-banner-required" checked={privacySettings.consentBannerRequired} onCheckedChange={(checked) => setPrivacySettings((prev) => ({ ...prev, consentBannerRequired: checked }))} /></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="analytics-visitor-identifiers">Allow visitor/session identifiers</Label>
              <div className="flex min-h-11 items-center rounded-md border border-border bg-background px-3"><Switch id="analytics-visitor-identifiers" checked={privacySettings.allowVisitorIdentifiers} onCheckedChange={(checked) => setPrivacySettings((prev) => ({ ...prev, allowVisitorIdentifiers: checked }))} /></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="analytics-retention-days">Retention days</Label>
              <Input ref={retentionDaysRef} id="analytics-retention-days" type="number" inputMode="numeric" min={30} max={730} step={1} value={privacyNumericDraft.retentionDays} onChange={(event) => updatePrivacyNumericDraft("retentionDays", event.target.value)} aria-invalid={Boolean(privacyNumericErrors.retentionDays)} aria-describedby={`analytics-retention-days-help${privacyNumericErrors.retentionDays ? " analytics-retention-days-error" : ""}`} className="min-h-11" />
              <p id="analytics-retention-days-help" className="text-xs text-muted-foreground">Keep analytics data for 30–730 days.</p>
              {privacyNumericErrors.retentionDays ? <p id="analytics-retention-days-error" role="alert" className="text-xs text-destructive">{privacyNumericErrors.retentionDays}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="analytics-report-cadence">Scheduled report cadence</Label>
              <Select value={privacySettings.scheduledReportCadence} onValueChange={(value) => setPrivacySettings((prev) => ({ ...prev, scheduledReportCadence: value as AnalyticsPrivacySettings["scheduledReportCadence"] }))}>
                <SelectTrigger id="analytics-report-cadence" className="min-h-11"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="off">Off</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="analytics-report-recipient">Report recipient</Label>
              <Input id="analytics-report-recipient" value={privacySettings.reportRecipient} onChange={(event) => setPrivacySettings((prev) => ({ ...prev, reportRecipient: event.target.value }))} placeholder="merchant@example.com" className="min-h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="analytics-anomaly-sensitivity">Anomaly sensitivity</Label>
              <Input ref={anomalySensitivityRef} id="analytics-anomaly-sensitivity" type="number" inputMode="numeric" min={5} max={50} step={1} value={privacyNumericDraft.anomalySensitivity} onChange={(event) => updatePrivacyNumericDraft("anomalySensitivity", event.target.value)} aria-invalid={Boolean(privacyNumericErrors.anomalySensitivity)} aria-describedby={`analytics-anomaly-sensitivity-help${privacyNumericErrors.anomalySensitivity ? " analytics-anomaly-sensitivity-error" : ""}`} className="min-h-11" />
              <p id="analytics-anomaly-sensitivity-help" className="text-xs text-muted-foreground">Use a whole-number sensitivity from 5–50.</p>
              {privacyNumericErrors.anomalySensitivity ? <p id="analytics-anomaly-sensitivity-error" role="alert" className="text-xs text-destructive">{privacyNumericErrors.anomalySensitivity}</p> : null}
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <Button type="button" className="min-h-11" onClick={handleSavePrivacy} disabled={savePrivacyMutation.isPending}>
              {savePrivacyMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save analytics settings
            </Button>
            {privacySaveError ? <p role="alert" className="text-sm text-destructive">{privacySaveError}</p> : null}
          </div>
        </div>
      </details>
    </div>
  );
}