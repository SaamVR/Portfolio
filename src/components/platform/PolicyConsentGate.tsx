"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { Button } from "@/components/ui/button";
import { usePlatformIdentity } from "@/components/platform/PlatformIdentityProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AcceptanceContext = "merchant_signup" | "billing" | "policy_update";

type PolicyState = {
  required: boolean;
  accepted: boolean;
  acceptedAt: string | null;
  policyVersion: string;
  acceptanceText: string | null;
  documentPaths: string[];
};

export default function PolicyConsentGate({
  context,
  children = null,
}: {
  context: AcceptanceContext;
  children?: ReactNode;
}) {
  const { session } = useAuth();
  const { siteName } = usePlatformIdentity();
  const [policy, setPolicy] = useState<PolicyState | null>(null);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPolicy = useCallback(async () => {
    const token = session?.access_token;
    if (!token) {
      setPolicy(null);
      setLoading(false);
      setError("Please sign in again before continuing.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/platform/policy-consent", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Could not load the current platform policies.");
      }
      setPolicy(data as PolicyState);
    } catch (caught) {
      setPolicy(null);
      setError(caught instanceof Error ? caught.message : "Could not load the current platform policies.");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    void loadPolicy();
  }, [loadPolicy]);

  const acceptPolicy = async () => {
    if (!policy?.required || !policy.policyVersion || !checked || saving) return;
    const token = session?.access_token;
    if (!token) {
      setError("Please sign in again before continuing.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/platform/policy-consent", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accepted: true,
          policyVersion: policy.policyVersion,
          context,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Could not record policy acceptance.");
      }
      setPolicy((current) => current ? {
        ...current,
        accepted: true,
        acceptedAt: data?.acceptedAt ?? new Date().toISOString(),
      } : current);
      setChecked(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record policy acceptance.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return children ? (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Checking policy acceptance" />
      </main>
    ) : (
      <div className="mx-auto max-w-5xl rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Checking current platform policies…
      </div>
    );
  }

  if (!error && policy && (!policy.required || policy.accepted)) {
    return <>{children}</>;
  }

  return (
    <main className={children ? "flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground" : "mx-auto max-w-5xl"}>
      <Card className="w-full border-border" data-testid="platform-policy-consent-gate">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
              {error ? <AlertCircle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle>{error ? "Policy check needs attention" : <>Review the current {siteName} policies</>}</CardTitle>
              <CardDescription className="mt-1">
                {error
                  ? "Store creation and paid billing stay protected until the current policy state can be verified."
                  : `Acceptance is recorded against policy version ${policy?.policyVersion}. A later binding version requires a new acceptance.`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
          ) : (
            <>
              <p className="text-sm leading-6 text-muted-foreground">{policy?.acceptanceText}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <Link href="/terms" target="_blank" className="font-semibold text-primary">Terms of Service</Link>
                <Link href="/privacy" target="_blank" className="font-semibold text-primary">Privacy Policy</Link>
                <Link href="/billing-policy" target="_blank" className="font-semibold text-primary">Billing Policy</Link>
              </div>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm leading-5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 shrink-0"
                  checked={checked}
                  onChange={(event) => setChecked(event.target.checked)}
                />
                <span>I have reviewed these policies and agree to the binding acceptance statement shown above.</span>
              </label>
            </>
          )}

          <div className="flex flex-wrap gap-3">
            {error ? (
              <Button type="button" onClick={() => void loadPolicy()}>Retry policy check</Button>
            ) : (
              <Button type="button" disabled={!checked || saving} onClick={() => void acceptPolicy()}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Accept and continue
              </Button>
            )}
            <Button asChild type="button" variant="outline">
              <Link href="/support">Contact platform support</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
