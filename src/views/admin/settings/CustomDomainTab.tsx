import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Globe, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/auth-context";

export const CustomDomainTab = () => {
  const { activeStoreId } = useAuth();
  const [domain, setDomain] = useState("");
  const [savedDomain, setSavedDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "active" | "error" | null>(null);

  useEffect(() => {
    let active = true;

    const fetchDomain = async () => {
      if (!activeStoreId) {
        if (!active) return;
        setInitialLoading(false);
        setCheckingVerification(false);
        setDomain("");
        setSavedDomain("");
        setVerificationStatus(null);
        return;
      }

      setInitialLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from("stores")
          .select("custom_domain")
          .eq("id", activeStoreId)
          .single();

        if (error) throw error;

        if (data?.custom_domain) {
          if (!active) return;
          setDomain(data.custom_domain);
          setSavedDomain(data.custom_domain);
          await checkVerification(data.custom_domain, () => active);
          return;
        }

        if (!active) return;
        setDomain("");
        setSavedDomain("");
        setVerificationStatus(null);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load custom domain:", error);
        toast.error("Failed to refresh custom domain settings. Please try again.");
      } finally {
        if (active) {
          setInitialLoading(false);
        }
      }
    };
    void fetchDomain();

    return () => {
      active = false;
    };
  }, [activeStoreId]);

  const checkVerification = async (domainToCheck: string, shouldApply: boolean | (() => boolean) = true) => {
    setCheckingVerification(true);
    try {
      const res = await fetch(`/api/domains?domain=${domainToCheck}`);
      const data = await res.json();
      const canApply = typeof shouldApply === "function" ? shouldApply() : shouldApply;

      if (!canApply) return;

      if (data.configured === false) {
        setVerificationStatus("error");
      } else if (data.verified) {
        setVerificationStatus("active");
      } else {
        setVerificationStatus("pending");
      }
    } catch (err) {
      const canApply = typeof shouldApply === "function" ? shouldApply() : shouldApply;
      if (canApply) {
        setVerificationStatus("error");
      }
    } finally {
      const canApply = typeof shouldApply === "function" ? shouldApply() : shouldApply;
      if (canApply) {
        setCheckingVerification(false);
      }
    }
  };

  const handleSaveDomain = async () => {
    if (!activeStoreId) return;
    
    if (domain === savedDomain) return; // No change
    
    setLoading(true);

    try {
      const formattedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!formattedDomain) {
        // Remove domain
        const res = await fetch(`/api/domains?storeId=${activeStoreId}&domain=${savedDomain}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error((await res.json()).error);
        
        setSavedDomain("");
        setDomain("");
        setVerificationStatus(null);
        toast.success("Custom domain removed");
      } else {
        // Add/Update domain
        const res = await fetch(`/api/domains`, {
          method: "POST",
          headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ storeId: activeStoreId, domain: formattedDomain })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        setDomain(data.domain || formattedDomain);
        setSavedDomain(data.domain || formattedDomain);
        setVerificationStatus(data.verified ? "active" : "pending");
        toast.success("Custom domain added successfully");
      }

    } catch (err: any) {
      toast.error(err.message || "Failed to update custom domain");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Custom Domain
        </CardTitle>
        <CardDescription>
          Connect a custom domain (e.g. www.yourbrand.com) to your store.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Domain Name</Label>
          <div className="flex gap-3">
            <Input 
              placeholder="e.g. yourstore.com" 
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="max-w-md"
            />
            <Button onClick={handleSaveDomain} disabled={loading || domain === savedDomain}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {domain ? (savedDomain && domain !== savedDomain ? "Update Domain" : "Save Domain") : "Remove Domain"}
            </Button>
          </div>
        </div>

        {savedDomain && verificationStatus === "pending" && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
            <div className="flex gap-3 items-start">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-500">Action Required: Configure DNS</p>
                <p className="text-xs text-amber-500/80 mt-1">
                  Your domain is added, but traffic isn't routing here yet. Log into your domain registrar (GoDaddy, Namecheap, etc.) and add the following records:
                </p>
              </div>
            </div>
            
            <div className="grid gap-2 text-sm pl-8">
              <div className="grid grid-cols-3 gap-2 p-3 bg-background/50 rounded border">
                <span className="font-semibold text-muted-foreground">Type</span>
                <span className="font-semibold text-muted-foreground">Name</span>
                <span className="font-semibold text-muted-foreground">Value</span>
                
                <span>A Record</span>
                <span>@</span>
                <span className="font-mono">76.76.21.21</span>
                
                <span className="col-span-3 border-t my-1"></span>
                
                <span>CNAME</span>
                <span>www</span>
                <span className="font-mono">cname.vercel-dns.com</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                DNS can still take time to propagate globally, but once verification turns active the storefront routing should refresh quickly without waiting on a long platform cache window.
              </p>
              <Button variant="outline" size="sm" className="w-fit mt-2" onClick={() => checkVerification(savedDomain)} disabled={checkingVerification}>
                <Loader2 className={`h-3 w-3 mr-2 ${checkingVerification ? "animate-spin" : "hidden"}`} />
                Check Status Again
              </Button>
            </div>
          </div>
        )}

        {savedDomain && verificationStatus === "active" && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex gap-3 items-start">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-500">Domain Active</p>
              <p className="text-xs text-green-500/80 mt-1">
                Your store is actively serving traffic from {savedDomain}. SSL certificates are automatically managed.
              </p>
            </div>
          </div>
        )}
        
        {savedDomain && verificationStatus === "error" && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-3 items-start">
            <XCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Verification Error</p>
              <p className="text-xs text-destructive/80 mt-1">
                We could not verify your domain status. Please check your DNS settings.
              </p>
              <Button variant="outline" size="sm" className="w-fit mt-3 border-destructive/30 hover:bg-destructive/10" onClick={() => checkVerification(savedDomain)} disabled={checkingVerification}>
                Retry Verification
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
