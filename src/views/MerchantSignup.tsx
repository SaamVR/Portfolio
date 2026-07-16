"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useNavigate, useSearchParams } from "@/lib/react-router-dom-shim";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Phone, Store, User } from "lucide-react";
import { slugify } from "@/lib/slug";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/site-config";
import { isContactOnlyPlan, resolveSignupPlanId, type PlanCatalogRecord } from "@/lib/billing/plans";
import { sendPhoneVerificationCode } from "@/lib/firebase-phone-auth";
import { signInWithGoogle } from "@/lib/google-auth";
import { exchangeFirebaseTokenForSupabaseSession } from "@/lib/auth-bridge-client";
import {
  fallbackStoreBlueprints,
  loadStoreBlueprints,
  type StoreBlueprintDefinition,
} from "@/lib/cms/store-blueprints";
import type { ConfirmationResult } from "@/lib/firebase-phone-auth";

type SignupStep = "methods" | "verify" | "details";

function normalizeHost(value?: string | null) {
  if (!value) return null;

  return value
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .split(":")[0]
    ?.trim()
    .toLowerCase() || null;
}

function getSignupRootDomain() {
  const configured = [
    process.env.NEXT_PUBLIC_CMS_ROOT_DOMAIN,
    process.env.NEXT_PUBLIC_STORE_SUBDOMAIN_BASE_DOMAIN,
    process.env.NEXT_PUBLIC_SITE_URL,
  ]
    .map(normalizeHost)
    .filter((value): value is string => Boolean(value));

  if (configured.length > 0) {
    return configured[0];
  }

  if (typeof window !== "undefined") {
    const hostname = normalizeHost(window.location.hostname);
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      const parts = hostname.split(".");
      if (parts.length >= 2) {
        return parts.slice(-2).join(".");
      }
      return hostname;
    }
  }

  return "localhost";
}

export default function MerchantSignup() {
  const { user, loading, refreshRole, setActiveStoreId } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<SignupStep>("methods");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [submittingDetails, setSubmittingDetails] = useState(false);
  const [plans, setPlans] = useState<PlanCatalogRecord[]>([
    { id: "basic", name: "Basic", description: null, monthly_price: 990, trial_days: 14, contact_only: false },
    { id: "advanced", name: "Advanced", description: null, monthly_price: 1490, trial_days: 14, contact_only: false },
    { id: "pro", name: "Pro", description: null, monthly_price: 3990, trial_days: 14, contact_only: true },
  ]);
  const [blueprints, setBlueprints] = useState<StoreBlueprintDefinition[]>(fallbackStoreBlueprints);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    storeName: "",
    storeSlug: "",
    businessType: "general-catalog",
    planId: searchParams.get("planId") || "basic",
    otpCode: "",
  });

  const blueprintGroups = useMemo(() => {
    const groups = new Map<string, StoreBlueprintDefinition[]>();
    for (const blueprint of blueprints) {
      const existing = groups.get(blueprint.group) ?? [];
      existing.push(blueprint);
      groups.set(blueprint.group, existing);
    }
    return Array.from(groups.entries());
  }, [blueprints]);

  const siteUrl = useMemo(
    () => absoluteStoreUrl({ slug: form.storeSlug || "your-store" }, "/"),
    [form.storeSlug],
  );

  useEffect(() => {
    supabase
      .from("cms_plans")
      .select("id, name, description, monthly_price, trial_days, contact_only, is_active")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data && data.length > 0) {
          const nextPlans = data as unknown as PlanCatalogRecord[];
          setPlans(nextPlans);
          const requestedPlanId = searchParams.get("planId");
          setForm((prev) => ({ ...prev, planId: resolveSignupPlanId(nextPlans, requestedPlanId) }));
        }
      });
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    const loadBlueprintOptions = async () => {
      const loaded = await loadStoreBlueprints(supabase);
      if (!active || loaded.length === 0) return;

      setBlueprints(loaded);
      setForm((prev) => {
        const hasCurrent = loaded.some((item) => item.id === prev.businessType);
        return {
          ...prev,
          businessType: hasCurrent ? prev.businessType : loaded[0].id,
        };
      });
    };

    void loadBlueprintOptions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user || loading) return;

    const metadataName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : "";
    const metadataPhone =
      typeof user.user_metadata?.phone_number === "string"
        ? user.user_metadata.phone_number
        : user.phone || "";

    setForm((prev) => ({
      ...prev,
      name: prev.name || metadataName,
      phone: prev.phone || metadataPhone,
    }));
    setStep("details");
  }, [loading, user]);

  const update = (field: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "storeName") next.storeSlug = slugify(value);
      if (field === "name" && !prev.storeName) {
        next.storeName = `${value.trim()}'s Store`.trim();
        next.storeSlug = slugify(next.storeName);
      }
      return next;
    });
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle({ redirectPath: "/signup" });
    } catch (error: any) {
      toast.error(error.message || "Google authentication failed");
      setGoogleLoading(false);
    }
  };

  const handleSendPhoneCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    setPhoneLoading(true);
    try {
      const nextConfirmation = await sendPhoneVerificationCode(form.phone);
      setConfirmation(nextConfirmation);
      toast.success("Verification code sent.");
    } catch (error: any) {
      toast.error(error.message || "Failed to send verification code");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhone = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!confirmation) {
      toast.error("Please request a verification code first.");
      setStep("methods");
      return;
    }
    if (!form.otpCode.trim()) {
      toast.error("Please enter the verification code");
      return;
    }

    setPhoneLoading(true);
    try {
      const credential = await confirmation.confirm(form.otpCode.trim());
      const idToken = await credential.user.getIdToken();
      const data = await exchangeFirebaseTokenForSupabaseSession({
        id_token: idToken,
        display_name: form.name || form.phone,
      });
      if (data?.error) throw new Error(String(data.error));
      if (!data?.access_token || !data?.refresh_token) {
        throw new Error("Phone verification did not return a valid session.");
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) throw sessionError;

      toast.success("Phone verified successfully.");
      setStep("details");
    } catch (error: any) {
      toast.error(error.message || "Phone verification failed");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleSubmitDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.storeName.trim() || !form.storeSlug.trim()) {
      toast.error("Please fill in name, store name, and store URL");
      return;
    }

    setSubmittingDetails(true);
    try {
      const { data, error } = await supabase.functions.invoke("merchant-signup", {
        body: {
          owner_name: form.name.trim(),
          store_name: form.storeName.trim(),
          store_slug: form.storeSlug.trim(),
          site_url: siteUrl,
          business_type: form.businessType,
          plan_id: form.planId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      if (!data?.store_id) {
        throw new Error("Workspace was created without a store id. Please try again.");
      }

      await refreshRole();
      setActiveStoreId(data.store_id);
      toast.success(data?.payment_required ? "Workspace created. Complete payment from your dashboard." : "Workspace created. Welcome to your dashboard.");

      const onboardingPath = `/admin/onboarding?storeId=${encodeURIComponent(data.store_id)}`;
      window.location.href = onboardingPath;
    } catch (error: any) {
      toast.error(error.message || "Failed to create workspace");
    } finally {
      setSubmittingDetails(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SEOHead title="Create CMS Workspace" description="Create a merchant CMS workspace." noindex />
      <section className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <Button asChild variant="ghost" className="mb-10 gap-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              {PLATFORM_BRAND_NAME}
            </Link>
          </Button>
          <h1 className="font-heading text-4xl font-bold leading-tight sm:text-5xl">
            Create your CMS workspace.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            This flow is for merchants and staff creating a store admin workspace. Customer accounts use the storefront account flow.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="rounded-full border border-border px-3 py-1">Tenant workspace</span>
            <span className="rounded-full border border-border px-3 py-1">Owner membership</span>
            <span className="rounded-full border border-border px-3 py-1">Admin dashboard</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold text-primary">Merchant signup</p>
            <h2 className="mt-2 font-heading text-2xl font-bold">
              {step === "details" ? "Store details" : step === "verify" ? "Verify phone" : "Choose sign-in method"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === "details" ? "Workspace creation happens after this step." : "Sign in first so the workspace has an owner."}
            </p>
          </div>

          {step === "methods" ? (
            <div className="space-y-3">
              <Button type="button" variant="outline" onClick={handleGoogleAuth} disabled={googleLoading || phoneLoading} className="h-11 w-full">
                {googleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue with Google
              </Button>
              <Button type="button" variant="outline" onClick={() => setStep("verify")} disabled={googleLoading || phoneLoading} className="h-11 w-full">
                <Phone className="mr-2 h-4 w-4" />
                Continue with Phone
              </Button>
              <Button asChild type="button" variant="ghost" className="w-full">
                <Link href="/admin/login">Already have admin access?</Link>
              </Button>
            </div>
          ) : null}

          {step === "verify" ? (
            <form onSubmit={confirmation ? handleVerifyPhone : handleSendPhoneCode} className="space-y-4">
              {!confirmation ? (
                <div>
                  <Label htmlFor="merchant-phone">Phone Number</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="merchant-phone"
                      value={form.phone}
                      onChange={(event) => update("phone", event.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="pl-10"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor="merchant-phone-code">Verification Code</Label>
                  <Input
                    id="merchant-phone-code"
                    inputMode="numeric"
                    value={form.otpCode}
                    onChange={(event) => update("otpCode", event.target.value)}
                    placeholder="Enter code"
                    className="mt-1"
                  />
                </div>
              )}
              <Button type="submit" disabled={phoneLoading} className="h-11 w-full">
                {phoneLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {confirmation ? "Verify Phone" : "Send Verification Code"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setStep("methods")} className="w-full">
                Back
              </Button>
            </form>
          ) : null}

          {step === "details" ? (
            <form onSubmit={handleSubmitDetails} className="space-y-4">
              <div>
                <Label htmlFor="owner-name">Owner Name</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="owner-name" data-testid="merchant-signup-owner-name" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Your name" className="pl-10" />
                </div>
              </div>
              <div>
                <Label htmlFor="store-name">Store Name</Label>
                <div className="relative mt-1">
                  <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="store-name" data-testid="merchant-signup-store-name" value={form.storeName} onChange={(event) => update("storeName", event.target.value)} placeholder="My Store" className="pl-10" />
                </div>
              </div>
              <div>
                <Label htmlFor="store-slug">Store URL</Label>
                <Input id="store-slug" data-testid="merchant-signup-store-slug" value={form.storeSlug} onChange={(event) => update("storeSlug", slugify(event.target.value))} placeholder="my-store" className="mt-1" />
                <p className="mt-1 truncate text-xs text-muted-foreground">{siteUrl}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="business-type">Business Type</Label>
                  <select id="business-type" value={form.businessType} onChange={(event) => update("businessType", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                    {blueprintGroups.map(([group, items]) => (
                      <optgroup key={group} label={group}>
                        {items.map((blueprint) => (
                          <option key={blueprint.id} value={blueprint.id}>
                            {blueprint.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="plan-id">Plan</Label>
                  <select id="plan-id" value={form.planId} onChange={(event) => update("planId", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                    {plans.map((p) => (
                      <option key={p.id} value={p.id} disabled={isContactOnlyPlan(p)}>
                        {isContactOnlyPlan(p) ? `${p.name} - Contact support` : p.name}
                      </option>
                    ))}
                  </select>
                  {plans.some((plan) => plan.id === "pro") ? (
                    <p className="mt-1 text-xs text-muted-foreground">Trial accounts can create one store. Additional stores unlock after your first paid package is active. Pro is support-managed.</p>
                  ) : null}
                </div>
              </div>
              <Button type="submit" data-testid="merchant-signup-submit" disabled={submittingDetails} className="h-11 w-full">
                {submittingDetails && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create CMS Workspace
              </Button>
            </form>
          ) : null}

          <div id="phone-recaptcha-container" />
        </div>
      </section>
    </main>
  );
}
