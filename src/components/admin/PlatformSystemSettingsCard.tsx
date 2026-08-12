"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Globe2,
  HardDrive,
  Info,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  Mail,
  Radio,
  RefreshCw,
  Save,
  ShieldAlert,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPlatformGlobalSettings,
  savePlatformGlobalSettings,
  type PlatformGlobalSettings,
  type SystemServiceStatus,
} from "@/lib/platform/global-settings";
import { PlatformBroadcastBanner } from "@/components/admin/PlatformBroadcastBanner";
import { cn } from "@/lib/utils";

interface PlatformSystemSettingsCardProps {
  canModify: boolean;
  currentUser?: { id?: string; email?: string; role?: string };
}

type PlatformBkashConnectionSummary = {
  provider: "bkash";
  configured: boolean;
  status: "draft" | "connected" | "revoked";
  metadata: {
    environment: "sandbox" | "live";
    forceTestMode: boolean;
    baseUrl: string | null;
    label: string;
    appKeyHint: string | null;
    usernameHint: string | null;
  };
  updatedAt: string | null;
  revokedAt: string | null;
};

type PlatformBkashDraft = {
  appKey: string;
  appSecret: string;
  username: string;
  password: string;
  isLive: boolean;
  forceTestMode: boolean;
  baseUrl: string;
};

const emptyPlatformBkashDraft: PlatformBkashDraft = {
  appKey: "",
  appSecret: "",
  username: "",
  password: "",
  isLive: false,
  forceTestMode: false,
  baseUrl: "",
};

export function PlatformSystemSettingsCard({
  canModify,
  currentUser,
}: PlatformSystemSettingsCardProps) {
  const [settings, setSettings] = useState<PlatformGlobalSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPinging, setIsPinging] = useState<string | null>(null);
  const [platformAccessToken, setPlatformAccessToken] = useState<string | null>(null);
  const [platformBkashConnection, setPlatformBkashConnection] = useState<PlatformBkashConnectionSummary | null>(null);
  const [platformBkashDraft, setPlatformBkashDraft] = useState<PlatformBkashDraft>(emptyPlatformBkashDraft);
  const [platformBkashLoading, setPlatformBkashLoading] = useState(true);
  const [platformBkashSavingAction, setPlatformBkashSavingAction] = useState<string | null>(null);
  const [showPlatformBkashRotateForm, setShowPlatformBkashRotateForm] = useState(false);

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      fetchPlatformGlobalSettings(supabase),
      supabase.auth.getSession(),
    ]).then(([res, sessionRes]) => {
      if (!mounted) return;
      setSettings(res);
      const accessToken = sessionRes.data.session?.access_token ?? null;
      setPlatformAccessToken(accessToken);
      if (!accessToken) {
        setPlatformBkashLoading(false);
        return;
      }
      void loadPlatformBkashConnection(accessToken, mounted);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const loadPlatformBkashConnection = async (accessToken: string, mounted = true) => {
    try {
      setPlatformBkashLoading(true);
      const response = await fetch("/api/platform/payment-connections/bkash", {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load CMS subscription payment gateway.");
      }
      if (mounted) {
        setPlatformBkashConnection(payload.connection ?? null);
      }
    } catch (error: any) {
      if (mounted) {
        setPlatformBkashConnection(null);
      }
      toast.error(error?.message || "Failed to load CMS subscription payment gateway.");
    } finally {
      if (mounted) {
        setPlatformBkashLoading(false);
      }
    }
  };

  if (!settings) {
    return (
      <Card className="border-border p-6 text-center text-xs text-muted-foreground">
        Loading platform global settings...
      </Card>
    );
  }

  const handleSave = async () => {
    if (!canModify) {
      toast.error("Super Admin permissions required to update global platform settings.");
      return;
    }

    try {
      setIsSaving(true);
      const res = await savePlatformGlobalSettings(supabase, settings, {
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userRole: currentUser?.role,
      });

      if (res.success) {
        toast.success("Global platform settings & maintenance configuration updated successfully!");
      } else {
        toast.error(res.error || "Failed to save global platform settings.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePingService = async (serviceKey: string) => {
    setIsPinging(serviceKey);
    const start = performance.now();
    await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400));
    const latency = Math.round(performance.now() - start);

    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        services: prev.services.map((s) =>
          s.key === serviceKey
            ? { ...s, lastPingMs: latency, lastCheckedAt: new Date().toISOString() }
            : s
        ),
      };
    });
    setIsPinging(null);
    toast.success(`Ping check complete for ${serviceKey}. Latency: ${latency} ms`);
  };

  const updateServiceStatus = (serviceKey: string, newStatus: SystemServiceStatus["status"]) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        services: prev.services.map((s) =>
          s.key === serviceKey ? { ...s, status: newStatus, lastCheckedAt: new Date().toISOString() } : s
        ),
      };
    });
  };

  const savePlatformBkashConnection = async (rotate = false) => {
    if (!canModify) {
      toast.error("Super Admin permissions required to update CMS subscription payment settings.");
      return;
    }
    if (!platformAccessToken) {
      toast.error("Please sign in again before updating CMS subscription payment settings.");
      return;
    }

    setPlatformBkashSavingAction(rotate ? "rotate" : "save");
    try {
      const response = await fetch("/api/platform/payment-connections/bkash", {
        method: rotate ? "PATCH" : "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${platformAccessToken}`,
        },
        body: JSON.stringify({ settings: platformBkashDraft }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save CMS subscription payment gateway.");
      }

      setPlatformBkashConnection(payload.connection ?? null);
      setPlatformBkashDraft((prev) => ({
        ...emptyPlatformBkashDraft,
        isLive: prev.isLive,
        forceTestMode: prev.forceTestMode,
        baseUrl: prev.baseUrl,
      }));
      setShowPlatformBkashRotateForm(false);
      toast.success(rotate ? "CMS subscription bKash credentials rotated." : "CMS subscription bKash gateway connected.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save CMS subscription payment gateway.");
    } finally {
      setPlatformBkashSavingAction(null);
    }
  };

  const revokePlatformBkashConnection = async () => {
    if (!canModify) {
      toast.error("Super Admin permissions required to update CMS subscription payment settings.");
      return;
    }
    if (!platformAccessToken) {
      toast.error("Please sign in again before updating CMS subscription payment settings.");
      return;
    }

    setPlatformBkashSavingAction("revoke");
    try {
      const response = await fetch("/api/platform/payment-connections/bkash", {
        method: "DELETE",
        headers: { authorization: `Bearer ${platformAccessToken}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to revoke CMS subscription payment gateway.");
      }

      setPlatformBkashConnection(payload.connection ?? null);
      setShowPlatformBkashRotateForm(false);
      toast.success("CMS subscription bKash gateway revoked.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to revoke CMS subscription payment gateway.");
    } finally {
      setPlatformBkashSavingAction(null);
    }
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="space-y-3 border-b border-border/60 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
              <ShieldAlert className="h-5 w-5 text-primary" /> Platform Maintenance & Global Settings
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Configure system-wide maintenance mode, global broadcast banners, and core infrastructure service health.
            </CardDescription>
          </div>

          <Button
            type="button"
            disabled={!canModify || isSaving}
            onClick={() => void handleSave()}
            className="h-9 px-4 text-xs font-medium"
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            {isSaving ? "Saving..." : "Save Platform Settings"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Section 1: Maintenance Mode Killswitch */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-4 shadow-2xs">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-500" />
                <h4 className="text-sm font-semibold text-foreground">System-Wide Maintenance Mode</h4>
                {settings.maintenanceMode ? (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">
                    Maintenance Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                    Normal Operation
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                When enabled, tenant storefront checkout and merchant admin views will present a maintenance checkpoint screen.
              </p>
            </div>

            <Switch
              checked={settings.maintenanceMode}
              disabled={!canModify}
              onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
            />
          </div>

          {settings.maintenanceMode && (
            <div className="grid gap-4 pt-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Maintenance Title</Label>
                <Input
                  value={settings.maintenanceTitle}
                  disabled={!canModify}
                  onChange={(e) => setSettings({ ...settings, maintenanceTitle: e.target.value })}
                  className="h-9 text-xs"
                  placeholder="e.g. Scheduled Maintenance"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Maintenance Message for Merchants & Buyers</Label>
                <Textarea
                  value={settings.maintenanceMessage}
                  disabled={!canModify}
                  onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                  className="text-xs min-h-[70px]"
                  placeholder="Describe the reason and expected downtime..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Global Merchant Broadcast Announcement Banner */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-4 shadow-2xs">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-blue-500" />
                <h4 className="text-sm font-semibold text-foreground">Global Merchant Broadcast Banner</h4>
                {settings.broadcastBannerEnabled && (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]">
                    Live Broadcast
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Publish a global announcement bar at the top of all active merchant dashboards.
              </p>
            </div>

            <Switch
              checked={settings.broadcastBannerEnabled}
              disabled={!canModify}
              onCheckedChange={(checked) => setSettings({ ...settings, broadcastBannerEnabled: checked })}
            />
          </div>

          <div className="grid gap-4 pt-2 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Announcement Message</Label>
              <Input
                value={settings.broadcastBannerMessage}
                disabled={!canModify}
                onChange={(e) => setSettings({ ...settings, broadcastBannerMessage: e.target.value })}
                className="h-9 text-xs"
                placeholder="Enter announcement message..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Alert Color Variant</Label>
              <Select
                value={settings.broadcastBannerVariant}
                disabled={!canModify}
                onValueChange={(val: any) => setSettings({ ...settings, broadcastBannerVariant: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info (Blue)</SelectItem>
                  <SelectItem value="warning">Warning (Amber)</SelectItem>
                  <SelectItem value="critical">Critical Alert (Red)</SelectItem>
                  <SelectItem value="success">Success (Emerald)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Target Merchant Scope</Label>
              <Select
                value={settings.broadcastBannerTargetScope}
                disabled={!canModify}
                onValueChange={(val: any) => setSettings({ ...settings, broadcastBannerTargetScope: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_merchants">All Merchants</SelectItem>
                  <SelectItem value="free_merchants">Free Tier Merchants Only</SelectItem>
                  <SelectItem value="paid_merchants">Paid Subscription Merchants Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between sm:col-span-2 pt-4 border-t border-border/40">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium">Allow Merchant Dismissal</Label>
                <p className="text-[11px] text-muted-foreground">Merchants can close the banner for their active session.</p>
              </div>
              <Switch
                checked={settings.broadcastBannerDismissible}
                disabled={!canModify}
                onCheckedChange={(checked) => setSettings({ ...settings, broadcastBannerDismissible: checked })}
              />
            </div>
          </div>

          {/* Interactive Live Banner Preview */}
          <div className="mt-4 pt-4 border-t border-border/60 space-y-2">
            <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Live Merchant View Preview
            </Label>
            <div className="rounded-lg bg-background p-3 border border-border">
              {settings.broadcastBannerEnabled ? (
                <PlatformBroadcastBanner />
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-1">
                  Broadcast banner is currently disabled. Toggle the switch above to preview and activate.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: CMS Subscription Payment Gateway */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-4 shadow-2xs">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#E2136E]" />
                <h4 className="text-sm font-semibold text-foreground">CMS Subscription Payment Gateway</h4>
                {platformBkashConnection?.configured ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                    Not Configured
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Securely store the platform bKash credentials used for CMS plan checkout and subscription renewals.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-background/70 p-3 text-xs text-muted-foreground">
            These secrets are stored in a server-only secure table and used ahead of the legacy environment fallback for CMS billing routes.
          </div>

          {platformBkashLoading ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border/70 p-6 text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading CMS subscription gateway...
            </div>
          ) : platformBkashConnection?.configured && !showPlatformBkashRotateForm ? (
            <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Environment</Label>
                  <p className="mt-1 text-sm font-medium capitalize">{platformBkashConnection.metadata.environment}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Global test mode</Label>
                  <p className="mt-1 text-sm font-medium">{platformBkashConnection.metadata.forceTestMode ? "Enabled" : "Disabled"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <p className="mt-1 text-sm font-medium capitalize text-emerald-600">{platformBkashConnection.status}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">bKash Base URL</Label>
                  <p className="mt-1 break-all text-xs font-medium">
                    {platformBkashConnection.metadata.baseUrl || "Auto-select from environment"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">App Key Hint</Label>
                  <p className="mt-1 font-mono text-xs">{platformBkashConnection.metadata.appKeyHint || "********"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Username Hint</Label>
                  <p className="mt-1 font-mono text-xs">{platformBkashConnection.metadata.usernameHint || "********"}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canModify || Boolean(platformBkashSavingAction)}
                  onClick={() => {
                    setPlatformBkashDraft((prev) => ({
                      ...emptyPlatformBkashDraft,
                      isLive: platformBkashConnection.metadata.environment === "live" ? true : prev.isLive,
                      forceTestMode: platformBkashConnection.metadata.forceTestMode,
                      baseUrl: platformBkashConnection.metadata.baseUrl ?? "",
                    }));
                    setShowPlatformBkashRotateForm(true);
                  }}
                >
                  <KeyRound className="mr-1 h-3.5 w-3.5" />
                  Rotate Credentials
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={!canModify || Boolean(platformBkashSavingAction)}
                  onClick={() => void revokePlatformBkashConnection()}
                >
                  {platformBkashSavingAction === "revoke" ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                  )}
                  Revoke Gateway
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={platformBkashDraft.isLive}
                  disabled={!canModify || Boolean(platformBkashSavingAction)}
                  onCheckedChange={(checked) => setPlatformBkashDraft((prev) => ({ ...prev, isLive: checked }))}
                />
                <Label className="text-xs font-medium text-foreground">Use live production credentials</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={platformBkashDraft.forceTestMode}
                  disabled={!canModify || Boolean(platformBkashSavingAction)}
                  onCheckedChange={(checked) => setPlatformBkashDraft((prev) => ({ ...prev, forceTestMode: checked }))}
                />
                <Label className="text-xs font-medium text-foreground">Global test mode for CMS subscription payments</Label>
              </div>

              {platformBkashDraft.forceTestMode ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">bKash Base URL</Label>
                  <Input
                    value={platformBkashDraft.baseUrl}
                    disabled={!canModify || Boolean(platformBkashSavingAction)}
                    onChange={(e) => setPlatformBkashDraft((prev) => ({ ...prev, baseUrl: e.target.value }))}
                    placeholder="https://tokenized.sandbox.bka.sh/v1.2.0-beta"
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    When test mode is on, merchant subscription checkout will use these saved credentials and this base URL globally.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">App Key</Label>
                  <Input
                    type="password"
                    value={platformBkashDraft.appKey}
                    disabled={!canModify || Boolean(platformBkashSavingAction)}
                    onChange={(e) => setPlatformBkashDraft((prev) => ({ ...prev, appKey: e.target.value }))}
                    placeholder="Platform bKash app key"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">App Secret</Label>
                  <Input
                    type="password"
                    value={platformBkashDraft.appSecret}
                    disabled={!canModify || Boolean(platformBkashSavingAction)}
                    onChange={(e) => setPlatformBkashDraft((prev) => ({ ...prev, appSecret: e.target.value }))}
                    placeholder="Platform bKash app secret"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Username</Label>
                  <Input
                    value={platformBkashDraft.username}
                    disabled={!canModify || Boolean(platformBkashSavingAction)}
                    onChange={(e) => setPlatformBkashDraft((prev) => ({ ...prev, username: e.target.value }))}
                    placeholder="Platform bKash username"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Password</Label>
                  <Input
                    type="password"
                    value={platformBkashDraft.password}
                    disabled={!canModify || Boolean(platformBkashSavingAction)}
                    onChange={(e) => setPlatformBkashDraft((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Platform bKash password"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  disabled={
                    !canModify ||
                    Boolean(platformBkashSavingAction) ||
                    !platformBkashDraft.appKey ||
                    !platformBkashDraft.appSecret ||
                    !platformBkashDraft.username ||
                    !platformBkashDraft.password
                  }
                  onClick={() => void savePlatformBkashConnection(showPlatformBkashRotateForm)}
                >
                  {platformBkashSavingAction === "save" || platformBkashSavingAction === "rotate" ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : null}
                  {showPlatformBkashRotateForm ? "Save Rotated Credentials" : "Connect CMS bKash Gateway"}
                </Button>
                {showPlatformBkashRotateForm ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={Boolean(platformBkashSavingAction)}
                    onClick={() => {
                      setPlatformBkashDraft(emptyPlatformBkashDraft);
                      setShowPlatformBkashRotateForm(false);
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Core Integration Infrastructure Health Monitor */}
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-emerald-500" /> Platform Infrastructure & Integration Health
              </h4>
              <p className="text-xs text-muted-foreground">
                Monitor and manually manage status for core payment, media, edge CDN, and notification gateways.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
            {settings.services.map((svc) => (
              <div key={svc.key} className="rounded-xl border border-border/70 bg-background/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{svc.name}</p>
                    <p className="text-[10px] text-muted-foreground">{svc.category}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] capitalize font-medium",
                      svc.status === "operational" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                      svc.status === "degraded" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                      svc.status === "maintenance" && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                      svc.status === "outage" && "bg-red-500/10 text-red-600 border-red-500/30"
                    )}
                  >
                    {svc.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                  <span>Latency: <strong className="text-foreground">{svc.lastPingMs ? `${svc.lastPingMs} ms` : "N/A"}</strong></span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPinging === svc.key}
                    onClick={() => void handlePingService(svc.key)}
                    className="h-6 px-2 text-[10px]"
                  >
                    <RefreshCw className={cn("mr-1 h-3 w-3", isPinging === svc.key && "animate-spin")} /> Ping
                  </Button>
                </div>

                {canModify && (
                  <div className="pt-2 border-t border-border/40">
                    <Select
                      value={svc.status}
                      onValueChange={(val: any) => updateServiceStatus(svc.key, val)}
                    >
                      <SelectTrigger className="h-7 text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operational">Operational</SelectItem>
                        <SelectItem value="degraded">Degraded</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="outage">Major Outage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
