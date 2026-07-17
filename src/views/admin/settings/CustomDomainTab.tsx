import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Copy, Globe, Loader2, RefreshCcw, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth-context";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { getStoreSubdomainBaseDomain } from "@/lib/platform/site-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";

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

export const CustomDomainTab = () => {
  const { activeStoreId } = useAuth();
  const [storeSlug, setStoreSlug] = useState("");
  const [platformDomainFromServer, setPlatformDomainFromServer] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [domains, setDomains] = useState<StoreDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actioningHostname, setActioningHostname] = useState<string | null>(null);

  const platformDomain = useMemo(() => {
    if (platformDomainFromServer) return platformDomainFromServer;
    if (!storeSlug) return "";
    return `${storeSlug}.${getStoreSubdomainBaseDomain()}`;
  }, [platformDomainFromServer, storeSlug]);

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

  async function fetchDomainState() {
    if (!activeStoreId) {
      setStoreSlug("");
      setPlatformDomainFromServer("");
      setDomains([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const domainResponse = await fetch(`/api/domains?storeId=${encodeURIComponent(activeStoreId)}`, { cache: "no-store" });
      if (!domainResponse.ok) {
        const body = await domainResponse.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load domains");
      }

      const domainData = await domainResponse.json();
      const store = (domainData.store ?? {}) as DomainPageStore;
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
  }

  useEffect(() => {
    void fetchDomainState();
  }, [activeStoreId]);

  async function withAuthHeaders() {
    const session = await supabase.auth.getSession();
    return {
      Authorization: `Bearer ${session.data.session?.access_token ?? ""}`,
      "Content-Type": "application/json",
    };
  }

  async function addDomain() {
    if (!activeStoreId || !domainInput.trim()) return;

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
      if (body.warning) {
        toast.success("Custom domain added. Review the DNS details below.");
      } else {
        toast.success("Custom domain connected. Add the DNS records below to finish setup.");
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
      toast.success("Domain status refreshed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to check connection");
    } finally {
      setActioningHostname(null);
    }
  }

  async function makePrimary(hostname: string) {
    if (!activeStoreId) return;

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
      toast.success("Primary storefront domain updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set primary domain");
    } finally {
      setActioningHostname(null);
    }
  }

  async function removeDomain(hostname: string) {
    if (!activeStoreId) return;

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

          <div className="rounded-xl border border-dashed border-border bg-background p-4">
            <p className="text-sm font-semibold text-foreground">What you need to do</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Keep your current platform subdomain live during setup.</li>
              <li>Enter the domain you want to connect, such as `example.com` or `www.example.com`.</li>
              <li>Add the exact DNS records shown below in your registrar or DNS provider.</li>
              <li>Come back here and press `Check Connection` until the domain becomes active.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-domain-input">Add custom domain</Label>
            <div className="rounded-lg border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
              Before adding the domain:
              <ul className="mt-2 list-disc pl-5">
                <li>Use a domain you control at your registrar or DNS provider.</li>
                <li>Add the domain here first so we can fetch the exact records Vercel expects.</li>
                <li>After that, copy the records shown below and create them in your DNS dashboard.</li>
              </ul>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                id="custom-domain-input"
                value={domainInput}
                onChange={(event) => setDomainInput(event.target.value)}
                placeholder="example.com or www.example.com"
              />
              <Button type="button" onClick={() => void addDomain()} disabled={saving || !domainInput.trim()}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Connect Domain
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              You can paste a full URL. We normalize it on the server, reject platform or localhost domains, and fetch the exact DNS values from Vercel.
            </p>
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
        const records = [...domain.verificationRecords, ...domain.dnsRecords];
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
                      : "Keep the platform domain live until verification and DNS both pass."}
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
                    {domain.vercelVerified ? "Ownership verified" : "Ownership or TXT verification still pending"}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">DNS status</p>
                  <p className="mt-2 text-sm text-foreground">
                    {domain.vercelMisconfigured ? "DNS still needs changes" : "DNS looks correct"}
                  </p>
                </div>
              </div>

              {domain.lastError?.message ? (
                <div className="flex gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span>{domain.lastError.message}</span>
                </div>
              ) : null}

              {domain.isActive ? (
                <div className="flex gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4" />
                  <span>This domain is active. SSL is handled by Vercel once the configuration is complete.</span>
                </div>
              ) : null}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">DNS instructions</h3>
                  {domain.configuredBy ? (
                    <Badge variant="secondary">Configured by {domain.configuredBy}</Badge>
                  ) : null}
                </div>
                {records.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    We have not received DNS instructions yet. Run Check Connection again in a moment.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                      Add these records exactly as shown at your domain provider. If the same host already has an old A or CNAME record pointing elsewhere, remove or replace that conflicting record.
                    </div>
                    {records.map((record, index) => (
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>Primary URL stays on `www` by default when both apex and `www` are connected.</span>
                <span>Last checked: {domain.lastCheckedAt ? new Date(domain.lastCheckedAt).toLocaleString() : "Not checked yet"}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
