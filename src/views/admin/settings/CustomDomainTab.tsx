import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Copy, Globe, Loader2, RefreshCcw, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth-context";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { getRoutingDnsRecordName, normalizeDomainInput } from "@/lib/domains";
import { getStoreSubdomainBaseDomain } from "@/lib/platform/site-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useStoreEntitlements } from "@/hooks/useStoreEntitlements";

type DomainRecordInstruction = {
  type: string;
  name: string;
  value: string;
  purpose: "verification" | "routing" | "redirect";
};

type StoreDomain = {
  id: string;
  hostname: string;
  status: string;
  isPrimary: boolean;
  isActive: boolean;
  vercelVerified: boolean;
  vercelMisconfigured: boolean;
  cloudflareHostnameStatus?: string | null;
  cloudflareSslStatus?: string | null;
  configuredBy: string | null;
  verificationRecords: DomainRecordInstruction[];
  dnsRecords: DomainRecordInstruction[];
  lastError: { message?: string } | null;
  lastCheckedAt: string | null;
  activatedAt: string | null;
  isWwwDomain: boolean;
};

type DomainPageStore = {
  slug?: string;
  platformDomain?: string;
};

function statusTone(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "pending_dns":
    case "pending_verification":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "failed":
    case "misconfigured":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function labelForStatus(status: string) {
  switch (status) {
    case "pending_verification":
      return "Pending Verification";
    case "pending_dns":
      return "Pending DNS";
    case "pending_vercel":
      return "Provisioning";
    case "misconfigured":
      return "Misconfigured";
    default:
      return status.replace(/_/g, " ");
  }
}

function summarizeDomainError(message?: string | null, hostname?: string) {
  const safeHost = hostname?.trim() || "This domain";
  const normalized = message?.trim() || "";

  if (!normalized) {
    return `${safeHost} still needs DNS and SSL verification before it can replace the platform storefront link.`;
  }

  if (/vercel|project domain not found|changed env vars recently/i.test(normalized)) {
    return `${safeHost} still needs a fresh DNS and hostname check. Keep the platform storefront link live, recheck the DNS records, and try Check Connection again.`;
  }

  return normalized;
}

function explainDomainState(domain: StoreDomain) {
  if (domain.isActive) {
    return "Custom hostname and SSL are both active. This domain is ready to serve live traffic.";
  }

  if (domain.lastError?.message) {
    return summarizeDomainError(domain.lastError.message, domain.hostname);
  }

  if (domain.cloudflareHostnameStatus !== "active") {
    return "Cloudflare has not finished hostname ownership and routing verification yet. Recheck after your DNS records finish propagating.";
  }

  if (domain.cloudflareSslStatus !== "active") {
    return "Hostname is provisioned, but SSL is still being issued or validated. Keep the platform subdomain live until SSL turns active.";
  }

  if (domain.status === "misconfigured" || domain.vercelMisconfigured) {
    return "A DNS record is still pointing somewhere else or proxying is interfering with the CNAME target. Remove conflicting records and keep the hostname DNS only.";
  }

  return "This domain is still moving through verification. Recheck after DNS propagation finishes.";
}

export const CustomDomainTab = () => {
  const { activeStoreId } = useAuth();
  const { data: entitlementData } = useStoreEntitlements(activeStoreId);
  const [storeSlug, setStoreSlug] = useState("");
  const [platformDomainFromServer, setPlatformDomainFromServer] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [domains, setDomains] = useState<StoreDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actioningHostname, setActioningHostname] = useState<string | null>(null);
  const [domainAccessMessage, setDomainAccessMessage] = useState<string | null>(null);
  const customDomainsEnabled = entitlementData?.featureMap?.get("custom_domains")?.enabled ?? false;

  const platformDomain = useMemo(() => {
    if (platformDomainFromServer) return platformDomainFromServer;
    if (!storeSlug) return "";
    return `${storeSlug}.${getStoreSubdomainBaseDomain()}`;
  }, [platformDomainFromServer, storeSlug]);

  const previewRecords = useMemo(() => {
    if (!domainInput.trim()) return [];
    try {
      const normalized = normalizeDomainInput(domainInput);
      return [{
        type: "CNAME",
        name: getRoutingDnsRecordName(normalized),
        value: "customers.ezcomo.shop",
      }];
    } catch {
      return [];
    }
  }, [domainInput]);

  const primaryDomain = domains.find((domain) => domain.isPrimary && domain.isActive)?.hostname
    ?? domains.find((domain) => domain.isActive)?.hostname
    ?? null;

  const storefrontUrl = absoluteStoreUrl(
    storeSlug
      ? {
          slug: storeSlug,
          primaryDomain,
        }
      : undefined,
    "/",
  );

  const fetchDomainState = useCallback(async () => {
    if (!activeStoreId) {
      setStoreSlug("");
      setPlatformDomainFromServer("");
      setDomains([]);
      setDomainAccessMessage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const domainResponse = await fetch(`/api/domains?storeId=${encodeURIComponent(activeStoreId)}`, { 
        cache: "no-store",
        headers: await withAuthHeaders(),
      });
      if (!domainResponse.ok) {
        const body = await domainResponse.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load domains");
      }

      const domainData = await domainResponse.json();
      const store = (domainData.store ?? {}) as DomainPageStore;
      setDomainAccessMessage(typeof domainData.domainAccess?.message === "string" ? domainData.domainAccess.message : null);
      setStoreSlug(store.slug ?? "");
      setPlatformDomainFromServer(store.platformDomain ?? "");
      setDomains(domainData.domains ?? []);

      if (!store.slug && activeStoreId) {
        const { data: fallbackStore } = await supabase
          .from("stores")
          .select("slug")
          .eq("id", activeStoreId)
          .maybeSingle();

        if (fallbackStore?.slug) {
          setStoreSlug(fallbackStore.slug);
        }
      }
    } catch (error) {
      console.error("Failed to load store domains:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load domain settings");
    } finally {
      setLoading(false);
    }
  }, [activeStoreId]);

  useEffect(() => {
    void fetchDomainState();
  }, [fetchDomainState]);

  async function withAuthHeaders() {
    const session = await supabase.auth.getSession();
    return {
      Authorization: `Bearer ${session.data.session?.access_token ?? ""}`,
      "Content-Type": "application/json",
    };
  }

  async function addDomain() {
    if (!activeStoreId || !domainInput.trim()) return;
    if (!customDomainsEnabled) {
      toast.error(domainAccessMessage || "Custom domains unlock only after a paid package with domain access becomes active.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/domains", {
        method: "POST",
        headers: await withAuthHeaders(),
        body: JSON.stringify({
          storeId: activeStoreId,
          domain: domainInput,
        }),
      });

      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Failed to add domain");

      setDomainInput("");
      const store = (body.store ?? {}) as DomainPageStore;
      if (store.slug) {
        setStoreSlug(store.slug);
      }
      if (store.platformDomain) {
        setPlatformDomainFromServer(store.platformDomain);
      }
      setDomains(body.domains ?? []);
      if (body.warning?.message) {
        toast.warning(body.warning.message);
      } else {
        toast.success("Custom domain added. Add the DNS records below and check the connection to finish setup.");
      }
    } catch (error) {
      await fetchDomainState();
      toast.error(error instanceof Error ? error.message : "Failed to add domain");
      console.error("Domain add error:", error);
    } finally {
      setSaving(false);
    }
  }

  async function checkDomain(hostname: string) {
    if (!activeStoreId) return;
    if (!customDomainsEnabled) {
      toast.error(domainAccessMessage || "Custom domains unlock only after a paid package with domain access becomes active.");
      return;
    }

    setActioningHostname(hostname);
    try {
      const response = await fetch("/api/domains", {
        method: "PATCH",
        headers: await withAuthHeaders(),
        body: JSON.stringify({
          storeId: activeStoreId,
          domain: hostname,
          action: "check",
        }),
      });

      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Failed to check connection");

      const store = (body.store ?? {}) as DomainPageStore;
      if (store.slug) {
        setStoreSlug(store.slug);
      }
      if (store.platformDomain) {
        setPlatformDomainFromServer(store.platformDomain);
      }

      setDomains((current) =>
        current.map((domain) => (domain.hostname === hostname ? body.domain : domain)),
      );
      if (body.warning?.message) {
        toast.warning(body.warning.message);
      } else {
        toast.success("Domain status refreshed.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to check connection");
    } finally {
      setActioningHostname(null);
    }
  }

  async function makePrimary(hostname: string) {
    if (!activeStoreId) return;
    if (!customDomainsEnabled) {
      toast.error(domainAccessMessage || "Custom domains unlock only after a paid package with domain access becomes active.");
      return;
    }

    setActioningHostname(hostname);
    try {
      const response = await fetch("/api/domains", {
        method: "PATCH",
        headers: await withAuthHeaders(),
        body: JSON.stringify({
          storeId: activeStoreId,
          domain: hostname,
          action: "make-primary",
        }),
      });

      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Failed to set primary domain");

      setDomains((current) =>
        current.map((domain) => ({
          ...domain,
          isPrimary: domain.hostname === hostname,
        })),
      );
      if (body.warning?.message) {
        toast.warning(body.warning.message);
      } else {
        toast.success("Primary storefront domain updated.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set primary domain");
    } finally {
      setActioningHostname(null);
    }
  }

  async function removeDomain(hostname: string) {
    if (!activeStoreId) return;
    if (!customDomainsEnabled) {
      toast.error(domainAccessMessage || "Custom domains unlock only after a paid package with domain access becomes active.");
      return;
    }

    setActioningHostname(hostname);
    try {
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `/api/domains?storeId=${encodeURIComponent(activeStoreId)}&domain=${encodeURIComponent(hostname)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token ?? ""}`,
          },
        },
      );

      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Failed to remove domain");

      await fetchDomainState();
      toast.success("Custom domain removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove domain");
    } finally {
      setActioningHostname(null);
    }
  }

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Globe className="h-5 w-5 text-primary" />
            Domains
          </CardTitle>
          <CardDescription>
            Keep the platform subdomain live while your custom domain is being verified and DNS finishes propagating.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Platform domain</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input readOnly value={platformDomain || storefrontUrl} className="font-mono text-xs" />
              <Button type="button" variant="outline" onClick={() => copyValue(platformDomain, "Platform domain")} disabled={!platformDomain}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Current storefront URL: <span className="font-mono">{storefrontUrl}</span>
            </p>
            {storeSlug ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Current store subdomain: <span className="font-mono">{storeSlug}</span>
              </p>
            ) : null}
          </div>

          {!customDomainsEnabled ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700">
              {domainAccessMessage || "Custom domains are unavailable on free stores and during trial. Upgrade to an eligible paid package and complete payment activation first."}
            </div>
          ) : null}

          <div className="rounded-xl border border-dashed border-border bg-background p-4">
            <p className="text-sm font-semibold text-foreground">What you need to do</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Keep your current platform subdomain live during setup.</li>
              <li>Enter the exact address you want shoppers to use. The root domain, such as `example.com`, is recommended when your DNS provider supports apex CNAME/ALIAS/ANAME or CNAME flattening.</li>
              <li>Add the routing record shown below in your registrar or DNS provider.</li>
              <li>Come back here and press `Check Connection`. EZComo will ask Cloudflare to retry real-time ownership validation.</li>
              <li>If real-time validation stays pending, use the TXT verification record shown under the fallback section.</li>
              <li>If your DNS provider refuses a CNAME at `@`, connect `www.example.com` instead. EZComo provisions only the hostname you enter.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-domain-input">Add custom domain</Label>
            <div className="rounded-lg border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
              Before adding the domain:
              <ul className="mt-2 list-disc pl-5">
                <li>Use a domain you control at your registrar or DNS provider.</li>
                <li>Use the exact hostname you want as your storefront address. `example.com` is preferred when your DNS provider supports an apex alias/CNAME.</li>
                <li>EZComo creates one Cloudflare custom hostname per connection; it does not automatically add both root and `www`.</li>
                <li>Start with the routing record shown below. TXT ownership verification is kept as a fallback if real-time validation does not complete.</li>
                <li>If your DNS provider cannot point the root (`@`) to a CNAME/ALIAS/ANAME target, use `www.example.com` as the compatibility fallback.</li>
              </ul>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                id="custom-domain-input"
                value={domainInput}
                onChange={(event) => setDomainInput(event.target.value)}
                placeholder="example.com"
              />
              <Button type="button" onClick={() => void addDomain()} disabled={saving || !domainInput.trim()}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Connect Domain
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              You can paste a full URL. We normalize it on the server, reject platform, localhost, wildcard, and IP domains, and provision exactly one Cloudflare hostname. Root/apex domains are supported.
            </p>
            {previewRecords.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-semibold text-foreground">Expected DNS Records</p>
                {previewRecords.map((record, index) => (
                  <div key={index} className="rounded-xl border border-border bg-secondary/10 p-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Type</p>
                        <p className="mt-1 font-mono text-sm">{record.type}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
                        <p className="mt-1 font-mono text-sm">{record.name}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Value</p>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="break-all font-mono text-sm">{record.value}</p>
                          <Button type="button" variant="ghost" size="sm" onClick={() => void copyValue(record.value, `${record.type} value`)} className="h-6 px-2 text-xs">
                            Copy
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {domains.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No custom domains connected yet. Add your merchant domain above and we will show the exact DNS records to create.
          </CardContent>
        </Card>
      ) : null}

      {domains.map((domain) => {
        const routingRecords = domain.dnsRecords;
        const verificationFallbackRecords = domain.verificationRecords;
        const domainExplanation = explainDomainState(domain);
        return (
          <Card key={domain.id} className="border-border bg-card">
            <CardHeader className="gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                    <span className="font-mono">{domain.hostname}</span>
                    {domain.isPrimary ? <Badge variant="outline"><Star className="mr-1 h-3 w-3" />Primary</Badge> : null}
                    <Badge variant="outline" className={statusTone(domain.status)}>{labelForStatus(domain.status)}</Badge>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {domain.isActive
                      ? "Connected and serving traffic."
                      : "Keep the platform storefront link live until hostname verification, DNS, and SSL all pass."}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void checkDomain(domain.hostname)}
                    disabled={actioningHostname === domain.hostname}
                  >
                    {actioningHostname === domain.hostname ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                    Check Connection
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void makePrimary(domain.hostname)}
                    disabled={domain.isPrimary || !domain.isActive || actioningHostname === domain.hostname}
                  >
                    <Star className="mr-2 h-4 w-4" />
                    Make Primary
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void removeDomain(domain.hostname)}
                    disabled={actioningHostname === domain.hostname}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Verification</p>
                  <p className="mt-2 text-sm text-foreground">
                    {domain.cloudflareHostnameStatus === "active" ? "Hostname active" : "Hostname still pending"}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">SSL status</p>
                  <p className="mt-2 text-sm text-foreground">
                    {domain.cloudflareSslStatus === "active" ? "SSL active" : "SSL still pending"}
                  </p>
                </div>
              </div>

              <div className={`rounded-lg border p-4 text-sm ${domain.isActive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700" : "border-amber-500/20 bg-amber-500/10 text-amber-700"}`}>
                {domainExplanation}
              </div>

              {domain.lastError?.message ? (
                <div className="flex gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span>{summarizeDomainError(domain.lastError.message, domain.hostname)}</span>
                </div>
              ) : null}

              {domain.isActive ? (
                <div className="flex gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4" />
                  <span>This domain is active. Cloudflare has activated both the hostname and SSL certificate.</span>
                </div>
              ) : null}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">DNS instructions</h3>
                  {domain.configuredBy ? (
                    <Badge variant="secondary">Configured by {domain.configuredBy}</Badge>
                  ) : null}
                </div>
                {routingRecords.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    We have not received the routing instruction yet. Run Check Connection again in a moment.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                      Start with this routing record. Set it to DNS only. Then press Check Connection; EZComo will retry Cloudflare real-time validation automatically.
                    </div>
                    {routingRecords.map((record, index) => (
                      <div key={`${record.type}-${record.name}-${index}`} className="rounded-xl border border-border p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <Badge variant="outline">{record.purpose === "verification" ? "Verification" : record.purpose === "redirect" ? "Redirect" : "Routing"}</Badge>
                          <Button type="button" variant="ghost" size="sm" onClick={() => void copyValue(record.value, `${record.type} value`)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Value
                          </Button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Type</p>
                            <p className="mt-1 font-mono text-sm">{record.type}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
                            <p className="mt-1 font-mono text-sm">{record.name}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Value</p>
                            <p className="mt-1 break-all font-mono text-sm">{record.value}</p>
                          </div>
                          {record.type === "CNAME" ? (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Proxy</p>
                              <p className="mt-1 font-mono text-sm">DNS only</p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!domain.isActive && verificationFallbackRecords.length > 0 ? (
                  <details className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    <summary className="cursor-pointer font-medium text-foreground">TXT verification fallback</summary>
                    <p className="mt-2">
                      Use this only if the routing record is correct but Cloudflare still shows the hostname as pending after Check Connection.
                    </p>
                    <div className="mt-3 space-y-3">
                      {verificationFallbackRecords.map((record, index) => (
                        <div key={`${record.type}-${record.name}-${index}`} className="rounded-lg border border-border bg-secondary/10 p-3">
                          <div className="grid gap-3 md:grid-cols-3">
                            <div><p className="text-xs uppercase tracking-wide">Type</p><p className="mt-1 font-mono text-sm text-foreground">{record.type}</p></div>
                            <div><p className="text-xs uppercase tracking-wide">Name</p><p className="mt-1 break-all font-mono text-sm text-foreground">{record.name}</p></div>
                            <div>
                              <p className="text-xs uppercase tracking-wide">Value</p>
                              <div className="mt-1 flex items-start justify-between gap-2">
                                <p className="break-all font-mono text-sm text-foreground">{record.value}</p>
                                <Button type="button" variant="ghost" size="sm" onClick={() => void copyValue(record.value, `${record.type} value`)}>Copy</Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>

              <Separator />

              <div className="grid gap-3 rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide">Primary-domain behavior</p>
                  <p className="mt-2">
                    {domain.isPrimary
                      ? "This is the primary storefront domain. Keep marketing links, canonical URLs, and paid traffic pointed here."
                      : "If you make this domain primary later, the storefront should treat it as the canonical live destination and keep the platform subdomain as fallback only."}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide">Apex redirect strategy</p>
                  <p className="mt-2">
                    {domain.isWwwDomain
                      ? "This www hostname is the selected storefront address. You may redirect the apex to it separately if you want both forms to resolve."
                      : "This apex/root hostname is the selected storefront address. No www hostname is required."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>Real-time validation is attempted first; TXT ownership verification remains available as a fallback.</span>
                <span>Last checked: {domain.lastCheckedAt ? new Date(domain.lastCheckedAt).toLocaleString() : "Not checked yet"}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
