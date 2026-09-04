"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Globe2, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { Button } from "@/components/ui/button";
import { usePlatformIdentity } from "@/components/platform/PlatformIdentityProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCountryOptions, normalizeCountryCode } from "@/lib/platform/jurisdiction";

type AcceptanceContext = "merchant_signup" | "billing" | "policy_update";

type PolicyState = {
  required: boolean;
  countryRequired: boolean;
  policyRequired: boolean;
  accepted: boolean;
  acceptedAt: string | null;
  policyVersion: string;
  acceptanceText: string | null;
  documentPaths: string[];
  businessCountryCode: string | null;
  legalRegime: string | null;
  suggestedCountryCode: string | null;
  geoHintCountryCode: string | null;
  geoHintRegionCode: string | null;
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
  const [countryCode, setCountryCode] = useState("");
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const countryOptions = useMemo(() => getCountryOptions(), []);

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
      const response = await fetch(`/api/platform/policy-consent?context=${encodeURIComponent(context)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Could not load the current platform policies.");
      }
      const next = data as PolicyState;
      setPolicy(next);
      const suggested = normalizeCountryCode(next.businessCountryCode || next.suggestedCountryCode);
      setCountryCode(suggested ?? "");
      setChecked(false);
    } catch (caught) {
      setPolicy(null);
      setError(caught instanceof Error ? caught.message : "Could not load the current platform policies.");
    } finally {
      setLoading(false);
    }
  }, [context, session?.access_token]);

  useEffect(() => {
    void loadPolicy();
  }, [loadPolicy]);

  const saveConsent = async () => {
    if (!policy || saving) return;
    const token = session?.access_token;
    const normalizedCountry = normalizeCountryCode(countryCode);
    if (!token) {
      setError("Please sign in again before continuing.");
      return;
    }
    if (!normalizedCountry) {
      setError("Select your business country before continuing.");
      return;
    }
    if (policy.policyRequired && !checked) return;

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
          accepted: policy.policyRequired ? checked : false,
          policyVersion: policy.policyVersion,
          context,
          countryCode: normalizedCountry,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Could not save your legal profile and policy acceptance.");
      }
      await loadPolicy();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your legal profile and policy acceptance.");
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

  if (!error && policy && !policy.required) {
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
              <CardTitle>{error ? "Policy check needs attention" : <>Confirm your business country and {siteName} policies</>}</CardTitle>
              <CardDescription className="mt-1">
                {error
                  ? "Store creation and paid billing stay protected until the current policy state can be verified."
                  : "Your selected business country is the legal-routing authority. IP geolocation is used only as a suggestion and is not silently treated as your business location."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
          ) : (
            <>
              <div className="rounded-lg border border-border p-3">
                <label htmlFor={`merchant-business-country-${context}`} className="flex items-center gap-2 text-sm font-semibold">
                  <Globe2 className="h-4 w-4 text-primary" /> Business country / region
                </label>
                <select
                  id={`merchant-business-country-${context}`}
                  value={countryCode}
                  onChange={(event) => {
                    setCountryCode(event.target.value);
                    setChecked(false);
                  }}
                  className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Select business country</option>
                  {countryOptions.map((country) => (
                    <option key={country.code} value={country.code}>{country.label}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {policy?.businessCountryCode
                    ? `Current legal profile: ${policy.businessCountryCode}${policy.legalRegime ? ` · ${policy.legalRegime}` : ""}.`
                    : policy?.geoHintCountryCode
                      ? `Suggested from this request: ${policy.geoHintCountryCode}. Confirm it before continuing.`
                      : "No reliable location hint was available, so please choose your business country manually."}
                </p>
              </div>

              {policy?.policyRequired ? (
                <>
                  <p className="text-sm leading-6 text-muted-foreground">{policy.acceptanceText}</p>
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
                  <p className="text-xs leading-5 text-muted-foreground">
                    Acceptance is stored against policy version {policy.policyVersion}, the confirmed country, and its legal regime. A later binding version or country change requires a fresh acceptance when the applicable rule requires one.
                  </p>
                </>
              ) : (
                <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm leading-6 text-muted-foreground">
                  No binding policy acceptance is active for this step. We still need your confirmed business country so the correct jurisdiction and future regional requirements can be applied.
                </p>
              )}
            </>
          )}

          <div className="flex flex-wrap gap-3">
            {error ? (
              <Button type="button" onClick={() => void loadPolicy()}>Retry policy check</Button>
            ) : (
              <Button
                type="button"
                disabled={!normalizeCountryCode(countryCode) || saving || Boolean(policy?.policyRequired && !checked)}
                onClick={() => void saveConsent()}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {policy?.policyRequired ? "Accept and continue" : "Confirm country and continue"}
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
