"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Globe2,
  LayoutTemplate,
  Loader2,
  LockKeyhole,
  Phone,
  Rocket,
  ShieldCheck,
  Sparkles,
  Store,
  User,
  WandSparkles,
} from "lucide-react";
import { useNavigate, useSearchParams } from "@/lib/react-router-dom-shim";
import SEOHead from "@/components/SEOHead";
import MerchantTemplatePicker from "@/components/auth/MerchantTemplatePicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { PLATFORM_BRAND_NAME } from "@/lib/platform/site-config";
import { isContactOnlyPlan, resolveSignupPlanId, type PlanCatalogRecord } from "@/lib/billing/plans";
import { sendPhoneVerificationCode } from "@/lib/firebase-phone-auth";
import { signInWithGoogle } from "@/lib/google-auth";
import { exchangeFirebaseTokenForSupabaseSession } from "@/lib/auth-bridge-client";
import {
  getStorefrontTemplateDefinition,
  resolveStorefrontTemplateId,
  type StorefrontTemplateId,
} from "@/lib/cms/storefront-templates";
import { getStorefrontTemplateReferenceImage } from "@/lib/cms/storefront-template-reference-images";
import type { ConfirmationResult } from "@/lib/firebase-phone-auth";
import { cn } from "@/lib/utils";

type SignupStep = "methods" | "verify" | "details" | "template" | "success";
type SlugAvailabilityState = "idle" | "checking" | "available" | "taken" | "invalid";

type CreatedStore = {
  storeId: string;
  dashboardPath: string;
  onboardingPath: string;
};

const defaultPlans: PlanCatalogRecord[] = [
  { id: "free", name: "Free", description: null, monthly_price: 0, trial_days: 0, contact_only: false },
  { id: "basic", name: "Basic", description: null, monthly_price: 990, trial_days: 14, contact_only: false },
  { id: "advanced", name: "Advanced", description: null, monthly_price: 1490, trial_days: 14, contact_only: false },
  { id: "pro", name: "Pro", description: null, monthly_price: 3990, trial_days: 14, contact_only: true },
];

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

  if (configured.length > 0) return configured[0];

  if (typeof window !== "undefined") {
    const hostname = normalizeHost(window.location.hostname);
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      const parts = hostname.split(".");
      return parts.length >= 2 ? parts.slice(-2).join(".") : hostname;
    }
  }

  return "localhost";
}

function getLaunchSuccessNextAction(templateId: StorefrontTemplateId) {
  if (templateId === "real-estate") return { label: "Add First Listing", description: "Create your first property listing with pricing, location, and listing details." };
  if (templateId === "hotel") return { label: "Add First Room", description: "Create the first room with pricing, occupancy, amenities, and policies." };
  if (templateId === "service" || templateId === "booking") return { label: "Add First Service", description: "Create the first service package so customers can book or inquire." };
  if (templateId === "inquiry-catalog") return { label: "Add First Catalog Item", description: "Add the first inquiry-led item so buyers can request pricing or details." };
  return { label: "Add First Product", description: "Add your first product so the storefront is ready for browsing and checkout." };
}

function formatPlanPrice(plan: PlanCatalogRecord) {
  if (Number(plan.monthly_price || 0) <= 0) return "Free";
  return `৳${Number(plan.monthly_price).toLocaleString()}/mo`;
}

export default function MerchantSignupV2() {
  const { user, loading, refreshRole, setActiveStoreId, activeStoreId, authRecovery } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchKey = searchParams.toString();
  const intent = searchParams.get("intent");
  const entry = searchParams.get("entry");
  const requestedTemplateParam = searchParams.get("template");
  const requestedTemplateId = resolveStorefrontTemplateId(undefined, {
    templateSeedId: requestedTemplateParam || "general-catalog",
  }) as StorefrontTemplateId;

  const isAdditionalStoreFlow = intent === "new-store";
  const isDashboardCreateFlow = entry === "dashboard" && Boolean(user) && !isAdditionalStoreFlow;
  const requiresOwnerName = !isAdditionalStoreFlow && !isDashboardCreateFlow;

  const [step, setStep] = useState<SignupStep>("methods");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [submittingDetails, setSubmittingDetails] = useState(false);
  const [createdStore, setCreatedStore] = useState<CreatedStore | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [slugState, setSlugState] = useState<SlugAvailabilityState>("idle");
  const [plans, setPlans] = useState<PlanCatalogRecord[]>(defaultPlans);
  const [accountRestriction, setAccountRestriction] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    storeName: "",
    storeSlug: "",
    storefrontTemplateId: requestedTemplateId,
    planId: searchParams.get("planId") || "free",
    otpCode: "",
  });
  const slugCheckSequence = useRef(0);

  const selectedTemplate = useMemo(
    () => getStorefrontTemplateDefinition(form.storefrontTemplateId),
    [form.storefrontTemplateId],
  );
  const selectedTemplateImage = useMemo(
    () => getStorefrontTemplateReferenceImage(form.storefrontTemplateId),
    [form.storefrontTemplateId],
  );
  const launchNextAction = useMemo(
    () => getLaunchSuccessNextAction(form.storefrontTemplateId),
    [form.storefrontTemplateId],
  );
  const signupRootDomain = useMemo(() => getSignupRootDomain(), []);
  const normalizedSlug = form.storeSlug.trim();
  const siteUrl = useMemo(
    () => absoluteStoreUrl({ slug: form.storeSlug || "your-store" }, "/"),
    [form.storeSlug],
  );
  const selectedPlan = plans.find((plan) => plan.id === form.planId) ?? plans[0];

  const slugStatusCopy = useMemo(() => {
    if (!normalizedSlug) return `Your store URL will look like your-store.${signupRootDomain}`;
    switch (slugState) {
      case "checking": return `Checking ${normalizedSlug}.${signupRootDomain}...`;
      case "available": return `${normalizedSlug}.${signupRootDomain} is available.`;
      case "taken": return `${normalizedSlug}.${signupRootDomain} is already taken.`;
      case "invalid": return "Use letters, numbers, and hyphens for the store URL.";
      default: return `Your store can go live at ${siteUrl.replace(/^https?:\/\//, "")}`;
    }
  }, [normalizedSlug, signupRootDomain, siteUrl, slugState]);

  const canContinueToTemplate = Boolean(form.storeName.trim())
    && (!requiresOwnerName || Boolean(form.name.trim()))
    && normalizedSlug.length > 0
    && slugState !== "checking"
    && slugState !== "taken"
    && slugState !== "invalid"
    && !accountRestriction;

  const progress = [
    { id: "account", label: "Account", active: step === "methods" || step === "verify", done: Boolean(user) || ["details", "template", "success"].includes(step) },
    { id: "store", label: "Store", active: step === "details", done: ["template", "success"].includes(step) },
    { id: "design", label: "Design", active: step === "template", done: step === "success" },
    { id: "launch", label: "Ready", active: step === "success", done: step === "success" },
  ];

  useEffect(() => {
    if (loading || !user || isAdditionalStoreFlow || isDashboardCreateFlow) return;
    if (authRecovery.reason === "no_store") navigate("/admin", { replace: true });
  }, [authRecovery.reason, isAdditionalStoreFlow, isDashboardCreateFlow, loading, navigate, user]);

  useEffect(() => {
    const requestedPlanId = isAdditionalStoreFlow ? null : new URLSearchParams(searchKey).get("planId");
    supabase
      .from("cms_plans")
      .select("id, name, description, monthly_price, trial_days, contact_only, is_active")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const nextPlans = data as unknown as PlanCatalogRecord[];
        setPlans(nextPlans);
        setForm((current) => ({ ...current, planId: resolveSignupPlanId(nextPlans, requestedPlanId) }));
      });
  }, [isAdditionalStoreFlow, searchKey]);

  useEffect(() => {
    setForm((current) => ({ ...current, storefrontTemplateId: requestedTemplateId }));
  }, [requestedTemplateId]);

  useEffect(() => {
    if (!user || loading) return;
    const metadataName = typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";
    const metadataPhone = typeof user.user_metadata?.phone_number === "string"
      ? user.user_metadata.phone_number
      : user.phone || "";
    setForm((current) => ({ ...current, name: current.name || metadataName, phone: current.phone || metadataPhone }));
    setStep((current) => current === "methods" || current === "verify" ? "details" : current);
  }, [loading, user]);

  useEffect(() => {
    let active = true;
    const loadRestriction = async () => {
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
      } else {
        setAccountRestriction(null);
      }
    };
    void loadRestriction();
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    setSubmitError(null);
  }, [form.name, form.planId, form.storeName, form.storeSlug, form.storefrontTemplateId]);

  useEffect(() => {
    const slug = slugify(form.storeSlug);
    if (!slug) {
      setSlugState(form.storeSlug.trim() ? "invalid" : "idle");
      return;
    }
    const sequence = slugCheckSequence.current + 1;
    slugCheckSequence.current = sequence;
    setSlugState("checking");
    const timer = window.setTimeout(async () => {
      const { data, error } = await (supabase as any).from("stores").select("id").eq("slug", slug).maybeSingle();
      if (slugCheckSequence.current !== sequence) return;
      if (error) {
        setSlugState("idle");
        return;
      }
      setSlugState(data ? "taken" : "available");
    }, 300);
    return () => window.clearTimeout(timer);
  }, [form.storeSlug]);

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "storeName") next.storeSlug = slugify(value);
      if (field === "name" && !current.storeName) {
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
    if (!confirmation) return;
    if (!form.otpCode.trim()) {
      toast.error("Please enter the verification code");
      return;
    }
    setPhoneLoading(true);
    try {
      const credential = await confirmation.confirm(form.otpCode.trim());
      const idToken = await credential.user.getIdToken();
      const data = await exchangeFirebaseTokenForSupabaseSession({ id_token: idToken, display_name: form.name || form.phone });
      if (data?.error) throw new Error(String(data.error));
      if (!data?.access_token || !data?.refresh_token) throw new Error("Phone verification did not return a valid session.");
      const { error: sessionError } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
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
    if (!canContinueToTemplate) {
      const message = slugState === "taken"
        ? "That store URL is already taken. Please choose another one."
        : slugState === "checking"
          ? "Please wait while we check that store URL."
          : accountRestriction || "Complete the required store details before continuing.";
      setSubmitError(message);
      toast.error(message);
      return;
    }
    setStep("template");
  };

  const extractSignupErrorMessage = async (error: unknown) => {
    const context = typeof error === "object" && error !== null && "context" in error
      ? (error as { context?: Response }).context
      : null;
    if (context instanceof Response) {
      try {
        const payload = await context.clone().json() as { error?: string; details?: string };
        if (typeof payload?.error === "string" && payload.error.trim()) return payload.details ? `${payload.error} ${payload.details}` : payload.error;
      } catch {
        try {
          const text = await context.clone().text();
          if (text.trim()) return text.trim();
        } catch {
          // Fall through to the standard error text.
        }
      }
    }
    return error instanceof Error ? error.message : String(error ?? "");
  };

  const friendlySignupError = (message: string) => {
    const normalized = message.toLowerCase();
    if (normalized.includes("already taken") || normalized.includes("already in use")) return "That store URL is already being used. Please choose another one.";
    if (normalized.includes("contact support")) return "That package is enabled through support. Please contact us to activate it.";
    if (normalized.includes("trial accounts can create only one store")) return "Your trial can only create one live store. Activate a paid package to add more.";
    if (normalized.includes("allows up to")) return message;
    if (normalized.includes("must be signed in") || normalized.includes("invalid session")) return "Your session expired while creating the store. Please sign in again and retry.";
    if (normalized.includes("failed to create store workspace")) return "We could not create the store workspace yet. Please try again.";
    if (normalized.includes("setup could not finish")) return "Your store started creating, but setup did not finish. Please retry once and contact support if it happens again.";
    if (normalized.includes("edge function") || normalized.includes("failed to fetch") || normalized.includes("internal server error")) return "We could not reach the signup service right now. Please try again.";
    return message || "We could not create the store right now. Please try again.";
  };

  const handleCreateStore = async () => {
    setSubmitError(null);
    if (!canContinueToTemplate) {
      setStep("details");
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
          business_type: form.storefrontTemplateId,
          storefront_template_id: form.storefrontTemplateId,
          plan_id: isAdditionalStoreFlow ? undefined : form.planId,
          source_store_id: isAdditionalStoreFlow ? activeStoreId : undefined,
          intent: isAdditionalStoreFlow ? "new-store" : "initial-signup",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      if (!data?.store_id) throw new Error("Workspace was created without a store id. Please try again.");

      setActiveStoreId(data.store_id);
      void refreshRole();
      toast.success(data?.payment_required ? "Workspace created. Complete payment from your dashboard." : "Workspace created. Your storefront is ready.");
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
      const message = friendlySignupError(rawMessage);
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmittingDetails(false);
    }
  };

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <SEOHead title="Create your EZComo store" description="Create a merchant storefront and CMS workspace." noindex />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_34%),radial-gradient(circle_at_80%_20%,hsl(var(--accent)/0.08),transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex items-center justify-between gap-4">
          <Button asChild variant="ghost" className="-ml-3 gap-2 rounded-xl">
            <Link href="/"><ArrowLeft className="h-4 w-4" /> {PLATFORM_BRAND_NAME}</Link>
          </Button>
          {user ? (
            <Badge variant="outline" className="max-w-[220px] truncate px-3 py-1.5">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-primary" /> {user.email || user.phone || "Signed in"}
            </Badge>
          ) : (
            <Button asChild variant="outline" size="sm"><Link href="/admin/login">Merchant login</Link></Button>
          )}
        </header>

        <div className="mt-6 grid gap-7 lg:grid-cols-[320px_minmax(0,1fr)] xl:gap-10">
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Merchant setup</p>
            <h1 className="mt-3 font-heading text-3xl font-bold leading-tight sm:text-4xl">Go from an idea to a real storefront.</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Create the store identity, choose a design that fits the business, then continue in the CMS with a clear launch checklist.
            </p>

            <div className="mt-6 space-y-2">
              {progress.map((item, index) => (
                <div key={item.id} className={cn("flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-colors", item.active ? "border-primary/30 bg-primary/7" : "border-transparent")}>
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold", item.done ? "border-primary bg-primary text-primary-foreground" : item.active ? "border-primary text-primary" : "border-border text-muted-foreground")}>
                    {item.done ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <div><p className={cn("text-sm font-semibold", item.active || item.done ? "text-foreground" : "text-muted-foreground")}>{item.label}</p><p className="text-[11px] text-muted-foreground">{item.id === "account" ? "Secure merchant identity" : item.id === "store" ? "Name, URL and package" : item.id === "design" ? "Choose your storefront" : "Continue in the CMS"}</p></div>
                </div>
              ))}
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <div className="relative aspect-[16/10] bg-muted">
                {selectedTemplateImage ? <img src={selectedTemplateImage} alt="Selected storefront" className="h-full w-full object-cover object-top opacity-90" /> : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Your storefront</p>
                  <p className="mt-1 truncate font-heading text-lg font-bold">{form.storeName || "Your store"}</p>
                  <p className="truncate text-xs text-white/75">{normalizedSlug ? `${normalizedSlug}.${signupRootDomain}` : "Choose your store URL"}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border border-t border-border text-center">
                <div className="p-3"><Globe2 className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 text-[10px] text-muted-foreground">Live URL</p></div>
                <div className="p-3"><LayoutTemplate className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 text-[10px] text-muted-foreground">Editable</p></div>
                <div className="p-3"><LockKeyhole className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 text-[10px] text-muted-foreground">Secure</p></div>
              </div>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="rounded-[2rem] border border-border bg-card/95 p-5 shadow-xl shadow-black/5 backdrop-blur sm:p-7 lg:p-8">
              <div className="mb-7 flex flex-col gap-2 border-b border-border pb-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{isAdditionalStoreFlow ? "Add another storefront" : "Create your storefront"}</p>
                <h2 className="font-heading text-2xl font-bold sm:text-3xl">
                  {step === "methods" ? "Create your merchant account" : step === "verify" ? "Verify your phone" : step === "details" ? "Tell us about the store" : step === "template" ? "Choose template" : "Launch successful"}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {step === "methods" ? "Use a secure sign-in method. This account becomes the owner of the CMS workspace." : step === "verify" ? "Enter the code sent to your phone to secure the merchant account." : step === "details" ? "Set the customer-facing store name and URL. Design comes next." : step === "template" ? "Browse by business type, preview the design, then launch with one selection." : "Your store and CMS workspace are ready for the next setup steps."}
                </p>
              </div>

              {step === "methods" ? (
                <div className="mx-auto max-w-xl space-y-4">
                  <Button type="button" onClick={handleGoogleAuth} disabled={googleLoading || phoneLoading} className="h-13 w-full rounded-2xl text-base">
                    {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Continue with Google
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setStep("verify")} disabled={googleLoading || phoneLoading} className="h-13 w-full rounded-2xl text-base">
                    <Phone className="mr-2 h-4 w-4" /> Continue with Phone
                  </Button>
                  <div className="grid gap-3 pt-3 sm:grid-cols-3">
                    {["No password to remember", "Owner access is verified", "You can add staff later"].map((text) => <div key={text} className="rounded-2xl bg-secondary/45 p-3 text-center text-xs text-muted-foreground"><CheckCircle2 className="mx-auto mb-1.5 h-4 w-4 text-primary" />{text}</div>)}
                  </div>
                  <Button asChild variant="ghost" className="w-full"><Link href="/admin/login">Already have merchant access?</Link></Button>
                </div>
              ) : null}

              {step === "verify" ? (
                <form onSubmit={confirmation ? handleVerifyPhone : handleSendPhoneCode} className="mx-auto max-w-xl space-y-5">
                  {!confirmation ? (
                    <div><Label htmlFor="merchant-phone">Phone number</Label><div className="relative mt-2"><Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="merchant-phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="01XXXXXXXXX" className="h-12 rounded-xl pl-10" /></div><p className="mt-2 text-xs text-muted-foreground">Use the number you want associated with the merchant account.</p></div>
                  ) : (
                    <div><Label htmlFor="merchant-phone-code">Verification code</Label><Input id="merchant-phone-code" inputMode="numeric" value={form.otpCode} onChange={(event) => update("otpCode", event.target.value)} placeholder="Enter code" className="mt-2 h-12 rounded-xl text-center text-lg tracking-[0.25em]" /></div>
                  )}
                  <Button type="submit" disabled={phoneLoading} className="h-12 w-full rounded-xl">{phoneLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}{confirmation ? "Verify and continue" : "Send verification code"}</Button>
                  <Button type="button" variant="ghost" onClick={() => setStep("methods")} className="w-full">Back to sign-in options</Button>
                </form>
              ) : null}

              {step === "details" ? (
                <form onSubmit={handleContinueToTemplate} className="space-y-7">
                  <div className="grid gap-5 md:grid-cols-2">
                    {requiresOwnerName ? (
                      <div className="md:col-span-2"><Label htmlFor="owner-name">Your name</Label><div className="relative mt-2"><User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="owner-name" data-testid="merchant-signup-owner-name" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Owner name" className="h-12 rounded-xl pl-10" /></div></div>
                    ) : null}
                    <div><Label htmlFor="store-name">Store name</Label><div className="relative mt-2"><Store className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="store-name" data-testid="merchant-signup-store-name" value={form.storeName} onChange={(event) => update("storeName", event.target.value)} placeholder="e.g. Northstar Fashion" className="h-12 rounded-xl pl-10" /></div><p className="mt-2 text-xs text-muted-foreground">Customers will see this across the storefront and order experience.</p></div>
                    <div><Label htmlFor="store-slug">Store URL</Label><div className="mt-2 flex h-12 items-center overflow-hidden rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring"><span className="border-r border-border bg-secondary/40 px-3 text-sm text-muted-foreground">https://</span><Input id="store-slug" data-testid="merchant-signup-store-slug" value={form.storeSlug} onChange={(event) => update("storeSlug", slugify(event.target.value))} placeholder="my-store" className="h-full rounded-none border-0 shadow-none focus-visible:ring-0" /></div><p className={cn("mt-2 text-xs", slugState === "available" ? "text-emerald-600" : slugState === "taken" || slugState === "invalid" ? "text-destructive" : "text-muted-foreground")}>{slugState === "checking" ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : slugState === "available" ? <CheckCircle2 className="mr-1 inline h-3 w-3" /> : null}{slugStatusCopy}</p></div>
                  </div>

                  {!isAdditionalStoreFlow ? (
                    <div>
                      <div className="flex items-end justify-between gap-3"><div><p className="text-sm font-semibold text-foreground">Choose a starting package</p><p className="mt-1 text-xs text-muted-foreground">You can change plans later. Template choice is independent of your package.</p></div></div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {plans.map((plan) => {
                          const contactOnly = isContactOnlyPlan(plan);
                          const active = form.planId === plan.id;
                          return <button key={plan.id} type="button" disabled={contactOnly} onClick={() => update("planId", plan.id)} className={cn("relative rounded-2xl border p-4 text-left transition-all", active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30", contactOnly && "cursor-not-allowed opacity-55")}><div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-foreground">{plan.name}</p><p className="mt-1 font-heading text-lg font-bold">{formatPlanPrice(plan)}</p></div>{active ? <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3.5 w-3.5" /></span> : null}</div><p className="mt-3 text-xs leading-5 text-muted-foreground">{contactOnly ? "Talk to support for a custom rollout." : Number(plan.trial_days || 0) > 0 ? `${plan.trial_days}-day trial included.` : plan.id === "free" ? "Start with one store and an EZComo subdomain." : plan.description || "Upgrade when you need more capacity."}</p></button>;
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4"><p className="text-sm font-semibold text-foreground">Package inherited automatically</p><p className="mt-1 text-xs leading-5 text-muted-foreground">This additional storefront uses the limits and entitlements of your current merchant package.</p></div>
                  )}

                  {accountRestriction ? <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">{accountRestriction}</div> : null}
                  {submitError ? <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">{submitError}</div> : null}

                  <div className="flex flex-col gap-3 rounded-2xl border border-border bg-secondary/25 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="text-sm font-semibold text-foreground">Next: choose the storefront design</p><p className="mt-1 text-xs text-muted-foreground">You’ll see real visual previews grouped by the type of business they suit.</p></div>
                    <Button type="submit" data-testid="merchant-signup-next" disabled={!canContinueToTemplate} className="h-11 shrink-0 rounded-xl">Choose template <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </div>
                </form>
              ) : null}

              {step === "template" ? (
                <MerchantTemplatePicker
                  selectedId={form.storefrontTemplateId}
                  onSelect={(templateId) => setForm((current) => ({ ...current, storefrontTemplateId: templateId }))}
                  storeName={form.storeName}
                  storeUrl={siteUrl.replace(/^https?:\/\//, "")}
                  launching={submittingDetails}
                  submitError={submitError}
                  isAdditionalStoreFlow={isAdditionalStoreFlow}
                  onBack={() => setStep("details")}
                  onLaunch={() => void handleCreateStore()}
                />
              ) : null}

              {step === "success" && createdStore ? (
                <div className="space-y-6">
                  <div className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-6 sm:p-8">
                    <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"><CheckCircle2 className="h-7 w-7" /></div>
                      <div><h2 className="font-heading text-2xl font-bold">Launch successful</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{form.storeName} now has the {selectedTemplate.label} storefront and its own merchant CMS workspace. Continue with products, launch settings, and content from one dashboard.</p></div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                    <div className="overflow-hidden rounded-3xl border border-border bg-card">
                      <div className="aspect-[16/9] bg-muted">{selectedTemplateImage ? <img src={selectedTemplateImage} alt={`${selectedTemplate.label} storefront`} className="h-full w-full object-cover object-top" /> : null}</div>
                      <div className="p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Created storefront</p><p className="mt-1 font-heading text-lg font-bold">{form.storeName}</p></div><Badge variant="outline">{selectedTemplate.label}</Badge></div><p className="mt-2 truncate text-sm text-muted-foreground">{siteUrl.replace(/^https?:\/\//, "")}</p></div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Recommended next</p><p className="mt-2 font-semibold text-foreground">{launchNextAction.label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{launchNextAction.description}</p></div>
                      <Button asChild variant="secondary" className="h-12 w-full justify-between rounded-xl"><Link href={`/admin/products?storeId=${encodeURIComponent(createdStore.storeId)}&action=add`}><span className="flex items-center"><Store className="mr-2 h-4 w-4" />{launchNextAction.label}</span><ArrowRight className="h-4 w-4" /></Link></Button>
                      <Button asChild className="h-12 w-full justify-between rounded-xl"><Link href={createdStore.dashboardPath}><span className="flex items-center"><Rocket className="mr-2 h-4 w-4" />Go To Dashboard</span><ArrowRight className="h-4 w-4" /></Link></Button>
                      <Button asChild variant="outline" className="h-12 w-full justify-between rounded-xl"><Link href={createdStore.onboardingPath}><span className="flex items-center"><WandSparkles className="mr-2 h-4 w-4" />Open Onboarding Wizard</span><ArrowRight className="h-4 w-4" /></Link></Button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div id="phone-recaptcha-container" />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
