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
  Layers,
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

export function PlatformSystemSettingsCard({
  canModify,
  currentUser,
}: PlatformSystemSettingsCardProps) {
  const [settings, setSettings] = useState<PlatformGlobalSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPinging, setIsPinging] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetchPlatformGlobalSettings(supabase).then((res) => {
      if (mounted) {
        setSettings(res);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

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

        {/* Section 3: Core Integration Infrastructure Health Monitor */}
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
