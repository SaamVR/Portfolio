"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useNavigate, useSearchParams } from "@/lib/react-router-dom-shim";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, LayoutTemplate, Loader2, PanelsTopLeft, Phone, Store, User } from "lucide-react";
import { slugify } from "@/lib/slug";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/site-config";
import { isContactOnlyPlan, resolveSignupPlanId, type PlanCatalogRecord } from "@/lib/billing/plans";
import { sendPhoneVerificationCode } from "@/lib/firebase-phone-auth";
import { signInWithGoogle } from "@/lib/google-auth";
import { exchangeFirebaseTokenForSupabaseSession } from "@/lib/auth-bridge-client";
import {
  getStorefrontTemplateDefinition,
  getStorefrontTemplateSeedDefinition,
  resolveStorefrontTemplateId,
  storefrontTemplateOptions,
  type StorefrontTemplateId,
} from "@/lib/cms/storefront-templates";
import { getStorefrontTemplateReferenceImage } from "@/lib/cms/storefront-template-reference-images";
import type { ConfirmationResult } from "@/lib/firebase-phone-auth";
import { cn } from "@/lib/utils";

type SignupStep = "methods" | "verify" | "details" | "template" | "success";

type SlugAvailabilityState = "idle" | "checking" | "available" | "taken" | "invalid";

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

function getLaunchSuccessNextAction(templateId: StorefrontTemplateId) {
  if (templateId === "real-estate") {
    return {
      label: "Add First Listing",
      description: "Create the first property listing with price, location, and listing type.",
    };
  }

  if (templateId === "hotel") {
    return {
      label: "Add First Room",
      description: "Create the first room with pricing, occupancy, amenities, and policies.",
    };
  }

  if (templateId === "service" || templateId === "booking") {
    return {
      label: "Add First Service",
      description: "Create the first service package so the storefront is ready to book or request.",
    };
  }

  if (templateId === "inquiry-catalog") {
    return {
      label: "Add First Catalog Item",
      description: "Create the first inquiry-led item so buyers can request pricing or details.",
    };
  }

  return {
    label: "Add First Product",
    description: "Create the first product so the storefront is ready for browsing and checkout.",
  };
}

export default function MerchantSignup() {
  const { user, loading, refreshRole, setActiveStoreId, activeStoreId, authRecovery } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const intent = searchParams.get("intent");
  const entry = searchParams.get("entry");
  const requestedTemplateParam = searchParams.get("template");
  const requestedTemplateId = resolveStorefrontTemplateId(undefined, {
    templateSeedId: requestedTemplateParam || "general-catalog",
  }) as StorefrontTemplateId;
  const isAdditionalStoreFlow = intent === "new-store";
  const isDashboardCreateFlow = entry === "dashboard" && Boolean(user) && !isAdditionalStoreFlow;
  const [step, setStep] = useState<SignupStep>("methods");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [submittingDetails, setSubmittingDetails] = useState(false);
  const [createdStore, setCreatedStore] = useState<{
    storeId: string;
    dashboardPath: string;
    onboardingPath: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [slugState, setSlugState] = useState<SlugAvailabilityState>("idle");
  const [plans, setPlans] = useState<PlanCatalogRecord[]>([
    { id: "free", name: "Free", description: null, monthly_price: 0, trial_days: 0, contact_only: false },
    { id: "basic", name: "Basic", description: null, monthly_price: 990, trial_days: 14, contact_only: false },
    { id: "advanced", name: "Advanced", description: null, monthly_price: 1490, trial_days: 14, contact_only: false },
    { id: "pro", name: "Pro", description: null, monthly_price: 3990, trial_days: 14, contact_only: true },
  ]);
  const [accountRestriction, setAccountRestriction] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    storeName: "",
    storeSlug: "",
    businessType: requestedTemplateId,
    storefrontTemplateId: requestedTemplateId,
    planId: searchParams.get("planId") || "free",
    otpCode: "",
  });
  const slugCheckSequence = useRef(0);

  const templateGroups = useMemo(() => {
    const groups = new Map<string, typeof storefrontTemplateOptions>();
    for (const template of storefrontTemplateOptions) {
      const seed = getStorefrontTemplateSeedDefinition(template.value);
      const existing = groups.get(seed.group) ?? [];
      existing.push(template);
      groups.set(seed.group, existing);
    }
    return Array.from(groups.entries());
  }, []);
  const selectedTemplate = useMemo(
    () => getStorefrontTemplateDefinition(form.storefrontTemplateId),
    [form.storefrontTemplateId],
  );
  const launchNextAction = useMemo(
    () => getLaunchSuccessNextAction(form.storefrontTemplateId),
    [form.storefrontTemplateId],
  );

  const siteUrl = useMemo(
    () => absoluteStoreUrl({ slug: form.storeSlug || "your-store" }, "/"),
    [form.storeSlug],
  );
  const signupRootDomain = useMemo(() => getSignupRootDomain(), []);
  const normalizedSlug = form.storeSlug.trim();
  const requiresOwnerName = !isAdditionalStoreFlow && !isDashboardCreateFlow;
  const canSubmitDetails = normalizedSlug.length > 0 && slugState !== "checking" && slugState !== "taken" && slugState !== "invalid";
  const canContinueToTemplate = canSubmitDetails
    && (!requiresOwnerName || Boolean(form.name.trim()))
    && Boolean(form.storeName.trim())
    && !accountRestriction;

  useEffect(() => {
    if (loading || !user || isAdditionalStoreFlow || isDashboardCreateFlow) return;
    if (authRecovery.reason === "no_store") {
      navigate("/admin", { replace: true });
    }
  }, [authRecovery.reason, isAdditionalStoreFlow, isDashboardCreateFlow, loading, navigate, user]);

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
          const requestedPlanId = isAdditionalStoreFlow ? null : searchParams.get("planId");
          setForm((prev) => ({ ...prev, planId: resolveSignupPlanId(nextPlans, requestedPlanId) }));
        }
      });
  }, [isAdditionalStoreFlow, searchParams]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      businessType: requestedTemplateId,
      storefrontTemplateId: requestedTemplateId,
    }));
  }, [requestedTemplateId]);

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

  useEffect(() => {
    let active = true;

    const loadAccountRestriction = async () => {
      if (!user?.id) {
        if (active) setAccountRestriction(null);
        return;
      }

      const { data } = await (supabase as any)
        .from("merchant_account_statuses")
        .select("can_create_store, status_note")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;

      if (data?.can_create_store === false) {
        setAccountRestriction(
          typeof data?.status_note === "string" && data.status_note.trim()
            ? data.status_note
            : "Your account cannot create new stores right now. Please contact support.",
        );
        return;
      }

      setAccountRestriction(null);
    };

    void loadAccountRestriction();
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    setSubmitError(null);
  }, [form.businessType, form.name, form.planId, form.storeName, form.storeSlug, form.storefrontTemplateId]);

  useEffect(() => {
    const slug = slugify(form.storeSlug);

    if (!slug) {
      setSlugState(form.storeSlug.trim() ? "invalid" : "idle");
      return;
    }

    const currentSequence = slugCheckSequence.current + 1;
    slugCheckSequence.current = currentSequence;
    setSlugState("checking");

    const timer = window.setTimeout(async () => {
      const { data, error } = await (supabase as any)
        .from("stores")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (slugCheckSequence.current !== currentSequence) {
        return;
      }

      if (error) {
        setSlugState("idle");
        return;
      }

      setSlugState(data ? "taken" : "available");
    }, 300);

    return () => window.clearTimeout(timer);
  }, [form.storeSlug]);

  const update = (field: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "storeName") next.storeSlug = slugify(value);
      if (field === "name" && !prev.storeName) {
        next.storeName = `${value.trim()}'s Store`.trim();
        next.storeSlug = slugify(next.storeName);
      }
        if (field === "businessType" || field === "storefrontTemplateId") {
          const templateId = resolveStorefrontTemplateId(value, {
            templateSeedId: value,
          }) as StorefrontTemplateId;
        next.businessType = templateId;
        next.storefrontTemplateId = templateId;
      }
      return next;
    });
  };

  const extractSignupErrorMessage = async (error: unknown) => {
    const context = typeof error === "object" && error !== null && "context" in error
      ? (error as { context?: Response }).context
      : null;

    if (context instanceof Response) {
      try {
        const payload = await context.clone().json() as { error?: string; details?: string };
        if (typeof payload?.error === "string" && payload.error.trim()) {
          return payload.details ? `${payload.error} ${payload.details}` : payload.error;
        }
      } catch {
        try {
          const text = await context.clone().text();
          if (text.trim()) {
            return text.trim();
          }
        } catch {
          // Ignore response parsing failures and fall back to the standard error message.
        }
      }
    }

    return error instanceof Error ? error.message : String(error ?? "");
  };

  const getFriendlySignupError = (message: string) => {
    const normalized = message.toLowerCase();

    if (normalized.includes("already taken") || normalized.includes("already in use")) {
      return "That store URL is already being used. Please choose another one.";
    }
    if (normalized.includes("contact support")) {
      return "That package is enabled through support. Please contact us to activate it.";
    }
    if (normalized.includes("trial accounts can create only one store")) {
      return "Your trial can only create one live store. Activate a paid package to add more.";
    }
    if (normalized.includes("allows up to")) {
      return message;
    }
    if (normalized.includes("must be signed in") || normalized.includes("invalid session")) {
      return "Your session expired while creating the store. Please sign in again and retry.";
    }
    if (normalized.includes("failed to create store workspace")) {
      return "We could not create the store workspace yet. Please try again in a moment.";
    }
    if (normalized.includes("setup could not finish")) {
      return "Your store started creating, but the setup did not finish. Please retry once and contact support if it happens again.";
    }
    if (normalized.includes("edge function") || normalized.includes("failed to fetch") || normalized.includes("internal server error")) {
      return "We could not reach the signup service right now. Please try again in a moment.";
    }

    return message || "We could not create the store right now. Please try again.";
  };

  const slugStatusCopy = useMemo(() => {
    if (!normalizedSlug) {
      return `Your store can go live at ${siteUrl.replace(/^https?:\/\//, "")}`;
    }

    switch (slugState) {
      case "checking":
        return `Checking whether ${normalizedSlug}.${signupRootDomain} is available...`;
      case "available":
        return `${normalizedSlug}.${signupRootDomain} is available.`;
      case "taken":
        return `${normalizedSlug}.${signupRootDomain} is already taken.`;
      case "invalid":
        return "Use letters, numbers, and hyphens for the store URL.";
      default:
        return `Your store can go live at ${siteUrl.replace(/^https?:\/\//, "")}`;
    }
  }, [normalizedSlug, signupRootDomain, siteUrl, slugState]);

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

  const handleContinueToTemplate = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    if ((requiresOwnerName && !form.name.trim()) || !form.storeName.trim() || !form.storeSlug.trim()) {
      const message = requiresOwnerName ? "Please fill in name, store name, and store URL" : "Please fill in store name and store URL";
      setSubmitError(message);
      toast.error(message);
      return;
    }

    if (!canSubmitDetails) {
      const message = slugState === "taken"
        ? "That store URL is already taken. Please choose another one."
        : slugState === "checking"
          ? "Please wait while we check that store URL."
          : "Please enter a valid store URL before continuing.";
      setSubmitError(message);
      toast.error(message);
      return;
    }

    if (accountRestriction) {
      setSubmitError(accountRestriction);
      toast.error(accountRestriction);
      return;
    }

    setStep("template");
  };

  const handleSubmitDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    if ((requiresOwnerName && !form.name.trim()) || !form.storeName.trim() || !form.storeSlug.trim()) {
      const message = requiresOwnerName ? "Please fill in name, store name, and store URL" : "Please fill in store name and store URL";
      setSubmitError(message);
      toast.error(message);
      return;
    }

    if (!canSubmitDetails) {
      const message = slugState === "taken"
        ? "That store URL is already taken. Please choose another one."
        : slugState === "checking"
          ? "Please wait while we check that store URL."
          : "Please enter a valid store URL before continuing.";
      setSubmitError(message);
      toast.error(message);
      return;
    }

    setSubmittingDetails(true);
    try {
      const { data, error } = await supabase.functions.invoke("merchant-signup", {
        body: {
          owner_name: form.name.trim() || user?.user_metadata?.full_name || form.storeName.trim(),
          store_name: form.storeName.trim(),
          store_slug: form.storeSlug.trim(),
          site_url: siteUrl,
          business_type: form.businessType,
          storefront_template_id: form.storefrontTemplateId,
          plan_id: isAdditionalStoreFlow ? undefined : form.planId,
          source_store_id: isAdditionalStoreFlow ? activeStoreId : undefined,
          intent: isAdditionalStoreFlow ? "new-store" : "initial-signup",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      if (!data?.store_id) {
        throw new Error("Workspace was created without a store id. Please try again.");
      }

      setActiveStoreId(data.store_id);
      void refreshRole();
      toast.success(data?.payment_required ? "Workspace created. Complete payment from your dashboard." : "Workspace created. Your storefront is live and the dashboard is ready.");

      const dashboardPath = typeof data?.dashboard_path === "string" && data.dashboard_path.trim()
        ? data.dashboard_path
        : `/admin?storeId=${encodeURIComponent(data.store_id)}`;
      setCreatedStore({
        storeId: data.store_id,
        dashboardPath,
        onboardingPath: `/admin/onboarding?storeId=${encodeURIComponent(data.store_id)}&guide=continue`,
      });
      setStep("success");
    } catch (error: any) {
      const rawMessage = await extractSignupErrorMessage(error);
      const message = getFriendlySignupError(rawMessage);
      setSubmitError(message);
      toast.error(message);
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
              {step === "details"
                ? isAdditionalStoreFlow ? "Add another store" : isDashboardCreateFlow ? "Create your website" : "Store details"
                : step === "template"
                  ? "Choose template"
                  : step === "success"
                    ? "Launch successful"
                : step === "verify" ? "Verify phone" : "Choose sign-in method"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === "details"
                ? isAdditionalStoreFlow
                  ? "This store will reuse your existing owner account and package limits."
                  : isDashboardCreateFlow
                    ? "Start with the website name and subdomain."
                    : "Set the site name and domain first."
                : step === "template"
                  ? "Pick the storefront template that should launch instantly for this store."
                  : step === "success"
                    ? "The store is live. Continue in the dashboard or guided onboarding."
                : "Sign in first so the workspace has an owner."}
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
            <form onSubmit={handleContinueToTemplate} className="space-y-4">
              {!isAdditionalStoreFlow && !isDashboardCreateFlow ? (
                <div>
                  <Label htmlFor="owner-name">Owner Name</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="owner-name" data-testid="merchant-signup-owner-name" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Your name" className="pl-10" />
                  </div>
                </div>
              ) : null}
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
                <p
                  className={cn(
                    "mt-1 text-xs",
                    slugState === "available" ? "text-emerald-600" : slugState === "taken" || slugState === "invalid" ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {slugStatusCopy}
                </p>
              </div>
              {isDashboardCreateFlow ? (
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  After this step you will choose a storefront template with mobile-ready previews.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="business-type">Template Family</Label>
                    <select id="business-type" value={form.businessType} onChange={(event) => update("businessType", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                      {templateGroups.map(([group, items]) => (
                        <optgroup key={group} label={group}>
                          {items.map((template) => (
                            <option key={template.value} value={template.value}>
                              {template.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  {!isAdditionalStoreFlow ? (
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
                        <p className="mt-1 text-xs text-muted-foreground">Free includes one store and an EZComo subdomain. Paid plans start with a 14-day trial, and custom domains unlock only after a paid package becomes active.</p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Package</p>
                      <p className="mt-1 text-sm text-foreground">This store will inherit your current EZComo package limits automatically.</p>
                    </div>
                  )}
                </div>
              )}
              {submitError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {submitError}
                </div>
              ) : null}
              <Button type="submit" data-testid="merchant-signup-next" disabled={!canContinueToTemplate} className="h-11 w-full">
                <ArrowRight className="mr-2 h-4 w-4" />
                Continue to Templates
              </Button>
              {accountRestriction ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {accountRestriction}
                </div>
              ) : null}
            </form>
          ) : null}

          {step === "template" ? (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{form.storeName || "Your store"}</p>
                <p className="mt-1">{slugStatusCopy}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {storefrontTemplateOptions.map((template) => {
                  const templateId = template.value as StorefrontTemplateId;
                  const isActive = form.storefrontTemplateId === template.value;
                  const templateDefinition = getStorefrontTemplateDefinition(templateId);
                  const referenceImage = getStorefrontTemplateReferenceImage(templateId);
                  return (
                    <button
                      key={template.value}
                      type="button"
                      onClick={() => update("storefrontTemplateId", template.value)}
                      className={cn(
                        "overflow-hidden rounded-2xl border text-left transition-all",
                        isActive ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/40",
                      )}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {referenceImage ? (
                          <img
                            src={referenceImage}
                            alt={template.label}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-muted/60 text-muted-foreground">
                            <LayoutTemplate className="h-8 w-8" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-white">{template.label}</p>
                            {isActive ? <CheckCircle2 className="h-5 w-5 shrink-0 text-white" /> : null}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                            {templateDefinition.presentation.cardStyle}
                          </span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            Mobile ready
                          </span>
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">{template.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="rounded-md border border-border bg-card p-4">
                <p className="text-sm font-medium text-foreground">{selectedTemplate.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedTemplate.description}</p>
              </div>
              {submitError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {submitError}
                </div>
              ) : null}
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep("details")} className="h-11 flex-1">
                  Back
                </Button>
                <Button type="button" data-testid="merchant-signup-submit" onClick={() => {
                  const syntheticEvent = { preventDefault() {} } as React.FormEvent;
                  void handleSubmitDetails(syntheticEvent);
                }} disabled={submittingDetails} className="h-11 flex-[1.4]">
                  {submittingDetails && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isAdditionalStoreFlow ? "Create Additional Store" : "Launch Store"}
                </Button>
              </div>
            </div>
          ) : null}

          {step === "success" && createdStore ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="font-medium text-foreground">Launch successful</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {form.storeName} is live with the {selectedTemplate.label} storefront template. The merchant can start managing the store now or continue through guided onboarding.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Store URL:</span> {siteUrl.replace(/^https?:\/\//, "")}</p>
                <p className="mt-1"><span className="font-medium text-foreground">Template:</span> {selectedTemplate.label}</p>
              </div>
              <div className="rounded-md border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{launchNextAction.label}</p>
                <p className="mt-1">{launchNextAction.description}</p>
              </div>
              <div className="grid gap-3">
                <Button asChild variant="secondary" className="h-11 w-full">
                  <Link href={`/admin/products?storeId=${encodeURIComponent(createdStore.storeId)}&action=add`}>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    {launchNextAction.label}
                  </Link>
                </Button>
                <Button asChild className="h-11 w-full">
                  <Link href={createdStore.dashboardPath}>
                    <Store className="mr-2 h-4 w-4" />
                    Go To Dashboard
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 w-full">
                  <Link href={createdStore.onboardingPath}>
                    <PanelsTopLeft className="mr-2 h-4 w-4" />
                    Open Onboarding Wizard
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}

          <div id="phone-recaptcha-container" />
        </div>
      </section>
    </main>
  );
}
