"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, MessageSquareText, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const POLICY_VERSION = "2026-09-04-paid-beta-1";

type Configuration = {
  identity: {
    siteName: string;
    legalOperatorName: string;
    updatedAt: string | null;
  };
  policy: {
    approvedVersion: string;
    policyVersion: string;
    binding: boolean;
    effectiveAt: string | null;
    acceptanceText: string | null;
    siteNameSnapshot: string | null;
    legalOperatorNameSnapshot: string | null;
    reissueRequired: boolean;
  };
  jurisdiction: {
    countryEnforcementEnabled: boolean;
    updatedAt: string | null;
  };
  availability: {
    monitoringStartedAt: string | null;
    commitmentPercent: number;
  };
  messaging: {
    activeProvider: string;
    smsEnabled: boolean;
    otpEnabled: boolean;
    transactionalEnabled: boolean;
    provider: {
      provider: string;
      configured: boolean;
      status: string;
      verificationStatus: string;
      lastVerifiedAt: string | null;
      verificationError: string | null;
      metadata: Record<string, unknown>;
    };
  };
};

export function PlatformIdentityMessagingSettingsCard() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [config, setConfig] = useState<Configuration | null>(null);
  const [siteName, setSiteName] = useState("");
  const [legalOperatorName, setLegalOperatorName] = useState("");
  const [credential, setCredential] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async (token?: string | null) => {
    const bearer = token ?? accessToken;
    if (!bearer) return;
    setLoading(true);
    try {
      const response = await fetch("/api/platform/configuration", {
        headers: { Authorization: `Bearer ${bearer}` },
        cache: "no-store",
      });
      if (response.status === 403) {
        setForbidden(true);
        setConfig(null);
        return;
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load platform configuration.");
      const next = payload as Configuration;
      setForbidden(false);
      setConfig(next);
      setSiteName(next.identity.siteName);
      setLegalOperatorName(next.identity.legalOperatorName ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load platform configuration.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const token = data.session?.access_token ?? null;
      setAccessToken(token);
      if (!token) {
        setLoading(false);
        return;
      }
      void load(token);
    });
    return () => {
      mounted = false;
    };
  }, [load]);

  const mutate = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!accessToken || working) return;
    setWorking(action);
    try {
      const response = await fetch("/api/platform/configuration", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, ...extra }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Platform configuration update failed.");
      const next = payload.configuration as Configuration;
      setConfig(next);
      setSiteName(next.identity.siteName);
      setLegalOperatorName(next.identity.legalOperatorName ?? "");
      setCredential("");
      toast.success("Platform configuration updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Platform configuration update failed.");
    } finally {
      setWorking(null);
    }
  };

  const providerReady = config?.messaging.provider.configured && config.messaging.provider.verificationStatus === "verified";
  const legalOperatorReady = Boolean(config?.identity.legalOperatorName.trim());
  const jurisdictionReady = config?.jurisdiction.countryEnforcementEnabled === true;
  const monitoringReady = Boolean(config?.availability.monitoringStartedAt);
  const policyActivationBlockedReason = !legalOperatorReady
    ? "Add the real legal operator name before policy activation."
    : !jurisdictionReady
      ? "Enable jurisdiction enforcement before policy activation."
      : !monitoringReady
        ? "Start 99% Core Service monitoring before policy activation."
        : null;
  const balance = useMemo(() => {
    const value = config?.messaging.provider.metadata?.balance;
    return value == null ? null : String(value);
  }, [config]);

  if (forbidden) return null;
  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading platform identity and messaging…
        </CardContent>
      </Card>
    );
  }
  if (!config || !accessToken) return null;

  return (
    <Card className="border-border shadow-sm" data-testid="platform-identity-messaging-settings">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" /> Platform identity, legal policy & messaging
        </CardTitle>
        <CardDescription>
          CMS-wide identity and platform messaging only. Merchant storefront identity and merchant-owned SMS providers remain store-scoped.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <section className="space-y-4 rounded-xl border border-border p-4">
          <div>
            <h3 className="text-sm font-semibold">Platform identity</h3>
            <p className="mt-1 text-xs text-muted-foreground">Changing these values does not rewrite an already-accepted legal version; binding policies keep immutable snapshots.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="platform-site-name">Site / brand name</Label>
              <Input id="platform-site-name" value={siteName} onChange={(event) => setSiteName(event.target.value)} maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="platform-legal-operator">Legal operator name</Label>
              <Input id="platform-legal-operator" value={legalOperatorName} onChange={(event) => setLegalOperatorName(event.target.value)} maxLength={160} placeholder="Required before binding paid-beta policies" />
            </div>
          </div>
          <Button
            type="button"
            disabled={working !== null || !siteName.trim()}
            onClick={() => void mutate("update_identity", { siteName, legalOperatorName })}
          >
            {working === "update_identity" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save platform identity
          </Button>
          {config.policy.reissueRequired ? (
            <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-900 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Current platform identity differs from the binding legal snapshot. Publish a new legal version before relying on the new identity contractually.
            </div>
          ) : null}
        </section>

        <section className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Jurisdiction enforcement</h3>
              <p className="mt-1 text-xs text-muted-foreground">Require the merchant country/regime consent boundary before a binding paid-beta policy can be activated.</p>
            </div>
            <Badge variant="outline">{jurisdictionReady ? "Enabled" : "Off"}</Badge>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-lg border border-border/70 p-3 text-sm">
            <span>
              <span className="block font-medium">Enforce country/regime consent</span>
              <span className="mt-1 block text-xs text-muted-foreground">Disabling remains available as a fail-closed rollback and immediately blocks paid-billing readiness.</span>
            </span>
            <Switch
              checked={jurisdictionReady}
              disabled={working !== null || (!legalOperatorReady && !jurisdictionReady)}
              onCheckedChange={(checked) => void mutate("set_jurisdiction_enforcement", { enabled: checked })}
            />
          </label>
          {!legalOperatorReady && !jurisdictionReady ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">Save the real legal operator identity before enabling jurisdiction enforcement.</p>
          ) : null}
        </section>

        <section className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">99% Core Service monitoring</h3>
              <p className="mt-1 text-xs text-muted-foreground">Five-minute canonical app + production database probes. Missing completed slots count as downtime.</p>
            </div>
            <Badge variant="outline">{config.availability.monitoringStartedAt ? "Active" : "Not started"}</Badge>
          </div>
          <Button type="button" variant="outline" disabled={working !== null || Boolean(config.availability.monitoringStartedAt)} onClick={() => void mutate("activate_availability")}>Start 99% monitoring</Button>
        </section>

        <section className="space-y-4 rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Paid-beta legal version</h3>
              <p className="mt-1 text-xs text-muted-foreground">Owner-approved version: {POLICY_VERSION}. Activation snapshots the current site and legal-operator names.</p>
            </div>
            <Badge variant="outline">{config.policy.binding ? `Binding: ${config.policy.policyVersion}` : "Review-only"}</Badge>
          </div>
          {policyActivationBlockedReason ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">{policyActivationBlockedReason}</p>
          ) : null}
          <Button
            type="button"
            variant={config.policy.binding && config.policy.policyVersion === POLICY_VERSION ? "outline" : "default"}
            disabled={working !== null || Boolean(policyActivationBlockedReason) || (config.policy.binding && config.policy.policyVersion === POLICY_VERSION)}
            onClick={() => void mutate("activate_policy")}
          >
            {working === "activate_policy" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {config.policy.binding && config.policy.policyVersion === POLICY_VERSION ? "Paid-beta policy active" : "Activate approved paid-beta policy"}
          </Button>
        </section>

        <section className="space-y-4 rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold"><MessageSquareText className="h-4 w-4" /> Platform SMS provider</h3>
              <p className="mt-1 text-xs text-muted-foreground">GreenWeb is the initial provider. Credentials are write-only and encrypted in Supabase Vault.</p>
            </div>
            <Badge variant="outline">{config.messaging.provider.verificationStatus}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="greenweb-token">GreenWeb API token</Label>
              <Input id="greenweb-token" type="password" autoComplete="new-password" value={credential} onChange={(event) => setCredential(event.target.value)} placeholder={config.messaging.provider.configured ? "Enter a new token to rotate" : "Paste token to connect"} />
            </div>
            <Button className="self-end" type="button" disabled={working !== null || !credential.trim()} onClick={() => void mutate("configure_sms_provider", { provider: "greenweb", credential })}>
              {working === "configure_sms_provider" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {config.messaging.provider.configured ? "Rotate & verify" : "Connect & verify"}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>Configured: {config.messaging.provider.configured ? "yes" : "no"}</span>
            <span>Verified: {providerReady ? "yes" : "no"}</span>
            {balance ? <span>Reported balance: {balance}</span> : null}
            {config.messaging.provider.lastVerifiedAt ? <span>Last check: {new Date(config.messaging.provider.lastVerifiedAt).toLocaleString()}</span> : null}
          </div>
          {config.messaging.provider.verificationError ? <p className="text-xs text-destructive">{config.messaging.provider.verificationError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={working !== null || !config.messaging.provider.configured} onClick={() => void mutate("verify_sms_provider", { provider: "greenweb" })}>
              {working === "verify_sms_provider" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Verify connection
            </Button>
            <Button type="button" variant="destructive" disabled={working !== null || !config.messaging.provider.configured} onClick={() => void mutate("revoke_sms_provider", { provider: "greenweb" })}>Revoke provider</Button>
          </div>

          <div className="grid gap-3 rounded-lg border border-border/70 p-3 md:grid-cols-3">
            <label className="flex items-center justify-between gap-3 text-sm"><span>SMS master</span><Switch checked={config.messaging.smsEnabled} disabled={!providerReady || working !== null} onCheckedChange={(checked) => void mutate("set_messaging", { provider: "greenweb", smsEnabled: checked, otpEnabled: checked ? config.messaging.otpEnabled : false, transactionalEnabled: checked ? config.messaging.transactionalEnabled : false })} /></label>
            <label className="flex items-center justify-between gap-3 text-sm"><span>Login / OTP</span><Switch checked={config.messaging.otpEnabled} disabled={!providerReady || !config.messaging.smsEnabled || working !== null} onCheckedChange={(checked) => void mutate("set_messaging", { provider: "greenweb", smsEnabled: true, otpEnabled: checked, transactionalEnabled: config.messaging.transactionalEnabled })} /></label>
            <label className="flex items-center justify-between gap-3 text-sm"><span>Platform notifications</span><Switch checked={config.messaging.transactionalEnabled} disabled={!providerReady || !config.messaging.smsEnabled || working !== null} onCheckedChange={(checked) => void mutate("set_messaging", { provider: "greenweb", smsEnabled: true, otpEnabled: config.messaging.otpEnabled, transactionalEnabled: checked })} /></label>
          </div>
          <p className="text-xs text-muted-foreground">Enabling Login / OTP here only marks provider readiness. Firebase phone login is retired; phone OTP must not be advertised as active unless a separately governed Supabase SMS authentication flow is configured and passes end-to-end verification.</p>
        </section>
      </CardContent>
    </Card>
  );
}
