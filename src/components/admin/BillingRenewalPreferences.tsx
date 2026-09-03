"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { getPlatformPermissions } from "@/lib/platform/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type RenewalPreferences = {
  available: boolean;
  planId: string | null;
  status: string | null;
  autoRenew: boolean;
  renewalPhone: string;
  currentPeriodEndsAt: string | null;
};

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again before changing renewal settings");
  return token;
}

function formatExpiry(value: string | null) {
  if (!value) return "the end of the current paid period";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "the end of the current paid period";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(parsed);
}

export default function BillingRenewalPreferences() {
  const { activeStoreId, storeRole, platformRole } = useAuth();
  const platformPermissions = getPlatformPermissions(platformRole);
  const canManage = storeRole === "owner" || platformPermissions.canManageSubscriptions;
  const [preferences, setPreferences] = useState<RenewalPreferences | null>(null);
  const [autoRenew, setAutoRenew] = useState(true);
  const [renewalPhone, setRenewalPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!activeStoreId || !canManage) {
        setPreferences(null);
        return;
      }

      setLoading(true);
      try {
        const token = await getAccessToken();
        const response = await fetch(`/api/billing/renewal-preferences?storeId=${encodeURIComponent(activeStoreId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error || "Failed to load renewal preferences");
        if (cancelled) return;

        const next = body as RenewalPreferences;
        setPreferences(next);
        setAutoRenew(next.autoRenew);
        setRenewalPhone(next.renewalPhone || "");
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Failed to load renewal preferences");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeStoreId, canManage]);

  const dirty = useMemo(() => {
    if (!preferences) return false;
    return autoRenew !== preferences.autoRenew || renewalPhone.trim() !== (preferences.renewalPhone || "").trim();
  }, [autoRenew, renewalPhone, preferences]);

  if (!canManage || !activeStoreId) return null;

  if (loading && !preferences) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading renewal preferences...
        </CardContent>
      </Card>
    );
  }

  if (!preferences?.available) return null;

  async function savePreferences() {
    if (!activeStoreId) return;
    if (!autoRenew && !renewalPhone.trim()) {
      toast.error("Enter a billing phone before turning renewal off.");
      return;
    }

    setSaving(true);
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/billing/renewal-preferences", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId: activeStoreId,
          autoRenew,
          renewalPhone: autoRenew ? null : renewalPhone,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "Failed to update renewal preferences");

      const next = body as RenewalPreferences;
      setPreferences(next);
      setAutoRenew(next.autoRenew);
      setRenewalPhone(next.renewalPhone || "");
      toast.success("Renewal preference saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update renewal preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
          <div className="space-y-1">
            <CardTitle className="text-lg">Renewal preference</CardTitle>
            <CardDescription>
              Control whether EZComo should expect this paid subscription to renew after its current access window.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
          <div className="space-y-1 pr-3">
            <Label htmlFor="subscription-auto-renew" className="text-sm font-medium">Keep renewal on</Label>
            <p className="text-sm text-muted-foreground">
              This preference does not authorize a silent charge. Current bKash checkout still requires payment approval unless a separate reusable payment authorization is supported and approved.
            </p>
          </div>
          <Switch
            id="subscription-auto-renew"
            checked={autoRenew}
            onCheckedChange={setAutoRenew}
            aria-label="Keep subscription renewal on"
          />
        </div>

        {!autoRenew ? (
          <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="space-y-1">
              <Label htmlFor="renewal-phone">Billing reminder phone</Label>
              <p className="text-sm text-muted-foreground">
                About 3 days before {formatExpiry(preferences.currentPeriodEndsAt)}, EZComo will queue an email to the store owner and an SMS to this number. Delivery is subject to platform messaging provider availability.
              </p>
            </div>
            <Input
              id="renewal-phone"
              inputMode="tel"
              autoComplete="tel"
              value={renewalPhone}
              onChange={(event) => setRenewalPhone(event.target.value)}
              placeholder="01712 345678 or +8801712345678"
              maxLength={32}
            />
          </div>
        ) : null}

        <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
          Same-plan renewals preserve prepaid time: monthly renewals add one month from the existing expiry, and annual renewals add one year. A paid plan change starts from the successful payment time instead of being deferred behind the old plan.
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-stretch gap-2 border-t border-border bg-muted/20 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Saved billing contact details are restricted to the platform billing service.
        </p>
        <Button type="button" onClick={savePreferences} disabled={!dirty || saving} className="sm:min-w-36">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save preference
        </Button>
      </CardFooter>
    </Card>
  );
}
