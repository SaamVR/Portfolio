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
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontBlockRenderer } from "@/components/storefront/StorefrontBlockRenderer";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import { instantiateStorePagesFromBlueprint } from "@/lib/cms/blueprint-pages";
import { fallbackPageBlueprints, loadPageBlueprints, type CmsPageBlueprint } from "@/lib/cms/page-blueprints";
import {
  type LaunchTemplatePaymentDefaults,
} from "@/lib/cms/launch-templates";
import { createStoreSlug } from "@/lib/slug";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import type { Store, StorePage } from "@/lib/cms/schema";
import { getFeatureEnabled } from "@/lib/platform/control-plane";
import {
  buildBlueprintSiteSettingsEntries,
  fallbackStoreBlueprints,
  findStoreBlueprintById,
  getStoreBlueprintGroups,
  loadStoreBlueprints,
  resolveStoreBlueprint,
  type StoreBlueprintDefinition,
} from "@/lib/cms/store-blueprints";
import {
  fallbackThemePackages,
  resolveThemePackageById,
  loadThemePackages,
  type ThemePackageDefinition,
} from "@/lib/theme-packages";
import type { Json } from "@/integrations/supabase/types";

interface DraftState {
  storeName: string;
  slug: string;
  customDomain?: string;
  description: string;
  logoUrl: string;
  blueprintId: string;
  businessFamily: StoreBlueprintDefinition["businessFamily"];
  catalogMode: StoreBlueprintDefinition["catalogMode"];
  themePackageId: string;
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

function getBlueprintPaymentDefaults(blueprintId: string): LaunchTemplatePaymentDefaults {
  return getBlueprintPaymentDefaultsFromCollection(blueprintId);
}

function getBlueprintPaymentDefaultsFromCollection(
  blueprintId: string,
  blueprints: StoreBlueprintDefinition[] = fallbackStoreBlueprints,
): LaunchTemplatePaymentDefaults {
  const blueprint = resolveStoreBlueprint(blueprintId, blueprints);
  const blueprintPaymentSettings = blueprint.defaultSiteSettings.payment_settings;
  if (typeof blueprintPaymentSettings === "object" && blueprintPaymentSettings) {
    const paymentSettings = blueprintPaymentSettings as Record<string, unknown>;
    return {
      cod_enabled: typeof paymentSettings.cod_enabled === "boolean"
        ? paymentSettings.cod_enabled as boolean
        : true,
      bkash_enabled: typeof paymentSettings.bkash_enabled === "boolean"
        ? paymentSettings.bkash_enabled as boolean
        : false,
      nagad_enabled: typeof paymentSettings.nagad_enabled === "boolean"
        ? paymentSettings.nagad_enabled as boolean
        : false,
      prepaid_badge_text: typeof paymentSettings.prepaid_badge_text === "string"
        ? paymentSettings.prepaid_badge_text
        : "",
      prepayment_discount_type: (paymentSettings.prepayment_discount_type as LaunchTemplatePaymentDefaults["prepayment_discount_type"] | undefined) ?? "none",
      prepayment_discount_value: typeof paymentSettings.prepayment_discount_value === "number"
        ? paymentSettings.prepayment_discount_value as number
        : 0,
    };
  }
  return {
    cod_enabled: true,
    bkash_enabled: false,
    nagad_enabled: false,
    prepaid_badge_text: "",
    prepayment_discount_type: "none",
    prepayment_discount_value: 0,
  };
}

function getDefaultBlueprintId(availableBlueprints: StoreBlueprintDefinition[] = fallbackStoreBlueprints) {
  return availableBlueprints.find((item) => item.id === "general-catalog")?.id
    ?? availableBlueprints[0]?.id
    ?? "general-catalog";
}

function getBlueprintDraftStoreName(blueprint: StoreBlueprintDefinition) {
  return `${blueprint.shortName} Store`;
}

function draftFromBlueprint(
  blueprintId: string,
  themePackages: ThemePackageDefinition[],
  previous?: Partial<DraftState>,
  blueprints: StoreBlueprintDefinition[] = fallbackStoreBlueprints,
): DraftState {
  const blueprint = resolveStoreBlueprint(blueprintId, blueprints);
  const themePackage = resolveThemePackageById(previous?.themePackageId, themePackages, blueprint.defaultTheme.presetId);
  const storeName = previous?.storeName || getBlueprintDraftStoreName(blueprint);

  return {
    storeName,
    slug: previous?.slug || createStoreSlug(storeName),
    customDomain: previous?.customDomain || "",
    description: previous?.description || blueprint.storeDescription,
    logoUrl: previous?.logoUrl || "",
    blueprintId: blueprint.id,
    businessFamily: previous?.businessFamily || blueprint.businessFamily,
    catalogMode: previous?.catalogMode || blueprint.catalogMode,
    themePackageId: previous?.themePackageId || themePackage.id,
    themeMode: previous?.themeMode || themePackage.mode || blueprint.defaultTheme.mode,
    headingFont: previous?.headingFont || themePackage.tokens.typography.headingFont || blueprint.defaultTheme.headingFont || "",
    bodyFont: previous?.bodyFont || themePackage.tokens.typography.bodyFont || blueprint.defaultTheme.bodyFont || "",
    borderRadius: previous?.borderRadius || themePackage.tokens.components.borderRadius || blueprint.defaultTheme.borderRadius || "0.75rem",
    heroTagline: previous?.heroTagline || blueprint.hero.tagline,
    heroTitle: previous?.heroTitle || blueprint.hero.title,
    heroHighlight: previous?.heroHighlight || blueprint.hero.highlight,
    heroSubtitle: previous?.heroSubtitle || blueprint.hero.subtitle,
    heroMediaUrl: previous?.heroMediaUrl || "",
    payment: {
      ...getBlueprintPaymentDefaults(blueprint.id),
      ...getBlueprintPaymentDefaultsFromCollection(blueprint.id, blueprints),
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

function applyCatalogModeToPages(pages: StorePage[], draft: DraftState): StorePage[] {
  return pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => {
      if (block.type === "featured-products") {
        if (draft.catalogMode === "single_product") {
          return {
            ...block,
            props: {
              ...block.props,
              limit: 1,
              title: block.props.title || "Featured Item",
              tagline: block.props.tagline || "Primary Offer",
            },
          };
        }

        if (draft.catalogMode === "inquiry_only") {
          return {
            ...block,
            props: {
              ...block.props,
              title: block.props.title || "Browse the Offerings",
              tagline: block.props.tagline || "Inquiry",
            },
          };
        }
      }

      if (block.type === "promo-banner" && draft.catalogMode === "inquiry_only") {
        return {
          ...block,
          props: {
            ...block.props,
            title: "Talk with the seller before checkout",
            subtitle: "Use WhatsApp, phone, or a contact form when pricing, availability, or fulfillment needs a conversation first.",
            ctaText: "Start a Conversation",
          },
        };
      }

      return block;
    }),
  }));
}

function buildPreviewStore(
  draft: DraftState,
  activeStoreId: string,
  themePackages: ThemePackageDefinition[],
  pageBlueprints: CmsPageBlueprint[] = fallbackPageBlueprints,
  blueprints: StoreBlueprintDefinition[] = fallbackStoreBlueprints,
): Store {
  const blueprint = resolveStoreBlueprint(draft.blueprintId, blueprints);
  const themePackage = resolveThemePackageById(draft.themePackageId, themePackages, blueprint.defaultTheme.presetId);
  const templatePages = applyCatalogModeToPages(
    applyHeroToPages(instantiateStorePagesFromBlueprint(blueprint, pageBlueprints), draft),
    draft,
  );

  return {
    id: activeStoreId,
    name: draft.storeName,
    slug: draft.slug,
    logoUrl: draft.logoUrl || undefined,
    description: draft.description,
    currencyCode: "BDT",
    locale: "en-BD",
    isPublished: draft.isPublished,
    theme: {
      presetId: themePackage.presetId,
      themePackageId: themePackage.id,
      mode: draft.themeMode,
      headingFont: draft.headingFont,
      bodyFont: draft.bodyFont,
      borderRadius: draft.borderRadius,
      customCssVars: {
        ...(themePackage.tokens[draft.themeMode] ?? {}),
      },
      customCss: themePackage.customCss,
    },
    pages: templatePages,
  };
}

function getStoreUrl(slug: string, customDomain?: string | null) {
  return absoluteStoreUrl({ slug, customDomain }, "/");
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
  const [blueprints, setBlueprints] = useState<StoreBlueprintDefinition[]>(fallbackStoreBlueprints);
  const [themePackages, setThemePackages] = useState<ThemePackageDefinition[]>(fallbackThemePackages);
  const [pageBlueprints, setPageBlueprints] = useState<CmsPageBlueprint[]>(fallbackPageBlueprints);
  const [draft, setDraft] = useState<DraftState>(() => draftFromBlueprint(getDefaultBlueprintId(), fallbackThemePackages));

  const blueprint = resolveStoreBlueprint(draft.blueprintId, blueprints);
  const steps = blueprint.onboarding.steps;
  const activeStep = steps[activeIndex] ?? steps[0];
  const previewStore = useMemo(
    () => buildPreviewStore(draft, activeStoreId ?? "preview-store", themePackages, pageBlueprints, blueprints),
    [draft, activeStoreId, blueprints, pageBlueprints, themePackages],
  );
  const previewBlocks = previewStore.pages.find((page) => page.isHomepage)?.blocks ?? [];
  const storeUrl = getStoreUrl(draft.slug, draft.customDomain);
  const canGoNext = activeIndex < steps.length - 1;
  const canGoBack = activeIndex > 0;
  const blueprintEditingEnabled = getFeatureEnabled(entitlements?.featureMap, "cms_pages", true);
  const themePresetsEnabled = getFeatureEnabled(entitlements?.featureMap, "theme_presets");

  useEffect(() => {
    setActiveIndex(0);
    setSlugAvailable(true);
    setSlugChecking(false);
    setSaving(false);
    setBlueprints(fallbackStoreBlueprints);
    setThemePackages(fallbackThemePackages);
    setPageBlueprints(fallbackPageBlueprints);
    setDraft(draftFromBlueprint(getDefaultBlueprintId(), fallbackThemePackages));
    setLoading(role === "admin" && Boolean(activeStoreId));
  }, [activeStoreId, role]);

  useEffect(() => {
    if (role !== "admin") return;
    let active = true;

    const loadDraft = async () => {
      if (!activeStoreId) {
        if (active) {
          setActiveIndex(0);
          setSlugAvailable(true);
          setSlugChecking(false);
          setDraft(draftFromBlueprint(getDefaultBlueprintId(), fallbackThemePackages));
          setLoading(false);
        }
        return;
      }

      if (active) {
        setLoading(true);
      }
      try {
        const [loadedBlueprints, loadedThemePackages, loadedPageBlueprints] = await Promise.all([
          loadStoreBlueprints(supabase),
          loadThemePackages(supabase, activeStoreId),
          loadPageBlueprints(supabase),
        ]);
        if (!active) return;
        setBlueprints(loadedBlueprints);
        setThemePackages(loadedThemePackages);
        setPageBlueprints(loadedPageBlueprints);

        const [{ data: storeRecord }, { data: themeRecord }, { data: siteSettings }, businessProfileResult] = await Promise.all([
          supabase
            .from("stores")
            .select("name, slug, custom_domain, description, logo_url, store_type, is_published")
            .eq("id", activeStoreId as string)
            .maybeSingle(),
          supabase
            .from("store_themes")
            .select("preset_id, theme_package_id, mode, typography, components, colors, custom_css, resolved_tokens")
            .eq("store_id", activeStoreId as string)
            .maybeSingle(),
          supabase.from("site_settings").select("value").eq("key", "payment_settings").eq("store_id", activeStoreId as string).maybeSingle(),
          supabase
            .from("store_business_profiles")
            .select("blueprint_id, blueprint_version, business_family, catalog_mode")
            .eq("store_id", activeStoreId as string)
            .maybeSingle(),
        ]);

        const store = storeRecord as {
          name?: string;
          slug?: string;
          custom_domain?: string | null;
          description?: string;
          logo_url?: string;
          store_type?: string;
          is_published?: boolean;
        } | null;
        const theme = themeRecord as {
          preset_id?: string;
          theme_package_id?: string | null;
          mode?: Store["theme"]["mode"];
          typography?: { headingFont?: string; bodyFont?: string };
          components?: { borderRadius?: string };
        } | null;
        const payment = (siteSettings?.value ?? {}) as Partial<DraftState["payment"]>;
        const businessProfile = businessProfileResult?.data as {
          blueprint_id?: string;
          blueprint_version?: number | null;
          business_family?: DraftState["businessFamily"];
          catalog_mode?: DraftState["catalogMode"];
        } | null;
        const resolvedBlueprint = findStoreBlueprintById(
          businessProfile?.blueprint_id
            ?? store?.store_type
            ?? getDefaultBlueprintId(loadedBlueprints),
          loadedBlueprints,
        );
        const safeBlueprint = resolvedBlueprint ?? resolveStoreBlueprint(getDefaultBlueprintId(loadedBlueprints), loadedBlueprints);

        if (!active) return;
        setDraft(draftFromBlueprint(safeBlueprint.id, loadedThemePackages, {
          storeName: store?.name || getBlueprintDraftStoreName(safeBlueprint),
          slug: store?.slug || createStoreSlug(store?.name || getBlueprintDraftStoreName(safeBlueprint)),
          customDomain: store?.custom_domain || "",
          description: store?.description || undefined,
          logoUrl: store?.logo_url || "",
          businessFamily: businessProfile?.business_family || safeBlueprint.businessFamily,
          catalogMode: businessProfile?.catalog_mode || safeBlueprint.catalogMode,
          themePackageId: theme?.theme_package_id || theme?.preset_id || safeBlueprint.defaultTheme.presetId,
          themeMode: theme?.mode || undefined,
          headingFont: theme?.typography?.headingFont || undefined,
          bodyFont: theme?.typography?.bodyFont || undefined,
          borderRadius: theme?.components?.borderRadius || undefined,
          payment: {
            ...getBlueprintPaymentDefaultsFromCollection(safeBlueprint.id, loadedBlueprints),
            ...payment,
            bkash_number: payment.bkash_number || "",
            nagad_number: payment.nagad_number || "",
          },
          isPublished: store?.is_published ?? false,
        }, loadedBlueprints));
        setActiveIndex(0);
      } catch (error) {
        if (active) {
          console.error("Failed to load onboarding draft:", error);
          toast.error("Failed to refresh onboarding data. Please try again.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadDraft();
    return () => {
      active = false;
    };
  }, [activeStoreId, role]);

  useEffect(() => {
    setSaving(false);
  }, [activeStoreId]);

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

  const applyBlueprint = (blueprintId: string) => {
    setDraft((current) =>
      draftFromBlueprint(blueprintId, themePackages, {
        storeName: current.storeName,
        slug: current.slug,
        customDomain: current.customDomain,
        description: current.description,
        logoUrl: current.logoUrl,
        themePackageId: current.themePackageId,
        themeMode: current.themeMode,
        headingFont: current.headingFont,
        bodyFont: current.bodyFont,
        borderRadius: current.borderRadius,
        payment: {
          ...getBlueprintPaymentDefaultsFromCollection(blueprintId, blueprints),
          bkash_number: current.payment.bkash_number,
          nagad_number: current.payment.nagad_number,
        },
        isPublished: current.isPublished,
      }, blueprints),
    );
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
    try {
      const selectedBlueprint = resolveStoreBlueprint(draft.blueprintId, blueprints);
      const selectedThemePackage = resolveThemePackageById(draft.themePackageId, themePackages, selectedBlueprint.defaultTheme.presetId);
      const pages = buildPreviewStore(
        { ...draft, isPublished: publish },
        activeStoreId,
        themePackages,
        pageBlueprints,
        blueprints,
      ).pages;

      const { error: storeError } = await supabase.from("stores").update(
        {
          name: draft.storeName.trim() || getBlueprintDraftStoreName(selectedBlueprint),
          slug: draft.slug.trim() || createStoreSlug(draft.storeName.trim() || getBlueprintDraftStoreName(selectedBlueprint)),
          description: draft.description.trim() || selectedBlueprint.storeDescription,
          store_type: draft.blueprintId,
          logo_url: draft.logoUrl.trim() || null,
          currency_code: "BDT",
          locale: "en-BD",
          is_published: publish,
        },
      ).eq("id", activeStoreId);

      if (storeError) {
        toast.error(`Failed to save store setup: ${storeError.message || storeError.details || storeError.hint || JSON.stringify(storeError)}`);
        return;
      }

      const fullThemePayload = {
        store_id: activeStoreId,
        preset_id: selectedThemePackage.presetId,
        mode: draft.themeMode,
        theme_package_id: selectedThemePackage.id,
        theme_package_version: selectedThemePackage.version,
        colors: selectedThemePackage.tokens[draft.themeMode] ?? {},
        typography: {
          headingFont: draft.headingFont,
          bodyFont: draft.bodyFont,
        },
        components: {
          borderRadius: draft.borderRadius,
        },
        overrides: {
          themeMode: draft.themeMode,
          headingFont: draft.headingFont,
          bodyFont: draft.bodyFont,
          borderRadius: draft.borderRadius,
        },
        resolved_tokens: {
          light: selectedThemePackage.tokens.light,
          dark: selectedThemePackage.tokens.dark,
        },
        custom_css: selectedThemePackage.customCss ?? null,
      };

      let themeError = (await supabase.from("store_themes").upsert(fullThemePayload, { onConflict: "store_id" })).error;
      if (themeError) {
        themeError = (await supabase.from("store_themes").upsert(
          {
            store_id: activeStoreId,
            preset_id: selectedThemePackage.presetId,
            mode: draft.themeMode,
            colors: selectedThemePackage.tokens[draft.themeMode] ?? {},
            typography: fullThemePayload.typography,
            components: fullThemePayload.components,
            custom_css: fullThemePayload.custom_css,
          },
          { onConflict: "store_id" },
        )).error;
      }

      if (themeError) {
        toast.error("Failed to save theme setup.");
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
      await supabase.from("store_page_blocks").delete().eq("store_id", activeStoreId as string);
      await supabase.from("store_pages").delete().eq("store_id", activeStoreId as string);

      const { error: pagesError } = await supabase.from("store_pages").insert(pageRows);
      if (pagesError) {
        toast.error("Failed to save storefront pages.");
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

      const { error: blocksError } = await supabase.from("store_page_blocks").insert(blockRows);
      if (blocksError) {
        toast.error("Failed to save storefront blocks.");
        return;
      }

      const siteSettingsRows = buildBlueprintSiteSettingsEntries(selectedBlueprint, {
        payment_settings: draft.payment as unknown as Json,
      }).map((entry) => ({
        store_id: activeStoreId,
        key: entry.key,
        value: entry.value,
      }));

      const { error: siteSettingsError } = await supabase
        .from("site_settings")
        .upsert(siteSettingsRows, { onConflict: "store_id,key" });

      if (siteSettingsError) {
        toast.error("Failed to save blueprint defaults.");
        return;
      }

      await supabase
        .from("store_business_profiles")
        .upsert(
          {
            store_id: activeStoreId,
            blueprint_id: draft.blueprintId,
            blueprint_version: 1,
            business_family: draft.businessFamily,
            catalog_mode: draft.catalogMode,
            enabled_modules: selectedBlueprint.capabilities,
          },
          { onConflict: "store_id" },
        );

      setDraft((current) => ({ ...current, isPublished: publish }));
      toast.success(publish ? "Store is live." : "Store setup saved.");
    } finally {
      setSaving(false);
    }
  };

  const copyStoreUrl = async () => {
    await navigator.clipboard.writeText(storeUrl);
    toast.success("Store URL copied.");
  };

  if (loading && !activeStoreId) {
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
            Flexible Store Launch
          </Badge>
          <h1 className="font-heading text-3xl font-bold text-foreground">Launch your store</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A blueprint-driven setup flow that keeps the current commerce engine intact while making each storefront more flexible, tenant-scoped, and themeable.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
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
            {activeStep.id === "blueprint" ? (
              <div className="grid gap-5">
                {!blueprintEditingEnabled ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                    Blueprint switching is disabled for this store package right now. The current storefront setup still works, but changing blueprint-driven page defaults is locked.
                  </div>
                ) : null}
                {Object.entries(getStoreBlueprintGroups(blueprints)).map(([groupName, groupedBlueprints]) => (
                  <div key={groupName} className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{groupName}</p>
                      <p className="text-xs text-muted-foreground">Each blueprint seeds store-local pages, blocks, and defaults only.</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {groupedBlueprints.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (!blueprintEditingEnabled) return;
                            applyBlueprint(item.id);
                          }}
                          disabled={!blueprintEditingEnabled}
                          className={`rounded-lg border p-4 text-left transition-colors ${
                            draft.blueprintId === item.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
                          } ${!blueprintEditingEnabled ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-foreground">{item.name}</p>
                                <Badge variant="outline">{item.catalogMode.replace(/_/g, " ")}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                              <div className="flex flex-wrap gap-2 pt-1">
                                {item.capabilities.map((capability) => (
                                  <Badge key={capability} variant="secondary" className="text-[11px]">
                                    {capability.replace(/_/g, " ")}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            {draft.blueprintId === item.id ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {activeStep.id === "brand" ? (
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
                    folder="logos"
                    label="Upload logo"
                    showPreview
                    resourceType="image"
                    storeId={activeStoreId ?? undefined}
                  />
                </div>
              </div>
            ) : null}

            {activeStep.id === "content" ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                  This starts from the selected <span className="font-medium text-foreground">{blueprint.name}</span> blueprint and stays scoped to this store.
                </div>
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
                  <Label>Hero Image or Video</Label>
                  <CloudinaryUpload
                    value={draft.heroMediaUrl}
                    onChange={(url) => updateDraft({ heroMediaUrl: url })}
                    folder="hero"
                    accept="image/*,video/*"
                    label="Upload hero media"
                    resourceType="auto"
                    storeId={activeStoreId ?? undefined}
                  />
                </div>
              </div>
            ) : null}

            {activeStep.id === "catalog" ? (
              <div className="grid gap-3">
                {(["single_product", "multi_product", "menu", "inquiry_only"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateDraft({ catalogMode: mode })}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      draft.catalogMode === mode ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{mode.replace(/_/g, " ")}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {mode === "single_product" ? "One flagship offer with a tighter conversion path."
                            : mode === "multi_product" ? "A classic browse-and-buy product catalog."
                            : mode === "menu" ? "Menu or assortment browsing with local ordering."
                            : "Browse-only or quote-led selling with assisted conversion."}
                        </p>
                      </div>
                      {draft.catalogMode === mode ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {activeStep.id === "theme" ? (
              <div className="space-y-4">
                {!themePresetsEnabled ? (
                  <p className="text-xs text-muted-foreground">
                    Theme switching is disabled for this store package. Saved theme data still previews normally.
                  </p>
                ) : null}
                <div className="grid gap-3 md:grid-cols-2">
                  {themePackages.map((themePackage) => {
                    const isActive = draft.themePackageId === themePackage.id;
                    return (
                      <button
                        key={themePackage.id}
                        type="button"
                        onClick={() => {
                          if (!themePresetsEnabled) return;
                          updateDraft({
                            themePackageId: themePackage.id,
                            themeMode: themePackage.mode,
                            headingFont: themePackage.tokens.typography.headingFont || draft.headingFont,
                            bodyFont: themePackage.tokens.typography.bodyFont || draft.bodyFont,
                            borderRadius: themePackage.tokens.components.borderRadius || draft.borderRadius,
                          });
                        }}
                        disabled={!themePresetsEnabled}
                        className={`rounded-lg border p-4 text-left transition-colors ${
                          isActive ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"
                        } ${!themePresetsEnabled ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        <div className="mb-3 flex gap-1.5">
                          <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: themePackage.preview.bg }} />
                          <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: themePackage.preview.primary }} />
                          <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: themePackage.preview.accent }} />
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{themePackage.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{themePackage.description}</p>
                          </div>
                          {isActive ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : null}
                        </div>
                      </button>
                    );
                  })}
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
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{blueprint.name}</Badge>
                    <Badge variant="secondary">{draft.catalogMode.replace(/_/g, " ")}</Badge>
                    <Badge variant="secondary">{draft.businessFamily}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Saving now writes a store-local storefront snapshot, a store business profile, payment settings, and a theme install payload without mutating shared defaults in place.
                  </p>
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
            <CardDescription>{blueprint.shortName} blueprint with your current draft.</CardDescription>
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
