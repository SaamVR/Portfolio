"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  Loader2,
  Package,
  Rocket,
  Save,
  Share2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/auth-context";
import { useSeedData } from "@/hooks/useSeedData";
import { useStoreEntitlements } from "@/hooks/useStoreEntitlements";
import { supabase } from "@/integrations/supabase/client";
import { defaultStore } from "@/lib/cms/default-store";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontBlockRenderer } from "@/components/storefront/StorefrontBlockRenderer";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import { themePresets } from "@/lib/themePresets";
import {
  createStoreSlug,
  getLaunchTemplate,
  instantiateLaunchPages,
  launchTemplates,
  type LaunchTemplateId,
  type LaunchTemplatePaymentDefaults,
} from "@/lib/cms/launch-templates";
import type { Store, StorePage } from "@/lib/cms/schema";
import { getFeatureEnabled } from "@/lib/platform/control-plane";

type OnboardingStepId = "identity" | "type" | "theme" | "hero" | "payments" | "launch";

const steps: Array<{ id: OnboardingStepId; title: string; description: string }> = [
  { id: "identity", title: "Store", description: "Name, URL, and description" },
  { id: "type", title: "Type", description: "Choose the launch template" },
  { id: "theme", title: "Look", description: "Theme and color mode" },
  { id: "hero", title: "Front", description: "Hero copy and media" },
  { id: "payments", title: "Pay", description: "Payment methods" },
  { id: "launch", title: "Live", description: "Publish and share" },
];

interface DraftState {
  storeName: string;
  slug: string;
  description: string;
  logoUrl: string;
  businessType: LaunchTemplateId;
  themePresetId: string;
  themeMode: Store["theme"]["mode"];
  headingFont: string;
  bodyFont: string;
  borderRadius: string;
  heroTagline: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  heroMediaUrl: string;
  payment: LaunchTemplatePaymentDefaults & {
    bkash_number: string;
    nagad_number: string;
  };
  isPublished: boolean;
}

function draftFromTemplate(templateId: LaunchTemplateId, previous?: Partial<DraftState>): DraftState {
  const template = getLaunchTemplate(templateId);
  const storeName = previous?.storeName || "ThreadBD";

  return {
    storeName,
    slug: previous?.slug || createStoreSlug(storeName),
    description: previous?.description || template.storeDescription,
    logoUrl: previous?.logoUrl || "",
    businessType: templateId,
    themePresetId: previous?.themePresetId || template.theme.presetId,
    themeMode: previous?.themeMode || template.theme.mode,
    headingFont: previous?.headingFont || template.theme.headingFont || "",
    bodyFont: previous?.bodyFont || template.theme.bodyFont || "",
    borderRadius: previous?.borderRadius || template.theme.borderRadius || "0.75rem",
    heroTagline: previous?.heroTagline || template.hero.tagline,
    heroTitle: previous?.heroTitle || template.hero.title,
    heroHighlight: previous?.heroHighlight || template.hero.highlight,
    heroSubtitle: previous?.heroSubtitle || template.hero.subtitle,
    heroMediaUrl: previous?.heroMediaUrl || template.hero.mediaUrl || "",
    payment: {
      ...template.paymentDefaults,
      bkash_number: previous?.payment?.bkash_number || "",
      nagad_number: previous?.payment?.nagad_number || "",
    },
    isPublished: previous?.isPublished ?? false,
  };
}

function applyHeroToPages(pages: StorePage[], draft: DraftState): StorePage[] {
  return pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => {
      if (block.type !== "hero") {
        return block;
      }

      return {
        ...block,
        props: {
          ...block.props,
          tagline: draft.heroTagline,
          title: draft.heroTitle,
          highlight: draft.heroHighlight,
          subtitle: draft.heroSubtitle,
          mediaUrl: draft.heroMediaUrl,
          mediaType: draft.heroMediaUrl ? "image" : undefined,
        },
      };
    }),
  }));
}

function buildPreviewStore(draft: DraftState, activeStoreId: string): Store {
  const templatePages = applyHeroToPages(instantiateLaunchPages(draft.businessType), draft);

  return {
    id: activeStoreId,
    name: draft.storeName,
    slug: draft.slug,
    description: draft.description,
    currencyCode: "BDT",
    locale: "en-BD",
    isPublished: draft.isPublished,
    theme: {
      presetId: draft.themePresetId,
      mode: draft.themeMode,
      headingFont: draft.headingFont,
      bodyFont: draft.bodyFont,
      borderRadius: draft.borderRadius,
      customCssVars: {},
    },
    pages: templatePages,
  };
}

function getStoreUrl(slug: string) {
  if (typeof window === "undefined") {
    return `/stores/${slug}`;
  }

  const host = window.location.host;
  const protocol = window.location.protocol;
  
  const rootHost = host.replace(/^www\./, '');
  return `${protocol}//${slug}.${rootHost}`;
}

export default function OnboardingWizard() {
  const { user, role, activeStoreId: contextStoreId } = useAuth();
  const searchParams = useSearchParams();
  const activeStoreId = searchParams?.get("storeId") || contextStoreId;
  const { seedData, isSeeding } = useSeedData(activeStoreId ?? null);
  const { data: entitlements } = useStoreEntitlements(activeStoreId);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState(true);
  const [draft, setDraft] = useState<DraftState>(() => draftFromTemplate("clothing"));

  const activeStep = steps[activeIndex];
  const template = getLaunchTemplate(draft.businessType);
  const previewStore = useMemo(() => buildPreviewStore(draft, activeStoreId ?? "00000000-0000-4000-8000-000000000001"), [draft, activeStoreId]);
  const previewBlocks = previewStore.pages.find((page) => page.isHomepage)?.blocks ?? [];
  const storeUrl = getStoreUrl(draft.slug);
  const canGoNext = activeIndex < steps.length - 1;
  const canGoBack = activeIndex > 0;
  const launchTemplatesEnabled = getFeatureEnabled(entitlements?.featureMap, "launch_templates");
  const themePresetsEnabled = getFeatureEnabled(entitlements?.featureMap, "theme_presets");

  useEffect(() => {
    if (role !== "admin") return;

    const loadDraft = async () => {
      setLoading(true);
      const [{ data: storeRecord }, { data: themeRecord }, { data: siteSettings }] = await Promise.all([
        (supabase as any)
          .from("stores")
          .select("name, slug, description, logo_url, store_type, is_published")
          .eq("id", activeStoreId as string)
          .maybeSingle(),
        (supabase as any)
          .from("store_themes")
          .select("preset_id, mode, typography, components")
          .eq("store_id", activeStoreId as string)
          .maybeSingle(),
        (supabase as any).from("site_settings").select("value").eq("key", "payment_settings").eq("store_id", activeStoreId as string).maybeSingle(),
      ]);

      const store = storeRecord as {
        name?: string;
        slug?: string;
        description?: string;
        logo_url?: string;
        store_type?: LaunchTemplateId;
        is_published?: boolean;
      } | null;
      const theme = themeRecord as {
        preset_id?: string;
        mode?: Store["theme"]["mode"];
        typography?: { headingFont?: string; bodyFont?: string };
        components?: { borderRadius?: string };
      } | null;
      const payment = (siteSettings?.value ?? {}) as Partial<DraftState["payment"]>;
      const templateId: LaunchTemplateId = store?.store_type && ["clothing", "food", "general"].includes(store.store_type)
        ? store.store_type
        : "clothing";

      setDraft(draftFromTemplate(templateId, {
        storeName: store?.name || defaultStore.name,
        slug: store?.slug || defaultStore.slug,
        description: store?.description || undefined,
        logoUrl: store?.logo_url || "",
        themePresetId: theme?.preset_id || undefined,
        themeMode: theme?.mode || undefined,
        headingFont: theme?.typography?.headingFont || undefined,
        bodyFont: theme?.typography?.bodyFont || undefined,
        borderRadius: theme?.components?.borderRadius || undefined,
        payment: {
          ...getLaunchTemplate(templateId).paymentDefaults,
          ...payment,
          bkash_number: payment.bkash_number || "",
          nagad_number: payment.nagad_number || "",
        },
        isPublished: store?.is_published ?? false,
      }));
      setLoading(false);
    };

    void loadDraft();
  }, [activeStoreId, role]);

  useEffect(() => {
    const checkSlug = async () => {
      if (!draft.slug.trim()) {
        setSlugAvailable(false);
        return;
      }

      setSlugChecking(true);
      const { data } = await (supabase as any)
        .from("stores")
        .select("id, slug")
        .eq("slug", draft.slug)
        .neq("id", activeStoreId)
        .maybeSingle();
      setSlugAvailable(!data);
      setSlugChecking(false);
    };

    const timer = window.setTimeout(() => void checkSlug(), 300);
    return () => window.clearTimeout(timer);
  }, [activeStoreId, draft.slug]);

  if (role !== "admin") {
    return null;
  }

  const updateDraft = (patch: Partial<DraftState>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const updatePayment = (patch: Partial<DraftState["payment"]>) => {
    setDraft((current) => ({
      ...current,
      payment: {
        ...current.payment,
        ...patch,
      },
    }));
  };

  const applyTemplate = (templateId: LaunchTemplateId) => {
    setDraft((current) => {
      const next = draftFromTemplate(templateId, {
        storeName: current.storeName,
        slug: current.slug,
        logoUrl: current.logoUrl,
        isPublished: current.isPublished,
        payment: {
          ...getLaunchTemplate(templateId).paymentDefaults,
          bkash_number: current.payment.bkash_number,
          nagad_number: current.payment.nagad_number,
        },
      });
      return next;
    });
  };

  const saveAndLaunch = async (publish: boolean) => {
    if (!user) {
      toast.error("Sign in as admin before launching.");
      return;
    }

    if (!activeStoreId) {
      toast.error("No store context found. Please start from the signup page.");
      return;
    }

    if (!slugAvailable) {
      toast.error("Choose an available store slug first.");
      setActiveIndex(0);
      return;
    }

    setSaving(true);
    const pages = buildPreviewStore({ ...draft, isPublished: publish }, activeStoreId).pages;

    const { error: storeError } = await (supabase as any).from("stores").update(
      {
        name: draft.storeName.trim() || defaultStore.name,
        slug: draft.slug.trim() || defaultStore.slug,
        description: draft.description.trim() || template.storeDescription,
        store_type: draft.businessType,
        logo_url: draft.logoUrl.trim() || null,
        currency_code: defaultStore.currencyCode,
        locale: defaultStore.locale,
        is_published: publish,
      }
    ).eq("id", activeStoreId);

    if (storeError) {
      toast.error(`Failed to save store setup: ${storeError.message || storeError.details || storeError.hint || JSON.stringify(storeError)}`);
      setSaving(false);
      return;
    }

    const { error: themeError } = await (supabase as any).from("store_themes").upsert(
      {
        store_id: activeStoreId,
        preset_id: draft.themePresetId,
        mode: draft.themeMode,
        colors: {},
        typography: {
          headingFont: draft.headingFont,
          bodyFont: draft.bodyFont,
        },
        components: {
          borderRadius: draft.borderRadius,
        },
      },
      { onConflict: "store_id" },
    );

    if (themeError) {
      toast.error("Failed to save theme setup.");
      setSaving(false);
      return;
    }

    const pageRows = pages.map((page) => ({
      id: page.id,
      store_id: activeStoreId,
      slug: page.slug,
      title: page.title,
      seo_title: page.seoTitle ?? null,
      seo_description: page.seoDescription ?? null,
      is_homepage: page.isHomepage,
    }));
    await (supabase as any).from("store_page_blocks").delete().eq("store_id", activeStoreId as string);
    await (supabase as any).from("store_pages").delete().eq("store_id", activeStoreId as string);

    const { error: pagesError } = await (supabase as any).from("store_pages").insert(pageRows);
    if (pagesError) {
      toast.error("Failed to save storefront pages.");
      setSaving(false);
      return;
    }

    const blockRows = pages.flatMap((page) =>
      page.blocks.map((pageBlock, index) => ({
        id: pageBlock.id,
        page_id: page.id,
        store_id: activeStoreId,
        block_type: pageBlock.type,
        props: pageBlock.props,
        sort_order: index,
        is_visible: pageBlock.isVisible,
      })),
    );

    const { error: blocksError } = await (supabase as any).from("store_page_blocks").insert(blockRows);
    if (blocksError) {
      toast.error("Failed to save storefront blocks.");
      setSaving(false);
      return;
    }

    const { error: paymentError } = await (supabase as any).from("site_settings").upsert(
      {
        store_id: activeStoreId,
        key: "payment_settings",
        value: draft.payment as any,
      },
      { onConflict: "store_id,key" },
    );

    if (paymentError) {
      toast.error("Failed to save payment setup.");
      setSaving(false);
      return;
    }

    setDraft((current) => ({ ...current, isPublished: publish }));
    setSaving(false);
    toast.success(publish ? "Store is live." : "Store setup saved.");
  };

  const copyStoreUrl = async () => {
    await navigator.clipboard.writeText(storeUrl);
    toast.success("Store URL copied.");
  };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="space-y-2">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            Phase 2 Setup
          </Badge>
          <h1 className="font-heading text-3xl font-bold text-foreground">Launch your store</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A mobile-first setup flow for the default store. Pick a template, tune the look, add payment basics, and go live.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                activeIndex === index
                  ? "border-primary bg-primary/10 text-primary"
                  : index < activeIndex
                    ? "border-primary/30 bg-card text-foreground"
                    : "border-border bg-card text-muted-foreground"
              }`}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[11px] font-bold">
                  {index < activeIndex ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span className="text-xs font-semibold">{step.title}</span>
              </div>
              <p className="hidden text-[11px] leading-4 sm:block">{step.description}</p>
            </button>
          ))}
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>{activeStep.title}</CardTitle>
            <CardDescription>{activeStep.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {activeStep.id === "identity" ? (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Store Name</Label>
                <Input
                  data-testid="onboarding-store-name"
                  value={draft.storeName}
                    onChange={(event) => {
                      const storeName = event.target.value;
                      updateDraft({ storeName, slug: createStoreSlug(storeName) });
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Store Slug</Label>
                  <Input
                    data-testid="onboarding-store-slug"
                    value={draft.slug}
                    onChange={(event) => updateDraft({ slug: createStoreSlug(event.target.value) })}
                  />
                  <p className={`text-xs ${slugAvailable ? "text-muted-foreground" : "text-destructive"}`}>
                    {slugChecking ? "Checking availability..." : slugAvailable ? "Slug is available." : "Slug is already used."}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea rows={4} value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Logo URL</Label>
                  <CloudinaryUpload
                    value={draft.logoUrl}
                    onChange={(url) => updateDraft({ logoUrl: url })}
                    folder={`stores/${draft.slug || defaultStore.slug}/logos`}
                    label="Upload logo"
                    showPreview
                    resourceType="image"
                  />
                </div>
              </div>
            ) : null}

            {activeStep.id === "type" ? (
              <div className="grid gap-3">
                {!launchTemplatesEnabled ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                    Launch templates are disabled for this store package right now. The current storefront type stays available, but template switching is locked.
                  </div>
                ) : null}
                {launchTemplates.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (!launchTemplatesEnabled) return;
                      applyTemplate(item.id);
                    }}
                    disabled={!launchTemplatesEnabled}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      draft.businessType === item.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
                    } ${!launchTemplatesEnabled ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      {draft.businessType === item.id ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {activeStep.id === "theme" ? (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Theme Preset</Label>
                  <Select value={draft.themePresetId} onValueChange={(value) => updateDraft({ themePresetId: value })} disabled={!themePresetsEnabled}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {themePresets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!themePresetsEnabled ? (
                    <p className="text-xs text-muted-foreground">
                      Theme preset switching is disabled for this store package. Saved colors and mode still preview normally.
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <Label>Mode</Label>
                  <Select value={draft.themeMode} onValueChange={(value) => updateDraft({ themeMode: value as Store["theme"]["mode"] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Heading Font</Label>
                    <Input value={draft.headingFont} onChange={(event) => updateDraft({ headingFont: event.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Body Font</Label>
                    <Input value={draft.bodyFont} onChange={(event) => updateDraft({ bodyFont: event.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Border Radius</Label>
                  <Input value={draft.borderRadius} onChange={(event) => updateDraft({ borderRadius: event.target.value })} />
                </div>
              </div>
            ) : null}

            {activeStep.id === "hero" ? (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Tagline</Label>
                  <Input value={draft.heroTagline} onChange={(event) => updateDraft({ heroTagline: event.target.value })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Title</Label>
                    <Input value={draft.heroTitle} onChange={(event) => updateDraft({ heroTitle: event.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Highlight</Label>
                    <Input value={draft.heroHighlight} onChange={(event) => updateDraft({ heroHighlight: event.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Subtitle</Label>
                  <Textarea rows={4} value={draft.heroSubtitle} onChange={(event) => updateDraft({ heroSubtitle: event.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Hero Image URL</Label>
                  <CloudinaryUpload
                    value={draft.heroMediaUrl}
                    onChange={(url) => updateDraft({ heroMediaUrl: url })}
                    folder={`stores/${draft.slug || defaultStore.slug}/hero`}
                    accept="image/*,video/*"
                    label="Upload hero media"
                    resourceType="auto"
                  />
                </div>
              </div>
            ) : null}

            {activeStep.id === "payments" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">bKash</p>
                    <p className="text-xs text-muted-foreground">Manual merchant number for prepaid orders.</p>
                  </div>
                  <Switch checked={draft.payment.bkash_enabled} onCheckedChange={(checked) => updatePayment({ bkash_enabled: checked })} />
                </div>
                {draft.payment.bkash_enabled ? (
                  <div className="grid gap-2">
                    <Label>bKash Number</Label>
                  <Input data-testid="onboarding-bkash-number" value={draft.payment.bkash_number} placeholder="01XXXXXXXXX" onChange={(event) => updatePayment({ bkash_number: event.target.value })} />
                  </div>
                ) : null}
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Nagad</p>
                    <p className="text-xs text-muted-foreground">Manual merchant number for prepaid orders.</p>
                  </div>
                  <Switch checked={draft.payment.nagad_enabled} onCheckedChange={(checked) => updatePayment({ nagad_enabled: checked })} />
                </div>
                {draft.payment.nagad_enabled ? (
                  <div className="grid gap-2">
                    <Label>Nagad Number</Label>
                    <Input value={draft.payment.nagad_number} placeholder="01XXXXXXXXX" onChange={(event) => updatePayment({ nagad_number: event.target.value })} />
                  </div>
                ) : null}
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Cash on Delivery</p>
                    <p className="text-xs text-muted-foreground">Allow customers to pay when products arrive.</p>
                  </div>
                  <Switch checked={draft.payment.cod_enabled} onCheckedChange={(checked) => updatePayment({ cod_enabled: checked })} />
                </div>
              </div>
            ) : null}

            {activeStep.id === "launch" ? (
              <div className="space-y-5">
                <div className="rounded-lg border border-border bg-secondary/30 p-5">
                  <p className="text-sm text-muted-foreground">Store URL</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input readOnly value={storeUrl} className="font-mono text-xs" />
                    <Button type="button" variant="outline" onClick={copyStoreUrl} className="gap-2">
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button type="button" data-testid="onboarding-save-draft" variant="outline" onClick={() => void saveAndLaunch(false)} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Draft
                  </Button>
                  <Button type="button" data-testid="onboarding-publish-store" onClick={() => void saveAndLaunch(true)} disabled={saving || !slugAvailable} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                    Publish Store
                  </Button>
                  <Button type="button" variant="outline" onClick={seedData} disabled={isSeeding || !slugAvailable} className="col-span-full gap-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10">
                    {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                    Seed Sample Data (Optional)
                  </Button>
                </div>
                <Button type="button" variant="secondary" asChild className="w-full gap-2">
                  <a href={`https://wa.me/?text=${encodeURIComponent(`My store is live: ${storeUrl}`)}`} target="_blank" rel="noreferrer">
                    <Share2 className="h-4 w-4" />
                    Share to WhatsApp
                  </a>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => setActiveIndex((current) => Math.max(0, current - 1))} disabled={!canGoBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {canGoNext ? (
            <Button type="button" data-testid="onboarding-next-step" onClick={() => setActiveIndex((current) => Math.min(steps.length - 1, current + 1))} className="gap-2">
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" asChild variant="outline" className="gap-2">
              <Link href="/">
                <Eye className="h-4 w-4" />
                View Store
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:h-max">
        <Card className="overflow-hidden border-border">
          <CardHeader>
            <CardTitle className="text-lg">Live Preview</CardTitle>
            <CardDescription>{template.shortName} template with your current draft.</CardDescription>
          </CardHeader>
          <CardContent>
            <StoreProvider store={previewStore}>
              <StoreThemeScope theme={previewStore.theme}>
                <div className="mx-auto max-h-[720px] max-w-[390px] overflow-y-auto rounded-[1.5rem] border border-border bg-background shadow-2xl">
                  <div className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3">
                    <p className="truncate text-sm font-semibold text-foreground">{draft.storeName}</p>
                    <p className="truncate text-xs text-muted-foreground">/{draft.slug}</p>
                  </div>
                  {previewBlocks.map((pageBlock) => (
                    <StorefrontBlockRenderer key={pageBlock.id} block={pageBlock} />
                  ))}
                </div>
              </StoreThemeScope>
            </StoreProvider>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}




