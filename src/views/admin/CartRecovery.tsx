"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Download, Loader2, Mail, MessageCircleMore, Save, ShoppingCart, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  cartRecoverySettingsKey,
  normalizeCartRecoverySettings,
  type CartRecoverySettings,
} from "@/lib/admin/merchant-growth-settings";
import { merchantNumericSettingBounds, parseBoundedIntegerDraft } from "@/lib/admin/numeric-setting-draft";

type RecoveryLeadRow = {
  id: string;
  status: string;
  recovery_stage: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_consent_status: string;
  cart_snapshot: Array<{ name?: string; quantity?: number; price?: number; variant?: string }>;
  cart_value: number;
  item_count: number;
  last_activity_at: string;
  next_contact_at: string | null;
  last_contact_at: string | null;
  recovered_revenue: number;
  recovery_coupon_code: string | null;
};

type RecoveryMessageRow = {
  id: string;
  lead_id: string;
  channel: string;
  status: string;
  retry_count: number;
  sent_at: string | null;
  next_retry_at: string | null;
};

type RecoveryLeadView = {
  id: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  status: string;
  recoveryStage: string;
  consentStatus: string;
  lastActivityAt: string;
  nextContactAt: string | null;
  lastContactAt: string | null;
  estimatedValue: number;
  recoveredRevenue: number;
  itemCount: number;
  itemSummary: string;
  message: string;
  couponCode: string | null;
  messageCount: number;
  sentCount: number;
  failedCount: number;
  retryCount: number;
  whatsappUrl: string | null;
  mailtoUrl: string | null;
};

type CartNumericField = "abandonmentWindowMinutes" | "cooldownHours" | "maxTouchesPerLead" | "dailyQueueLimit";
type CartNumericDraft = Record<CartNumericField, string>;
type CartNumericErrors = Partial<Record<CartNumericField, string>>;

const initialCartSettings = normalizeCartRecoverySettings(null);
const cartNumericBounds = {
  abandonmentWindowMinutes: merchantNumericSettingBounds.cartAbandonmentWindowMinutes,
  cooldownHours: merchantNumericSettingBounds.cartCooldownHours,
  maxTouchesPerLead: merchantNumericSettingBounds.cartMaxTouchesPerLead,
  dailyQueueLimit: merchantNumericSettingBounds.cartDailyQueueLimit,
} as const;

function cartNumericDraftFromSettings(settings: CartRecoverySettings): CartNumericDraft {
  return {
    abandonmentWindowMinutes: String(settings.abandonmentWindowMinutes),
    cooldownHours: String(settings.cooldownHours),
    maxTouchesPerLead: String(settings.maxTouchesPerLead),
    dailyQueueLimit: String(settings.dailyQueueLimit),
  };
}

function formatTaka(value: number) {
  return `৳${Math.max(0, value || 0).toLocaleString()}`;
}

function formatRelativeTime(value: string | null) {
  if (!value) return "Not scheduled";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Unknown";
  const diffMs = timestamp - Date.now();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (Math.abs(diffHours) < 1) return diffMs >= 0 ? "Within 1 hour" : "Less than 1 hour ago";
  if (Math.abs(diffHours) < 24) return diffMs >= 0 ? `In ${diffHours}h` : `${Math.abs(diffHours)}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return diffMs >= 0 ? `In ${diffDays}d` : `${Math.abs(diffDays)}d ago`;
}

export default function CartRecoveryPage() {
  const { activeStoreId } = useAuth();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<CartRecoverySettings>(initialCartSettings);
  const [cartNumericDraft, setCartNumericDraft] = useState<CartNumericDraft>(() => cartNumericDraftFromSettings(initialCartSettings));
  const [cartNumericErrors, setCartNumericErrors] = useState<CartNumericErrors>({});
  const [settingsSaveError, setSettingsSaveError] = useState<string | null>(null);
  const [queueActionError, setQueueActionError] = useState<string | null>(null);
  const abandonmentWindowRef = useRef<HTMLInputElement>(null);
  const cooldownHoursRef = useRef<HTMLInputElement>(null);
  const maxTouchesRef = useRef<HTMLInputElement>(null);
  const dailyQueueLimitRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["cart-recovery", activeStoreId],
    enabled: Boolean(activeStoreId),
    queryFn: async () => {
      const [
        { data: store, error: storeError },
        { data: leads, error: leadsError },
        { data: messages, error: messagesError },
        { data: analyticsEvents, error: analyticsError },
        { data: settingsRow, error: settingsError },
      ] = await Promise.all([
        supabase.from("stores").select("id, name, slug").eq("id", activeStoreId as string).maybeSingle(),
        (supabase as any)
          .from("store_cart_recovery_leads")
          .select("id, status, recovery_stage, contact_name, contact_email, contact_phone, contact_consent_status, cart_snapshot, cart_value, item_count, last_activity_at, next_contact_at, last_contact_at, recovered_revenue, recovery_coupon_code")
          .eq("store_id", activeStoreId as string)
          .order("last_activity_at", { ascending: false })
          .limit(100),
        (supabase as any)
          .from("store_cart_recovery_messages")
          .select("id, lead_id, channel, status, retry_count, sent_at, next_retry_at")
          .eq("store_id", activeStoreId as string)
          .order("created_at", { ascending: false })
          .limit(300),
        (supabase as any)
          .from("store_analytics_events")
          .select("event_name, session_id, visitor_id, event_timestamp")
          .eq("store_id", activeStoreId as string)
          .gte("event_timestamp", new Date(Date.now() - (1000 * 60 * 60 * 24 * 30)).toISOString())
          .limit(4000),
        supabase
          .from("site_settings")
          .select("value")
          .eq("store_id", activeStoreId as string)
          .eq("key", cartRecoverySettingsKey)
          .maybeSingle(),
      ]);

      if (storeError) throw storeError;
      if (leadsError) throw leadsError;
      if (messagesError) throw messagesError;
      if (analyticsError) throw analyticsError;
      if (settingsError) throw settingsError;

      return {
        store: store as { id: string; name: string; slug: string } | null,
        leads: (leads ?? []) as RecoveryLeadRow[],
        messages: (messages ?? []) as RecoveryMessageRow[],
        analyticsEvents: (analyticsEvents ?? []) as Array<{ event_name: string; session_id: string | null; visitor_id: string | null; event_timestamp: string }>,
        settings: normalizeCartRecoverySettings(settingsRow?.value),
      };
    },
  });

  function updateCartNumericDraft(field: CartNumericField, value: string) {
    const result = parseBoundedIntegerDraft(value, cartNumericBounds[field]);
    setCartNumericDraft((previous) => ({ ...previous, [field]: value }));
    setCartNumericErrors((previous) => ({
      ...previous,
      [field]: result.ok ? undefined : result.error,
    }));
  }

  function validateCartSettings() {
    const abandonmentWindowMinutes = parseBoundedIntegerDraft(cartNumericDraft.abandonmentWindowMinutes, cartNumericBounds.abandonmentWindowMinutes);
    const cooldownHours = parseBoundedIntegerDraft(cartNumericDraft.cooldownHours, cartNumericBounds.cooldownHours);
    const maxTouchesPerLead = parseBoundedIntegerDraft(cartNumericDraft.maxTouchesPerLead, cartNumericBounds.maxTouchesPerLead);
    const dailyQueueLimit = parseBoundedIntegerDraft(cartNumericDraft.dailyQueueLimit, cartNumericBounds.dailyQueueLimit);

    const nextErrors: CartNumericErrors = {
      abandonmentWindowMinutes: abandonmentWindowMinutes.ok ? undefined : abandonmentWindowMinutes.error,
      cooldownHours: cooldownHours.ok ? undefined : cooldownHours.error,
      maxTouchesPerLead: maxTouchesPerLead.ok ? undefined : maxTouchesPerLead.error,
      dailyQueueLimit: dailyQueueLimit.ok ? undefined : dailyQueueLimit.error,
    };
    setCartNumericErrors(nextErrors);

    if (!abandonmentWindowMinutes.ok || !cooldownHours.ok || !maxTouchesPerLead.ok || !dailyQueueLimit.ok) {
      if (!abandonmentWindowMinutes.ok) abandonmentWindowRef.current?.focus();
      else if (!cooldownHours.ok) cooldownHoursRef.current?.focus();
      else if (!maxTouchesPerLead.ok) maxTouchesRef.current?.focus();
      else dailyQueueLimitRef.current?.focus();
      return null;
    }

    return normalizeCartRecoverySettings({
      ...settings,
      abandonmentWindowMinutes: abandonmentWindowMinutes.value,
      cooldownHours: cooldownHours.value,
      maxTouchesPerLead: maxTouchesPerLead.value,
      dailyQueueLimit: dailyQueueLimit.value,
    });
  }

  const saveSettingsMutation = useMutation({
    mutationFn: async (nextSettings: CartRecoverySettings) => {
      if (!activeStoreId) return;
      const normalized = normalizeCartRecoverySettings(nextSettings);
      const { error: upsertError } = await supabase
        .from("site_settings")
        .upsert({ store_id: activeStoreId, key: cartRecoverySettingsKey, value: normalized as any }, { onConflict: "store_id,key" });
      if (upsertError) throw upsertError;
    },
    onMutate: () => {
      setSettingsSaveError(null);
    },
    onSuccess: async (_data, savedSettings) => {
      const normalized = normalizeCartRecoverySettings(savedSettings);
      setSettings(normalized);
      setCartNumericDraft(cartNumericDraftFromSettings(normalized));
      setCartNumericErrors({});
      toast.success("Recovery automation settings saved.");
      await queryClient.invalidateQueries({ queryKey: ["cart-recovery", activeStoreId] });
    },
    onError: () => {
      setSettingsSaveError("Could not save the recovery settings. Your current values are still here; review them and try again.");
    },
  });

  const queueRecoveryMutation = useMutation({
    mutationFn: async (nextSettings: CartRecoverySettings) => {
      if (!activeStoreId) {
        throw new Error("Select a store first.");
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Please sign in again before queueing recovery.");

      const response = await fetch("/api/cart-recovery/queue", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId: activeStoreId,
          settings: normalizeCartRecoverySettings(nextSettings),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Could not queue recovery follow-ups.");
      }
      return payload as { queuedCount: number };
    },
    onMutate: () => {
      setQueueActionError(null);
    },
    onSuccess: async (payload) => {
      toast.success(payload.queuedCount > 0 ? `${payload.queuedCount} recovery follow-up${payload.queuedCount === 1 ? "" : "s"} queued.` : "No leads were due for outreach yet.");
      await queryClient.invalidateQueries({ queryKey: ["cart-recovery", activeStoreId] });
    },
    onError: (mutationError) => {
      setQueueActionError(mutationError instanceof Error ? mutationError.message : "Could not queue recovery follow-ups. Review the settings and try again.");
    },
  });

  function handleSaveSettings() {
    const validated = validateCartSettings();
    if (validated) saveSettingsMutation.mutate(validated);
  }

  function handleQueueRecovery() {
    const validated = validateCartSettings();
    if (validated) queueRecoveryMutation.mutate(validated);
  }

  const leads = useMemo<RecoveryLeadView[]>(() => {
    const messageMap = new Map<string, RecoveryMessageRow[]>();
    for (const message of data?.messages ?? []) {
      const current = messageMap.get(message.lead_id) ?? [];
      current.push(message);
      messageMap.set(message.lead_id, current);
    }

    return (data?.leads ?? []).map((lead) => {
      const leadMessages = messageMap.get(lead.id) ?? [];
      const itemSummary = Array.isArray(lead.cart_snapshot) && lead.cart_snapshot.length > 0
        ? lead.cart_snapshot
            .slice(0, 4)
            .map((item) => `${item.name ?? "Product"} x${Math.max(1, Number(item.quantity ?? 1))}`)
            .join(", ")
        : "No cart items captured yet";
      const contactName = lead.contact_name || "Customer";
      const message = `Hi ${contactName}, you left ${itemSummary} in your cart at ${data?.store?.name ?? "our store"}. Want to complete your order?`;

      return {
        id: lead.id,
        contactName,
        email: lead.contact_email,
        phone: lead.contact_phone,
        status: lead.status,
        recoveryStage: lead.recovery_stage,
        consentStatus: lead.contact_consent_status,
        lastActivityAt: lead.last_activity_at,
        nextContactAt: lead.next_contact_at,
        lastContactAt: lead.last_contact_at,
        estimatedValue: lead.cart_value,
        recoveredRevenue: lead.recovered_revenue,
        itemCount: lead.item_count,
        itemSummary,
        message,
        couponCode: lead.recovery_coupon_code,
        messageCount: leadMessages.length,
        sentCount: leadMessages.filter((entry) => entry.status === "sent").length,
        failedCount: leadMessages.filter((entry) => entry.status === "failed").length,
        retryCount: leadMessages.reduce((sum, entry) => sum + Math.max(0, entry.retry_count ?? 0), 0),
        whatsappUrl: lead.contact_phone
          ? `https://wa.me/${lead.contact_phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
          : null,
        mailtoUrl: lead.contact_email
          ? `mailto:${encodeURIComponent(lead.contact_email)}?subject=${encodeURIComponent(`Complete your order at ${data?.store?.name ?? "our store"}`)}&body=${encodeURIComponent(message)}`
          : null,
      };
    });
  }, [data?.leads, data?.messages, data?.store?.name]);

  const anonymousRecoverySignals = useMemo(() => {
    const sessions = new Map<string, { hasCart: boolean; hasCheckout: boolean; hasPurchase: boolean }>();
    for (const event of data?.analyticsEvents ?? []) {
      const key = event.session_id || event.visitor_id;
      if (!key) continue;
      const current = sessions.get(key) ?? { hasCart: false, hasCheckout: false, hasPurchase: false };
      if (event.event_name === "add_to_cart" || event.event_name === "view_cart") current.hasCart = true;
      if (event.event_name === "begin_checkout") current.hasCheckout = true;
      if (event.event_name === "purchase") current.hasPurchase = true;
      sessions.set(key, current);
    }

    let anonymousCartStarts = 0;
    let anonymousCheckoutDropOff = 0;
    for (const session of sessions.values()) {
      if (session.hasCart && !session.hasPurchase) anonymousCartStarts += 1;
      if (session.hasCheckout && !session.hasPurchase) anonymousCheckoutDropOff += 1;
    }

    return { anonymousCartStarts, anonymousCheckoutDropOff };
  }, [data?.analyticsEvents]);

  const summary = useMemo(() => {
    return {
      actionableLeads: leads.filter((lead) => (lead.email || lead.phone) && lead.consentStatus === "accepted" && lead.status !== "recovered"),
      recoveredRevenue: leads.reduce((sum, lead) => sum + lead.recoveredRevenue, 0),
      queuedOutreach: leads.filter((lead) => lead.status === "abandoned" || lead.status === "contacted").length,
    };
  }, [leads]);

  useEffect(() => {
    setCartNumericErrors({});
    setSettingsSaveError(null);
    setQueueActionError(null);
  }, [activeStoreId]);

  useEffect(() => {
    if (data?.settings) {
      setSettings(data.settings);
      setCartNumericDraft(cartNumericDraftFromSettings(data.settings));
      setCartNumericErrors({});
      setSettingsSaveError(null);
      setQueueActionError(null);
    }
  }, [data?.settings]);

  const exportCsv = () => {
    if (leads.length === 0) return;
    const header = [
      "customer",
      "email",
      "phone",
      "status",
      "consent_status",
      "last_activity_at",
      "next_contact_at",
      "item_count",
      "estimated_value",
      "recovered_revenue",
      "message_count",
      "items",
    ];
    const rows = leads.map((lead) => [
      lead.contactName,
      lead.email ?? "",
      lead.phone ?? "",
      lead.status,
      lead.consentStatus,
      lead.lastActivityAt,
      lead.nextContactAt ?? "",
      String(lead.itemCount),
      String(lead.estimatedValue),
      String(lead.recoveredRevenue),
      String(lead.messageCount),
      lead.itemSummary,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cart-recovery-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!activeStoreId) {
    return (
      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>Cart recovery</CardTitle>
          <CardDescription>Select a store first to open abandoned-cart recovery.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Building recovery workspace...
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle>Recovery workspace unavailable</CardTitle>
          <CardDescription>We could not load the current cart-recovery queue right now.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card/50">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Recovery automation</CardTitle>
              <CardDescription>Define the abandonment window, follow-up rhythm, and safe queue size before the team pushes outreach.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handleSaveSettings} disabled={saveSettingsMutation.isPending}>
                {saveSettingsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save settings
              </Button>
              <Button type="button" onClick={handleQueueRecovery} disabled={queueRecoveryMutation.isPending}>
                {queueRecoveryMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Queue due follow-ups
              </Button>
            </div>
          </div>
          {settingsSaveError ? <p role="alert" className="text-sm text-destructive">{settingsSaveError}</p> : null}
          {queueActionError ? <p role="alert" className="text-sm text-destructive">{queueActionError}</p> : null}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="cart-abandonment-window">Abandonment window (minutes)</Label>
            <Input
              ref={abandonmentWindowRef}
              id="cart-abandonment-window"
              type="number"
              inputMode="numeric"
              min={15}
              max={1440}
              step={1}
              value={cartNumericDraft.abandonmentWindowMinutes}
              onChange={(event) => updateCartNumericDraft("abandonmentWindowMinutes", event.target.value)}
              aria-invalid={Boolean(cartNumericErrors.abandonmentWindowMinutes)}
              aria-describedby={`cart-abandonment-window-help${cartNumericErrors.abandonmentWindowMinutes ? " cart-abandonment-window-error" : ""}`}
            />
            <p id="cart-abandonment-window-help" className="text-xs text-muted-foreground">Use a whole number from 15–1440 minutes.</p>
            {cartNumericErrors.abandonmentWindowMinutes ? <p id="cart-abandonment-window-error" role="alert" className="text-xs text-destructive">{cartNumericErrors.abandonmentWindowMinutes}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cart-cooldown-hours">Cooldown between touches (hours)</Label>
            <Input
              ref={cooldownHoursRef}
              id="cart-cooldown-hours"
              type="number"
              inputMode="numeric"
              min={1}
              max={168}
              step={1}
              value={cartNumericDraft.cooldownHours}
              onChange={(event) => updateCartNumericDraft("cooldownHours", event.target.value)}
              aria-invalid={Boolean(cartNumericErrors.cooldownHours)}
              aria-describedby={`cart-cooldown-hours-help${cartNumericErrors.cooldownHours ? " cart-cooldown-hours-error" : ""}`}
            />
            <p id="cart-cooldown-hours-help" className="text-xs text-muted-foreground">Use a whole number from 1–168 hours.</p>
            {cartNumericErrors.cooldownHours ? <p id="cart-cooldown-hours-error" role="alert" className="text-xs text-destructive">{cartNumericErrors.cooldownHours}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cart-max-touches">Maximum touches per lead</Label>
            <Input
              ref={maxTouchesRef}
              id="cart-max-touches"
              type="number"
              inputMode="numeric"
              min={1}
              max={6}
              step={1}
              value={cartNumericDraft.maxTouchesPerLead}
              onChange={(event) => updateCartNumericDraft("maxTouchesPerLead", event.target.value)}
              aria-invalid={Boolean(cartNumericErrors.maxTouchesPerLead)}
              aria-describedby={`cart-max-touches-help${cartNumericErrors.maxTouchesPerLead ? " cart-max-touches-error" : ""}`}
            />
            <p id="cart-max-touches-help" className="text-xs text-muted-foreground">Use a whole number from 1–6 touches.</p>
            {cartNumericErrors.maxTouchesPerLead ? <p id="cart-max-touches-error" role="alert" className="text-xs text-destructive">{cartNumericErrors.maxTouchesPerLead}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cart-preferred-channel">Preferred channel</Label>
            <Select value={settings.preferredChannel} onValueChange={(value) => setSettings((prev) => ({ ...prev, preferredChannel: value as CartRecoverySettings["preferredChannel"] }))}>
              <SelectTrigger id="cart-preferred-channel"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="smart">Smart by available contact</SelectItem>
                <SelectItem value="email">Email first</SelectItem>
                <SelectItem value="whatsapp">WhatsApp first</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cart-daily-queue-limit">Daily queue limit</Label>
            <Input
              ref={dailyQueueLimitRef}
              id="cart-daily-queue-limit"
              type="number"
              inputMode="numeric"
              min={5}
              max={500}
              step={1}
              value={cartNumericDraft.dailyQueueLimit}
              onChange={(event) => updateCartNumericDraft("dailyQueueLimit", event.target.value)}
              aria-invalid={Boolean(cartNumericErrors.dailyQueueLimit)}
              aria-describedby={`cart-daily-queue-limit-help${cartNumericErrors.dailyQueueLimit ? " cart-daily-queue-limit-error" : ""}`}
            />
            <p id="cart-daily-queue-limit-help" className="text-xs text-muted-foreground">Use a whole number from 5–500 follow-ups per day.</p>
            {cartNumericErrors.dailyQueueLimit ? <p id="cart-daily-queue-limit-error" role="alert" className="text-xs text-destructive">{cartNumericErrors.dailyQueueLimit}</p> : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Recoverable leads", value: summary.actionableLeads.length, helper: "Consent-safe contacts we can actually reach." },
          { label: "Queued follow-ups", value: summary.queuedOutreach, helper: "Leads sitting inside the abandonment window." },
          { label: "Recovered revenue", value: formatTaka(summary.recoveredRevenue), helper: "Orders matched back to a recovery lead." },
          { label: "Anonymous checkout drop-offs", value: anonymousRecoverySignals.anonymousCheckoutDropOff, helper: "Intent we can see even without outreach rights." },
        ].map((item) => (
          <Card key={item.label} className="border-border bg-card/50">
            <CardHeader>
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-3xl">{item.value}</CardTitle>
              <p className="text-xs text-muted-foreground">{item.helper}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card/50">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Recovery queue</CardTitle>
              <CardDescription>
                This queue now comes from persisted recovery leads, not only signed-in cart guesses. Contact details appear only when the shopper allowed that outreach path.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={exportCsv} disabled={leads.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export recovery CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {leads.length === 0 ? (
            <AdminEmptyState
              icon={Users}
              title="No recovery leads yet"
              description="We have not captured any cart-recovery records for this storefront yet."
              helper="As shoppers build carts and move into checkout, this queue will begin filling with consent-safe recovery leads."
            />
          ) : (
            leads.map((lead) => (
              <div key={lead.id} className="rounded-2xl border border-border bg-background/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{lead.contactName}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{lead.status}</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{lead.recoveryStage}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {lead.email ?? "No email"}{lead.phone ? ` · ${lead.phone}` : ""} · Consent: {lead.consentStatus}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatTaka(lead.estimatedValue)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{lead.itemCount} item{lead.itemCount === 1 ? "" : "s"}</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-4">
                  <div className="rounded-xl bg-muted/50 px-3 py-2">Last activity: {formatRelativeTime(lead.lastActivityAt)}</div>
                  <div className="rounded-xl bg-muted/50 px-3 py-2">Next follow-up: {formatRelativeTime(lead.nextContactAt)}</div>
                  <div className="rounded-xl bg-muted/50 px-3 py-2">Sent: {lead.sentCount} · Failed: {lead.failedCount}</div>
                  <div className="rounded-xl bg-muted/50 px-3 py-2">Retries logged: {lead.retryCount}</div>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">{lead.itemSummary}</p>
                {lead.couponCode ? (
                  <p className="mt-2 text-xs text-primary">Recovery coupon ready: {lead.couponCode}</p>
                ) : null}
                {lead.recoveredRevenue > 0 ? (
                  <p className="mt-2 text-xs font-medium text-primary">Recovered so far: {formatTaka(lead.recoveredRevenue)}</p>
                ) : null}
                <p className="mt-3 rounded-xl bg-muted/60 p-3 text-sm text-foreground">{lead.message}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {lead.whatsappUrl ? (
                    <Button type="button" asChild>
                      <a href={lead.whatsappUrl} target="_blank" rel="noreferrer">
                        <MessageCircleMore className="mr-2 h-4 w-4" />
                        Open WhatsApp
                      </a>
                    </Button>
                  ) : null}

                  {lead.mailtoUrl ? (
                    <Button type="button" variant="outline" asChild>
                      <a href={lead.mailtoUrl}>
                        <Mail className="mr-2 h-4 w-4" />
                        Open email draft
                      </a>
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(lead.message);
                      toast.success("Recovery message copied.");
                    }}
                  >
                    Copy message
                  </Button>
                  {lead.status !== "opted_out" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        const { error: updateError } = await (supabase as any)
                          .from("store_cart_recovery_leads")
                          .update({ status: "opted_out", marketing_opt_out_at: new Date().toISOString() })
                          .eq("id", lead.id)
                          .eq("store_id", activeStoreId as string);
                        if (updateError) {
                          toast.error(updateError.message);
                          return;
                        }
                        toast.success("Lead marked as opted out.");
                        await queryClient.invalidateQueries({ queryKey: ["cart-recovery", activeStoreId] });
                      }}
                    >
                      Mark opted out
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>How this queue behaves now</CardTitle>
          <CardDescription>The system is more real now, but still intentionally safe.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background/80 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Anonymous intent is preserved
            </div>
            <p className="text-sm text-muted-foreground">
              Cart and checkout activity now persists even for anonymous shoppers, so the merchant can see real demand and abandonment volume.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/80 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock3 className="h-4 w-4 text-primary" />
              Follow-up windows are explicit
            </div>
            <p className="text-sm text-muted-foreground">
              Leads track last activity, next contact timing, retries, and recovered revenue so the queue reads like an operating system instead of a guess list.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/80 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users className="h-4 w-4 text-primary" />
              Consent still gates outreach
            </div>
            <p className="text-sm text-muted-foreground">
              Contact details stay hidden unless the shopper explicitly accepted the cookie-consent path that supports recovery outreach.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
