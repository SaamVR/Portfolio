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
  ShieldCheck,
  Sparkles,
  Store,
  User,
  WandSparkles,
} from "lucide-react";
import { useNavigate, useSearchParams } from "@/lib/react-router-dom-shim";
import SEOHead from "@/components/SEOHead";
import MerchantDesignPicker from "@/components/auth/MerchantDesignPicker";
import MerchantRegistrationWizard, {
  createDefaultRegistrationAnswers,
  type MerchantRegistrationAnswers,
} from "@/components/auth/MerchantRegistrationWizard";
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
import { formatPlanBillingLabel, isContactOnlyPlan, resolveSignupPlanId } from "@/lib/billing/plans";
import { usePublicPlanCatalog } from "@/lib/billing/use-public-plan-catalog";
import { signInWithGoogle } from "@/lib/google-auth";
import {
  getStorefrontTemplateDefinition,
  resolveStorefrontTemplateId,
  type StorefrontTemplateId,
} from "@/lib/cms/storefront-templates";
import { getStorefrontTemplateReferenceImage } from "@/lib/cms/storefront-template-reference-images";
import { cn } from "@/lib/utils";


type SignupStep = "methods" | "details" | "design" | "wizard" | "success";
type SlugAvailabilityState = "idle" | "checking" | "available" | "taken" | "invalid";
type CreatedStore = { storeId: string; dashboardPath: string; onboardingPath: string };

type SiteSettingEntry = { key: string; value: unknown };

const questionnaireSectionIds = new Set([
  "hero",
  "promo-banner",
  "category-showcase",
  "featured-products",
  "rich-text",
  "trust-badges",
  "testimonials",
  "faq-accordion",
  "social-feed",
  "comparison",
  "recommended-products",
  "recently-viewed",
]);



function normalizeHost(value?: string | null) {
  if (!value) return null;
  return value.replace(/^https?:\/\//, "").replace(/\/.*$/, "").split(":")[0]?.trim().toLowerCase() || null;
}

function getSignupRootDomain() {
  const configured = [process.env.NEXT_PUBLIC_CMS_ROOT_DOMAIN, process.env.NEXT_PUBLIC_STORE_SUBDOMAIN_BASE_DOMAIN, process.env.NEXT_PUBLIC_SITE_URL]
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

async function saveSiteSettings(storeId: string, entries: SiteSettingEntry[]) {
  const keys = entries.map((entry) => entry.key);
  const { data: existing, error: readError } = await supabase.from("site_settings").select("id, key").eq("store_id", storeId).in("key", keys);
  if (readError) throw readError;
  const existingKeys = new Set((existing ?? []).map((row) => row.key));

  for (const entry of entries.filter((item) => existingKeys.has(item.key))) {
    const { error } = await supabase.from("site_settings").update({ value: entry.value as any }).eq("store_id", storeId).eq("key", entry.key);
    if (error) throw error;
  }

  const inserts = entries.filter((item) => !existingKeys.has(item.key)).map((entry) => ({ store_id: storeId, key: entry.key, value: entry.value as any }));
  if (inserts.length > 0) {
    const { error } = await supabase.from("site_settings").insert(inserts as any);
    if (error) throw error;
  }
}

async function applyRegistrationAnswers(storeId: string, answers: MerchantRegistrationAnswers) {
  const { data: homePage, error: pageError } = await supabase.from("store_pages").select("id").eq("store_id", storeId).eq("is_homepage", true).maybeSingle();
  if (pageError) throw pageError;

  if (homePage?.id) {
    const { data: blocks, error: blocksError } = await supabase
      .from("store_page_blocks")
      .select("id, block_type, props, is_visible")
      .eq("store_id", storeId)
      .eq("page_id", homePage.id);
    if (blocksError) throw blocksError;

    for (const block of blocks ?? []) {
      const patch: Record<string, unknown> = {};
      if (questionnaireSectionIds.has(block.block_type)) {
        patch.is_visible = answers.selectedSections.includes(block.block_type);
      }
      if (block.block_type === "hero" && (answers.heroTitle.trim() || answers.heroSubtitle.trim())) {
        const props = (block.props && typeof block.props === "object" && !Array.isArray(block.props)) ? block.props as Record<string, unknown> : {};
        patch.props = {
          ...props,
          ...(answers.heroTitle.trim() ? { title: answers.heroTitle.trim() } : {}),
          ...(answers.heroSubtitle.trim() ? { subtitle: answers.heroSubtitle.trim() } : {}),
        };
      }
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("store_page_blocks").update(patch as any).eq("id", block.id);
        if (error) throw error;
      }
    }
  }

  const toneConfig = {
    clean: { mode: "light", borderRadius: "0.75rem" },
    bold: { mode: "dark", borderRadius: "0.5rem" },
    soft: { mode: "light", borderRadius: "1.25rem" },
    editorial: { mode: "light", borderRadius: "0.25rem" },
  }[answers.designTone];

  const { data: theme } = await supabase.from("store_themes").select("components").eq("store_id", storeId).maybeSingle();
  const currentComponents = theme?.components && typeof theme.components === "object" && !Array.isArray(theme.components)
    ? theme.components as Record<string, unknown>
    : {};
  const { error: themeError } = await supabase.from("store_themes").update({
    mode: toneConfig.mode,
    components: { ...currentComponents, borderRadius: toneConfig.borderRadius } as any,
  } as any).eq("store_id", storeId);
  if (themeError) throw themeError;

  const visibility = Object.fromEntries(Array.from(questionnaireSectionIds).map((id) => [id, answers.selectedSections.includes(id)]));
  const deliveryFee = Math.max(0, Number(answers.deliveryFee || 0) || 0);
  const deliveryFeeOutside = Math.max(0, Number(answers.deliveryFeeOutside || 0) || 0);

  await saveSiteSettings(storeId, [
    {
      key: "registration_onboarding",
      value: {
        completed: true,
        completed_at: new Date().toISOString(),
        selected_sections: answers.selectedSections,
        design_tone: answers.designTone,
        hero_title: answers.heroTitle.trim(),
        hero_subtitle: answers.heroSubtitle.trim(),
        whatsapp_enabled: answers.whatsappEnabled,
        delivery_enabled: answers.deliveryEnabled,
      },
    },
    { key: "homepage_section_visibility", value: visibility },
    {
      key: "whatsapp_support",
      value: {
        enabled: answers.whatsappEnabled && Boolean(answers.whatsappNumber.trim()),
        number: answers.whatsappNumber.trim(),
        message: "Hi, I need help with an order.",
      },
    },
    {
      key: "delivery_settings",
      value: {
        enabled: answers.deliveryEnabled,
        primary_zone_label: "Primary delivery zone",
        secondary_zone_label: "Extended delivery zone",
        primary_zone_aliases: [],
        delivery_fee: deliveryFee,
        delivery_fee_outside: deliveryFeeOutside,
        free_threshold: 0,
      },
    },
  ]);
}

export default function MerchantSignupV3() {
  const { user, loading, refreshRole, setActiveStoreId, activeStoreId, authRecovery } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchKey = searchParams.toString();
  const intent = searchParams.get("intent");
  const entry = searchParams.get("entry");
  const requestedTemplateParam = searchParams.get("template");
  const requestedTemplateId = resolveStorefrontTemplateId(undefined, { templateSeedId: requestedTemplateParam || "general-catalog" }) as StorefrontTemplateId;

  const isAdditionalStoreFlow = intent === "new-store";
  const isDashboardCreateFlow = entry === "dashboard" && Boolean(user) && !isAdditionalStoreFlow;
  const requiresOwnerName = !isAdditionalStoreFlow && !isDashboardCreateFlow;

  const [step, setStep] = useState<SignupStep>("methods");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submittingDetails, setSubmittingDetails] = useState(false);
  const [createdStore, setCreatedStore] = useState<CreatedStore | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [setupWarning, setSetupWarning] = useState<string | null>(null);
  const [slugState, setSlugState] = useState<SlugAvailabilityState>("idle");
  const plans = usePublicPlanCatalog();
  const [accountRestriction, setAccountRestriction] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", storeName: "", storeSlug: "", storefrontTemplateId: requestedTemplateId, planId: searchParams.get("planId") || "free" });
  const [wizardAnswers, setWizardAnswers] = useState<MerchantRegistrationAnswers>(() => createDefaultRegistrationAnswers(getStorefrontTemplateDefinition(requestedTemplateId)));
  const slugCheckSequence = useRef(0);

  const selectedTemplate = useMemo(() => getStorefrontTemplateDefinition(form.storefrontTemplateId), [form.storefrontTemplateId]);
  const selectedTemplateImage = useMemo(() => getStorefrontTemplateReferenceImage(form.storefrontTemplateId), [form.storefrontTemplateId]);
  const launchNextAction = useMemo(() => getLaunchSuccessNextAction(form.storefrontTemplateId), [form.storefrontTemplateId]);
  const signupRootDomain = useMemo(() => getSignupRootDomain(), []);
  const normalizedSlug = form.storeSlug.trim();
  const siteUrl = useMemo(() => absoluteStoreUrl({ slug: form.storeSlug || "your-store" }, "/"), [form.storeSlug]);

  const slugStatusCopy = useMemo(() => {
    if (!normalizedSlug) return `Your store URL will look like your-store.${signupRootDomain}`;
    if (slugState === "checking") return `Checking ${normalizedSlug}.${signupRootDomain}...`;
    if (slugState === "available") return `${normalizedSlug}.${signupRootDomain} is available.`;
    if (slugState === "taken") return `${normalizedSlug}.${signupRootDomain} is already taken.`;
    if (slugState === "invalid") return "Use letters, numbers, and hyphens for the store URL.";
    return `Your store can go live at ${siteUrl.replace(/^https?:\/\//, "")}`;
  }, [normalizedSlug, signupRootDomain, siteUrl, slugState]);

  const canContinueToDesign = Boolean(form.storeName.trim()) && (!requiresOwnerName || Boolean(form.name.trim())) && normalizedSlug.length > 0 && slugState !== "checking" && slugState !== "taken" && slugState !== "invalid" && !accountRestriction;

  const progress = [
    { id: "account", label: "Account", active: step === "methods", done: Boolean(user) || ["details", "design", "wizard", "success"].includes(step), description: "Secure merchant identity" },
    { id: "store", label: "Store", active: step === "details", done: ["design", "wizard", "success"].includes(step), description: "Name, URL and package" },
    { id: "design", label: "Design", active: step === "design", done: ["wizard", "success"].includes(step), description: "Choose a storefront" },
    { id: "wizard", label: "Onboarding Wizard", active: step === "wizard", done: step === "success", description: "Quick sections and starter inputs" },
    { id: "ready", label: "Ready", active: step === "success", done: step === "success", description: "Store and CMS created" },
  ];

  useEffect(() => {
    if (loading || !user || isAdditionalStoreFlow || isDashboardCreateFlow) return;
    if (authRecovery.reason === "no_store") navigate("/admin", { replace: true });
  }, [authRecovery.reason, isAdditionalStoreFlow, isDashboardCreateFlow, loading, navigate, user]);

  useEffect(() => {
    const requestedPlanId = isAdditionalStoreFlow ? null : new URLSearchParams(searchKey).get("planId");
    setForm((current) => ({ ...current, planId: resolveSignupPlanId(plans, requestedPlanId) }));
  }, [isAdditionalStoreFlow, plans, searchKey]);

  useEffect(() => {
    setForm((current) => ({ ...current, storefrontTemplateId: requestedTemplateId }));
    setWizardAnswers(createDefaultRegistrationAnswers(getStorefrontTemplateDefinition(requestedTemplateId)));
  }, [requestedTemplateId]);

  useEffect(() => {
    if (!user || loading) return;
    const metadataName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "";
    setForm((current) => ({ ...current, name: current.name || metadataName }));
    setStep((current) => current === "methods" ? "details" : current);
  }, [loading, user]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!user?.id) return;
      const { data } = await (supabase as any).from("merchant_account_statuses").select("can_create_store, status_note").eq("user_id", user.id).maybeSingle();
      if (!active) return;
      setAccountRestriction(data?.can_create_store === false ? (typeof data?.status_note === "string" && data.status_note.trim() ? data.status_note : "Your account cannot create new stores right now. Please contact support.") : null);
    };
    void run();
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    const slug = slugify(form.storeSlug);
    if (!slug) { setSlugState(form.storeSlug.trim() ? "invalid" : "idle"); return; }
    const sequence = ++slugCheckSequence.current;
    setSlugState("checking");
    const timer = window.setTimeout(async () => {
      const { data, error } = await (supabase as any).from("stores").select("id").eq("slug", slug).maybeSingle();
      if (slugCheckSequence.current !== sequence) return;
      setSlugState(error ? "idle" : data ? "taken" : "available");
    }, 300);
    return () => window.clearTimeout(timer);
  }, [form.storeSlug]);

  const update = (field: keyof typeof form, value: string) => setForm((current) => {
    const next = { ...current, [field]: value };
    if (field === "storeName") next.storeSlug = slugify(value);
    if (field === "name" && !current.storeName) { next.storeName = `${value.trim()}'s Store`.trim(); next.storeSlug = slugify(next.storeName); }
    return next;
  });

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try { await signInWithGoogle({ redirectPath: "/signup" }); }
    catch (error: any) { toast.error(error.message || "Google authentication failed"); setGoogleLoading(false); }
  };

  const handleContinueToDesign = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canContinueToDesign) {
      const message = slugState === "taken" ? "That store URL is already taken. Please choose another one." : slugState === "checking" ? "Please wait while we check that store URL." : accountRestriction || "Complete the required store details before continuing.";
      setSubmitError(message); toast.error(message); return;
    }
    setSubmitError(null); setStep("design");
  };

  const handleTemplateSelect = (templateId: StorefrontTemplateId) => {
    setForm((current) => ({ ...current, storefrontTemplateId: templateId }));
    setWizardAnswers(createDefaultRegistrationAnswers(getStorefrontTemplateDefinition(templateId)));
  };

  const handleCreateStore = async () => {
    setSubmitError(null); setSetupWarning(null); setSubmittingDetails(true);
    try {
      const { data, error } = await supabase.functions.invoke("merchant-signup", { body: {
        owner_name: form.name.trim() || user?.user_metadata?.full_name || form.storeName.trim(),
        store_name: form.storeName.trim(),
        store_slug: form.storeSlug.trim(),
        site_url: siteUrl,
        business_type: form.storefrontTemplateId,
        storefront_template_id: form.storefrontTemplateId,
        plan_id: isAdditionalStoreFlow ? undefined : form.planId,
        source_store_id: isAdditionalStoreFlow ? activeStoreId : undefined,
        intent: isAdditionalStoreFlow ? "new-store" : "initial-signup",
      }});
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      if (!data?.store_id) throw new Error("Workspace was created without a store id. Please try again.");

      try { await applyRegistrationAnswers(data.store_id, wizardAnswers); }
      catch (preferenceError) {
        console.error("Registration questionnaire preferences could not be fully applied:", preferenceError);
        setSetupWarning("The store was created, but a few questionnaire preferences could not be applied automatically. Your choices can still be finished from Onboarding.");
      }

      setActiveStoreId(data.store_id);
      void refreshRole();
      const dashboardPath = typeof data?.dashboard_path === "string" && data.dashboard_path.trim() ? data.dashboard_path : `/admin?storeId=${encodeURIComponent(data.store_id)}`;
      setCreatedStore({ storeId: data.store_id, dashboardPath, onboardingPath: `/admin/onboarding?storeId=${encodeURIComponent(data.store_id)}&guide=continue` });
      setStep("success");
      toast.success("Store created. Your registration choices are ready.");
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error || "We could not create the store right now.");
      setSubmitError(message); toast.error(message);
    } finally { setSubmittingDetails(false); }
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>;

  const stepTitle = step === "methods" ? "Create your merchant account" : step === "details" ? "Tell us about the store" : step === "design" ? "Choose your storefront design" : step === "wizard" ? "Quick Onboarding Wizard" : "Your store is ready";
  const stepDescription = step === "methods" ? "This secure account becomes the owner of the CMS workspace." : step === "details" ? "Set the customer-facing store identity, URL, and package." : step === "design" ? "Choose the closest visual starting point. You can customize it later." : step === "wizard" ? "Answer a few simple questions about sections, design feel, and starter content." : "The registration flow is complete. Full Onboarding remains available separately in the CMS.";

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <SEOHead title="Create your EZComo store" description="Create a merchant storefront and CMS workspace." noindex />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_34%),radial-gradient(circle_at_80%_20%,hsl(var(--accent)/0.08),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex items-center justify-between gap-4">
          <Button asChild variant="ghost" className="-ml-3 gap-2 rounded-xl"><Link href="/"><ArrowLeft className="h-4 w-4" /> {PLATFORM_BRAND_NAME}</Link></Button>
          {user ? <Badge variant="outline" className="max-w-[220px] truncate px-3 py-1.5"><ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-primary" /> {user.email || user.phone || "Signed in"}</Badge> : <Button asChild variant="outline" size="sm"><Link href="/admin/login">Merchant login</Link></Button>}
        </header>

        <div className="mt-6 grid gap-7 lg:grid-cols-[330px_minmax(0,1fr)] xl:gap-10">
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Merchant registration</p>
            <h1 className="mt-3 font-heading text-3xl font-bold leading-tight sm:text-4xl">Build the first version of your storefront.</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">Registration creates a useful starting store. Full Onboarding and the CMS editor remain separate so you can refine everything afterward.</p>
            <div className="mt-6 space-y-2">
              {progress.map((item, index) => <div key={item.id} className={cn("flex items-center gap-3 rounded-2xl border px-3.5 py-3", item.active ? "border-primary/30 bg-primary/7" : "border-transparent")}><span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold", item.done ? "border-primary bg-primary text-primary-foreground" : item.active ? "border-primary text-primary" : "border-border text-muted-foreground")}>{item.done ? <Check className="h-4 w-4" /> : index + 1}</span><div><p className={cn("text-sm font-semibold", item.active || item.done ? "text-foreground" : "text-muted-foreground")}>{item.label}</p><p className="text-[11px] text-muted-foreground">{item.description}</p></div></div>)}
            </div>
            <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <div className="relative aspect-[16/10] bg-muted">{selectedTemplateImage ? <img src={selectedTemplateImage} alt="Selected storefront" className="h-full w-full object-cover object-top opacity-90" /> : null}<div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-4 text-white"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Your storefront</p><p className="mt-1 truncate font-heading text-lg font-bold">{form.storeName || "Your store"}</p><p className="truncate text-xs text-white/75">{normalizedSlug ? `${normalizedSlug}.${signupRootDomain}` : "Choose your store URL"}</p></div></div>
              <div className="grid grid-cols-3 divide-x divide-border border-t border-border text-center"><div className="p-3"><Globe2 className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 text-[10px] text-muted-foreground">Live URL</p></div><div className="p-3"><LayoutTemplate className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 text-[10px] text-muted-foreground">Editable</p></div><div className="p-3"><LockKeyhole className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 text-[10px] text-muted-foreground">Secure</p></div></div>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="rounded-[2rem] border border-border bg-card/95 p-5 shadow-xl shadow-black/5 backdrop-blur sm:p-7 lg:p-8">
              <div className="mb-7 border-b border-border pb-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{isAdditionalStoreFlow ? "Add another storefront" : "Create your storefront"}</p><h2 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">{stepTitle}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{stepDescription}</p></div>

              {step === "methods" ? <div className="mx-auto max-w-xl space-y-4"><Button type="button" onClick={handleGoogleAuth} disabled={googleLoading} className="h-12 w-full rounded-2xl text-base">{googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Continue with Google</Button><p className="text-center text-sm text-muted-foreground">Merchant accounts are created through Google sign-in.</p><Button asChild variant="ghost" className="w-full"><Link href="/admin/login">Already have merchant access?</Link></Button></div> : null}

              {step === "details" ? <form onSubmit={handleContinueToDesign} className="space-y-7"><div className="grid gap-5 md:grid-cols-2">{requiresOwnerName ? <div className="md:col-span-2"><Label htmlFor="owner-name">Your name</Label><div className="relative mt-2"><User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="owner-name" data-testid="merchant-signup-owner-name" value={form.name} onChange={(e) => update("name", e.target.value)} className="h-12 pl-10" /></div></div> : null}<div><Label htmlFor="store-name">Store name</Label><div className="relative mt-2"><Store className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="store-name" data-testid="merchant-signup-store-name" value={form.storeName} onChange={(e) => update("storeName", e.target.value)} placeholder="My Store" className="h-12 pl-10" /></div></div><div><Label htmlFor="store-slug">Store URL</Label><Input id="store-slug" data-testid="merchant-signup-store-slug" value={form.storeSlug} onChange={(e) => update("storeSlug", slugify(e.target.value))} className="mt-2 h-12" /><p className={cn("mt-2 text-xs", slugState === "available" ? "text-emerald-600" : slugState === "taken" || slugState === "invalid" ? "text-destructive" : "text-muted-foreground")}>{slugStatusCopy}</p></div></div>
                {!isAdditionalStoreFlow ? <div><p className="text-sm font-semibold">Choose a starting package</p><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{plans.map((plan) => { const contactOnly = isContactOnlyPlan(plan); const active = form.planId === plan.id; return <button key={plan.id} type="button" disabled={contactOnly} onClick={() => update("planId", plan.id)} className={cn("rounded-2xl border p-4 text-left", active ? "border-primary bg-primary/5" : "border-border", contactOnly && "opacity-50")}><p className="font-semibold">{plan.name}</p><p className="mt-1 font-heading text-lg font-bold">{formatPlanBillingLabel(plan)}</p><p className="mt-2 text-xs text-muted-foreground">{contactOnly ? "Contact support" : Number(plan.trial_days || 0) > 0 ? `${plan.trial_days}-day trial` : "Start free"}</p></button>; })}</div></div> : <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm">This store inherits your current package limits.</div>}
                {accountRestriction ? <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">{accountRestriction}</div> : null}{submitError ? <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">{submitError}</div> : null}
                <div className="flex justify-end"><Button type="submit" data-testid="merchant-signup-next" disabled={!canContinueToDesign} className="h-11">Continue to Design <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
              </form> : null}

              {step === "design" ? <MerchantDesignPicker selectedId={form.storefrontTemplateId} onSelect={handleTemplateSelect} onBack={() => setStep("details")} onContinue={() => setStep("wizard")} storeName={form.storeName} /> : null}

              {step === "wizard" ? <MerchantRegistrationWizard template={selectedTemplate} value={wizardAnswers} onChange={setWizardAnswers} onBack={() => setStep("design")} onSubmit={() => void handleCreateStore()} submitting={submittingDetails} submitError={submitError} additionalStore={isAdditionalStoreFlow} /> : null}

              {step === "success" && createdStore ? <div className="space-y-6"><div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-6 sm:p-8"><CheckCircle2 className="h-8 w-8 text-emerald-600" /><h3 className="mt-4 font-heading text-2xl font-bold">Launch successful</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{form.storeName} is ready with {selectedTemplate.label}. Your registration questionnaire has been applied without marking the separate full Onboarding flow as complete.</p></div>{setupWarning ? <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700">{setupWarning}</div> : null}<div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-border p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Store URL</p><p className="mt-1 font-medium">{siteUrl.replace(/^https?:\/\//, "")}</p></div><div className="rounded-2xl border border-border p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next best action</p><p className="mt-1 font-medium">{launchNextAction.label}</p><p className="mt-1 text-xs text-muted-foreground">{launchNextAction.description}</p></div></div><div className="grid gap-3 sm:grid-cols-2"><Button asChild className="h-12"><Link href={createdStore.dashboardPath}><Store className="mr-2 h-4 w-4" /> Go to Dashboard</Link></Button><Button asChild variant="outline" className="h-12"><Link href={createdStore.onboardingPath}><WandSparkles className="mr-2 h-4 w-4" /> Open Onboarding</Link></Button></div></div> : null}

            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
