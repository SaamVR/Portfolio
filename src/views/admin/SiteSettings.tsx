import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Link, Navigate, useSearchParams } from "@/lib/react-router-dom-shim";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";

import { Loader2, Save, Plus, Trash2, GripVertical, Check, Palette, Search, PanelsTopLeft, ArrowRightCircle, Store as StoreIcon, Database, ChevronDown, ChevronUp } from "lucide-react";

import { BrandSeoTab } from "./settings/BrandSeoTab";
import { AnnouncementTab } from "./settings/AnnouncementTab";
import { ThemesTab } from "./settings/ThemesTab";
import { CustomDomainTab } from "./settings/CustomDomainTab";
import { PaymentSettingsTab } from "./settings/PaymentSettingsTab";
import { DeliverySettingsTab } from "./settings/DeliverySettingsTab";
import { CourierSettingsTab } from "./settings/CourierSettingsTab";
import { WhatsAppSupportTab } from "./settings/WhatsAppSupportTab";
import { AboutPageTab } from "./settings/AboutPageTab";
import { ContactPageTab } from "./settings/ContactPageTab";
import { FaqTab } from "./settings/FaqTab";
import { LoyaltyTab } from "./settings/LoyaltyTab";
import { NavigationTab } from "./settings/NavigationTab";
import { ShopPageTab } from "./settings/ShopPageTab";
import { FooterTab } from "./settings/FooterTab";
import { ExitIntentTab } from "./settings/ExitIntentTab";
import { AnalyticsTab } from "./settings/AnalyticsTab";
import { NotificationsTab } from "./settings/NotificationsTab";
import { TemplateFeaturesTab } from "./settings/TemplateFeaturesTab";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { useStoreEntitlements } from "@/hooks/useStoreEntitlements";
import { getFeatureEnabled } from "@/lib/platform/control-plane";
import { cn } from "@/lib/utils";
import AdminRecoveryPanel from "@/components/admin/AdminRecoveryPanel";
import { DeleteStoreDialog } from "@/components/admin/DeleteStoreDialog";
import { buildPageBuilderPath } from "@/lib/admin-paths";
import { persistStorefrontState } from "@/lib/cms/store-persistence";
import { refreshStorefrontContentCache } from "@/lib/storefront-cache-client";
import { applyTemplateDemoContentToPages } from "@/lib/cms/template-demo-seeds";
import { isTemplateSeedMetadata, reseedTemplateCatalog, unseedTemplateCatalog } from "@/lib/cms/template-seed-management";
import {
  buildThemePackageExport,
  fallbackThemePackages,
  isThemePackageReferenceMissing,
  resolveThemePackageById,
  loadThemePackages,
  parseThemePackageImport,
  type ThemePackageDefinition,
} from "@/lib/theme-packages";
import { resolveStorefrontTemplateSeed } from "@/lib/cms/storefront-template-seeds";
import { isSettingsTabCompatible, supportsDedicatedShopPage, supportsTransactionalCheckout } from "@/lib/cms/storefront-compat";
import {
  getAvailableSettingsTabs,
  getMobilePinnedSettingsTabs,
  isLegacySettingsTab,
  resolveStorefrontSettingsContext,
  validSettingTabs,
  type SettingsTabOption,
  type SettingsTabValue,
} from "@/lib/cms/site-settings-tabs";
import {
  buildStorefrontTemplateSiteSettingsEntries,
  getStorefrontTemplateDefinition,
  resolveStorefrontTemplateProfile,
  storefrontTemplateOptions,
  type StorefrontTemplateId,
} from "@/lib/cms/storefront-templates";
import {
  applyHomepageSectionVisibilityToPages,
  normalizeHomepageSectionVisibility,
} from "@/lib/cms/template-homepage-sections";
import { resolveStoreThemeVars } from "@/lib/cms/store-theme-utils";
import type { Store } from "@/lib/cms/schema";
import type { Json } from "@/integrations/supabase/types";
import { normalizeAnalyticsSettings } from "@/lib/analytics/storefront-analytics";
import type { StorePage, StorePageBlock } from "@/lib/cms/schema";
import {
  collectMerchantWideSettings,
  collectTemplateScopedSettings,
  normalizeTemplatePageSnapshots,
  normalizeTemplateSettingsArchive,
  TEMPLATE_PAGE_SNAPSHOTS_KEY,
  TEMPLATE_SETTINGS_ARCHIVE_KEY,
  templateScopedSettingKeys,
  updateTemplatePageSnapshots,
  updateTemplateSettingsArchive,
} from "@/lib/cms/template-site-settings-registry";

import { usePaymentGateway, scrubPaymentSettings } from "@/hooks/usePaymentGateway";
import { useThemeManager } from "@/hooks/useThemeManager";
import { siteSettingsSchema } from "@/lib/validations/site-settings";
import {
  isSettingsSaveCompletionCurrent,
  resolveSettingsSaveState,
  settingsSaveStateLabel,
  type SettingsSaveFeedback,
} from "@/lib/settings/save-state";

const settingsCategoryTone: Record<string, { title: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
  "Store Identity": {
    title: "Store identity",
    description: "Brand voice, navigation, footer, and the details shoppers notice first.",
    icon: StoreIcon,
  },
  "Design System": {
    title: "Design system",
    description: "Theme, visual style, and reusable storefront presentation choices.",
    icon: Palette,
  },
  "Storefront": {
    title: "Storefront setup",
    description: "Homepage sections, merchandising, and editing paths that shape the live storefront.",
    icon: PanelsTopLeft,
  },
  "Checkout & Log": {
    title: "Buying flow",
    description: "Delivery, payment, loyalty, and shopper conversion settings.",
    icon: Database,
  },
  Information: {
    title: "Customer information",
    description: "Support, FAQ, contact, and notification content that keeps shoppers confident.",
    icon: ArrowRightCircle,
  },
  "Growth": {
    title: "Growth tracking",
    description: "Analytics and pixel settings for measuring merchant performance.",
    icon: Search,
  },
  "Legacy Fallbacks": {
    title: "Legacy fallback fields",
    description: "Older fields still supported for compatibility while the shared block system takes over.",
    icon: Database,
  },
};

const scrollToAdminSection = (sectionId: string) => {
  if (typeof document === "undefined") return;
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

type SnapshotPageRow = {
  id: string;
  slug: string;
  title: string;
  seo_title: string | null;
  seo_description: string | null;
  is_homepage: boolean | null;
};

type SnapshotBlockRow = {
  id: string;
  page_id: string;
  block_type: StorePageBlock["type"];
  props: Record<string, unknown> | null;
  sort_order: number | null;
  is_visible: boolean | null;
  entrance_animation: StorePageBlock["entranceAnimation"] | null;
  hover_effect: StorePageBlock["hoverEffect"] | null;
  effect_override: boolean | null;
  layout_variant: string | null;
  variant_options: StorePageBlock["variantOptions"] | null;
  custom_html: string | null;
  custom_css: string | null;
};

async function loadStorePagesSnapshot(storeId: string): Promise<StorePage[]> {
  const [{ data: pages, error: pageError }, { data: blocks, error: blockError }] = await Promise.all([
    supabase
      .from("store_pages")
      .select("id, slug, title, seo_title, seo_description, is_homepage")
      .eq("store_id", storeId)
      .order("is_homepage", { ascending: false }),
    supabase
      .from("store_page_blocks")
      .select(
        "id, page_id, block_type, props, sort_order, is_visible, entrance_animation, hover_effect, effect_override, layout_variant, variant_options, custom_html, custom_css",
      )
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true }),
  ]);

  if (pageError) throw pageError;
  if (blockError) throw blockError;

  const blocksByPageId = new Map<string, StorePageBlock[]>();
  for (const blockRow of (blocks ?? []) as SnapshotBlockRow[]) {
    const pageId = blockRow.page_id;
    const existing = blocksByPageId.get(pageId) ?? [];
    existing.push({
      id: blockRow.id,
      type: blockRow.block_type,
      props: (typeof blockRow.props === "object" && blockRow.props ? blockRow.props : {}) as Record<string, unknown>,
      sortOrder: typeof blockRow.sort_order === "number" ? blockRow.sort_order : 0,
      isVisible: blockRow.is_visible ?? true,
      visible: blockRow.is_visible ?? true,
      entranceAnimation: blockRow.entrance_animation ?? "none",
      hoverEffect: blockRow.hover_effect ?? "none",
      effectOverride: blockRow.effect_override ?? false,
      layoutVariant: blockRow.layout_variant ?? undefined,
      variantOptions: blockRow.variant_options ?? undefined,
      customHtml: blockRow.custom_html ?? undefined,
      customCss: blockRow.custom_css ?? undefined,
    } as any);
    blocksByPageId.set(pageId, existing);
  }

  return ((pages ?? []) as SnapshotPageRow[]).map((pageRow) => ({
    id: pageRow.id,
    slug: pageRow.slug,
    title: pageRow.title,
    seoTitle: pageRow.seo_title ?? undefined,
    seoDescription: pageRow.seo_description ?? undefined,
    isHomepage: pageRow.is_homepage ?? false,
    blocks: (blocksByPageId.get(pageRow.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

export default function SiteSettings() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeStoreId = useMemo(() => {
    return localStorage.getItem("ezcomo_active_store_id") || null;
  }, []);

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ["store", activeStoreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", activeStoreId as string)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: Boolean(activeStoreId),
  });

  const { data: themePackagesData } = useQuery({
    queryKey: ["theme_packages", activeStoreId],
    queryFn: async () => {
      return loadThemePackages(supabase, activeStoreId);
    },
    staleTime: 1000 * 60 * 15,
  });

  const themePackages = themePackagesData ?? fallbackThemePackages;

  const entitlementsQuery = useStoreEntitlements(activeStoreId);
  const customDomainsAllowed = entitlementsQuery.data?.featureMap?.custom_domains !== false;

  const { data: rawSettingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["site_settings", activeStoreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .eq("store_id", activeStoreId as string);

      if (error) throw error;

      const map: Record<string, any> = {};
      (data ?? []).forEach((row) => {
        map[row.key] = row.value;
      });
      return map;
    },
    enabled: Boolean(activeStoreId),
  });

  const [settings, setSettings] = useState<Record<string, any>>({});
  const [persistedSettings, setPersistedSettings] = useState<Record<string, any>>({});
  const [saveFeedback, setSaveFeedback] = useState<Record<string, SettingsSaveFeedback | undefined>>({});
  const hydratedStoreIdRef = useRef<string | null>(null);
  const saveOperationRef = useRef<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<SettingsTabValue>("brand_seo");
  const [tabSearch, setTabSearch] = useState("");
  const [mobileDirectoryOpen, setMobileDirectoryOpen] = useState(false);

  // Custom Hooks
  const paymentGateway = usePaymentGateway({
    activeStoreId,
    accessToken: session?.access_token,
  });

  const themeManager = useThemeManager({
    activeStoreId,
    themeCustomizationSettings: settings.theme_customization,
    themePackages,
    templateContractVersion: undefined,
  });

  useEffect(() => {
    if (!rawSettingsData || !activeStoreId) return;

    if (hydratedStoreIdRef.current !== activeStoreId) {
      hydratedStoreIdRef.current = activeStoreId;
      saveOperationRef.current = {};
      setSettings(rawSettingsData);
      setPersistedSettings(rawSettingsData);
      setSaveFeedback({});
      return;
    }

    setPersistedSettings((previous) => {
      const next = { ...rawSettingsData };
      for (const settingKey of Object.keys(saveOperationRef.current)) {
        if (Object.prototype.hasOwnProperty.call(previous, settingKey)) {
          next[settingKey] = previous[settingKey];
        }
      }
      return next;
    });
  }, [activeStoreId, rawSettingsData]);

  const activeStorefrontTemplateId: StorefrontTemplateId =
    (settings.storefront_profile?.template_id as StorefrontTemplateId | undefined) ??
    (settings.storefront_template?.template_id as StorefrontTemplateId | undefined) ??
    ((store as any)?.storefront_template_id as StorefrontTemplateId | undefined) ??
    "fashion";

  const storefrontTemplateDefinition = useMemo(
    () => getStorefrontTemplateDefinition(activeStorefrontTemplateId),
    [activeStorefrontTemplateId],
  );

  const activeStorefrontTemplateSeed = useMemo(() => {
    return resolveStorefrontTemplateSeed(activeStorefrontTemplateId);
  }, [activeStorefrontTemplateId]);

  const storefrontContext = useMemo(() => {
    return resolveStorefrontSettingsContext(
      activeStorefrontTemplateSeed.businessFamily,
      activeStorefrontTemplateSeed.catalogMode,
    );
  }, [activeStorefrontTemplateSeed]);

  const availableTabs = useMemo(() => {
    return getAvailableSettingsTabs({
      businessFamily: activeStorefrontTemplateSeed.businessFamily,
      catalogMode: activeStorefrontTemplateSeed.catalogMode,
      templateId: activeStorefrontTemplateId,
    });
  }, [activeStorefrontTemplateSeed, activeStorefrontTemplateId]);

  const mobilePinnedTabs = useMemo(() => {
    return getMobilePinnedSettingsTabs({
      businessFamily: activeStorefrontTemplateSeed.businessFamily,
      catalogMode: activeStorefrontTemplateSeed.catalogMode,
      templateId: activeStorefrontTemplateId,
    });
  }, [activeStorefrontTemplateSeed, activeStorefrontTemplateId]);

  const activeTabDefinition = useMemo(
    () => availableTabs.find((tab) => tab.value === activeTab) ?? availableTabs[0] ?? null,
    [activeTab, availableTabs],
  );

  const normalizedTabSearch = tabSearch.trim().toLowerCase();

  const filteredTabs = useMemo(() => {
    if (!normalizedTabSearch) return availableTabs;
    return availableTabs.filter((tab) => {
      const haystack = `${tab.label} ${tab.category} ${tab.keywords}`.toLowerCase();
      return haystack.includes(normalizedTabSearch);
    });
  }, [availableTabs, normalizedTabSearch]);

  const groupedTabs = useMemo(() => {
    const groups = new Map<string, SettingsTabOption[]>();
    filteredTabs.forEach((tab) => {
      const existing = groups.get(tab.category) ?? [];
      existing.push(tab);
      groups.set(tab.category, existing);
    });
    return Array.from(groups.entries()).map(([category, tabs]) => ({
      category,
      tabs,
      tone: settingsCategoryTone[category] ?? {
        title: category,
        description: "Merchant-facing settings grouped for quicker editing.",
        icon: PanelsTopLeft,
      },
    }));
  }, [filteredTabs]);

  const mobileQuickTabs = useMemo(
    () => availableTabs.filter((tab) => mobilePinnedTabs.includes(tab.value)),
    [availableTabs, mobilePinnedTabs],
  );

  const tabParam = searchParams.get("tab");
  useEffect(() => {
    if (tabParam && validSettingTabs.has(tabParam as SettingsTabValue)) {
      if (
        isSettingsTabCompatible(
          tabParam as SettingsTabValue,
          activeStorefrontTemplateSeed.businessFamily,
          activeStorefrontTemplateSeed.catalogMode,
        )
      ) {
        setActiveTab(tabParam as SettingsTabValue);
      } else {
        setActiveTab("brand_seo");
      }
    }
  }, [activeStorefrontTemplateSeed, tabParam]);

  const handleTabChange = (val: string) => {
    const nextTab = val as SettingsTabValue;
    setActiveTab(nextTab);
    setMobileDirectoryOpen(false);
    setSearchParams((prev) => {
      const copy = new URLSearchParams(prev);
      copy.set("tab", nextTab);
      return copy;
    });
  };

  const updateSettingField = (category: string, field: string, value: any) => {
    setSettings((prev) => {
      const currentCat = prev[category] ?? {};
      return {
        ...prev,
        [category]: {
          ...currentCat,
          [field]: value,
        },
      };
    });
  };

  const getSaveState = (key: string) =>
    resolveSettingsSaveState({
      current: settings[key] ?? {},
      persisted: persistedSettings[key] ?? {},
      feedback: saveFeedback[key],
    });

  const saveSettingCategory = async (key: string) => {
    const originStoreId = activeStoreId;
    if (!originStoreId) return;

    const operationId = `${originStoreId}:${key}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const operationSettingKey = key;
    saveOperationRef.current[key] = operationId;
    setSaveFeedback((previous) => ({
      ...previous,
      [key]: { state: "saving", operationId },
    }));

    const completionIsCurrent = () => {
      const currentStoreId =
        typeof window === "undefined"
          ? originStoreId
          : window.localStorage.getItem("ezcomo_active_store_id");
      return isSettingsSaveCompletionCurrent({
        originStoreId,
        currentStoreId,
        settingKey: key,
        operationSettingKey,
        operationId,
        latestOperationId: saveOperationRef.current[key],
      });
    };

    try {
      let rawValue = settings[key] ?? {};

      if (key === "payment_settings") {
        rawValue = scrubPaymentSettings(rawValue);
      }

      const submittedValue = rawValue;

      // Schema validation attempt
      const categorySchema = (siteSettingsSchema.shape as Record<string, any>)[key];
      if (categorySchema) {
        const validation = categorySchema.safeParse(submittedValue);
        if (!validation.success) {
          const firstError = validation.error.errors[0]?.message || "Invalid settings configuration";
          const persistentMessage = `Review this section and fix the invalid value before saving again: ${firstError}`;
          if (completionIsCurrent()) {
            setSaveFeedback((previous) => ({
              ...previous,
              [key]: { state: "save_failed", operationId, message: persistentMessage },
            }));
          }
          toast.error(`Validation Error: ${firstError}`);
          return;
        }
      }

      const { error } = await supabase.from("site_settings").upsert(
        {
          store_id: originStoreId,
          key,
          value: submittedValue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id,key" },
      );

      if (error) throw error;

      if (key === "homepage_section_visibility") {
        const pages = await loadStorePagesSnapshot(originStoreId);
        const homepage = pages.find((page) => page.isHomepage);
        const nextPages = applyHomepageSectionVisibilityToPages(
          pages,
          activeStorefrontTemplateId,
          normalizeHomepageSectionVisibility(activeStorefrontTemplateId, submittedValue),
        );
        const nextHomepage = nextPages.find((page) => page.id === homepage?.id);
        const changedBlocks = nextHomepage?.blocks.filter((block) => {
          const previousBlock = homepage?.blocks.find((candidate) => candidate.id === block.id);
          const previousVisibility = previousBlock?.isVisible ?? previousBlock?.visible ?? true;
          const nextVisibility = block.isVisible ?? block.visible ?? true;
          return previousBlock && previousVisibility !== nextVisibility;
        }) ?? [];

        for (const block of changedBlocks) {
          const { error: blockError } = await supabase
            .from("store_page_blocks")
            .update({
              is_visible: block.isVisible ?? block.visible ?? true,
            })
            .eq("store_id", originStoreId)
            .eq("id", block.id);

          if (blockError) throw blockError;
        }

        await queryClient.invalidateQueries({ queryKey: ["store_pages_snapshot", originStoreId] });
      }

      await refreshStorefrontContentCache(supabase, originStoreId);

      const { data: persistedRow, error: persistedError } = await supabase
        .from("site_settings")
        .select("value")
        .eq("store_id", originStoreId)
        .eq("key", key)
        .single();
      if (persistedError) throw persistedError;

      await queryClient.invalidateQueries({ queryKey: ["site_settings", originStoreId] });

      if (!completionIsCurrent()) return;

      setPersistedSettings((previous) => ({
        ...previous,
        [key]: persistedRow?.value ?? submittedValue,
      }));
      setSaveFeedback((previous) => ({
        ...previous,
        [key]: { state: "saved", operationId },
      }));
      toast.success("Settings saved successfully");
    } catch {
      if (completionIsCurrent()) {
        const message = "Could not save these settings. Your changes are still here; review them and try again.";
        setSaveFeedback((previous) => ({
          ...previous,
          [key]: { state: "save_failed", operationId, message },
        }));
        toast.error(message);
      }
    } finally {
      if (saveOperationRef.current[key] === operationId) {
        delete saveOperationRef.current[key];
      }
    }
  };

  const SaveStateText = ({ settingKey }: { settingKey: string }) => {
    const state = getSaveState(settingKey);
    const feedback = saveFeedback[settingKey];
    return (
      <div
        data-settings-save-state={state}
        role={state === "save_failed" ? "alert" : "status"}
        aria-live="polite"
        className={cn(
          "min-w-0 text-xs leading-5",
          state === "save_failed" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        <p className="font-medium">{settingsSaveStateLabel(state)}</p>
        {state === "save_failed" && feedback?.message ? <p>{feedback.message}</p> : null}
      </div>
    );
  };

  const SaveButton = ({ settingKey }: { settingKey: string }) => {
    const state = getSaveState(settingKey);
    const isSaving = state === "saving";
    const canSave = state === "dirty" || state === "save_failed";
    return (
      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <SaveStateText settingKey={settingKey} />
        <Button
          onClick={() => saveSettingCategory(settingKey)}
          disabled={!canSave || isSaving}
          className="gap-2"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" />}
          {isSaving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    );
  };

  const MobileSectionShell = ({ title, description, children }: { title: string; description: string; children: ReactNode }) => (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  );

  const MobileSectionJumper = ({ items }: { items: Array<{ id: string; label: string }> }) => (
    <div className="flex flex-wrap gap-2 pb-2">
      {items.map((item) => (
        <Button
          key={item.id}
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => scrollToAdminSection(item.id)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );

  const StickySectionSaveBar = ({ settingKey, title, hint }: { settingKey: string; title: string; hint: string }) => {
    const state = getSaveState(settingKey);
    const isSaving = state === "saving";
    const canSave = state === "dirty" || state === "save_failed";
    return (
      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="text-xs text-muted-foreground">{hint}</p>
          <div className="mt-1"><SaveStateText settingKey={settingKey} /></div>
        </div>
        <Button onClick={() => saveSettingCategory(settingKey)} disabled={!canSave || isSaving} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" />}
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    );
  };

  if (storeLoading || settingsLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const faqEntries: Array<{ q: string; a: string }> = settings.faq_entries?.entries ?? [];
  const addFaq = () => {
    const updated = [...faqEntries, { q: "", a: "" }];
    setSettings((prev) => ({ ...prev, faq_entries: { ...prev.faq_entries, entries: updated } }));
  };
  const removeFaq = (index: number) => {
    const updated = faqEntries.filter((_, i) => i !== index);
    setSettings((prev) => ({ ...prev, faq_entries: { ...prev.faq_entries, entries: updated } }));
  };
  const updateFaq = (index: number, field: "q" | "a", value: string) => {
    const updated = [...faqEntries];
    updated[index] = { ...updated[index], [field]: value };
    setSettings((prev) => ({ ...prev, faq_entries: { ...prev.faq_entries, entries: updated } }));
  };

  const supportsMapControls = storefrontTemplateDefinition.supportsMapControls ?? true;
  const hasDedicatedShop = supportsDedicatedShopPage(
    activeStorefrontTemplateSeed.businessFamily,
    activeStorefrontTemplateSeed.catalogMode,
  );
  const supportsSearch = storefrontTemplateDefinition.supportsSearchControls ?? true;
  const supportsWishlist = storefrontTemplateDefinition.supportsWishlistControls ?? true;
  const supportsCart = supportsTransactionalCheckout(
    activeStorefrontTemplateSeed.businessFamily,
    activeStorefrontTemplateSeed.catalogMode,
  );
  const supportsNewsletter = storefrontTemplateDefinition.supportsNewsletterControls ?? true;

  const analyticsSettings = normalizeAnalyticsSettings(settings.analytics_tracking);
  const pageBuilderPath = buildPageBuilderPath("basic", { storeId: activeStoreId ?? undefined });
  const templateLabel = storefrontTemplateDefinition.label ?? activeStorefrontTemplateId;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[28px] border border-border/60 bg-card shadow-sm">
        <div className="border-b border-border/60 bg-muted/20 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Online Store
                </span>
                <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                  {templateLabel}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Site Settings</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Keep the storefront tidy, on-brand, and ready for shoppers. Update the sections merchants expect most, then jump deeper when needed.
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[320px]">
              <Link to={pageBuilderPath} className="min-w-0">
                <Card className="h-full border-border/70 bg-background/80 transition-colors hover:border-primary/40 hover:bg-primary/5">
                  <CardContent className="flex h-full items-center gap-3 p-4">
                    <PanelsTopLeft className="h-5 w-5 text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">Open page editor</p>
                      <p className="text-xs leading-5 text-muted-foreground">Manage blocks, structure, and page flow.</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Card className="border-border/70 bg-background/80">
                <CardContent className="flex items-center gap-3 p-4">
                  <StoreIcon className="h-5 w-5 text-primary" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{storefrontContext.pageLabel}</p>
                    <p className="text-xs leading-5 text-muted-foreground">{storefrontContext.supportSummary}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 xl:grid-cols-4 sm:px-6">
          <Card className="border-border/60 bg-background/70">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Template</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{templateLabel}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Shared blocks and template-aware defaults stay editable from here.</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-background/70">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Browse mode</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{storefrontContext.pageLabel}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">This store is optimized for {storefrontContext.itemLabelPlural} and {storefrontContext.conversionLabel}.</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-background/70">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Quick edits</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{mobileQuickTabs.length} mobile-first shortcuts</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">The most-used settings are pinned below for fast merchant updates.</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-background/70">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Available panels</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{availableTabs.length} settings areas</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Grouped by identity, storefront, buying flow, and customer support.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]"
        orientation="vertical"
      >
        <aside className="order-2 min-w-0 lg:order-1">
          <div className="lg:sticky lg:top-24">
            <Card className="overflow-hidden border-border/70 shadow-sm">
              <CardHeader className="space-y-4 border-b border-border/60 bg-muted/20">
                <div>
                  <CardTitle className="text-lg">Guided settings</CardTitle>
                  <CardDescription>
                    Start with the common merchant edits, then open the deeper panels when you need them.
                  </CardDescription>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={tabSearch}
                    onChange={(event) => setTabSearch(event.target.value)}
                    placeholder="Search settings"
                    className="pl-9"
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-4 p-4">
                <div className="space-y-2 lg:hidden">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Quick actions</p>
                  <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
                    {mobileQuickTabs.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => handleTabChange(tab.value)}
                        className={cn(
                          "min-w-[136px] snap-start rounded-2xl border px-3 py-2 text-left transition-colors",
                          activeTab === tab.value ? "border-primary bg-primary/10" : "border-border bg-background",
                        )}
                      >
                        <p className={cn("text-sm font-medium", activeTab === tab.value ? "text-foreground" : "text-muted-foreground")}>{tab.label}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{tab.category}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/70 p-3 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileDirectoryOpen((current) => !current)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">Browse all settings</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Open the full directory when you need a less common setting.
                      </p>
                    </div>
                    {mobileDirectoryOpen ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                </div>

                <div className={cn("space-y-3", !mobileDirectoryOpen && "hidden lg:block")}>
                  {groupedTabs.map((group) => {
                    const Icon = group.tone.icon;
                    return (
                      <div key={group.category} className="rounded-2xl border border-border/60 bg-background/60 p-3">
                        <div className="mb-3 flex items-start gap-3">
                          <div className="rounded-xl border border-border/60 bg-background p-2">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{group.tone.title}</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{group.tone.description}</p>
                          </div>
                        </div>
                        <TabsList className="grid h-auto w-full gap-2 bg-transparent p-0">
                          {group.tabs.map((tab) => (
                            <TabsTrigger
                              key={tab.value}
                              value={tab.value}
                              className={cn(
                                "h-auto w-full justify-start rounded-xl border border-border/60 bg-background px-3 py-3 text-left",
                                "data-[state=active]:border-primary/50 data-[state=active]:bg-primary/10 data-[state=active]:text-primary",
                              )}
                            >
                              <span className="block min-w-0">
                                <span className="block text-sm font-medium">{tab.label}</span>
                                <span className="mt-1 block text-[11px] leading-5 text-muted-foreground">{tab.category}</span>
                              </span>
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </div>
                    );
                  })}
                </div>

                {filteredTabs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                    No settings matched that search yet.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </aside>

        <div className="order-1 min-w-0 space-y-5 lg:order-2">
          <Card className="border-border/70 bg-card shadow-sm">
            <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {activeTabDefinition?.category ?? "Settings"}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">{activeTabDefinition?.label ?? "Site Settings"}</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {isLegacySettingsTab(activeTab)
                      ? "These fields remain available for compatibility. Shared blocks and template presets still take priority where storefront content has already moved forward."
                      : `Update ${activeTabDefinition?.label?.toLowerCase() ?? "this area"} and keep the live storefront aligned across mobile and desktop.`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">

        <BrandSeoTab
          settings={settings}
          update={updateSettingField}
          SaveButton={SaveButton}
        />

        <AnnouncementTab
          settings={settings}
          update={updateSettingField}
          SaveButton={SaveButton}
        />

        <ThemesTab
          themeManager={themeManager}
          settings={settings}
          update={updateSettingField}
          SaveButton={SaveButton}
        />

        <TabsContent value="domain" className="mt-0">
          <CustomDomainTab />
        </TabsContent>

        <PaymentSettingsTab
          paymentGateway={paymentGateway}
          settings={settings}
          update={updateSettingField}
          SaveButton={SaveButton}
        />

        <DeliverySettingsTab
          settings={settings}
          update={updateSettingField}
          SaveButton={SaveButton}
        />

        <CourierSettingsTab />

        <WhatsAppSupportTab
          settings={settings}
          update={updateSettingField}
          SaveButton={SaveButton}
          MobileSectionShell={MobileSectionShell}
          StickySectionSaveBar={StickySectionSaveBar}
        />

        <AboutPageTab
          settings={settings}
          update={updateSettingField}
          SaveButton={SaveButton}
        />

        <ContactPageTab
          settings={settings}
          update={updateSettingField}
          supportsMapControls={supportsMapControls}
          storefrontContext={storefrontContext}
          SaveButton={SaveButton}
          MobileSectionShell={MobileSectionShell}
          StickySectionSaveBar={StickySectionSaveBar}
        />

        <FaqTab
          faqEntries={faqEntries}
          addFaq={addFaq}
          removeFaq={removeFaq}
          updateFaq={updateFaq}
          SaveButton={SaveButton}
        />

        <LoyaltyTab
          settings={settings}
          update={updateSettingField}
          SaveButton={SaveButton}
        />

        <NavigationTab
          settings={settings}
          setSettings={setSettings}
          update={updateSettingField}
          hasDedicatedShopPage={hasDedicatedShop}
          supportsSearchControls={supportsSearch}
          supportsWishlistControls={supportsWishlist}
          supportsCartControls={supportsCart}
          storefrontContext={storefrontContext}
          SaveButton={SaveButton}
          MobileSectionShell={MobileSectionShell}
          MobileSectionJumper={MobileSectionJumper}
          StickySectionSaveBar={StickySectionSaveBar}
        />

        <ShopPageTab
          settings={settings}
          update={updateSettingField}
          supportsSearchControls={supportsSearch}
          supportsSizeControls={storefrontTemplateDefinition.supportsSizeControls ?? true}
          supportsSaleFilterControls={storefrontTemplateDefinition.supportsSaleFilterControls ?? true}
          supportsPriceFilterControls={storefrontTemplateDefinition.supportsPriceFilterControls ?? true}
          supportsColorControls={storefrontTemplateDefinition.supportsColorControls ?? true}
          storefrontContext={storefrontContext}
          SaveButton={SaveButton}
          MobileSectionShell={MobileSectionShell}
          MobileSectionJumper={MobileSectionJumper}
          StickySectionSaveBar={StickySectionSaveBar}
        />

        <FooterTab
          settings={settings}
          setSettings={setSettings}
          update={updateSettingField}
          supportsNewsletterControls={supportsNewsletter}
          SaveButton={SaveButton}
          MobileSectionShell={MobileSectionShell}
          MobileSectionJumper={MobileSectionJumper}
          StickySectionSaveBar={StickySectionSaveBar}
        />

        <ExitIntentTab
          settings={settings}
          update={updateSettingField}
          SaveButton={SaveButton}
        />

        <AnalyticsTab
          analyticsSettings={analyticsSettings}
          update={updateSettingField}
          SaveButton={SaveButton}
          MobileSectionShell={MobileSectionShell}
          MobileSectionJumper={MobileSectionJumper}
          StickySectionSaveBar={StickySectionSaveBar}
        />

        <NotificationsTab
          settings={settings}
          update={updateSettingField}
          SaveButton={SaveButton}
        />

        <TemplateFeaturesTab
          activeStoreId={activeStoreId}
          templateId={activeStorefrontTemplateId}
          settings={settings}
          update={updateSettingField}
          SaveButton={SaveButton}
        />
          </div>
        </div>
      </Tabs>
    </div>
  );
}