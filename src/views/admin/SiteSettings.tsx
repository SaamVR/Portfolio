import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Link, Navigate, useSearchParams } from "@/lib/react-router-dom-shim";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

import { Loader2, Save, Plus, Trash2, GripVertical, MessageCircle, Check, Palette, Search, PanelsTopLeft, ArrowRightCircle, Store } from "lucide-react";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { BrandSeoTab } from "./settings/BrandSeoTab";
import { AnnouncementTab } from "./settings/AnnouncementTab";
import { ThemesTab } from "./settings/ThemesTab";
import { CustomDomainTab } from "./settings/CustomDomainTab";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Database } from "lucide-react";
import { seedDemoProducts } from "@/data/seedDemoProducts";
import { useStoreEntitlements } from "@/hooks/useStoreEntitlements";
import { getFeatureEnabled } from "@/lib/platform/control-plane";
import { cn } from "@/lib/utils";
import AdminRecoveryPanel from "@/components/admin/AdminRecoveryPanel";
import { applyLegacyHomepageSettingToBlock, type LegacyHomepageSettingKey } from "@/lib/cms/homepage-settings-adapter";
import {
  buildThemePackageExport,
  fallbackThemePackages,
  isThemePackageReferenceMissing,
  resolveThemePackageById,
  loadThemePackages,
  parseThemePackageImport,
  type ThemePackageDefinition,
} from "@/lib/theme-packages";
import type { Json } from "@/integrations/supabase/types";

type StoreThemeSettingsRow = {
  preset_id: string;
  theme_package_id?: string | null;
  theme_package_version?: number | null;
  mode: string;
  colors?: Record<string, string> | null;
  resolved_tokens?: { light?: Record<string, string>; dark?: Record<string, string> } | null;
  typography: { headingFont?: string; bodyFont?: string };
  components: { borderRadius?: string };
  custom_css?: string | null;
};

type StoreBusinessProfileSettingsRow = {
  blueprint_id?: string | null;
  blueprint_version?: number | null;
};

const headingFontOptions = {
  inter: "Inter, sans-serif",
  playfair: "'Playfair Display', serif",
  roboto: "Roboto, sans-serif",
  outfit: "Outfit, sans-serif",
} as const;

const bodyFontOptions = {
  inter: "Inter, sans-serif",
  roboto: "Roboto, sans-serif",
  opensans: "'Open Sans', sans-serif",
} as const;

const mobilePinnedSettingTabs = [
  "brand_seo",
  "themes",
  "payment",
  "delivery",
  "support",
  "contact",
  "page_builder",
] as const;

const validSettingTabs = new Set([
  "brand_seo",
  "home_sections",
  "hero",
  "promo",
  "announcement",
  "themes",
  "upsells",
  "payment",
  "delivery",
  "loyalty",
  "support",
  "about",
  "faq",
  "contact",
  "footer",
  "domain",
  "notifications",
  "page_builder",
]);

const scrollToAdminSection = (sectionId: string) => {
  if (typeof document === "undefined") return;
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

function resolveThemeFontValue(
  value: unknown,
  options: Record<string, string>,
  fallback: string,
) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  return options[value as keyof typeof options] ?? value;
}

function resolveThemeFontControlValue(
  value: unknown,
  options: Record<string, string>,
  fallbackKey: string,
) {
  if (typeof value !== "string" || !value.trim()) {
    return fallbackKey;
  }

  const matched = Object.entries(options).find(([, fontValue]) => fontValue === value);
  return matched?.[0] ?? (value in options ? value : fallbackKey);
}

type HomepagePageRow = {
  id: string;
};

type HomepageBlockRow = {
  id: string;
  block_type: "hero" | "promo-banner" | "featured-products" | "category-showcase";
  props: Record<string, unknown> | null;
  sort_order: number | null;
  is_visible: boolean | null;
};

const homepageSyncKeys = new Set<LegacyHomepageSettingKey>([
  "hero_section",
  "promo_banner",
  "home_featured",
  "home_categories",
]);

const SiteSettings = () => {
  const { role, session, activeStoreId, loading: authLoading, refreshRole, signOut } = useAuth();
  const { data: entitlementData } = useStoreEntitlements(activeStoreId);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [dbTypes, setDbTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [themePackages, setThemePackages] = useState<ThemePackageDefinition[]>(fallbackThemePackages);

  const rawActiveTab = searchParams.get("tab") || "brand_seo";
  const normalizedActiveTab = rawActiveTab === "cms_pages" ? "page_builder" : rawActiveTab;
  const activeTab = validSettingTabs.has(normalizedActiveTab) ? normalizedActiveTab : "brand_seo";

  const handleTabChange = (value: string) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("tab", value);
    setSearchParams(nextSearchParams);
    setShowMobileAllTabs(false);
    setShowMobileLegacyTabs(false);
  };

  const [tabQuery, setTabQuery] = useState("");
  const [showMobileAllTabs, setShowMobileAllTabs] = useState(false);
  const [showMobileLegacyTabs, setShowMobileLegacyTabs] = useState(false);

  const tabOptions = [
    { value: "brand_seo", label: "Brand & SEO", category: "Store Identity", keywords: "brand title description seo logo highlight name" },
    { value: "home_sections", label: "Fallback Home Sections", category: "Legacy Fallbacks", keywords: "legacy fallback featured category tagline catalog title homepage migration" },
    { value: "hero", label: "Fallback Hero Fields", category: "Legacy Fallbacks", keywords: "legacy fallback hero background image video media title tagline overlay button cta homepage migration" },
    { value: "promo", label: "Fallback Promo Fields", category: "Legacy Fallbacks", keywords: "legacy fallback promo discount sale button text color card opacity homepage migration" },
    { value: "announcement", label: "Announcement Bar", category: "Store Identity", keywords: "announcement rotation text bar color bg message" },
    { value: "themes", label: "Themes Customizer", category: "Design System", keywords: "theme colors palette presets font layout border radius container width preset preset presets typography style styles" },
    { value: "upsells", label: "Upsells & Popups", category: "Checkout & Log", keywords: "popup count-down upsells discount coupon exit-intent popups modal drawer card" },
    { value: "payment", label: "Payment Config", category: "Checkout & Log", keywords: "payment bkash nagad api cash on delivery prepayment incentive method credentials gateway credentials" },
    { value: "delivery", label: "Delivery Options", category: "Checkout & Log", keywords: "delivery fee shipping rate primary secondary zone threshold free shipping weight" },
    { value: "loyalty", label: "Loyalty & Rewards", category: "Checkout & Log", keywords: "loyalty rewards point balance rate cashback checkout signup bonus points reward rewards" },
    { value: "support", label: "Support & WhatsApp", category: "Information", keywords: "support whatsapp help phone message number contact support support number helpline" },
    { value: "about", label: "About Page", category: "Information", keywords: "about us page text details description history values story team" },
    { value: "faq", label: "FAQ & Return Policy", category: "Information", keywords: "faq questions answers return refund policy returns exchange queries shipping returns policy policy policies" },
    { value: "contact", label: "Contact Inquiries", category: "Information", keywords: "contact email form submit queries address office hours contact page map location" },
    { value: "footer", label: "Footer Details", category: "Store Identity", keywords: "footer link social copyright pay text message description information links copy footer settings social social links" },
    { value: "domain", label: "Custom Domain", category: "Store Identity", keywords: "custom domain dns website url address connect" },
    { value: "notifications", label: "Notifications", category: "Information", keywords: "sms email notifications order receipt shipped tracking tracking sms alert email gateway resend greenweb sms api key" },
    { value: "page_builder", label: "Page Builder", category: "Storefront", keywords: "page builder pages blocks homepage custom page revisions seo slug layout rich text storefront sections" },
  ];
  const pageBuilderEnabled = getFeatureEnabled(entitlementData?.featureMap, "cms_pages", false);
  const LegacyHomepageNotice = ({ title }: { title: string }) => (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This editor is kept for backward compatibility. Homepage sections now render from Page Builder blocks first, and these fields are being gradually demoted.
          </p>
        </div>
        {pageBuilderEnabled ? (
          <Button asChild variant="outline" className="gap-2">
            <Link to="/admin/page-builder">
              <PanelsTopLeft className="h-4 w-4" />
              Open Page Builder
            </Link>
          </Button>
        ) : (
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowRightCircle className="h-4 w-4" />
            Enable Page Builder for block-first editing
          </div>
        )}
      </CardContent>
    </Card>
  );

  const filteredTabs = tabOptions.filter(
    (t) =>
      t.label.toLowerCase().includes(tabQuery.toLowerCase()) ||
      t.keywords.toLowerCase().includes(tabQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(tabQuery.toLowerCase())
  );
  const mobileQuickTabs = tabOptions.filter((tab) => mobilePinnedSettingTabs.includes(tab.value as (typeof mobilePinnedSettingTabs)[number]));
  const mobileVisibleTabs = filteredTabs.filter((tab) => !mobilePinnedSettingTabs.includes(tab.value as (typeof mobilePinnedSettingTabs)[number]) && tab.category !== "Legacy Fallbacks");
  const mobileLegacyTabs = filteredTabs.filter((tab) => tab.category === "Legacy Fallbacks");

  useEffect(() => {
    if (role !== "admin") return;
    const fetch = async () => {
      if (!activeStoreId) {
        setSettings({});
        setDbCategories([]);
        setDbTypes([]);
        setThemePackages(fallbackThemePackages);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const loadedThemePackages = await loadThemePackages(supabase, activeStoreId);
        setThemePackages(loadedThemePackages);

        const [{ data: categoryData }, { data: typeData }, { data: settingsData, error: settingsError }] = await Promise.all([
          supabase.from("product_categories").select("name").eq("store_id", activeStoreId as string),
          supabase.from("product_types").select("name").eq("store_id", activeStoreId as string),
          supabase.from("site_settings").select("*").eq("store_id", activeStoreId as string),
        ]);

        if (settingsError) throw settingsError;

        setDbCategories((categoryData ?? []).map((r: { name: string }) => r.name));
        setDbTypes((typeData ?? []).map((r: { name: string }) => r.name));

        const map: Record<string, any> = {};
        settingsData?.forEach((row) => {
          map[row.key] = row.value;
        });
        setSettings(map);
      } catch (error) {
        console.error("Failed to load site settings:", error);
        toast.error("Failed to refresh site settings. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [activeStoreId, role]);

  useEffect(() => {
    setSettings({});
    setDbCategories([]);
    setDbTypes([]);
    setThemePackages(fallbackThemePackages);
    setLoading(Boolean(activeStoreId));
    setSaving(null);
  }, [activeStoreId]);

  const { data: themeData } = useQuery({
    queryKey: ["store_themes", activeStoreId],
    queryFn: async (): Promise<StoreThemeSettingsRow> => {
      const { data } = await supabase
        .from("store_themes")
        .select("preset_id, theme_package_id, theme_package_version, mode, colors, resolved_tokens, typography, components, custom_css")
        .eq("store_id", activeStoreId as string)
        .maybeSingle();

      return {
        preset_id: data?.preset_id ?? "default",
        theme_package_id: data?.theme_package_id ?? null,
        theme_package_version: typeof data?.theme_package_version === "number" ? data.theme_package_version : null,
        mode: data?.mode ?? "dark",
        colors: (typeof data?.colors === "object" && data?.colors ? data.colors : null) as StoreThemeSettingsRow["colors"],
        resolved_tokens: (typeof data?.resolved_tokens === "object" && data?.resolved_tokens ? data.resolved_tokens : null) as StoreThemeSettingsRow["resolved_tokens"],
        typography: typeof data?.typography === "object" && data?.typography ? data.typography as StoreThemeSettingsRow["typography"] : {},
        components: typeof data?.components === "object" && data?.components ? data.components as StoreThemeSettingsRow["components"] : {},
        custom_css: data?.custom_css ?? null,
      };
    },
    enabled: Boolean(activeStoreId),
  });
  const { data: businessProfileData } = useQuery({
    queryKey: ["store_business_profiles", activeStoreId, "site_settings"],
    queryFn: async (): Promise<StoreBusinessProfileSettingsRow | null> => {
      const { data } = await supabase
        .from("store_business_profiles")
        .select("blueprint_id, blueprint_version")
        .eq("store_id", activeStoreId as string)
        .maybeSingle();

      return data
        ? {
            blueprint_id: data.blueprint_id ?? null,
            blueprint_version: typeof data.blueprint_version === "number" ? data.blueprint_version : null,
          }
        : null;
    },
    enabled: Boolean(activeStoreId),
  });

  const { data: notificationEvents, isLoading: notificationEventsLoading } = useQuery({
    queryKey: ["email-events", activeStoreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_events")
        .select("id, template_name, recipient, channel, status, provider, error, created_at")
        .eq("store_id", activeStoreId as string)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(activeStoreId) && activeTab === "notifications",
  });

  const activeThemeId = themeData?.theme_package_id ?? themeData?.preset_id ?? "default";
  const [localThemeId, setLocalThemeId] = useState(activeThemeId);

  useEffect(() => {
    setLocalThemeId(activeThemeId);
  }, [activeThemeId]);

  const activeThemePackage = useMemo(
    () => resolveThemePackageById(localThemeId, themePackages, themeData?.preset_id ?? "default"),
    [localThemeId, themeData?.preset_id, themePackages],
  );
  const isMissingActiveThemeReference = useMemo(
    () => isThemePackageReferenceMissing(themeData?.theme_package_id ?? null, themePackages),
    [themeData?.theme_package_id, themePackages],
  );
  const hasThemeVersionUpdate = useMemo(
    () =>
      typeof themeData?.theme_package_version === "number"
      && typeof activeThemePackage.version === "number"
      && themeData.theme_package_version < activeThemePackage.version,
    [activeThemePackage.version, themeData?.theme_package_version],
  );
  const hasBlueprintVersionUpdate = useMemo(
    () =>
      typeof businessProfileData?.blueprint_version === "number"
      && businessProfileData.blueprint_version < 1,
    [businessProfileData?.blueprint_version],
  );
  const resolvedThemeMode = (themeData?.mode === "light" ? "light" : "dark") as "light" | "dark";
  const resolvedHeadingFont = resolveThemeFontValue(
    settings.theme_customization?.heading_font ?? themeData?.typography?.headingFont,
    headingFontOptions,
    activeThemePackage.tokens.typography.headingFont ?? "Inter, sans-serif",
  );
  const resolvedBodyFont = resolveThemeFontValue(
    settings.theme_customization?.body_font ?? themeData?.typography?.bodyFont,
    bodyFontOptions,
    activeThemePackage.tokens.typography.bodyFont ?? "Inter, sans-serif",
  );
  const resolvedHeadingFontControl = resolveThemeFontControlValue(
    settings.theme_customization?.heading_font ?? themeData?.typography?.headingFont,
    headingFontOptions,
    "inter",
  );
  const resolvedBodyFontControl = resolveThemeFontControlValue(
    settings.theme_customization?.body_font ?? themeData?.typography?.bodyFont,
    bodyFontOptions,
    "inter",
  );
  const resolvedBorderRadius = settings.theme_customization?.border_radius
    ?? themeData?.components?.borderRadius
    ?? activeThemePackage.tokens.components.borderRadius
    ?? "0.5rem";

  const syncHomepageSettingToBlocks = async (key: LegacyHomepageSettingKey, value: unknown) => {
    if (!activeStoreId) return false;

    const { data: homepage } = await supabase
      .from("store_pages")
      .select("id")
      .eq("store_id", activeStoreId as string)
      .eq("is_homepage", true)
      .maybeSingle();

    const homepageRow = homepage as HomepagePageRow | null;
    if (!homepageRow?.id) return false;

    const { data: blocks, error: blocksError } = await supabase
      .from("store_page_blocks")
      .select("id, block_type, props, sort_order, is_visible")
      .eq("store_id", activeStoreId as string)
      .eq("page_id", homepageRow.id)
      .in("block_type", ["hero", "promo-banner", "featured-products", "category-showcase"]);

    if (blocksError || !Array.isArray(blocks) || blocks.length === 0) {
      if (blocksError) {
        throw blocksError;
      }
      return false;
    }

    const updatedBlocks = (blocks as HomepageBlockRow[]).map((block) => {
      const adapted = applyLegacyHomepageSettingToBlock(
        {
          id: block.id,
          type: block.block_type,
          props: (block.props ?? {}) as any,
          sortOrder: block.sort_order ?? 0,
          isVisible: block.is_visible ?? true,
        },
        key,
        value,
      );

      return {
        id: adapted.id,
        store_id: activeStoreId,
        page_id: homepageRow.id,
        block_type: adapted.type,
        props: adapted.props as Json,
        sort_order: adapted.sortOrder,
        is_visible: adapted.isVisible,
      };
    });

    const { error: syncError } = await supabase.from("store_page_blocks").upsert(updatedBlocks, { onConflict: "id" });
    if (syncError) {
      throw syncError;
    }

    return true;
  };

  const saveSetting = async (key: string) => {
    if (!activeStoreId) return;

    setSaving(key);
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ store_id: activeStoreId, key, value: settings[key] ?? {} }, { onConflict: "store_id,key" });
      if (error) throw error;

      if (homepageSyncKeys.has(key as LegacyHomepageSettingKey)) {
        const synced = await syncHomepageSettingToBlocks(key as LegacyHomepageSettingKey, settings[key] ?? {});
        if (synced) {
          queryClient.invalidateQueries({ queryKey: ["store_page_blocks"] });
          queryClient.invalidateQueries({ queryKey: ["store_pages"] });
        }
      }

      toast.success(`${key.replace(/_/g, " ")} updated`);
      queryClient.invalidateQueries({ queryKey: ["site_settings", activeStoreId, key] });
    } catch (error: any) {
      toast.error(error?.message || "Failed to save");
    }
    setSaving(null);
  };

  const update = (key: string, field: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  // FAQ array helpers
  const faqEntries: { q: string; a: string }[] = settings.faq_entries ?? [];

  const updateFaq = (index: number, field: "q" | "a", value: string) => {
    const updated = [...faqEntries];
    updated[index] = { ...updated[index], [field]: value };
    setSettings((prev) => ({ ...prev, faq_entries: updated }));
  };

  const addFaq = () => {
    setSettings((prev) => ({
      ...prev,
      faq_entries: [...(prev.faq_entries ?? []), { q: "", a: "" }],
    }));
  };

  const removeFaq = (index: number) => {
    const updated = faqEntries.filter((_, i) => i !== index);
    setSettings((prev) => ({ ...prev, faq_entries: updated }));
  };


  const SaveButton = ({ settingKey }: { settingKey: string }) => (
    <Button onClick={() => saveSetting(settingKey)} disabled={saving === settingKey} className="gap-2">
      {saving === settingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      Save
    </Button>
  );

  const StickySectionSaveBar = ({
    settingKey,
    title,
    hint,
  }: {
    settingKey: string;
    title: string;
    hint: string;
  }) => (
    <div className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-border/70 bg-background/95 px-4 py-3 backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
        <SaveButton settingKey={settingKey} />
      </div>
    </div>
  );

  const MobileSectionShell = ({
    title,
    description,
    children,
    className,
  }: {
    title: string;
    description: string;
    children: ReactNode;
    className?: string;
  }) => (
    <Card className={cn("border-border shadow-sm md:shadow-none rounded-xl", className)}>
      <CardHeader className="space-y-1 px-4 py-3.5 md:px-6 md:py-4">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3.5 px-4 pb-4 md:px-6">{children}</CardContent>
    </Card>
  );

  const MobileSectionJumper = ({
    items,
  }: {
    items: Array<{ id: string; label: string }>;
  }) => (
    <div className="sticky top-[7.25rem] z-10 -mx-4 border-y border-border/60 bg-background/95 px-4 py-3 backdrop-blur-xl md:hidden">
      <div className="overflow-x-auto">
        <div className="flex min-w-max items-center gap-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToAdminSection(item.id)}
              className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const handleThemeSelect = (themeId: string) => {
    setLocalThemeId(themeId);
  };

  const saveTheme = async () => {
    if (!activeStoreId) return;

    setSaving("active_theme");
    try {
      const fullPayload = {
        store_id: activeStoreId,
        preset_id: activeThemePackage.presetId,
        mode: themeData?.mode ?? "dark",
        theme_package_id: activeThemePackage.id,
        theme_package_version: activeThemePackage.version,
        colors: activeThemePackage.tokens[(themeData?.mode as "light" | "dark" | undefined) ?? "dark"] ?? {},
        typography: {
          headingFont: resolvedHeadingFont,
          bodyFont: resolvedBodyFont,
        },
        components: {
          borderRadius: settings.theme_customization?.border_radius ?? themeData?.components?.borderRadius ?? activeThemePackage.tokens.components.borderRadius ?? "0.5rem",
        },
        overrides: {
          headingFont: settings.theme_customization?.heading_font ? resolvedHeadingFont : undefined,
          bodyFont: settings.theme_customization?.body_font ? resolvedBodyFont : undefined,
          borderRadius: settings.theme_customization?.border_radius ?? undefined,
        },
        resolved_tokens: {
          light: activeThemePackage.tokens.light,
          dark: activeThemePackage.tokens.dark,
        },
        custom_css: activeThemePackage.customCss ?? null,
      };

      let { error } = await supabase.from("store_themes").upsert(fullPayload, { onConflict: "store_id" });
      if (error) {
        ({ error } = await supabase.from("store_themes").upsert(
          {
            store_id: activeStoreId,
            preset_id: activeThemePackage.presetId,
            mode: themeData?.mode ?? "dark",
            colors: fullPayload.colors,
            typography: fullPayload.typography,
            components: fullPayload.components,
            custom_css: fullPayload.custom_css,
          },
          { onConflict: "store_id" },
        ));
      }
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["store_themes", activeStoreId] });
      toast.success(isMissingActiveThemeReference ? "Theme settings saved and missing package reference repaired." : "Theme settings saved.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save theme settings.");
    } finally {
      setSaving(null);
    }
  };

  const exportCurrentTheme = () => {
    const exportPayload = buildThemePackageExport({
      ...activeThemePackage,
      name: `${activeThemePackage.name} (${settings.brand_seo?.site_name || "Store"})`,
        sourceType: "merchant_private",
        tokens: {
          ...activeThemePackage.tokens,
          typography: {
          headingFont: resolvedHeadingFont,
          bodyFont: resolvedBodyFont,
          },
          components: {
            borderRadius: settings.theme_customization?.border_radius ?? activeThemePackage.tokens.components.borderRadius,
        },
      },
    });

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${exportPayload.slug || "theme-package"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const savePrivateTheme = async () => {
    if (!activeStoreId) return;

    setSaving("private_theme");
    try {
      const exportPayload = buildThemePackageExport({
        ...activeThemePackage,
        id: crypto.randomUUID(),
        slug: `${settings.brand_seo?.site_name || "store"}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: `${settings.brand_seo?.site_name || "Store"} Private Theme`,
        sourceType: "merchant_private",
        ownerStoreId: activeStoreId,
        tokens: {
          ...activeThemePackage.tokens,
          typography: {
            headingFont: resolvedHeadingFont,
            bodyFont: resolvedBodyFont,
          },
          components: {
            borderRadius: settings.theme_customization?.border_radius ?? activeThemePackage.tokens.components.borderRadius,
          },
        },
      });

      const { error } = await supabase.from("theme_packages").insert({
        id: exportPayload.id,
        slug: exportPayload.slug,
        name: exportPayload.name,
        description: exportPayload.description,
        preview_metadata: exportPayload.preview as Json,
        source_type: exportPayload.sourceType,
        version: exportPayload.version,
        compatibility_version: exportPayload.compatibilityVersion,
        preset_id: exportPayload.presetId,
        mode: exportPayload.mode,
        tokens: exportPayload.tokens as Json,
        component_recipes: exportPayload.recipes as Json,
        custom_css: exportPayload.customCss ?? null,
        owner_store_id: activeStoreId,
      });
      if (error) throw error;

      const refreshed = await loadThemePackages(supabase, activeStoreId);
      setThemePackages(refreshed);
      setLocalThemeId(exportPayload.id);
      toast.success("Private theme saved.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save private theme.");
    } finally {
      setSaving(null);
    }
  };

  const importThemePackage = async (raw: string) => {
    if (!activeStoreId) return;

    setSaving("import_theme");
    try {
      const imported = parseThemePackageImport(raw);
      const packageId = crypto.randomUUID();
      const { error } = await supabase.from("theme_packages").insert({
        id: packageId,
        slug: `${imported.slug}-${Date.now()}`,
        name: imported.name,
        description: imported.description,
        preview_metadata: imported.preview as Json,
        source_type: "merchant_private",
        version: imported.version,
        compatibility_version: imported.compatibilityVersion,
        preset_id: imported.presetId,
        mode: imported.mode,
        tokens: imported.tokens as Json,
        component_recipes: imported.recipes as Json,
        custom_css: imported.customCss ?? null,
        owner_store_id: activeStoreId,
      });
      if (error) throw error;

      const refreshed = await loadThemePackages(supabase, activeStoreId);
      setThemePackages(refreshed);
      setLocalThemeId(packageId);
      toast.success("Theme package imported.");
    } catch (err: any) {
      toast.error(err.message || "Failed to import theme package.");
    } finally {
      setSaving(null);
    }
  };

  if ((authLoading || (session && role !== "admin")) && role !== "admin") {
    return (
      <AdminRecoveryPanel
        title="Restoring Site Settings"
        description="Store permissions are still reconnecting before settings can be edited."
        loadingLabel="Reconnecting the settings workspace."
        retryLabel="Retry access"
        secondaryLabel="Sign out"
        onRetry={() => void refreshRole()}
        onSecondary={() => void signOut()}
        fullHeight
      />
    );
  }

  if (role !== "admin") return <Navigate to="/admin" replace />;

  const showBlockingLoader =
    loading
    && Object.keys(settings).length === 0
    && dbCategories.length === 0
    && dbTypes.length === 0;

  if (showBlockingLoader) {
    return (
      <div className="flex h-screen flex-col gap-6 p-6">
        <Skeleton className="h-10 w-[200px]" />
        <div className="flex flex-1 flex-col gap-6 lg:flex-row">
          <Skeleton className="h-[600px] w-full lg:w-[250px]" />
          <div className="flex-1 space-y-6">
            <Skeleton className="h-[200px] w-full rounded-xl" />
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!activeStoreId) {
    return (
      <div className="space-y-6">
        <Card className="border-border bg-card/80 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Choose a Store to Edit Site Settings</CardTitle>
                <CardDescription>
                  Brand, SEO, payment, support, and theme settings all stay scoped to the active store, so pick that context first.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-background/40 p-4">
                <p className="text-sm font-medium text-foreground">Select the right store</p>
                <p className="mt-1 text-xs text-muted-foreground">Use the store switcher in the admin header to load the storefront you want to configure.</p>
              </div>
              <div className="rounded-xl border border-border bg-background/40 p-4">
                <p className="text-sm font-medium text-foreground">Edit with confidence</p>
                <p className="mt-1 text-xs text-muted-foreground">Theme, contact, and payment settings save to the active store only.</p>
              </div>
              <div className="rounded-xl border border-border bg-background/40 p-4">
                <p className="text-sm font-medium text-foreground">Finish setup faster</p>
                <p className="mt-1 text-xs text-muted-foreground">Onboarding is still the quickest place to create a store or complete first-run setup.</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="gap-2">
                <Link to="/admin">
                  <Store className="h-4 w-4" />
                  Go To Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/signup">
                  <ArrowRightCircle className="h-4 w-4" />
                  Create Store
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-foreground md:text-3xl">Site Settings</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary md:hidden">
              {tabOptions.find((tab) => tab.value === activeTab)?.label ?? "Settings"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Edit your store's content and appearance</p>
          {isMissingActiveThemeReference ? (
            <p className="mt-2 text-sm text-amber-600">
              This store references a theme package that is no longer available. The editor is showing the nearest compatible fallback until you save a new package choice.
            </p>
          ) : null}
          {hasThemeVersionUpdate ? (
            <p className="mt-2 text-sm text-sky-600">
              This store is using theme snapshot v{themeData?.theme_package_version} while the current shared package is v{activeThemePackage.version}. Saving theme settings will install the latest snapshot for this store.
            </p>
          ) : null}
          {hasBlueprintVersionUpdate ? (
            <p className="mt-2 text-sm text-sky-600">
              This store was created from an older blueprint snapshot. Updating store configuration will refresh blueprint-owned profile metadata for the current blueprint generation.
            </p>
          ) : null}
        </div>
        <Button
          variant="outline"
          onClick={() => void seedDemoProducts(activeStoreId)}
          disabled={!activeStoreId}
          className="gap-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:text-primary w-full sm:w-auto"
        >
          <Database className="h-4 w-4" /> Seed Demo Products
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {tabOptions.find((tab) => tab.value === activeTab)?.label ?? "Settings"} workspace
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Use the section rail to jump quickly, then save from the sticky action bar as you work through longer forms.
            </p>
          </div>
          <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            Mobile edit mode
          </span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation & Search & Select */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-4">
          {/* Quick Search settings */}
          <div className="relative md:sticky md:top-20">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search settings..."
              value={tabQuery}
              onChange={(e) => setTabQuery(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>

          {/* Mobile sticky jumpers */}
          <div className="md:hidden">
            <div className="sticky top-16 z-20 -mx-4 border-y border-border/60 bg-background/95 px-4 py-3 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Jump to section</p>
                  <p className="text-[11px] text-muted-foreground">Keep the main areas close and hide older sections unless you need them.</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setShowMobileAllTabs((current) => !current)}
                >
                  {showMobileAllTabs ? "Compact" : "Browse"}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <div className="flex min-w-max items-center gap-2 pb-1">
                  {mobileQuickTabs.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => handleTabChange(tab.value)}
                      className={cn(
                        "inline-flex h-9 items-center rounded-full border px-3 text-xs font-medium transition-colors",
                        activeTab === tab.value
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {(showMobileAllTabs ? mobileVisibleTabs : mobileVisibleTabs.slice(0, 4)).map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => handleTabChange(tab.value)}
                    className={cn(
                      "flex w-full items-start justify-between rounded-xl border px-3 py-2.5 text-left transition-colors",
                      activeTab === tab.value
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-border bg-card/70 text-foreground",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{tab.label}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{tab.category}</p>
                    </div>
                    <ArrowRightCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
                {mobileVisibleTabs.length > 4 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-full text-xs"
                    onClick={() => setShowMobileAllTabs((current) => !current)}
                  >
                    {showMobileAllTabs ? "Show fewer sections" : `Show ${mobileVisibleTabs.length - 4} more sections`}
                  </Button>
                ) : null}
              </div>
              <div className="mt-3 rounded-xl border border-dashed border-border/70 bg-card/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-foreground">Legacy homepage tools</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Only older stores usually need these fields now.</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setShowMobileLegacyTabs((current) => !current)}
                  >
                    {showMobileLegacyTabs ? "Hide" : "Show"}
                  </Button>
                </div>
                {showMobileLegacyTabs ? (
                  <div className="mt-3 space-y-2">
                    {mobileLegacyTabs.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => handleTabChange(tab.value)}
                        className={cn(
                          "flex w-full items-start justify-between rounded-xl border px-3 py-2.5 text-left transition-colors",
                          activeTab === tab.value
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "border-border bg-background text-foreground",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{tab.label}</p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{tab.category}</p>
                        </div>
                        <ArrowRightCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Desktop Sidebar TabsList */}
          <TabsList className="hidden md:flex flex-col h-auto w-full items-stretch justify-start gap-2 bg-transparent p-0 border-r border-border pr-4">
            {Array.from(new Set(filteredTabs.map((t) => t.category))).map((cat) => (
              <div key={cat} className="space-y-1 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-3 block py-1">
                  {cat}
                </span>
                {filteredTabs
                  .filter((t) => t.category === cat)
                  .map((t) => (
                    <TabsTrigger
                      key={t.value}
                      value={t.value}
                      className="w-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary justify-start px-3 py-2 text-left text-sm font-medium transition-colors rounded-lg border border-transparent data-[state=active]:border-primary/20"
                    >
                      {t.label}
                    </TabsTrigger>
                  ))}
              </div>
            ))}
            {filteredTabs.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2">No matching settings found.</p>
            )}
          </TabsList>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">

        {/* Brand & SEO */}
        <BrandSeoTab settings={settings} update={update} SaveButton={SaveButton} />

        {/* Home Sections */}
        <TabsContent value="home_sections">
          <MobileSectionShell title="Legacy Home Sections" description="These older homepage fields are still supported for existing stores, but Page Builder sections should lead new edits.">
            <LegacyHomepageNotice title="Legacy Homepage Section Settings" />
            <Card className="rounded-xl border-border shadow-sm md:shadow-none">
              <CardHeader className="px-4 py-3.5 md:px-6 md:py-4"><CardTitle className="text-base">Featured Products Section</CardTitle></CardHeader>
              <CardContent className="space-y-3.5 px-4 pb-4 md:px-6">
                <div className="grid gap-2">
                  <Label>Section Tagline</Label>
                  <Input value={settings.home_featured?.tagline ?? ""} placeholder="Highlights" onChange={(e) => update("home_featured", "tagline", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Section Title</Label>
                  <Input value={settings.home_featured?.title ?? ""} placeholder="Section heading for highlighted products" onChange={(e) => update("home_featured", "title", e.target.value)} />
                </div>
                <SaveButton settingKey="home_featured" />
              </CardContent>
            </Card>

            <Card className="rounded-xl border-border shadow-sm md:shadow-none">
              <CardHeader className="px-4 py-3.5 md:px-6 md:py-4"><CardTitle className="text-base">Category Showcase Section</CardTitle></CardHeader>
              <CardContent className="space-y-3.5 px-4 pb-4 md:px-6">
                <div className="grid gap-2">
                  <Label>Section Tagline</Label>
                  <Input value={settings.home_categories?.tagline ?? ""} placeholder="Categories" onChange={(e) => update("home_categories", "tagline", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Section Title</Label>
                  <Input value={settings.home_categories?.title ?? ""} placeholder="Browse by category" onChange={(e) => update("home_categories", "title", e.target.value)} />
                </div>
                <SaveButton settingKey="home_categories" />
              </CardContent>
            </Card>
            <StickySectionSaveBar settingKey="home_categories" title="Legacy home sections" hint="Save older featured and category homepage headings." />
          </MobileSectionShell>
        </TabsContent>

        {/* Announcement Bar */}
        <AnnouncementTab settings={settings} setSettings={setSettings} update={update} SaveButton={SaveButton} />

        {/* Promo Banner */}
        <TabsContent value="promo">
          <MobileSectionShell title="Legacy Promo Banner" description="Keep older promo banner content working while newer stores move toward Page Builder-owned blocks.">
            <LegacyHomepageNotice title="Legacy Promotional Banner Settings" />
            <Card className="rounded-xl border-border shadow-sm md:shadow-none">
              <CardHeader className="px-4 py-3.5 md:px-6 md:py-4"><CardTitle className="text-base">Promotional Banner</CardTitle></CardHeader>
              <CardContent className="space-y-3.5 px-4 pb-4 md:px-6">
                <div className="flex items-center gap-2">
                  <Switch checked={settings.promo_banner?.enabled ?? false} onCheckedChange={(v) => update("promo_banner", "enabled", v)} />
                  <Label>Show banner on homepage</Label>
                </div>
                <div className="grid gap-2">
                  <Label>Badge text</Label>
                  <Input value={settings.promo_banner?.badge_text ?? ""} placeholder="Limited offer" onChange={(e) => update("promo_banner", "badge_text", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Title</Label>
                  <Input value={settings.promo_banner?.title ?? ""} placeholder="Offer headline" onChange={(e) => update("promo_banner", "title", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Subtitle</Label>
                  <Input value={settings.promo_banner?.subtitle ?? ""} placeholder="Offer details or supporting message" onChange={(e) => update("promo_banner", "subtitle", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Button text</Label>
                    <Input value={settings.promo_banner?.cta_text ?? ""} placeholder="Learn more" onChange={(e) => update("promo_banner", "cta_text", e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Button link</Label>
                    <Input value={settings.promo_banner?.cta_link ?? ""} placeholder="/" onChange={(e) => update("promo_banner", "cta_link", e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Colour style</Label>
                  <div className="flex flex-wrap gap-3">
                    {(["gradient", "luxury-gold", "indigo", "rose", "dark", "accent"] as const).map((style) => (
                      <button key={style} type="button" onClick={() => update("promo_banner", "bg_style", style)}
                        className={`rounded-lg border-2 px-4 py-2 text-xs font-semibold capitalize transition-colors ${(settings.promo_banner?.bg_style ?? "gradient") === style ? "border-primary text-foreground bg-primary/10" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                        {style === "gradient" ? "Green Gradient" : style === "luxury-gold" ? "Luxury Gold" : style === "indigo" ? "Royal Indigo" : style === "rose" ? "Velvet Rose" : style === "dark" ? "Dark" : "Light"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Text Alignment</Label>
                  <div className="flex gap-3">
                    {(["left", "center", "right"] as const).map((align) => (
                      <button key={align} type="button" onClick={() => update("promo_banner", "text_alignment", align)}
                        className={`rounded-lg border-2 px-4 py-2 text-xs font-semibold capitalize transition-colors ${(settings.promo_banner?.text_alignment ?? "center") === align ? "border-primary text-foreground bg-primary/10" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Banner Height / Spacing</Label>
                  <div className="flex gap-3">
                    {(["compact", "cozy", "large"] as const).map((pad) => (
                      <button key={pad} type="button" onClick={() => update("promo_banner", "padding_size", pad)}
                        className={`rounded-lg border-2 px-4 py-2 text-xs font-semibold capitalize transition-colors ${(settings.promo_banner?.padding_size ?? "cozy") === pad ? "border-primary text-foreground bg-primary/10" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                        {pad}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Switch checked={settings.promo_banner?.enable_glow ?? false} onCheckedChange={(v) => update("promo_banner", "enable_glow", v)} />
                  <Label>Enable pulsing glow effect on CTA button</Label>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Switch checked={settings.promo_banner?.enable_orbs ?? true} onCheckedChange={(v) => update("promo_banner", "enable_orbs", v)} />
                  <Label>Show floating background accents</Label>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Switch checked={settings.promo_banner?.enable_particles ?? true} onCheckedChange={(v) => update("promo_banner", "enable_particles", v)} />
                  <Label>Show floating sparkle particles</Label>
                </div>
                <div className="grid gap-3 pt-4 border-t border-border mt-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Glass Card Opacity</Label>
                    <span className="font-mono text-xs font-bold bg-secondary px-2.5 py-1 rounded text-secondary-foreground">{settings.promo_banner?.card_opacity ?? 3}%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={settings.promo_banner?.card_opacity ?? 3}
                      onChange={(e) => update("promo_banner", "card_opacity", Number(e.target.value))}
                      className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Adjust the transparency of the glassmorphic card (0% is completely clear water-glass, higher is more frosted/milky).</p>
                </div>
                <SaveButton settingKey="promo_banner" />
              </CardContent>
            </Card>
            <StickySectionSaveBar settingKey="promo_banner" title="Legacy promo banner" hint="Save banner copy, style, and legacy visual effects." />
          </MobileSectionShell>
        </TabsContent>

        {/* Hero Section - Enhanced */}
        <TabsContent value="hero">
          <MobileSectionShell title="Legacy Hero Section" description="These legacy hero controls still backfill older storefronts, but page blocks should become the main editing surface over time.">
            <LegacyHomepageNotice title="Legacy Hero Settings" />
            <Card className="rounded-xl border-border shadow-sm md:shadow-none">
              <CardHeader className="px-4 py-3.5 md:px-6 md:py-4"><CardTitle className="text-base">Hero Section</CardTitle></CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 md:px-6">
              <div className="grid gap-2">
                <Label>Tagline (small text above title)</Label>
                  <Input value={settings.hero_section?.tagline ?? ""} placeholder="Short supporting text above the main title" onChange={(e) => update("hero_section", "tagline", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Title</Label>
                  <Input value={settings.hero_section?.title ?? ""} placeholder="Bring your" onChange={(e) => update("hero_section", "title", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Highlighted word (gradient)</Label>
                  <Input value={settings.hero_section?.highlight ?? ""} placeholder="brand online" onChange={(e) => update("hero_section", "highlight", e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Subtitle</Label>
                <Textarea value={settings.hero_section?.subtitle ?? ""} onChange={(e) => update("hero_section", "subtitle", e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Primary CTA Text</Label>
                  <Input value={settings.hero_section?.cta_text ?? ""} placeholder="Explore" onChange={(e) => update("hero_section", "cta_text", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Primary CTA Link</Label>
                  <Input value={settings.hero_section?.cta_link ?? ""} placeholder="/" onChange={(e) => update("hero_section", "cta_link", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Secondary CTA Text</Label>
                  <Input value={settings.hero_section?.secondary_cta_text ?? ""} placeholder="Learn more" onChange={(e) => update("hero_section", "secondary_cta_text", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Secondary CTA Link</Label>
                  <Input value={settings.hero_section?.secondary_cta_link ?? ""} placeholder="/contact" onChange={(e) => update("hero_section", "secondary_cta_link", e.target.value)} />
                </div>
              </div>

              {/* Background Media */}
              <div className="border-t border-border pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Background Media</h3>
                <div className="grid gap-2">
                  <Label>Hero Image / Video</Label>
                  <CloudinaryUpload
                    value={settings.hero_section?.media_url ?? ""}
                    onChange={(url) => {
                      const isVideo = url && (url.includes("/video/") || url.match(/\.(mp4|webm|mov)$/i));
                      setSettings((prev) => ({
                        ...prev,
                        hero_section: {
                          ...prev.hero_section,
                          media_url: url,
                          media_type: isVideo ? "video" : "image",
                        },
                      }));
                    }}
                    folder="hero"
                    accept="image/*,video/*"
                    label="Upload hero media"
                    resourceType="auto"
                  />
                  <p className="text-xs text-muted-foreground">Recommended: 1920x1080 for images, MP4 under 10MB for videos</p>
                </div>
                <div className="grid gap-2">
                  <Label>Media Type</Label>
                  <Select value={settings.hero_section?.media_type ?? "image"} onValueChange={(v) => update("hero_section", "media_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {settings.hero_section?.media_url && (
                  <div className="overflow-hidden rounded-lg border border-border">
                    {settings.hero_section?.media_type === "video" ? (
                      <video src={settings.hero_section.media_url} className="h-40 w-full object-cover" controls muted />
                    ) : (
                      <img src={settings.hero_section.media_url} alt="Hero preview" className="h-40 w-full object-cover" />
                    )}
                  </div>
                )}
              </div>

              {/* Overlay */}
              <div className="border-t border-border pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Overlay</h3>
                <div className="flex items-center gap-4">
                  <Label>Overlay Colour</Label>
                  <input
                    type="color"
                    value={settings.hero_section?.overlay_color ?? "#101418"}
                    onChange={(e) => update("hero_section", "overlay_color", e.target.value)}
                    className="h-9 w-14 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  />
                  <span className="font-mono text-xs text-muted-foreground">{settings.hero_section?.overlay_color ?? "theme default"}</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => update("hero_section", "overlay_color", "")}>
                    Reset
                  </Button>
                </div>
                <div className="grid gap-2">
                  <Label>Overlay Opacity ({settings.hero_section?.overlay_opacity ?? 50}%)</Label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.hero_section?.overlay_opacity ?? 50}
                    onChange={(e) => update("hero_section", "overlay_opacity", Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>

                <SaveButton settingKey="hero_section" />
              </CardContent>
            </Card>
            <StickySectionSaveBar settingKey="hero_section" title="Legacy hero section" hint="Save hero copy, media, and overlay settings." />
          </MobileSectionShell>
        </TabsContent>

        {/* Storefront Builder (Themes & Layout) */}
          <ThemesTab
            settings={settings}
            update={update}
            SaveButton={SaveButton}
            localThemeId={localThemeId}
            activeThemeMode={resolvedThemeMode}
            activeHeadingFont={resolvedHeadingFontControl}
            activeBodyFont={resolvedBodyFontControl}
            activeBorderRadius={resolvedBorderRadius}
            handleThemeSelect={handleThemeSelect}
            saveTheme={saveTheme}
            saving={saving}
            themePackages={themePackages}
          onExportCurrentTheme={exportCurrentTheme}
          onSavePrivateTheme={() => void savePrivateTheme()}
          onImportThemePackage={(raw) => void importThemePackage(raw)}
        />

        {/* Payment */}
        <TabsContent value="payment">
          <MobileSectionShell title="Payment Settings" description="Payment methods, persuasion copy, and credentials stay grouped into denser mobile sections.">
              <MobileSectionJumper items={[
                { id: "payment-methods", label: "Methods" },
                { id: "payment-incentives", label: "Incentives" },
                { id: "payment-gateway", label: "Gateway" },
              ]} />
              <div id="payment-methods" className="space-y-3 scroll-mt-36">
                <div className="rounded-xl border border-border p-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">bKash</h3>
                        <p className="mt-1 text-xs text-muted-foreground">Manual or assisted checkout via the merchant number shown at checkout.</p>
                      </div>
                      <Switch checked={settings.payment_settings?.bkash_enabled ?? false} onCheckedChange={(v) => update("payment_settings", "bkash_enabled", v)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>bKash Merchant Number</Label>
                      <Input value={settings.payment_settings?.bkash_number ?? ""} onChange={(e) => update("payment_settings", "bkash_number", e.target.value)} placeholder="01XXXXXXXXX" />
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">Nagad</h3>
                        <p className="mt-1 text-xs text-muted-foreground">Offer Nagad alongside bKash without expanding the checkout flow too much.</p>
                      </div>
                      <Switch checked={settings.payment_settings?.nagad_enabled ?? false} onCheckedChange={(v) => update("payment_settings", "nagad_enabled", v)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Nagad Merchant Number</Label>
                      <Input value={settings.payment_settings?.nagad_number ?? ""} onChange={(e) => update("payment_settings", "nagad_number", e.target.value)} placeholder="01XXXXXXXXX" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div id="payment-incentives" className="space-y-4 scroll-mt-36 rounded-xl border border-border p-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Checkout Persuasion</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Use one badge and one incentive to encourage prepaid checkout without overloading the form.</p>
                </div>
                <div className="grid gap-2">
                  <Label>Prepaid Badge Text</Label>
                  <Input value={settings.payment_settings?.prepaid_badge_text ?? ""} onChange={(e) => update("payment_settings", "prepaid_badge_text", e.target.value)} placeholder="Optional badge text for prepaid checkout" />
                  <p className="text-xs text-muted-foreground">This text is shown as a green badge next to online payment methods to persuade users to pay upfront rather than Cash on Delivery.</p>
                </div>
                <div className="grid gap-2 mt-2">
                  <Label>Prepayment Incentive</Label>
                  <Select value={settings.payment_settings?.prepayment_discount_type ?? "none"} onValueChange={(v) => update("payment_settings", "prepayment_discount_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="free_delivery">Free Delivery</SelectItem>
                      <SelectItem value="percentage">Percentage Discount (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount Discount (store currency)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Offer an incentive when customers choose bKash or Nagad instead of Cash on Delivery.</p>
                </div>
                {(settings.payment_settings?.prepayment_discount_type === "percentage" || settings.payment_settings?.prepayment_discount_type === "fixed") && (
                  <div className="grid gap-2">
                    <Label>Discount Value {settings.payment_settings?.prepayment_discount_type === "percentage" ? "(%)" : "(store currency)"}</Label>
                    <Input type="number" value={settings.payment_settings?.prepayment_discount_value ?? 0} onChange={(e) => update("payment_settings", "prepayment_discount_value", Number(e.target.value))} min={0} />
                  </div>
                )}
              </div>

              <div id="payment-gateway" className="space-y-4 scroll-mt-36 rounded-xl border border-border p-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Automated Payment Gateway (bKash API)</h3>
                  <p className="text-xs text-muted-foreground">Enter your bKash PGW credentials here. Leave blank to use manual Send Money verification.</p>
                </div>
                <div className="grid gap-2">
                  <Label>App Key</Label>
                  <Input type="password" value={settings.payment_settings?.bkash_app_key ?? ""} onChange={(e) => update("payment_settings", "bkash_app_key", e.target.value)} placeholder="Enter App Key" />
                </div>
                <div className="grid gap-2">
                  <Label>App Secret</Label>
                  <Input type="password" value={settings.payment_settings?.bkash_app_secret ?? ""} onChange={(e) => update("payment_settings", "bkash_app_secret", e.target.value)} placeholder="Enter App Secret" />
                </div>
                <div className="grid gap-2">
                  <Label>Username</Label>
                  <Input value={settings.payment_settings?.bkash_username ?? ""} onChange={(e) => update("payment_settings", "bkash_username", e.target.value)} placeholder="Enter Username" />
                </div>
                <div className="grid gap-2">
                  <Label>Password</Label>
                  <Input type="password" value={settings.payment_settings?.bkash_password ?? ""} onChange={(e) => update("payment_settings", "bkash_password", e.target.value)} placeholder="Enter Password" />
                </div>
              </div>

              <SaveButton settingKey="payment_settings" />
              <StickySectionSaveBar settingKey="payment_settings" title="Payment settings" hint="Save methods, incentives, and gateway credentials." />
          </MobileSectionShell>
        </TabsContent>

        {/* Delivery Settings */}
        <TabsContent value="delivery">
          <MobileSectionShell title="Delivery Settings" description="Shipping labels and fee rules are condensed for faster phone editing.">
              <div className="flex items-center gap-2">
                <Switch checked={settings.delivery_settings?.enabled ?? false} onCheckedChange={(v) => update("delivery_settings", "enabled", v)} />
                <Label>Enable delivery fee</Label>
              </div>
              {settings.delivery_settings?.enabled && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Primary Zone Label</Label>
                      <Input value={settings.delivery_settings?.primary_zone_label ?? ""} onChange={(e) => update("delivery_settings", "primary_zone_label", e.target.value)} placeholder="Primary delivery zone" />
                      <p className="text-xs text-muted-foreground">Shown in guest checkout for the default delivery area.</p>
                    </div>
                    <div className="grid gap-2">
                      <Label>Extended Zone Label</Label>
                      <Input value={settings.delivery_settings?.secondary_zone_label ?? ""} onChange={(e) => update("delivery_settings", "secondary_zone_label", e.target.value)} placeholder="Extended delivery zone" />
                      <p className="text-xs text-muted-foreground">Shown for the second delivery area with a different fee.</p>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Primary Delivery Fee</Label>
                    <Input type="number" value={settings.delivery_settings?.delivery_fee ?? 80} onChange={(e) => update("delivery_settings", "delivery_fee", Number(e.target.value))} placeholder="80" min={0} />
                    <p className="text-xs text-muted-foreground">Charged for your default local delivery zone.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Extended Area Delivery Fee</Label>
                    <Input type="number" value={settings.delivery_settings?.delivery_fee_outside ?? 150} onChange={(e) => update("delivery_settings", "delivery_fee_outside", Number(e.target.value))} placeholder="150" min={0} />
                    <p className="text-xs text-muted-foreground">Charged for orders outside your default delivery zone.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Free Delivery Threshold</Label>
                    <Input type="number" value={settings.delivery_settings?.free_threshold ?? 2000} onChange={(e) => update("delivery_settings", "free_threshold", Number(e.target.value))} placeholder="2000" min={0} />
                    <p className="text-xs text-muted-foreground">Orders at or above this amount get free delivery.</p>
                  </div>
                </>
              )}
              <SaveButton settingKey="delivery_settings" />
              <StickySectionSaveBar settingKey="delivery_settings" title="Delivery settings" hint="Save delivery zones, fees, and thresholds." />
          </MobileSectionShell>
        </TabsContent>

        {/* Upsells & Popups */}
        <TabsContent value="upsells">
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader><CardTitle>Product Upsell</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch checked={settings.upsells?.complete_look_enabled ?? false} onCheckedChange={(v) => update("upsells", "complete_look_enabled", v)} />
                  <Label>Show a default upsell block on product pages</Label>
                </div>
                <div className="grid gap-2">
                  <Label>Related Product ID</Label>
                  <Input value={settings.upsells?.complete_look_product_id ?? ""} onChange={(e) => update("upsells", "complete_look_product_id", e.target.value)} placeholder="Product ID to feature as an upsell" />
                  <p className="text-xs text-muted-foreground">Enter the product ID you want to suggest alongside another item.</p>
                </div>
                <div className="grid gap-2">
                  <Label>Upsell Title</Label>
                  <Input value={settings.upsells?.complete_look_title ?? ""} onChange={(e) => update("upsells", "complete_look_title", e.target.value)} placeholder="You may also like" />
                </div>
                <SaveButton settingKey="upsells" />
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader><CardTitle>Gamified Exit-Intent Popup</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch checked={settings.exit_intent?.enabled ?? false} onCheckedChange={(v) => update("exit_intent", "enabled", v)} />
                  <Label>Enable Exit-Intent Popup</Label>
                </div>
                <div className="grid gap-2">
                  <Label>Popup Title</Label>
                    <Input value={settings.exit_intent?.title ?? ""} onChange={(e) => update("exit_intent", "title", e.target.value)} placeholder="Optional popup headline" />
                </div>
                <div className="grid gap-2">
                  <Label>Offer Text (Subtitle)</Label>
                    <Input value={settings.exit_intent?.offer_text ?? ""} onChange={(e) => update("exit_intent", "offer_text", e.target.value)} placeholder="Optional supporting offer text" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Discount Amount / Text</Label>
                      <Input value={settings.exit_intent?.discount_amount ?? ""} onChange={(e) => update("exit_intent", "discount_amount", e.target.value)} placeholder="e.g. 10% OFF or 200 off" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Discount Code</Label>
                      <Input value={settings.exit_intent?.discount_code ?? ""} onChange={(e) => update("exit_intent", "discount_code", e.target.value)} placeholder="Optional promo code" />
                  </div>
                </div>
                
                {/* Design Customization */}
                <div className="border-t border-border pt-4 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Design & Media</h3>
                  <div className="flex items-center gap-4">
                    <Label>Background Colour</Label>
                    <input
                      type="color"
                      value={settings.exit_intent?.bg_color ?? "#101418"}
                      onChange={(e) => update("exit_intent", "bg_color", e.target.value)}
                      className="h-9 w-14 cursor-pointer rounded border border-border bg-transparent p-0.5"
                    />
                    <span className="font-mono text-xs text-muted-foreground">{settings.exit_intent?.bg_color ?? "#101418"}</span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => update("exit_intent", "bg_color", "")}>
                      Reset
                    </Button>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Popup Image (Left Side)</Label>
                    <CloudinaryUpload
                      value={settings.exit_intent?.image_url ?? ""}
                      onChange={(url) => update("exit_intent", "image_url", url)}
                      folder="popups"
                      accept="image/*"
                      label="Upload popup image"
                    />
                    {settings.exit_intent?.image_url && (
                      <div className="mt-2 overflow-hidden rounded-md border border-border">
                        <img src={settings.exit_intent.image_url} alt="Popup preview" className="h-32 w-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                <SaveButton settingKey="exit_intent" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* WhatsApp Support */}
        <TabsContent value="support">
          <MobileSectionShell title="WhatsApp Live Support" description="Support controls keep the storefront toggle, number, and default message easier to manage from a phone.">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <MessageCircle className="h-5 w-5 text-[#25D366]" />
                WhatsApp channel
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={settings.whatsapp_support?.enabled ?? false} onCheckedChange={(v) => update("whatsapp_support", "enabled", v)} />
                <Label>Show WhatsApp button on storefront</Label>
              </div>
              <div className="grid gap-2">
                <Label>WhatsApp Number</Label>
                <Input value={settings.whatsapp_support?.number ?? ""} onChange={(e) => update("whatsapp_support", "number", e.target.value)} placeholder="Include country code, digits only" />
                <p className="text-xs text-muted-foreground">Use the full number with country code and digits only.</p>
              </div>
              <div className="grid gap-2">
                <Label>Pre-filled message</Label>
                <Input value={settings.whatsapp_support?.message ?? ""} onChange={(e) => update("whatsapp_support", "message", e.target.value)} placeholder="Hi! I need help with my order." />
              </div>
              {settings.whatsapp_support?.enabled && settings.whatsapp_support?.number && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: "#25D366" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="h-5 w-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Button is live on storefront</p>
                    <p className="text-xs text-muted-foreground">Customers can click it to open WhatsApp</p>
                  </div>
                </div>
              )}
              <SaveButton settingKey="whatsapp_support" />
              <StickySectionSaveBar settingKey="whatsapp_support" title="WhatsApp support" hint="Save storefront support visibility and contact details." />
          </MobileSectionShell>
        </TabsContent>

        {/* About Page */}
        <TabsContent value="about">
          <Card className="border-border">
            <CardHeader><CardTitle>About Page</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input value={settings.about_page?.title ?? ""} onChange={(e) => update("about_page", "title", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Content (use new lines to separate paragraphs)</Label>
                <Textarea value={settings.about_page?.content ?? ""} onChange={(e) => update("about_page", "content", e.target.value)} rows={6} />
              </div>
              <SaveButton settingKey="about_page" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ Entries */}
        <TabsContent value="faq">
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>FAQ Entries</CardTitle>
                <Button variant="outline" size="sm" onClick={addFaq} className="gap-1"><Plus className="h-4 w-4" /> Add</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {faqEntries.length === 0 && <p className="text-sm text-muted-foreground">No FAQ entries yet.</p>}
              {faqEntries.map((faq, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">FAQ #{i + 1}</Label>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeFaq(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <div className="grid gap-2">
                    <Label>Question</Label>
                    <Input value={faq.q} onChange={(e) => updateFaq(i, "q", e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Answer</Label>
                    <Textarea value={faq.a} onChange={(e) => updateFaq(i, "a", e.target.value)} rows={2} />
                  </div>
                </div>
              ))}
              <SaveButton settingKey="faq_entries" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loyalty & Rewards */}
        <TabsContent value="loyalty">
          <Card className="border-border">
            <CardHeader><CardTitle>Loyalty Program</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-4">
                <Switch checked={settings.loyalty_settings?.enabled ?? false} onCheckedChange={(v) => update("loyalty_settings", "enabled", v)} />
                <Label>Enable Loyalty Program</Label>
              </div>
              <div className="grid gap-2">
                <Label>Point Currency Name</Label>
                <Input value={settings.loyalty_settings?.name ?? "Reward Points"} onChange={(e) => update("loyalty_settings", "name", e.target.value)} placeholder="e.g. Reward Points, Credits, Stars" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Earn Rate (Points per currency unit spent)</Label>
                  <Input type="number" step="0.01" value={settings.loyalty_settings?.earn_rate ?? 0.05} onChange={(e) => update("loyalty_settings", "earn_rate", parseFloat(e.target.value))} placeholder="0.05" />
                  <p className="text-xs text-muted-foreground">Example: 0.05 means customers earn 5 points for every 100 units of your store currency spent.</p>
                </div>
                <div className="grid gap-2">
                  <Label>Redemption Value (currency discount per point)</Label>
                  <Input type="number" step="0.01" value={settings.loyalty_settings?.redemption_value ?? 1} onChange={(e) => update("loyalty_settings", "redemption_value", parseFloat(e.target.value))} placeholder="1" />
                  <p className="text-xs text-muted-foreground">Example: 1 means 1 point gives a 1-unit discount in your store currency.</p>
                </div>
              </div>
              <SaveButton settingKey="loyalty_settings" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Page */}
        <TabsContent value="contact">
          <MobileSectionShell title="Contact Page" description="Contact details and map controls are sectioned for simpler mobile editing.">
              <div className="grid gap-2">
                <Label>Badge</Label>
                <Input value={settings.contact_page?.badge ?? ""} onChange={(e) => update("contact_page", "badge", e.target.value)} placeholder="Get in Touch" />
              </div>
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input value={settings.contact_page?.title ?? ""} onChange={(e) => update("contact_page", "title", e.target.value)} placeholder="Contact Us" />
              </div>
              <div className="grid gap-2">
                <Label>Intro text</Label>
                <Textarea value={settings.contact_page?.description ?? ""} onChange={(e) => update("contact_page", "description", e.target.value)} placeholder="Tell customers how to reach you." />
              </div>
              <div className="grid gap-2">
                <Label>Address</Label>
                <Input value={settings.contact_page?.address ?? ""} onChange={(e) => update("contact_page", "address", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input value={settings.contact_page?.phone ?? ""} onChange={(e) => update("contact_page", "phone", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={settings.contact_page?.email ?? ""} onChange={(e) => update("contact_page", "email", e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>WhatsApp</Label>
                <Input value={settings.contact_page?.whatsapp ?? ""} onChange={(e) => update("contact_page", "whatsapp", e.target.value)} placeholder="+8801..." />
              </div>
              <div className="grid gap-2">
                <Label>Form button label</Label>
                <Input value={settings.contact_page?.form_button_label ?? ""} onChange={(e) => update("contact_page", "form_button_label", e.target.value)} placeholder="Send Message" />
              </div>
              <div className="grid gap-2">
                <Label>Response time heading</Label>
                <Input value={settings.contact_page?.response_time_label ?? ""} onChange={(e) => update("contact_page", "response_time_label", e.target.value)} placeholder="Response Time" />
              </div>
              <div className="grid gap-2">
                <Label>Response time text</Label>
                <Textarea value={settings.contact_page?.response_time_text ?? ""} onChange={(e) => update("contact_page", "response_time_text", e.target.value)} placeholder="Usually within 1 business day." />
              </div>
              <div className="border-t border-border pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Switch checked={settings.contact_page?.map_enabled ?? false} onCheckedChange={(v) => update("contact_page", "map_enabled", v)} />
                  <Label>Show map on contact page</Label>
                </div>
                {settings.contact_page?.map_enabled && (
                  <div className="grid gap-2">
                    <Label>Google Maps Embed URL</Label>
                    <Input value={settings.contact_page?.map_embed_url ?? ""} onChange={(e) => update("contact_page", "map_embed_url", e.target.value)} placeholder="https://www.google.com/maps/embed?pb=..." />
                    <p className="text-xs text-muted-foreground">Go to Google Maps, choose Share, then Embed a map, and copy the <code className="bg-secondary px-1 rounded">src</code> URL.</p>
                    {settings.contact_page?.map_embed_url && (
                      <div className="mt-2 overflow-hidden rounded-lg border border-border">
                        <iframe src={settings.contact_page.map_embed_url} width="100%" height="200" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Map preview" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <SaveButton settingKey="contact_page" />
              <StickySectionSaveBar settingKey="contact_page" title="Contact page" hint="Save inquiry details and map visibility." />
          </MobileSectionShell>
        </TabsContent>

        {/* Footer */}
        <TabsContent value="footer">
          <MobileSectionShell title="Footer Settings" description="Footer sections are denser on mobile and keep save affordances within reach.">
              <MobileSectionJumper items={[
                { id: "footer-brand", label: "Brand" },
                { id: "footer-newsletter", label: "Newsletter" },
                { id: "footer-company-links", label: "Company" },
                { id: "footer-extra-links", label: "Extra Links" },
                { id: "footer-order", label: "Order" },
                { id: "footer-bottom", label: "Bottom" },
              ]} />
              {/* Brand */}
              <div id="footer-brand" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
                <h3 className="text-sm font-semibold text-foreground">Brand</h3>
                <div className="grid gap-2">
                  <Label>Brand Tagline (used in footer)</Label>
                  <Textarea value={settings.footer?.about_text ?? ""} placeholder="A clear, trusted summary of what your store offers." onChange={(e) => update("footer", "about_text", e.target.value)} rows={2} />
                </div>
                <div className="grid gap-2">
                  <Label>Tagline</Label>
                  <Textarea value={settings.footer?.about_text ?? ""} placeholder="A clear, trusted summary of what your store offers." onChange={(e) => update("footer", "about_text", e.target.value)} rows={2} />
                </div>
              </div>

              {/* Newsletter */}
              <div id="footer-newsletter" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
                <h3 className="text-sm font-semibold text-foreground">Newsletter</h3>
                <div className="grid gap-2">
                  <Label>Heading</Label>
                  <Input value={settings.footer?.newsletter_heading ?? ""} placeholder="Optional heading for updates or announcements" onChange={(e) => update("footer", "newsletter_heading", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input value={settings.footer?.newsletter_description ?? ""} placeholder="Optional note for updates, launches, or announcements." onChange={(e) => update("footer", "newsletter_description", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Subscribed Message</Label>
                  <Input value={settings.footer?.newsletter_subscribed ?? ""} placeholder="You're subscribed!" onChange={(e) => update("footer", "newsletter_subscribed", e.target.value)} />
                </div>
              </div>

              {/* Company Links */}
              <div id="footer-company-links" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Company Links</h3>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                    const links = settings.footer?.company_links ?? [];
                    setSettings((prev) => ({
                      ...prev,
                      footer: { ...prev.footer, company_links: [...links, { label: "", url: "" }] },
                    }));
                  }}>
                    <Plus className="h-4 w-4" /> Add Link
                  </Button>
                </div>
                {((settings.footer?.company_links as { label: string; url: string }[]) ?? []).map((link, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <Input value={link.label} placeholder="Label" onChange={(e) => {
                      const updated = [...(settings.footer?.company_links ?? [])];
                      updated[i] = { ...updated[i], label: e.target.value };
                      setSettings((prev) => ({ ...prev, footer: { ...prev.footer, company_links: updated } }));
                    }} />
                    <Input value={link.url} placeholder="/about" onChange={(e) => {
                      const updated = [...(settings.footer?.company_links ?? [])];
                      updated[i] = { ...updated[i], url: e.target.value };
                      setSettings((prev) => ({ ...prev, footer: { ...prev.footer, company_links: updated } }));
                    }} />
                    <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 text-destructive hover:text-destructive" onClick={() => {
                      const updated = (settings.footer?.company_links ?? []).filter((_: any, idx: number) => idx !== i);
                      setSettings((prev) => ({ ...prev, footer: { ...prev.footer, company_links: updated } }));
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Custom Links Column */}
              <div id="footer-extra-links" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Extra Links Column</h3>
                    <p className="text-xs text-muted-foreground">Optional additional links section</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                    const links = settings.footer?.extra_links ?? [];
                    setSettings((prev) => ({
                      ...prev,
                      footer: { ...prev.footer, extra_links: [...links, { label: "", url: "" }] },
                    }));
                  }}>
                    <Plus className="h-4 w-4" /> Add Link
                  </Button>
                </div>
                <div className="grid gap-2">
                  <Label>Column Title</Label>
                  <Input value={settings.footer?.extra_links_title ?? ""} placeholder="Quick Links" onChange={(e) => update("footer", "extra_links_title", e.target.value)} />
                </div>
                {((settings.footer?.extra_links as { label: string; url: string }[]) ?? []).map((link, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <Input value={link.label} placeholder="Label" onChange={(e) => {
                      const updated = [...(settings.footer?.extra_links ?? [])];
                      updated[i] = { ...updated[i], label: e.target.value };
                      setSettings((prev) => ({ ...prev, footer: { ...prev.footer, extra_links: updated } }));
                    }} />
                    <Input value={link.url} placeholder="/shop" onChange={(e) => {
                      const updated = [...(settings.footer?.extra_links ?? [])];
                      updated[i] = { ...updated[i], url: e.target.value };
                      setSettings((prev) => ({ ...prev, footer: { ...prev.footer, extra_links: updated } }));
                    }} />
                    <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 text-destructive hover:text-destructive" onClick={() => {
                      const updated = (settings.footer?.extra_links ?? []).filter((_: any, idx: number) => idx !== i);
                      setSettings((prev) => ({ ...prev, footer: { ...prev.footer, extra_links: updated } }));
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Section Order */}
              <div id="footer-order" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
                <h3 className="text-sm font-semibold text-foreground">Section Order</h3>
                <p className="text-xs text-muted-foreground">Drag to reorder footer columns. Use arrows to rearrange.</p>
                {(() => {
                  const sections: { id: string; label: string }[] = (settings.footer?.section_order ?? [
                    { id: "brand", label: "Brand & Tagline" },
                    { id: "shop", label: "Shop Links" },
                    { id: "company", label: "Company Links" },
                    { id: "newsletter", label: "Newsletter" },
                  ]);
                  return sections.map((section, i) => (
                    <div key={section.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm">{section.label}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0} onClick={() => {
                        const updated = [...sections];
                        [updated[i - 1], updated[i]] = [updated[i], updated[i - 1]];
                        setSettings((prev) => ({ ...prev, footer: { ...prev.footer, section_order: updated } }));
                      }}>Up</Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === sections.length - 1} onClick={() => {
                        const updated = [...sections];
                        [updated[i], updated[i + 1]] = [updated[i + 1], updated[i]];
                        setSettings((prev) => ({ ...prev, footer: { ...prev.footer, section_order: updated } }));
                      }}>Down</Button>
                    </div>
                  ));
                })()}
              </div>

              {/* Bottom Bar */}
              <div id="footer-bottom" className="space-y-3 scroll-mt-36 rounded-xl border border-border p-3">
                <h3 className="text-sm font-semibold text-foreground">Bottom Bar</h3>
                <div className="grid gap-2">
                  <Label>Payment Methods Text</Label>
                  <Input value={settings.footer?.payment_text ?? ""} placeholder="Optional note about accepted payment methods or checkout policies." onChange={(e) => update("footer", "payment_text", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Copyright Text</Label>
                  <Input value={settings.footer?.copyright ?? ""} placeholder="Optional copyright or legal footer text" onChange={(e) => update("footer", "copyright", e.target.value)} />
                </div>
              </div>

              {/* Show/hide Shop Links */}
              <div className="rounded-xl border border-border p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Switch checked={settings.footer?.show_shop_links ?? true} onCheckedChange={(v) => update("footer", "show_shop_links", v)} />
                  <Label>Show Shop Category Links</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={settings.footer?.show_newsletter ?? true} onCheckedChange={(v) => update("footer", "show_newsletter", v)} />
                  <Label>Show Newsletter Section</Label>
                </div>
              </div>

              <SaveButton settingKey="footer" />
              <StickySectionSaveBar settingKey="footer" title="Footer settings" hint="Save footer copy, columns, and visibility toggles." />
          </MobileSectionShell>
        </TabsContent>

        <TabsContent value="page_builder">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PanelsTopLeft className="h-5 w-5 text-primary" />
                Page Builder
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Manage storefront pages in the dedicated builder.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Site Settings is for global store configuration. Pages, homepage blocks, SEO, revisions, and live preview now live in Page Builder.
                </p>
              </div>
              {pageBuilderEnabled ? (
                <Button asChild className="gap-2">
                  <Link to="/admin/page-builder">
                    <PanelsTopLeft className="h-4 w-4" />
                    Open Page Builder
                  </Link>
                </Button>
              ) : null}
              {!pageBuilderEnabled ? (
                <p className="text-xs text-muted-foreground">Page Builder is not enabled for this store package.</p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="domain">
          <CustomDomainTab />
        </TabsContent>
        <TabsContent value="notifications">
          <MobileSectionShell title="Transactional Notifications" description="Notification credentials and recent delivery events stay easier to scan and save on long mobile forms.">
              <MobileSectionJumper items={[
                { id: "notifications-email", label: "Email" },
                { id: "notifications-sms", label: "SMS" },
                { id: "notifications-events", label: "Events" },
              ]} />
              <div id="notifications-email" className="space-y-4 scroll-mt-36">
                <h3 className="text-sm font-semibold text-foreground">Email Notifications</h3>
                <p className="text-xs text-muted-foreground">Automatically send emails to your customers and yourself.</p>
                <div className="flex items-center gap-2">
                  <Switch checked={settings.notification_settings?.email_receipts ?? true} onCheckedChange={(v) => update("notification_settings", "email_receipts", v)} />
                  <Label>Send Order Receipts to Customers</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={settings.notification_settings?.email_alerts ?? true} onCheckedChange={(v) => update("notification_settings", "email_alerts", v)} />
                  <Label>Send New Order Alerts to Me (Store Owner)</Label>
                </div>
              </div>

              <div id="notifications-sms" className="border-t border-border pt-4 mt-2 space-y-4 scroll-mt-36">
                <h3 className="text-sm font-semibold text-foreground">SMS Notifications (GreenWeb)</h3>
                <p className="text-xs text-muted-foreground">Send SMS to customers. Provide your GreenWeb SMS API key.</p>
                <div className="flex items-center gap-2">
                  <Switch checked={settings.notification_settings?.sms_enabled ?? false} onCheckedChange={(v) => update("notification_settings", "sms_enabled", v)} />
                  <Label>Enable SMS Notifications</Label>
                </div>
                {settings.notification_settings?.sms_enabled && (
                  <div className="grid gap-4 mt-2 border border-primary/20 rounded-md p-4 bg-primary/5">
                    <div className="grid gap-2">
                      <Label>GreenWeb API Token</Label>
                      <Input type="password" value={settings.notification_settings?.sms_api_key ?? ""} onChange={(e) => update("notification_settings", "sms_api_key", e.target.value)} placeholder="Enter Token" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Order Received Template</Label>
                      <Input value={settings.notification_settings?.sms_template_received ?? "Hi {customer_name}, your order #{order_id} is confirmed!"} onChange={(e) => update("notification_settings", "sms_template_received", e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Order Shipped Template</Label>
                      <Input value={settings.notification_settings?.sms_template_shipped ?? "Hi {customer_name}, your order #{order_id} has been shipped!"} onChange={(e) => update("notification_settings", "sms_template_shipped", e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              <div id="notifications-events" className="border-t border-border pt-4 mt-2 space-y-4 scroll-mt-36">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Recent Delivery Events</h3>
                  <p className="text-xs text-muted-foreground">Latest email and SMS delivery attempts for this store.</p>
                </div>
                {notificationEventsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading delivery events...
                  </div>
                ) : notificationEvents && notificationEvents.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-border">
                    {notificationEvents.map((event: any) => (
                      <div key={event.id} className="flex flex-col gap-2 border-b border-border p-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{event.template_name}</span>
                            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase text-muted-foreground">{event.channel}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] uppercase ${
                              event.status === "sent"
                                ? "bg-green-500/10 text-green-500"
                                : event.status === "failed"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-yellow-500/10 text-yellow-500"
                            }`}>
                              {event.status}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {event.recipient || "No recipient"}{event.provider ? ` via ${event.provider}` : ""}
                          </p>
                          {event.error ? <p className="mt-1 truncate text-xs text-destructive">{event.error}</p> : null}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                    No delivery events yet.
                  </div>
                )}
              </div>

              <SaveButton settingKey="notification_settings" />
              <StickySectionSaveBar settingKey="notification_settings" title="Notification settings" hint="Save receipt, alert, and SMS delivery configuration." />
          </MobileSectionShell>
        </TabsContent>
      </div>
      </Tabs>
    </div>
  );

};

export default SiteSettings;


