import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Link, Navigate, useSearchParams } from "@/lib/react-router-dom-shim";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";

import { Loader2, Save, Plus, Trash2, GripVertical, Check, Palette, Search, PanelsTopLeft, ArrowRightCircle, Store as StoreIcon, Database } from "lucide-react";

import { BrandSeoTab } from "./settings/BrandSeoTab";
import { AnnouncementTab } from "./settings/AnnouncementTab";
import { ThemesTab } from "./settings/ThemesTab";
import { CustomDomainTab } from "./settings/CustomDomainTab";
import { PaymentSettingsTab } from "./settings/PaymentSettingsTab";
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
import { applyLegacyHomepageSettingToBlock, type LegacyHomepageSettingKey } from "@/lib/cms/homepage-settings-adapter";
import { instantiateStorePagesFromBlueprint } from "@/lib/cms/blueprint-pages";
import { persistStorefrontState } from "@/lib/cms/store-persistence";
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
import { resolveStoreBlueprint, type StoreBusinessFamily, type StoreCatalogMode } from "@/lib/cms/store-blueprints";
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
import { getTemplateFeatureBlockDefinitions, type TemplateFeatureBlockType } from "@/lib/cms/template-feature-blocks";

import { usePaymentGateway, scrubPaymentSettings } from "@/hooks/usePaymentGateway";
import { useThemeManager } from "@/hooks/useThemeManager";
import { siteSettingsSchema } from "@/lib/validations/site-settings";

type StoreBusinessProfileSettingsRow = {
  blueprint_id?: string | null;
  blueprint_version?: number | null;
  business_family?: StoreBusinessFamily | null;
  catalog_mode?: StoreCatalogMode | null;
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
        "id, page_id, block_type, props, sort_order, is_visible, entrance_animation, hover_effect, effect_override, layout_variant, custom_html, custom_css",
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
      entranceAnimation: blockRow.entrance_animation ?? "none",
      hoverEffect: blockRow.hover_effect ?? "none",
      effectOverride: blockRow.effect_override ?? false,
      layoutVariant: blockRow.layout_variant ?? undefined,
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

  const { data: businessProfileData } = useQuery({
    queryKey: ["store_business_profile_settings", activeStoreId],
    queryFn: async (): Promise<StoreBusinessProfileSettingsRow> => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("store_id", activeStoreId as string)
        .eq("key", "business_profile")
        .maybeSingle();

      const raw = data?.value;
      if (raw && typeof raw === "object") {
        const valueObj = raw as Record<string, unknown>;
        return {
          blueprint_id: typeof valueObj.blueprint_id === "string" ? valueObj.blueprint_id : null,
          blueprint_version: typeof valueObj.blueprint_version === "number" ? valueObj.blueprint_version : null,
          business_family: (typeof valueObj.business_family === "string" ? valueObj.business_family : null) as StoreBusinessFamily | null,
          catalog_mode: (typeof valueObj.catalog_mode === "string" ? valueObj.catalog_mode : null) as StoreCatalogMode | null,
        };
      }
      return {};
    },
    enabled: Boolean(activeStoreId),
  });

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
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTabValue>("brand_seo");

  // Custom Hooks
  const paymentGateway = usePaymentGateway({
    activeStoreId,
    accessToken: session?.access_token,
  });

  const themeManager = useThemeManager({
    activeStoreId,
    themeCustomizationSettings: settings.theme_customization,
    themePackages,
    blueprintVersion: businessProfileData?.blueprint_version,
  });

  useEffect(() => {
    if (rawSettingsData) {
      setSettings(rawSettingsData);
    }
  }, [rawSettingsData]);

  const activeStorefrontTemplateId: StorefrontTemplateId =
    (settings.storefront_template?.template_id as StorefrontTemplateId | undefined) ??
    ((store as any)?.storefront_template_id as StorefrontTemplateId | undefined) ??
    "fashion";

  const storefrontTemplateDefinition = useMemo(
    () => getStorefrontTemplateDefinition(activeStorefrontTemplateId),
    [activeStorefrontTemplateId],
  );

  const activeStorefrontBlueprint = useMemo(() => {
    return resolveStoreBlueprint(businessProfileData?.blueprint_id ?? activeStorefrontTemplateId);
  }, [activeStorefrontTemplateId, businessProfileData?.blueprint_id]);

  const storefrontContext = useMemo(() => {
    return resolveStorefrontSettingsContext(
      activeStorefrontBlueprint.businessFamily,
      activeStorefrontBlueprint.catalogMode,
    );
  }, [activeStorefrontBlueprint]);

  const availableTabs = useMemo(() => {
    return getAvailableSettingsTabs({
      businessFamily: activeStorefrontBlueprint.businessFamily,
      catalogMode: activeStorefrontBlueprint.catalogMode,
      templateId: activeStorefrontTemplateId,
    });
  }, [activeStorefrontBlueprint, activeStorefrontTemplateId]);

  const mobilePinnedTabs = useMemo(() => {
    return getMobilePinnedSettingsTabs({
      businessFamily: activeStorefrontBlueprint.businessFamily,
      catalogMode: activeStorefrontBlueprint.catalogMode,
      templateId: activeStorefrontTemplateId,
    });
  }, [activeStorefrontBlueprint, activeStorefrontTemplateId]);

  const tabParam = searchParams.get("tab");
  useEffect(() => {
    if (tabParam && validSettingTabs.has(tabParam as SettingsTabValue)) {
      if (
        isSettingsTabCompatible(
          tabParam as SettingsTabValue,
          activeStorefrontBlueprint.businessFamily,
          activeStorefrontBlueprint.catalogMode,
        )
      ) {
        setActiveTab(tabParam as SettingsTabValue);
      } else {
        setActiveTab("brand_seo");
      }
    }
  }, [activeStorefrontBlueprint, tabParam]);

  const handleTabChange = (val: string) => {
    const nextTab = val as SettingsTabValue;
    setActiveTab(nextTab);
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

  const saveSettingCategory = async (key: string) => {
    if (!activeStoreId) return;
    setSavingKey(key);

    try {
      let rawValue = settings[key] ?? {};

      if (key === "payment_settings") {
        rawValue = scrubPaymentSettings(rawValue);
      }

      // Schema validation attempt
      const categorySchema = (siteSettingsSchema.shape as Record<string, any>)[key];
      if (categorySchema) {
        const validation = categorySchema.safeParse(rawValue);
        if (!validation.success) {
          const firstError = validation.error.errors[0]?.message || "Invalid settings configuration";
          toast.error(`Validation Error: ${firstError}`);
          setSavingKey(null);
          return;
        }
      }

      const { error } = await supabase.from("site_settings").upsert(
        {
          store_id: activeStoreId,
          key,
          value: rawValue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id,key" },
      );

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["site_settings", activeStoreId] });
      toast.success("Settings saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSavingKey(null);
    }
  };

  const SaveButton = ({ settingKey }: { settingKey: string }) => (
    <div className="flex justify-end pt-4 border-t border-border">
      <Button
        onClick={() => saveSettingCategory(settingKey)}
        disabled={savingKey === settingKey}
        className="gap-2"
      >
        {savingKey === settingKey ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save Changes
      </Button>
    </div>
  );

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

  const StickySectionSaveBar = ({ settingKey, title, hint }: { settingKey: string; title: string; hint: string }) => (
    <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur">
      <div>
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Button onClick={() => saveSettingCategory(settingKey)} disabled={savingKey === settingKey} className="gap-2">
        {savingKey === settingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save
      </Button>
    </div>
  );

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
    activeStorefrontBlueprint.businessFamily,
    activeStorefrontBlueprint.catalogMode,
  );
  const supportsSearch = storefrontTemplateDefinition.supportsSearchControls ?? true;
  const supportsWishlist = storefrontTemplateDefinition.supportsWishlistControls ?? true;
  const supportsCart = supportsTransactionalCheckout(
    activeStorefrontBlueprint.businessFamily,
    activeStorefrontBlueprint.catalogMode,
  );
  const supportsNewsletter = storefrontTemplateDefinition.supportsNewsletterControls ?? true;

  const analyticsSettings = normalizeAnalyticsSettings(settings.analytics_tracking);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Site Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your store preferences, layout, themes, payment gateways, and content.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto p-1 bg-muted gap-1">
          {availableTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

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

        <CustomDomainTab />

        <PaymentSettingsTab
          paymentGateway={paymentGateway}
          settings={settings}
          update={updateSettingField}
          SaveButton={SaveButton}
        />

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
          themeManager={themeManager}
          settings={settings}
          update={updateSettingField}
          SaveButton={SaveButton}
        />
      </Tabs>
    </div>
  );
}
