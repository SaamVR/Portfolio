"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth-context";
import { Link } from "@/lib/react-router-dom-shim";
import { withStoreId } from "@/lib/admin-paths";
import {
  buildNotificationHealthSummary,
  loadMerchantOpsSnapshot,
  normalizeNotificationSettings,
} from "@/lib/admin/merchant-ops";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

type StatusFilter = "all" | "sent" | "failed" | "retrying" | "dead_letter";
type ChannelFilter = "all" | "email" | "sms";
type PreviewTemplate = "merchant-order-alert" | "test-customer-receipt" | "order-shipped" | "welcome";
type PreviewChannel = "email" | "sms";

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function getStatusTone(status?: string | null) {
  if (!status) return "secondary" as const;
  if (status === "failed" || status === "dead_letter" || status === "bounced") return "destructive" as const;
  if (status === "retrying" || status === "queued") return "secondary" as const;
  return "default" as const;
}

export default function NotificationsCenterPage() {
  const { activeStoreId } = useAuth();
  const queryClient = useQueryClient();
  const [sendingTest, setSendingTest] = useState(false);
  const [retryingDue, setRetryingDue] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [templateName, setTemplateName] = useState<PreviewTemplate>("merchant-order-alert");
  const [previewChannel, setPreviewChannel] = useState<PreviewChannel>("email");
  const [testRecipient, setTestRecipient] = useState("");
  const [preview, setPreview] = useState<{
    subject: string | null;
    html: string | null;
    smsText: string | null;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [operatorNote, setOperatorNote] = useState("Please review the latest failed notifications for this store.");

  const { data, isLoading, error } = useQuery({
    queryKey: ["notification-center", activeStoreId],
    enabled: Boolean(activeStoreId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => loadMerchantOpsSnapshot(activeStoreId as string),
  });

  const notificationEvents = useMemo(() => data?.notificationEvents ?? [], [data]);
  const settings = normalizeNotificationSettings(data?.settings?.notification_settings);
  const health = useMemo(() => buildNotificationHealthSummary(notificationEvents), [notificationEvents]);
  const providerBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    notificationEvents.forEach((event) => {
      const key = event.provider?.trim() || "Unknown provider";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
      .map(([label, value]) => ({ label, value }));
  }, [notificationEvents]);
  const failureReasons = useMemo(() => {
    const counts = new Map<string, number>();
    notificationEvents
      .filter((event) => ["failed", "dead_letter", "bounced"].includes(event.status || ""))
      .forEach((event) => {
        const key = event.error?.trim() || "Unknown failure";
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
      .map(([label, value]) => ({ label, value }));
  }, [notificationEvents]);
  const templateHealth = useMemo(() => {
    const templateMap = new Map<string, { sent: number; failed: number; retrying: number }>();
    notificationEvents.forEach((event) => {
      const key = event.template_name?.trim() || "Notification event";
      const current = templateMap.get(key) ?? { sent: 0, failed: 0, retrying: 0 };
      if (event.status === "sent" || event.status === "delivered") current.sent += 1;
      if (["failed", "dead_letter", "bounced"].includes(event.status || "")) current.failed += 1;
      if (event.status === "retrying") current.retrying += 1;
      templateMap.set(key, current);
    });
    return [...templateMap.entries()]
      .map(([label, totals]) => ({ label, ...totals }))
      .sort((left, right) => (right.failed - left.failed) || (right.retrying - left.retrying) || (right.sent - left.sent))
      .slice(0, 5);
  }, [notificationEvents]);
  const channelHealth = useMemo(() => {
    return (["email", "sms"] as const).map((channel) => {
      const channelEvents = notificationEvents.filter((event) => event.channel === channel);
      return {
        channel,
        total: channelEvents.length,
        healthy: channelEvents.filter((event) => ["sent", "delivered"].includes(event.status || "")).length,
        blocked: channelEvents.filter((event) => ["failed", "dead_letter", "bounced"].includes(event.status || "")).length,
        queued: channelEvents.filter((event) => event.status === "retrying").length,
        escalated: channelEvents.filter((event) => Boolean(event.operator_escalated_at)).length,
      };
    });
  }, [notificationEvents]);
  const filteredEvents = useMemo(
    () =>
      notificationEvents.filter((event) => {
        const statusMatch =
          statusFilter === "all" ||
          (statusFilter === "sent" && ["sent", "delivered"].includes(event.status || "")) ||
          (statusFilter === "failed" && ["failed", "bounced"].includes(event.status || "")) ||
          event.status === statusFilter;
        const channelMatch = channelFilter === "all" || event.channel === channelFilter;
        return statusMatch && channelMatch;
      }),
    [channelFilter, notificationEvents, statusFilter],
  );
  const queueNeedingAttention = useMemo(
    () => notificationEvents.filter((event) => event.status === "retrying" || event.status === "dead_letter"),
    [notificationEvents],
  );

  useEffect(() => {
    if (!activeStoreId) {
      setPreview(null);
      return;
    }

    const controller = new AbortController();
    const loadPreview = async () => {
      setPreviewLoading(true);
      try {
        const session = await supabase.auth.getSession();
        const search = new URLSearchParams({
          storeId: activeStoreId,
          templateName,
          channel: previewChannel,
        });
        if (testRecipient.trim()) {
          search.set("recipient", testRecipient.trim());
        }

        const response = await fetch(`/api/notifications/test?${search.toString()}`, {
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token ?? ""}`,
          },
          signal: controller.signal,
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body?.error || "Failed to load preview");
        }
        setPreview(body.preview ?? null);
      } catch (previewError) {
        if ((previewError as Error).name !== "AbortError") {
          console.error(previewError);
          setPreview(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setPreviewLoading(false);
        }
      }
    };

    void loadPreview();
    return () => controller.abort();
  }, [activeStoreId, previewChannel, templateName, testRecipient]);

  const refreshCenter = async () => {
    if (!activeStoreId) return;
    await queryClient.invalidateQueries({ queryKey: ["notification-center", activeStoreId] });
  };

  const sendTestNotification = async () => {
    if (!activeStoreId) return;

    setSendingTest(true);
    try {
      const session = await supabase.auth.getSession();
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          storeId: activeStoreId,
          templateName,
          channel: previewChannel,
          recipient: testRecipient.trim() || undefined,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || "Failed to send test notification");
      }

      await refreshCenter();
      toast.success(`Test notification queued for ${body.recipient}`);
    } catch (sendError) {
      console.error(sendError);
      toast.error(sendError instanceof Error ? sendError.message : "Failed to send test notification");
    } finally {
      setSendingTest(false);
    }
  };

  const runDueRetries = async () => {
    if (!activeStoreId) return;

    setRetryingDue(true);
    try {
      const session = await supabase.auth.getSession();
      const response = await fetch("/api/notifications/retry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          storeId: activeStoreId,
          action: "run_due",
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || "Failed to process retries");
      }
      await refreshCenter();
      toast.success(body.retried > 0 ? `Retried ${body.retried} queued notification${body.retried === 1 ? "" : "s"}.` : "No due retry items right now.");
    } catch (retryError) {
      console.error(retryError);
      toast.error(retryError instanceof Error ? retryError.message : "Failed to process retries");
    } finally {
      setRetryingDue(false);
    }
  };

  const escalateEvent = async (eventId: string) => {
    if (!activeStoreId) return;

    try {
      const session = await supabase.auth.getSession();
      const response = await fetch("/api/notifications/retry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          storeId: activeStoreId,
          action: "escalate",
          eventId,
          reason: operatorNote.trim() || undefined,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || "Failed to escalate notification");
      }
      await refreshCenter();
      toast.success("Operator escalation noted for this notification.");
    } catch (escalationError) {
      console.error(escalationError);
      toast.error(escalationError instanceof Error ? escalationError.message : "Failed to escalate notification");
    }
  };

  if (!activeStoreId) {
    return (
      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>Notification control center</CardTitle>
          <CardDescription>Select a store first to review notification health.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading notification health...
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle>Notifications unavailable</CardTitle>
          <CardDescription>We could not load the notification center right now.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-7">
      <Card className="border-border bg-card/50">
        <CardHeader className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <BellRing className="h-6 w-6 text-primary" />
              Notification Control Center
            </CardTitle>
            <CardDescription className="max-w-2xl">
              Watch customer receipts, merchant alerts, retries, and dead letters from one place before launch traffic starts relying on them.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void sendTestNotification()} disabled={sendingTest} className="gap-2">
              {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send test notification
            </Button>
            <Button type="button" variant="outline" onClick={() => void runDueRetries()} disabled={retryingDue} className="gap-2">
              {retryingDue ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Run due retries
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to={withStoreId("/admin/site-settings?tab=notifications", activeStoreId)}>
                Open notification settings <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-background/60 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Healthy sends</p>
            <p className="mt-2 font-heading text-3xl font-bold text-emerald-600">{health.sent}</p>
            <p className="mt-1 text-xs text-muted-foreground">Accepted or delivered messages in the current history window.</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Retry queue</p>
            <p className="mt-2 font-heading text-3xl font-bold text-amber-600">{health.queuedForRetry}</p>
            <p className="mt-1 text-xs text-muted-foreground">Transient failures still scheduled for another attempt.</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Dead letters</p>
            <p className="mt-2 font-heading text-3xl font-bold text-destructive">{health.deadLetters}</p>
            <p className="mt-1 text-xs text-muted-foreground">Items that exhausted retries and now need manual review.</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Escalated</p>
            <p className="mt-2 font-heading text-3xl font-bold text-foreground">{health.escalated}</p>
            <p className="mt-1 text-xs text-muted-foreground">Failures already flagged for operator follow-up.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-7 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Template preview and test recipient</CardTitle>
            <CardDescription>Preview the exact message style, then send a real test through the configured delivery path.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Template</p>
                <Select value={templateName} onValueChange={(value) => setTemplateName(value as PreviewTemplate)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merchant-order-alert">Merchant order alert</SelectItem>
                    <SelectItem value="test-customer-receipt">Customer receipt</SelectItem>
                    <SelectItem value="order-shipped">Order shipped update</SelectItem>
                    <SelectItem value="welcome">Welcome message</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Channel</p>
                <Select value={previewChannel} onValueChange={(value) => setPreviewChannel(value as PreviewChannel)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Test recipient</p>
                <Input
                  value={testRecipient}
                  onChange={(event) => setTestRecipient(event.target.value)}
                  placeholder={previewChannel === "sms" ? "017XXXXXXXX" : "merchant@example.com"}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-5">
              {previewLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading preview...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{previewChannel.toUpperCase()}</Badge>
                    <Badge variant="secondary">{templateName}</Badge>
                  </div>
                  {preview?.subject ? (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Subject</p>
                      <p className="text-sm font-semibold text-foreground">{preview.subject}</p>
                    </div>
                  ) : null}
                  {preview?.html ? (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Email preview</p>
                      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground" dangerouslySetInnerHTML={{ __html: preview.html }} />
                    </div>
                  ) : null}
                  {preview?.smsText ? (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">SMS preview</p>
                      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">{preview.smsText}</div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Merchant-facing channel health</CardTitle>
            <CardDescription>See which channels are healthy, which ones are backing up, and when to escalate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {channelHealth.map((channel) => (
              <div key={channel.channel} className="rounded-xl border border-border bg-background/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{channel.channel === "email" ? "Email channel" : "SMS channel"}</p>
                    <p className="text-xs text-muted-foreground">
                      {channel.total > 0
                        ? `${channel.healthy} healthy, ${channel.queued} queued, ${channel.blocked} blocked.`
                        : "No activity yet on this channel."}
                    </p>
                  </div>
                  <Badge variant={channel.blocked > 0 ? "destructive" : channel.queued > 0 ? "secondary" : "default"}>
                    {channel.blocked > 0 ? "Needs attention" : channel.queued > 0 ? "Retrying" : "Healthy"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">Healthy {channel.healthy}</Badge>
                  <Badge variant="outline">Queued {channel.queued}</Badge>
                  <Badge variant="outline">Escalated {channel.escalated}</Badge>
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operator note</p>
              <Textarea
                value={operatorNote}
                onChange={(event) => setOperatorNote(event.target.value)}
                className="mt-2 min-h-[88px]"
                placeholder="Add a short note to explain what needs manual review."
              />
            </div>
            {!settings.emailReceipts && !settings.emailAlerts && !settings.smsEnabled ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700">
                No channel is enabled right now, so the store may miss customer receipts or merchant alerts.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-7 xl:grid-cols-3">
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Failure reasons</CardTitle>
            <CardDescription>The most common reasons recent sends did not go through.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {failureReasons.length > 0 ? failureReasons.map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 text-foreground">{item.label}</span>
                <Badge variant="destructive">{item.value}</Badge>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No recent failure reasons. That is the state we want before launch.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Template performance</CardTitle>
            <CardDescription>Which message types look healthy and which ones still need testing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templateHealth.length > 0 ? templateHealth.map((template) => (
              <div key={template.label} className="rounded-xl border border-border bg-background/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{template.label}</p>
                  <div className="flex gap-2">
                    <Badge variant="secondary">Sent {template.sent}</Badge>
                    <Badge variant="outline">Retrying {template.retrying}</Badge>
                    <Badge variant={template.failed > 0 ? "destructive" : "outline"}>Failed {template.failed}</Badge>
                  </div>
                </div>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No message history yet. Use the test send to create the first known-good signal.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Providers in play</CardTitle>
            <CardDescription>Quick visibility into which delivery providers are actually handling messages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {providerBreakdown.length > 0 ? providerBreakdown.map((provider) => (
              <div key={provider.label} className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3 text-sm">
                <span className="text-foreground">{provider.label}</span>
                <Badge variant="outline">{provider.value}</Badge>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No provider activity yet. Once notifications start sending, this becomes a quick routing check.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card/50">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle>Retry queue and dead letters</CardTitle>
              <CardDescription>Transient failures can retry automatically. Dead letters need a human decision.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/diagnostics">Open diagnostics</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/orders">Open orders</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {queueNeedingAttention.length > 0 ? queueNeedingAttention.map((event) => (
            <div key={event.id} className="rounded-xl border border-border bg-background/60 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{event.template_name || "Notification event"}</p>
                    <Badge variant={getStatusTone(event.status)}>{event.status || "unknown"}</Badge>
                    {event.operator_escalated_at ? <Badge variant="outline">Escalated</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {event.channel || "email"} via {event.provider || "provider"} to {event.recipient || "recipient unavailable"}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><RefreshCw className="h-3.5 w-3.5" /> Retry count {event.retry_count ?? 0}</span>
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> Next retry {formatDate(event.next_retry_at)}</span>
                    {event.provider_message_id ? (
                      <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Provider ID {event.provider_message_id}</span>
                    ) : null}
                  </div>
                  {event.error ? (
                    <p className="inline-flex items-center gap-2 pt-1 text-xs text-destructive">
                      <TriangleAlert className="h-3.5 w-3.5" />
                      {event.error}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!event.operator_escalated_at ? (
                    <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => void escalateEvent(event.id)}>
                      <ShieldAlert className="h-4 w-4" />
                      Escalate
                    </Button>
                  ) : (
                    <div className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
                      Escalated {formatDate(event.operator_escalated_at)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              The retry queue is clear. No dead letters are waiting for manual action.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card/50">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle>Recent delivery history</CardTitle>
              <CardDescription>Latest notification attempts across receipts, alerts, and store operations.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "sent", "failed", "retrying", "dead_letter"] as const).map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={statusFilter === status ? "default" : "outline"}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === "all" ? "All statuses" : status.replace("_", " ")}
                </Button>
              ))}
              {(["all", "email", "sms"] as const).map((channel) => (
                <Button
                  key={channel}
                  type="button"
                  size="sm"
                  variant={channelFilter === channel ? "default" : "outline"}
                  onClick={() => setChannelFilter(channel)}
                >
                  {channel === "all" ? "All channels" : channel.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredEvents.length > 0 ? filteredEvents.map((event) => (
            <div key={event.id} className="rounded-xl border border-border bg-background/60 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{event.template_name || "Notification event"}</p>
                    <Badge variant={getStatusTone(event.status)}>{event.status || "unknown"}</Badge>
                    {event.delivery_status ? <Badge variant="outline">{event.delivery_status}</Badge> : null}
                    {event.operator_escalated_at ? <Badge variant="outline">Escalated</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {event.channel || "email"} via {event.provider || "provider"} to {event.recipient || "recipient unavailable"}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {event.provider_message_id ? <span>Provider ID: {event.provider_message_id}</span> : null}
                    <span>Retry count: {event.retry_count ?? 0}</span>
                    {event.next_retry_at ? <span>Next retry: {formatDate(event.next_retry_at)}</span> : null}
                    {event.delivered_at ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Delivered {formatDate(event.delivered_at)}</span> : null}
                    {event.bounced_at ? <span className="inline-flex items-center gap-1 text-destructive"><TriangleAlert className="h-3.5 w-3.5" /> Bounced {formatDate(event.bounced_at)}</span> : null}
                  </div>
                  {event.error ? (
                    <p className="inline-flex items-center gap-2 pt-1 text-xs text-destructive">
                      <TriangleAlert className="h-3.5 w-3.5" />
                      {event.error}
                    </p>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(event.created_at)}</p>
              </div>
            </div>
          )) : (
            <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              {notificationEvents.length > 0
                ? "No events match the current filters."
                : "No delivery history yet. Once receipts or alerts start sending, this page becomes a quick health check."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
