"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Plus,
  Save,
  ArrowUp,
  ArrowDown,
  Trash2,
  RefreshCcw,
  LayoutTemplate,
  Eye,
  EyeOff,
  History,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Import,
  Layers3,
  Monitor,
  PanelRightClose,
  PanelRightOpen,
  PanelsTopLeft,
  Smartphone,
  Store as StoreIcon,
  Redo2,
  Undo2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Code2,
  ClipboardCopy,
  Rocket,
  MapPin,
  ShoppingBag,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { useStoreEntitlements } from "@/hooks/useStoreEntitlements";
import { supabase } from "@/integrations/supabase/client";
import { Link, useLocation, useSearchParams } from "@/lib/react-router-dom-shim";
import { buildPageBuilderPath, withStoreId } from "@/lib/admin-paths";
import {
  DEFAULT_STORE_CURRENCY_CODE,
  DEFAULT_STORE_DESCRIPTION,
  DEFAULT_STORE_LOCALE,
} from "@/lib/cms/default-store";
import { createDefaultCmsPage, reservedCmsSlugs } from "@/lib/cms/block-library";
import { instantiateStorePagesFromBlueprint } from "@/lib/cms/blueprint-pages";
import { createRegistryDefaultBlock, fallbackBlockRegistry, getCmsBlockRegistryItem, loadBlockRegistry, type CmsBlockRegistryItem } from "@/lib/cms/block-registry";
import { applyLegacyHomepageSettingsToPages, type SiteSettingRecord } from "@/lib/cms/homepage-settings-adapter";
import { applyPageBlueprint, fallbackPageBlueprints, instantiatePageBlueprint, loadPageBlueprints, type CmsPageBlueprint } from "@/lib/cms/page-blueprints";
import { storeSchema, type Store, type StorePage, type StorePageBlock } from "@/lib/cms/schema";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { cn } from "@/lib/utils";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontBlockRenderer } from "@/components/storefront/StorefrontBlockRenderer";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import { sanitizeStoreBlocks, sanitizeStorePage, validateStoreForPersistence } from "@/lib/cms/validation";
import { getFeatureEnabled } from "@/lib/platform/control-plane";
import { buildBlueprintSiteSettingsEntries, fallbackStoreBlueprints, loadStoreBlueprints, resolveStoreBlueprint, type StoreBlueprintDefinition } from "@/lib/cms/store-blueprints";
import { isThemePackageReferenceMissing, resolveThemePackageById, fallbackThemePackages, loadThemePackages, type ThemePackageDefinition } from "@/lib/theme-packages";
import AdminRecoveryPanel from "@/components/admin/AdminRecoveryPanel";
import { persistStorefrontState } from "@/lib/cms/store-persistence";
import { GUIDED_THEME_TOKENS, hexToHslChannels, hslChannelsToHex, resolveStoreThemeVars } from "@/lib/cms/store-theme-utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type StoreRecord = {
  id: string;
  name: string;
  slug: string;
  custom_domain?: string | null;
  description: string | null;
  currency_code: string | null;
  locale: string | null;
  is_published: boolean | null;
  store_type?: string | null;
};

type ThemeRecord = {
  preset_id: string | null;
  theme_package_id?: string | null;
  theme_package_version?: number | null;
  mode: "light" | "dark" | null;
  typography: Record<string, unknown> | null;
  components: Record<string, unknown> | null;
  colors: Record<string, string> | null;
  custom_css?: string | null;
  resolved_tokens?: Record<string, Record<string, string>> | null;
};

type PageRecord = {
  id: string;
  slug: string;
  title: string;
  seo_title: string | null;
  seo_description: string | null;
  is_homepage: boolean | null;
};

type BlockRecord = {
  id: string;
  page_id: string;
  block_type: StorePageBlock["type"];
  props: Record<string, unknown> | null;
  sort_order: number | null;
  is_visible: boolean | null;
};

type BusinessProfileRecord = {
  blueprint_id: string | null;
  blueprint_version?: number | null;
  business_family: string | null;
  catalog_mode: string | null;
};

type RecoverableDraft = {
  snapshot: string;
  updatedAt: string;
};

type BasicGuideStep = "basics" | "homepage" | "product" | "checkout" | "custom" | "launch";

const STORE_LAYOUT_PACKAGE_SCHEMA = "ecomcms.storefront-layout.v1";

type StoreLayoutPackage = {
  schema: typeof STORE_LAYOUT_PACKAGE_SCHEMA;
  exportedAt: string;
  source: {
    storeName: string;
    storeSlug: string;
    blueprintId: string;
  };
  layout: {
    description: string;
    theme: Store["theme"];
    pages: StorePage[];
  };
};

type AdvancedCodePanel = "page-json" | "block-json" | "theme-css" | "layout";

function serializeStoreDraft(store: Store): string {
  return JSON.stringify(store);
}

function getDraftStorageKey(storeId: string | null | undefined): string {
  return storeId ? `commerce-engine-cms-draft:${storeId}` : "";
}

function readRecoverableDraft(key: string): RecoverableDraft | null {
  if (!key || typeof window === "undefined") return null;

  try {
    const rawDraft = window.localStorage.getItem(key);
    if (!rawDraft) return null;

    const parsed = JSON.parse(rawDraft) as Partial<RecoverableDraft>;
    if (typeof parsed.snapshot !== "string" || typeof parsed.updatedAt !== "string") {
      return null;
    }

    return {
      snapshot: parsed.snapshot,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function cloneHomepageBlocksForBlueprint(
  blueprintId: string,
  pageBlueprints: CmsPageBlueprint[] = fallbackPageBlueprints,
): StorePageBlock[] {
  const seededPages = instantiateStorePagesFromBlueprint(blueprintId, pageBlueprints);
  const homepage = seededPages.find((page) => page.isHomepage) ?? createDefaultCmsPage(0);

  return homepage.blocks.map((block, index) => ({
    ...block,
    id: crypto.randomUUID(),
    sortOrder: index,
  }));
}

function mapRecordsToStore(
  store: StoreRecord,
  businessProfile: BusinessProfileRecord | null,
  theme: ThemeRecord | null,
  pages: PageRecord[],
  blocks: BlockRecord[],
  siteSettings: SiteSettingRecord[],
  blueprints: StoreBlueprintDefinition[] = [],
  themePackages: ThemePackageDefinition[] = fallbackThemePackages,
  pageBlueprints: CmsPageBlueprint[] = fallbackPageBlueprints,
): Store {
  const blueprint = resolveStoreBlueprint(
    businessProfile?.blueprint_id ?? store.store_type ?? "general-catalog",
    blueprints,
  );
  const fallbackTheme = resolveThemePackageById(
    theme?.theme_package_id,
    themePackages,
    theme?.preset_id ?? blueprint.defaultTheme.presetId,
  );

  return storeSchema.parse({
    id: store.id,
    name: store.name,
    slug: store.slug,
    customDomain: store.custom_domain ?? undefined,
    description: store.description ?? blueprint.storeDescription ?? DEFAULT_STORE_DESCRIPTION,
    currencyCode: store.currency_code ?? DEFAULT_STORE_CURRENCY_CODE,
    locale: store.locale ?? DEFAULT_STORE_LOCALE,
    isPublished: store.is_published ?? false,
    theme: {
      presetId: theme?.preset_id ?? fallbackTheme.presetId,
      themePackageId: theme?.theme_package_id ?? fallbackTheme.id,
      mode: theme?.mode ?? blueprint.defaultTheme.mode,
      headingFont: typeof theme?.typography?.headingFont === "string" ? theme.typography.headingFont : (fallbackTheme.tokens.typography.headingFont ?? blueprint.defaultTheme.headingFont),
      bodyFont: typeof theme?.typography?.bodyFont === "string" ? theme.typography.bodyFont : (fallbackTheme.tokens.typography.bodyFont ?? blueprint.defaultTheme.bodyFont),
      borderRadius: typeof theme?.components?.borderRadius === "string" ? theme.components.borderRadius : (fallbackTheme.tokens.components.borderRadius ?? blueprint.defaultTheme.borderRadius),
      customCssVars: theme?.colors ?? theme?.resolved_tokens?.[theme?.mode ?? blueprint.defaultTheme.mode] ?? fallbackTheme.tokens[theme?.mode ?? blueprint.defaultTheme.mode],
      customCss: theme?.custom_css ?? fallbackTheme.customCss,
    },
    pages:
      pages.length > 0
        ? applyLegacyHomepageSettingsToPages(
            pages
              .map((page) =>
                sanitizeStorePage({
                  id: page.id,
                  slug: page.slug,
                  title: page.title,
                  seoTitle: page.seo_title ?? "",
                  seoDescription: page.seo_description ?? "",
                  isHomepage: page.is_homepage ?? false,
                  blocks: blocks
                    .filter((block) => block.page_id === page.id)
                    .map((block) => ({
                      id: block.id,
                      type: block.block_type,
                      sortOrder: block.sort_order ?? 0,
                      isVisible: block.is_visible ?? true,
                      props: block.props ?? {},
                    })),
                }),
              )
              .filter((page): page is StorePage => Boolean(page)),
            siteSettings,
          )
        : instantiateStorePagesFromBlueprint(blueprint, pageBlueprints),
  });
}

function getBlueprintBootstrapStoreName(blueprintId: string) {
  const blueprint = resolveStoreBlueprint(blueprintId);
  return `${blueprint.shortName} Store`;
}

export default function CmsPagesManager() {
  const { user, role , activeStoreId} = useAuth();
  const { data: entitlements } = useStoreEntitlements(activeStoreId);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [store, setStore] = useState<Store | null>(null);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const [nextBlockType, setNextBlockType] = useState<StorePageBlock["type"]>("rich-text");
  const [blockRegistry, setBlockRegistry] = useState<CmsBlockRegistryItem[]>(fallbackBlockRegistry);
  const [storeBlueprints, setStoreBlueprints] = useState<StoreBlueprintDefinition[]>(fallbackStoreBlueprints);
  const [pageBlueprints, setPageBlueprints] = useState<CmsPageBlueprint[]>(fallbackPageBlueprints);
  const [themePackages, setThemePackages] = useState<ThemePackageDefinition[]>(fallbackThemePackages);
  const [newPageTemplate, setNewPageTemplate] = useState(fallbackPageBlueprints[0]?.id ?? "landing");
  const [activeTemplateId, setActiveTemplateId] = useState(fallbackPageBlueprints[0]?.id ?? "landing");
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");
  const [revisionLabel, setRevisionLabel] = useState("");
  const [revisions, setRevisions] = useState<Array<{ id: string; created_at: string; revision_label: string; blocks_snapshot: StorePageBlock[] }>>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [activeAdvancedCodePanel, setActiveAdvancedCodePanel] = useState<AdvancedCodePanel>("page-json");
  const [advancedPageJsonDraft, setAdvancedPageJsonDraft] = useState("");
  const [advancedSelectedBlockJsonDraft, setAdvancedSelectedBlockJsonDraft] = useState("");
  const [advancedThemeCssDraft, setAdvancedThemeCssDraft] = useState("");
  const [persistedSnapshot, setPersistedSnapshot] = useState("");
  const [recoverableDraft, setRecoverableDraft] = useState<RecoverableDraft | null>(null);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<Date | null>(null);
  const [undoStack, setUndoStack] = useState<Store[]>([]);
  const [redoStack, setRedoStack] = useState<Store[]>([]);
  const [basicGuideStep, setBasicGuideStep] = useState<BasicGuideStep>("basics");
  const [isActionDockMinimized, setIsActionDockMinimized] = useState(false);
  const [desktopPreviewMode, setDesktopPreviewMode] = useState<"side" | "below" | "minimized" | "hidden">("side");
  const [desktopPreviewSide, setDesktopPreviewSide] = useState<"left" | "right">("right");
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const [storeBlueprintId, setStoreBlueprintId] = useState("general-catalog");
  const [installedThemePackageVersion, setInstalledThemePackageVersion] = useState<number | null>(null);
  const [installedBlueprintVersion, setInstalledBlueprintVersion] = useState<number | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<"store" | "theme" | "pages" | "info">("pages");
  const layoutImportInputRef = useRef<HTMLInputElement | null>(null);
  const requestedPageId = searchParams.get("page");
  const requestedBlockId = searchParams.get("block") ?? "";
  const returnTo = searchParams.get("returnTo");
  const builderMode = location.pathname.includes("/advanced") ? "advanced" : "basic";
  const isAdvancedEditor = builderMode === "advanced";
  const basicEditorHref = buildPageBuilderPath("basic", {
    pageId: requestedPageId,
    blockId: requestedBlockId || null,
    returnTo,
    storeId: activeStoreId,
  });
  const advancedEditorHref = buildPageBuilderPath("advanced", {
    pageId: requestedPageId,
    blockId: requestedBlockId || null,
    returnTo,
    storeId: activeStoreId,
  });
  const pageBlueprintsEnabled = getFeatureEnabled(entitlements?.featureMap, "cms_pages", true);
  const themePresetsEnabled = getFeatureEnabled(entitlements?.featureMap, "theme_presets", true);
  const draftStorageKey = useMemo(() => getDraftStorageKey(activeStoreId), [activeStoreId]);
  const pushHistoryLimit = 20;
  const activeBlueprint = useMemo(
    () => resolveStoreBlueprint(storeBlueprintId, storeBlueprints),
    [storeBlueprintId, storeBlueprints],
  );
  const availablePageBlueprints = useMemo(
    () =>
      pageBlueprints.filter(
        (template) =>
          template.businessFamily === activeBlueprint.businessFamily
          && template.catalogModes.includes(activeBlueprint.catalogMode),
      ),
    [activeBlueprint, pageBlueprints],
  );
  const availableBlockRegistry = useMemo(
    () =>
      blockRegistry.filter(
        (block) =>
          block.compatibleBusinessFamilies.includes(activeBlueprint.businessFamily)
          && block.requiredCapabilities.every((capability) => activeBlueprint.capabilities.includes(capability)),
      ),
    [activeBlueprint, blockRegistry],
  );
  const isMissingThemeReference = useMemo(
    () => Boolean(store?.theme.themePackageId) && isThemePackageReferenceMissing(store?.theme.themePackageId ?? null, themePackages),
    [store?.theme.themePackageId, themePackages],
  );
  const resolvedEditorThemePackage = useMemo(
    () => (store ? resolveThemePackageById(store.theme.themePackageId, themePackages, store.theme.presetId) : null),
    [store, themePackages],
  );
  const hasThemeVersionUpdate = useMemo(
    () =>
      Boolean(resolvedEditorThemePackage)
      && typeof installedThemePackageVersion === "number"
      && typeof resolvedEditorThemePackage?.version === "number"
      && installedThemePackageVersion < resolvedEditorThemePackage.version,
    [installedThemePackageVersion, resolvedEditorThemePackage],
  );
  const hasBlueprintVersionUpdate = useMemo(
    () =>
      typeof installedBlueprintVersion === "number"
      && installedBlueprintVersion < 1,
    [installedBlueprintVersion],
  );

  const commitStoreChange = useCallback((
    updater: Store | null | ((current: Store | null) => Store | null),
    options?: { trackHistory?: boolean; resetHistory?: boolean },
  ) => {
    const trackHistory = options?.trackHistory ?? true;
    const resetHistory = options?.resetHistory ?? false;

    setStore((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;

      if (resetHistory) {
        setUndoStack([]);
        setRedoStack([]);
        return next;
      }

      if (
        trackHistory
        && current
        && next
        && serializeStoreDraft(current) !== serializeStoreDraft(next)
      ) {
        setUndoStack((existing) => {
          const snapshot = [...existing, current];
          return snapshot.length > pushHistoryLimit ? snapshot.slice(snapshot.length - pushHistoryLimit) : snapshot;
        });
        setRedoStack([]);
      }

      return next;
    });
  }, []);

  const loadStore = useCallback(async () => {
    setLoading(true);
    if (!activeStoreId) {
      commitStoreChange(null, { trackHistory: false, resetHistory: true });
      setInstalledThemePackageVersion(null);
      setInstalledBlueprintVersion(null);
      setSelectedPageId("");
      setPersistedSnapshot("");
      setRecoverableDraft(null);
      setLastDraftSavedAt(null);
      setLoading(false);
      return;
    }

    try {
      const storeResponse = await supabase
        .from("stores")
        .select("id, name, slug, custom_domain, description, currency_code, locale, is_published, store_type")
        .eq("id", activeStoreId as string)
        .maybeSingle();

      const storeRecord = storeResponse.data as StoreRecord | null;

      if (!storeRecord) {
        commitStoreChange(null, { trackHistory: false, resetHistory: true });
        setInstalledThemePackageVersion(null);
        setInstalledBlueprintVersion(null);
        setSelectedPageId("");
        setPersistedSnapshot("");
        setRecoverableDraft(null);
        setLastDraftSavedAt(null);
        return;
      }

      const [
        businessProfileResponse,
        themeResponse,
        pagesResponse,
        blocksResponse,
        siteSettingsResponse,
        loadedBlueprints,
        loadedPageBlueprints,
        loadedThemePackages,
      ] = await Promise.all([
        supabase
          .from("store_business_profiles")
          .select("blueprint_id, blueprint_version, business_family, catalog_mode")
          .eq("store_id", storeRecord.id)
          .maybeSingle(),
        supabase.from("store_themes").select("preset_id, theme_package_id, theme_package_version, mode, typography, components, colors, custom_css, resolved_tokens").eq("store_id", storeRecord.id).maybeSingle(),
        supabase.from("store_pages").select("id, slug, title, seo_title, seo_description, is_homepage").eq("store_id", storeRecord.id).order("slug"),
        supabase.from("store_page_blocks").select("id, page_id, block_type, props, sort_order, is_visible").eq("store_id", storeRecord.id).order("sort_order"),
        supabase.from("site_settings").select("key, value").eq("store_id", storeRecord.id).in("key", ["hero_section", "promo_banner", "home_featured", "home_categories"]),
        loadStoreBlueprints(supabase),
        loadPageBlueprints(supabase),
        loadThemePackages(supabase, storeRecord.id),
      ]);

      const businessProfile = (businessProfileResponse.data as BusinessProfileRecord | null) ?? null;

      const parsedStore = mapRecordsToStore(
        storeRecord,
        businessProfile,
        (themeResponse.data as ThemeRecord | null) ?? null,
        (pagesResponse.data as PageRecord[] | null) ?? [],
        (blocksResponse.data as BlockRecord[] | null) ?? [],
        (siteSettingsResponse.data as SiteSettingRecord[] | null) ?? [],
        loadedBlueprints,
        loadedThemePackages,
        loadedPageBlueprints,
      );

      setStoreBlueprints(loadedBlueprints);
      setPageBlueprints(loadedPageBlueprints);
      setThemePackages(loadedThemePackages);
      setStoreBlueprintId(businessProfile?.blueprint_id ?? storeRecord.store_type ?? "general-catalog");
      setInstalledBlueprintVersion(typeof businessProfile?.blueprint_version === "number" ? businessProfile.blueprint_version : null);
      commitStoreChange(parsedStore, { trackHistory: false, resetHistory: true });
      setInstalledThemePackageVersion(typeof (themeResponse.data as ThemeRecord | null)?.theme_package_version === "number"
        ? (themeResponse.data as ThemeRecord).theme_package_version ?? null
        : null);
      setPersistedSnapshot(serializeStoreDraft(parsedStore));
      setLastDraftSavedAt(null);
      setSelectedPageId((current) => {
        if (requestedPageId && parsedStore.pages.some((page) => page.id === requestedPageId)) {
          return requestedPageId;
        }

        return current || parsedStore.pages[0]?.id || "";
      });
      setSelectedBlockId(requestedBlockId);
    } catch (error) {
      console.error("Failed to load CMS store workspace:", error);
      toast.error("Failed to refresh the page builder workspace. Please try again.");
      commitStoreChange(null, { trackHistory: false, resetHistory: true });
      setInstalledThemePackageVersion(null);
      setInstalledBlueprintVersion(null);
    } finally {
      setLoading(false);
    }
  }, [activeStoreId, commitStoreChange, requestedBlockId, requestedPageId]);

  const currentSnapshot = useMemo(() => (store ? serializeStoreDraft(store) : ""), [store]);
  const hasUnsavedChanges = Boolean(store && persistedSnapshot && currentSnapshot !== persistedSnapshot);

  useEffect(() => {
    if (role !== "admin") return;
    void loadStore();
  }, [loadStore, role]);

  useEffect(() => {
    setSelectedPageId("");
    setSelectedBlockId("");
    setRevisions([]);
    setLoadingRevisions(false);
    setRevisionLabel("");
    setIsMobileSettingsOpen(false);
    setPreviewViewport("desktop");
    setInstalledThemePackageVersion(null);
    setInstalledBlueprintVersion(null);
    setPersistedSnapshot("");
    setRecoverableDraft(null);
    setLastDraftSavedAt(null);
    setDesktopPreviewMode("side");
    setDesktopPreviewSide("right");
    setIsMobilePreviewOpen(false);
  }, [activeStoreId]);

  useEffect(() => {
    if (role !== "admin") return;

    const loadSharedLibraries = async () => {
      const [loadedPageBlueprints, registry, loadedThemePackages] = await Promise.all([
        loadPageBlueprints(supabase),
        loadBlockRegistry(supabase),
        loadThemePackages(supabase, activeStoreId),
      ]);
      setPageBlueprints(loadedPageBlueprints);
      setBlockRegistry(registry);
      setThemePackages(loadedThemePackages);
    };

    void loadSharedLibraries();
  }, [activeStoreId, role]);

  useEffect(() => {
    if (!availablePageBlueprints.some((template) => template.id === newPageTemplate)) {
      setNewPageTemplate(availablePageBlueprints[0]?.id ?? "landing");
    }
  }, [availablePageBlueprints, newPageTemplate]);

  useEffect(() => {
    if (!availablePageBlueprints.some((template) => template.id === activeTemplateId)) {
      setActiveTemplateId(availablePageBlueprints[0]?.id ?? "landing");
    }
  }, [activeTemplateId, availablePageBlueprints]);

  useEffect(() => {
    if (!availableBlockRegistry.some((block) => block.value === nextBlockType)) {
      setNextBlockType(availableBlockRegistry[0]?.value ?? "rich-text");
    }
  }, [availableBlockRegistry, nextBlockType]);

  useEffect(() => {
    if (!draftStorageKey || !persistedSnapshot) {
      setRecoverableDraft(null);
      return;
    }

    const draft = readRecoverableDraft(draftStorageKey);
    setRecoverableDraft(draft && draft.snapshot !== persistedSnapshot ? draft : null);
  }, [draftStorageKey, persistedSnapshot]);

  useEffect(() => {
    if (!draftStorageKey || !store || !hasUnsavedChanges) return;

    setRecoverableDraft(null);
    const timeout = window.setTimeout(() => {
      const updatedAt = new Date().toISOString();
      window.localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          snapshot: currentSnapshot,
          updatedAt,
        } satisfies RecoverableDraft),
      );
      setLastDraftSavedAt(new Date(updatedAt));
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [currentSnapshot, draftStorageKey, hasUnsavedChanges, store]);

  const selectedPage = useMemo(
    () => store?.pages.find((page) => page.id === selectedPageId) ?? null,
    [store, selectedPageId],
  );

  const selectedBlock = useMemo(
    () => selectedPage?.blocks.find((block) => block.id === selectedBlockId) ?? selectedPage?.blocks[0] ?? null,
    [selectedBlockId, selectedPage],
  );

  useEffect(() => {
    if (!store) return;

    if (requestedPageId && store.pages.some((page) => page.id === requestedPageId) && requestedPageId !== selectedPageId) {
      setSelectedPageId(requestedPageId);
    }

    setSelectedBlockId(requestedBlockId);
  }, [requestedBlockId, requestedPageId, selectedPageId, store]);

  useEffect(() => {
    if (!selectedBlockId) return;

    const element = document.getElementById(`cms-block-${selectedBlockId}`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedBlockId, selectedPageId]);

  useEffect(() => {
    if (!selectedBlockId) return;

    const element = document.getElementById(`cms-preview-block-${selectedBlockId}`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedBlockId, selectedPageId]);

  useEffect(() => {
    if (!selectedPage || selectedPage.blocks.length === 0) {
      if (selectedBlockId) {
        setSelectedBlockId("");
      }
      return;
    }

    if (!selectedPage.blocks.some((block) => block.id === selectedBlockId)) {
      setSelectedBlockId(selectedPage.blocks[0]?.id ?? "");
    }
  }, [selectedBlockId, selectedPage]);

  useEffect(() => {
    if (!selectedPageId) {
      setRevisions([]);
      return;
    }

    const loadRevisions = async () => {
      setLoadingRevisions(true);
      const { data } = await supabase
        .from("store_page_revisions")
        .select("id, created_at, revision_label, blocks_snapshot")
        .eq("page_id", selectedPageId)
        .order("created_at", { ascending: false })
        .limit(8);

      setRevisions(
        (((data as Array<{ id: string; created_at: string; revision_label: string; blocks_snapshot: unknown[] }> | null) ?? [])
          .map((revision) => ({
            ...revision,
            blocks_snapshot: sanitizeStoreBlocks(Array.isArray(revision.blocks_snapshot) ? revision.blocks_snapshot : []),
          }))
          .filter((revision) => revision.blocks_snapshot.length > 0)),
      );
      setLoadingRevisions(false);
    };

    void loadRevisions();
  }, [selectedPageId]);

  const updateSelectedPage = (updater: (page: StorePage) => StorePage) => {
    commitStoreChange((current) => {
      if (!current) return current;
      return {
        ...current,
        pages: current.pages.map((page) => (page.id === selectedPageId ? updater(page) : page)),
      };
    });
  };

  const updateStoreTheme = (patch: Partial<Store["theme"]>) => {
    commitStoreChange((current) => {
      if (!current) return current;
      return {
        ...current,
        theme: {
          ...current.theme,
          ...patch,
        },
      };
    });
  };

  const bootstrapDefaultStore = async () => {
    if (!user) {
      toast.error("You need to be signed in as admin.");
      return;
    }

    if (!activeStoreId) {
      toast.error("Select a store before initializing the storefront workspace.");
      return;
    }

    setBootstrapping(true);

    const blueprint = resolveStoreBlueprint(storeBlueprintId, storeBlueprints);
    const seedPages = instantiateStorePagesFromBlueprint(blueprint.id, pageBlueprints);
    const themePackage = resolveThemePackageById(blueprint.defaultTheme.presetId, themePackages, blueprint.defaultTheme.presetId);

    const { error: storeError } = await supabase.from("stores").upsert(
      {
        id: activeStoreId as string,
        owner_id: user.id,
        name: store?.name ?? getBlueprintBootstrapStoreName(blueprint.id),
        slug: store?.slug ?? `store-${String(activeStoreId).slice(0, 8)}`,
        description: blueprint.storeDescription,
        currency_code: "BDT",
        locale: "en-BD",
        is_published: false,
        store_type: blueprint.id,
      },
      { onConflict: "slug" },
    );

    if (storeError) {
      toast.error("Failed to initialize the storefront workspace.");
      setBootstrapping(false);
      return;
    }

    await supabase.from("store_themes").upsert(
      {
        store_id: activeStoreId as string,
        preset_id: themePackage.presetId,
        mode: blueprint.defaultTheme.mode,
        theme_package_id: themePackage.id,
        theme_package_version: themePackage.version,
        colors: themePackage.tokens[blueprint.defaultTheme.mode] ?? {},
        typography: {
          headingFont: blueprint.defaultTheme.headingFont,
          bodyFont: blueprint.defaultTheme.bodyFont,
        },
        components: {
          borderRadius: blueprint.defaultTheme.borderRadius,
        },
        resolved_tokens: {
          light: themePackage.tokens.light,
          dark: themePackage.tokens.dark,
        },
        custom_css: themePackage.customCss ?? null,
      },
      { onConflict: "store_id" },
    );

    for (const page of seedPages) {
      await supabase.from("store_pages").upsert(
        {
          id: page.id,
          store_id: activeStoreId as string,
          slug: page.slug,
          title: page.title,
          seo_title: page.seoTitle ?? null,
          seo_description: page.seoDescription ?? null,
          is_homepage: page.isHomepage,
        },
        { onConflict: "id" },
      );

      if (page.blocks.length > 0) {
        await supabase.from("store_page_blocks").upsert(
          page.blocks.map((block) => ({
            id: block.id,
            page_id: page.id,
            store_id: activeStoreId as string,
            block_type: block.type as any,
            props: block.props as any,
            sort_order: block.sortOrder,
            is_visible: block.isVisible,
          })),
          { onConflict: "id" },
        );
      }
    }

    await supabase.from("store_business_profiles").upsert(
      {
        store_id: activeStoreId as string,
        blueprint_id: blueprint.id,
        blueprint_version: 1,
        business_family: blueprint.businessFamily,
        catalog_mode: blueprint.catalogMode,
        enabled_modules: blueprint.capabilities,
      },
      { onConflict: "store_id" },
    );

    const siteSettingsRows = buildBlueprintSiteSettingsEntries(blueprint).map((entry) => ({
      store_id: activeStoreId as string,
      key: entry.key,
      value: entry.value,
    }));

    if (siteSettingsRows.length > 0) {
      const { error: siteSettingsError } = await supabase
        .from("site_settings")
        .upsert(siteSettingsRows, { onConflict: "store_id,key" });

      if (siteSettingsError) {
        toast.error("Failed to seed blueprint site settings.");
        setBootstrapping(false);
        return;
      }
    }

    toast.success("Storefront workspace is ready.");
    setBootstrapping(false);
    await loadStore();
  };

  const addPage = () => {
    commitStoreChange((current) => {
      if (!current) return current;
      const page = pageBlueprintsEnabled
        ? instantiatePageBlueprint(newPageTemplate, current.pages.length, availablePageBlueprints) ?? createDefaultCmsPage(current.pages.length)
        : createDefaultCmsPage(current.pages.length);
      setSelectedPageId(page.id);
      return { ...current, pages: [...current.pages, page] };
    });
  };

  const duplicatePage = (pageId: string) => {
    commitStoreChange((current) => {
      if (!current) return current;
      const sourcePage = current.pages.find((page) => page.id === pageId);
      if (!sourcePage) return current;

      const duplicateIndex = current.pages.length + 1;
      const duplicatedPage: StorePage = {
        ...sourcePage,
        id: crypto.randomUUID(),
        title: `${sourcePage.title} Copy`,
        slug: sourcePage.slug === "/" ? `/page-${duplicateIndex}` : `${sourcePage.slug}-copy`,
        isHomepage: false,
        blocks: sourcePage.blocks.map((block, index) => ({
          ...block,
          id: crypto.randomUUID(),
          sortOrder: index,
        })),
      };

      setSelectedPageId(duplicatedPage.id);
      return { ...current, pages: [...current.pages, duplicatedPage] };
    });
  };

  const applyTemplate = (templateId: string) => {
    if (!pageBlueprintsEnabled) {
      toast.error("Page blueprints are not enabled for this store.");
      return;
    }
    updateSelectedPage((page) => applyPageBlueprint(page, templateId, availablePageBlueprints) ?? page);
    setActiveTemplateId(templateId);
    toast.success("Template applied to the current page.");
  };

  const applyRecommendedHomepage = () => {
    if (!selectedPage?.isHomepage) {
      toast.error("Select the homepage before applying the recommended homepage layout.");
      return;
    }

    if (
      selectedPage.blocks.length > 0 &&
      !window.confirm("Replace the current homepage blocks with the recommended default homepage layout?")
    ) {
      return;
    }

    updateSelectedPage((page) => ({
      ...page,
      slug: "/",
      isHomepage: true,
      blocks: cloneHomepageBlocksForBlueprint(storeBlueprintId, pageBlueprints),
    }));
    setSelectedBlockId("");
    toast.success("Recommended homepage layout applied. Save Page Builder changes to publish it.");
  };

  const removePage = (pageId: string) => {
    commitStoreChange((current) => {
      if (!current) return current;
      const remainingPages = current.pages.filter((page) => page.id !== pageId);

      if (remainingPages.length === 0) {
        toast.error("Keep at least one page in the storefront.");
        return current;
      }

      if (!remainingPages.some((page) => page.isHomepage)) {
        remainingPages[0] = { ...remainingPages[0], isHomepage: true };
      }

      if (selectedPageId === pageId) {
        setSelectedPageId(remainingPages[0].id);
      }

      return { ...current, pages: remainingPages };
    });
  };

  const addBlock = () => {
    if (!selectedPage) return;
    const nextBlock = createRegistryDefaultBlock(nextBlockType, selectedPage.blocks.length);
    updateSelectedPage((page) => ({
      ...page,
      blocks: [...page.blocks, nextBlock],
    }));
    setSelectedBlockId(nextBlock.id);
  };

  const updateBlock = (blockId: string, updater: (block: StorePageBlock) => StorePageBlock) => {
    updateSelectedPage((page) => ({
      ...page,
      blocks: page.blocks.map((block) => (block.id === blockId ? updater(block) : block)).map((block, index) => ({
        ...block,
        sortOrder: index,
      })),
    }));
  };

  const removeBlock = (blockId: string) => {
    if (selectedPage) {
      const currentIndex = selectedPage.blocks.findIndex((block) => block.id === blockId);
      const fallbackBlock = selectedPage.blocks[currentIndex + 1] ?? selectedPage.blocks[currentIndex - 1] ?? null;
      setSelectedBlockId(fallbackBlock?.id ?? "");
    }

    updateSelectedPage((page) => ({
      ...page,
      blocks: page.blocks.filter((block) => block.id !== blockId).map((block, index) => ({ ...block, sortOrder: index })),
    }));
  };

  const duplicateBlock = (blockId: string) => {
    updateSelectedPage((page) => {
      const sourceIndex = page.blocks.findIndex((block) => block.id === blockId);
      if (sourceIndex === -1) {
        return page;
      }

      const sourceBlock = page.blocks[sourceIndex];
      const duplicatedBlock: StorePageBlock = {
        ...sourceBlock,
        id: crypto.randomUUID(),
        sortOrder: sourceIndex + 1,
      };

      const blocks = [...page.blocks];
      blocks.splice(sourceIndex + 1, 0, duplicatedBlock);
      setSelectedBlockId(duplicatedBlock.id);

      return {
        ...page,
        blocks: blocks.map((block, index) => ({ ...block, sortOrder: index })),
      };
    });
  };

  const moveBlock = (blockId: string, direction: -1 | 1) => {
    updateSelectedPage((page) => {
      const index = page.blocks.findIndex((block) => block.id === blockId);
      const nextIndex = index + direction;

      if (index === -1 || nextIndex < 0 || nextIndex >= page.blocks.length) {
        return page;
      }

      const blocks = [...page.blocks];
      const [block] = blocks.splice(index, 1);
      blocks.splice(nextIndex, 0, block);

      return {
        ...page,
        blocks: blocks.map((item, order) => ({ ...item, sortOrder: order })),
      };
    });
  };

  const updateFeaturedProductLimit = (blockId: string, limit: number) => {
    updateBlock(blockId, (current) => {
      if (current.type !== "featured-products") {
        return current;
      }

      return {
        ...current,
        props: {
          ...current.props,
          limit,
        },
      };
    });
  };

  const updateRichTextBlockField = (
    blockId: string,
    field: "eyebrow" | "title" | "body" | "align",
    value: string,
  ) => {
    updateBlock(blockId, (current) => {
      if (current.type !== "rich-text") {
        return current;
      }

      return {
        ...current,
        props: {
          ...current.props,
          [field]: value,
        },
      };
    });
  };

  const updateBlockProps = (
    blockId: string,
    expectedType: StorePageBlock["type"],
    patch: Record<string, unknown>,
  ) => {
    updateBlock(blockId, (current) => {
      if (current.type !== expectedType) {
        return current;
      }

      return {
        ...current,
        props: {
          ...current.props,
          ...patch,
        },
      } as StorePageBlock;
    });
  };

  const exportStoreLayout = () => {
    if (!store) return;

    const payload: StoreLayoutPackage = {
      schema: STORE_LAYOUT_PACKAGE_SCHEMA,
      exportedAt: new Date().toISOString(),
      source: {
        storeName: store.name,
        storeSlug: store.slug,
        blueprintId: storeBlueprintId,
      },
      layout: {
        description: store.description,
        theme: store.theme,
        pages: store.pages,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${store.slug || "storefront"}-layout.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Storefront layout exported.");
  };

  const importStoreLayout = async (raw: string) => {
    if (!store) return;

    try {
      const parsed = JSON.parse(raw) as Partial<StoreLayoutPackage>;
      if (parsed.schema !== STORE_LAYOUT_PACKAGE_SCHEMA || !parsed.layout || !Array.isArray(parsed.layout.pages)) {
        throw new Error("This is not a valid storefront layout package.");
      }

      if (hasUnsavedChanges && !window.confirm("Importing a layout will replace your unsaved Page Builder draft. Continue?")) {
        return;
      }

      const importedPages = parsed.layout.pages.flatMap((page, pageIndex) => {
        const pageId = crypto.randomUUID();
        const sanitizedPage = sanitizeStorePage({
          ...page,
          id: pageId,
          isHomepage: Boolean(page.isHomepage),
          blocks: sanitizeStoreBlocks(page.blocks ?? []).map((block, blockIndex) => ({
            ...block,
            id: crypto.randomUUID(),
            sortOrder: blockIndex,
          })),
        });

        return sanitizedPage ? [sanitizedPage] : [];
      });

      if (importedPages.length === 0) {
        throw new Error("This layout package does not contain any valid pages.");
      }

      const homepageIndex = Math.max(0, importedPages.findIndex((page) => page.isHomepage));
      const normalizedPages = importedPages.map((page, index) => ({
        ...page,
        isHomepage: index === homepageIndex,
        slug: index === homepageIndex ? "/" : page.slug === "/" ? `/page-${index + 1}` : page.slug,
      }));

      const candidate = storeSchema.parse({
        ...store,
        description: parsed.layout.description || store.description,
        theme: parsed.layout.theme || store.theme,
        pages: normalizedPages,
      });

      commitStoreChange(candidate);
      setSelectedPageId(candidate.pages.find((page) => page.isHomepage)?.id ?? candidate.pages[0]?.id ?? "");
      setSelectedBlockId("");
      setWorkspaceTab("pages");
      toast.success("Layout imported. Review it, then save Page Builder changes.");
    } catch (error: any) {
      toast.error(error.message || "Failed to import storefront layout.");
    }
  };

  const saveAll = async () => {
    if (!store || !user) return;

    const validatedStore = validateStoreForPersistence(store);
    if (!validatedStore.success) {
      const firstIssue = validatedStore.error.issues[0];
      toast.error(`CMS validation failed: ${firstIssue?.message ?? "Please review the page content."}`);
      return;
    }

    const safeStore = validatedStore.data;

    const seenSlugs = new Set<string>();

    for (const page of safeStore.pages) {
      if (!page.slug.startsWith("/")) {
        toast.error(`Page slug "${page.slug}" must start with "/".`);
        return;
      }

      if (page.slug !== "/" && reservedCmsSlugs.has(page.slug)) {
        toast.error(`"${page.slug}" is already handled by the app and cannot be reused here.`);
        return;
      }

      if (seenSlugs.has(page.slug)) {
        toast.error(`Duplicate page slug found: ${page.slug}`);
        return;
      }

      seenSlugs.add(page.slug);
    }

    setSaving(true);

    const { error: storeError } = await supabase.from("stores").upsert(
      {
        id: safeStore.id,
        owner_id: user.id,
        name: safeStore.name,
        slug: safeStore.slug,
        description: safeStore.description,
        currency_code: safeStore.currencyCode,
        locale: safeStore.locale,
        is_published: safeStore.isPublished,
        store_type: storeBlueprintId,
      },
      { onConflict: "id" },
    );

    if (storeError) {
      toast.error("Failed to save store details.");
      setSaving(false);
      return;
    }

    const persistResult = await persistStorefrontState({
      client: supabase,
      store: safeStore,
      ownerId: user.id,
      blueprint: activeBlueprint,
      themePackages,
      selectedPage,
      revisionLabel,
      changedBy: user.id,
    });

    if (persistResult.error) {
      toast.error(`Failed to save Page Builder changes: ${persistResult.error.message || "Unknown persistence error"}`);
      setSaving(false);
      return;
    }

    toast.success("Page Builder changes saved.");
    setRevisionLabel("");
    if (draftStorageKey && typeof window !== "undefined") {
      window.localStorage.removeItem(draftStorageKey);
    }
    setPersistedSnapshot(serializeStoreDraft(safeStore));
    setRecoverableDraft(null);
    setLastDraftSavedAt(null);
    setSaving(false);
    await loadStore();
  };

  const restoreRevision = (revisionId: string) => {
    const revision = revisions.find((item) => item.id === revisionId);
    if (!revision) return;

    if (hasUnsavedChanges && !window.confirm("Restore this revision and replace your current unsaved edits?")) {
      return;
    }

    updateSelectedPage((page) => ({
      ...page,
      blocks: sanitizeStoreBlocks(revision.blocks_snapshot).map((block, index) => ({
        ...block,
        sortOrder: index,
      })),
    }));

    toast.success("Revision restored into the editor. Save Page Builder changes to publish it.");
  };

  const restoreLocalDraft = () => {
    if (!recoverableDraft) return;

    const parsedStore = storeSchema.safeParse(JSON.parse(recoverableDraft.snapshot));
    if (!parsedStore.success) {
      toast.error("The local draft could not be restored.");
      return;
    }

    commitStoreChange(parsedStore.data, { trackHistory: false, resetHistory: true });
    setSelectedPageId((current) => (parsedStore.data.pages.some((page) => page.id === current) ? current : parsedStore.data.pages[0]?.id ?? ""));
    setRecoverableDraft(null);
    toast.success("Local draft restored. Save Page Builder changes to publish it.");
  };

  const discardLocalDraft = () => {
    if (draftStorageKey && typeof window !== "undefined") {
      window.localStorage.removeItem(draftStorageKey);
    }
    setRecoverableDraft(null);
    setLastDraftSavedAt(null);
    toast.success("Local draft discarded.");
  };

  const undoStoreChange = () => {
    const previous = undoStack[undoStack.length - 1];
    if (!previous || !store) {
      toast.error("Nothing to undo.");
      return;
    }

    setRedoStack((existing) => {
      const next = [...existing, store];
      return next.length > pushHistoryLimit ? next.slice(next.length - pushHistoryLimit) : next;
    });
    setUndoStack((existing) => existing.slice(0, -1));
    commitStoreChange(previous, { trackHistory: false });
  };

  const redoStoreChange = () => {
    const next = redoStack[redoStack.length - 1];
    if (!next || !store) {
      toast.error("Nothing to redo.");
      return;
    }

    setUndoStack((existing) => {
      const snapshot = [...existing, store];
      return snapshot.length > pushHistoryLimit ? snapshot.slice(snapshot.length - pushHistoryLimit) : snapshot;
    });
    setRedoStack((existing) => existing.slice(0, -1));
    commitStoreChange(next, { trackHistory: false });
  };

  useEffect(() => {
    setAdvancedPageJsonDraft(
      selectedPage
        ? JSON.stringify({
            id: selectedPage.id,
            title: selectedPage.title,
            slug: selectedPage.slug,
            seoTitle: selectedPage.seoTitle ?? "",
            seoDescription: selectedPage.seoDescription ?? "",
            isHomepage: selectedPage.isHomepage,
            blocks: selectedPage.blocks,
          }, null, 2)
        : "",
    );
  }, [selectedPage]);

  useEffect(() => {
    setAdvancedSelectedBlockJsonDraft(selectedBlock ? JSON.stringify(selectedBlock, null, 2) : "");
  }, [selectedBlock]);

  useEffect(() => {
    setAdvancedThemeCssDraft(store?.theme.customCss ?? "");
  }, [store?.theme.customCss]);

  if (role !== "admin") {
    return null;
  }

  if (loading && !store) {
    return (
      <AdminRecoveryPanel
        title="Loading Page Builder"
        description="The storefront workspace is being restored for the active store."
        loadingLabel="Rebuilding page, block, and theme state."
        retryLabel="Reload Page Builder"
        onRetry={() => void loadStore()}
      />
    );
  }

  if (!activeStoreId) {
    return (
      <Card className="border-border bg-card/80 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <StoreIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Choose a Store to Open Page Builder</CardTitle>
              <CardDescription>
                Pick a store from the switcher first, then initialize its storefront workspace when you are ready to build pages.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 md:hidden">
            <p className="text-sm font-semibold text-foreground">Page Builder needs an active store first</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose the store you want to work on, then come back here to seed or edit its storefront workspace.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-sm font-medium text-foreground">1. Select a store</p>
              <p className="mt-1 text-xs text-muted-foreground">Use the store switcher in the dashboard header to choose the storefront you want to edit.</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-sm font-medium text-foreground">2. Initialize workspace</p>
              <p className="mt-1 text-xs text-muted-foreground">The first visit seeds starter pages, blocks, and theme wiring for that store only.</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-sm font-medium text-foreground">3. Start editing</p>
              <p className="mt-1 text-xs text-muted-foreground">After initialization, mobile and desktop editing surfaces stay scoped to the active store.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="gap-2">
              <Link to="/admin">
                <StoreIcon className="h-4 w-4" />
                Go To Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/signup">
                <RefreshCcw className="h-4 w-4" />
                Create Store
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!store) {
    return (
      <Card className="border-border bg-card/80 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PanelsTopLeft className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Initialize Storefront Workspace</CardTitle>
              <CardDescription>
                Generate the first page builder snapshot for this store using its blueprint, theme, and page defaults.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 md:hidden">
            <p className="text-sm font-semibold text-foreground">This store is ready for its first builder snapshot</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Initialization creates store-owned pages, blocks, and theme wiring so later edits stay isolated from shared packages.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-sm font-medium text-foreground">Scoped to this store</p>
              <p className="mt-1 text-xs text-muted-foreground">Pages, blocks, and theme references are seeded for the active store only.</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-sm font-medium text-foreground">Blueprint-aware</p>
              <p className="mt-1 text-xs text-muted-foreground">The starter workspace pulls from the current business blueprint and page templates.</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-sm font-medium text-foreground">Safe to customize</p>
              <p className="mt-1 text-xs text-muted-foreground">Once initialized, edits stay local to this store and won’t mutate shared source packages.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={bootstrapDefaultStore} disabled={bootstrapping} className="gap-2">
              {bootstrapping ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Initialize Storefront Workspace
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link to={withStoreId("/admin/site-settings", activeStoreId)}>
                <StoreIcon className="h-4 w-4" />
                Open Site Settings
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const previewPath = selectedPage?.slug === "/" ? "" : selectedPage?.slug ?? "";
  const previewHref = absoluteStoreUrl({ slug: store.slug, customDomain: store.customDomain }, previewPath || "/");
  
  const previewBlocks = selectedPage ? [...selectedPage.blocks].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  const previewFrameClassName = previewViewport === "mobile" ? "mx-auto w-full max-w-[420px]" : "w-full";
  const visibleBlockCount = selectedPage?.blocks.filter((block) => block.isVisible).length ?? 0;
  const selectedPageNumber = selectedPage ? store.pages.findIndex((page) => page.id === selectedPage.id) + 1 : 0;
  const heroBlock = selectedPage?.blocks.find((block) => block.type === "hero") ?? null;
  const promoBlock = selectedPage?.blocks.find((block) => block.type === "promo-banner") ?? null;
  const featuredProductsBlock = selectedPage?.blocks.find((block) => block.type === "featured-products") ?? null;
  const richTextBlock = selectedPage?.blocks.find((block) => block.type === "rich-text") ?? null;
  const faqBlock = selectedPage?.blocks.find((block) => block.type === "faq-accordion") ?? null;
  const trustBlock = selectedPage?.blocks.find((block) => block.type === "trust-badges") ?? null;
  const socialFeedBlock = selectedPage?.blocks.find((block) => block.type === "social-feed") ?? null;
  const videoReelBlock = selectedPage?.blocks.find((block) => block.type === "video-reel") ?? null;
  const testimonialsBlock = selectedPage?.blocks.find((block) => block.type === "testimonials") ?? null;
  const categoryShowcaseBlock = selectedPage?.blocks.find((block) => block.type === "category-showcase") ?? null;
  const recentlyViewedBlock = selectedPage?.blocks.find((block) => block.type === "recently-viewed") ?? null;
  const homepagePage = store.pages.find((page) => page.isHomepage) ?? null;
  const productStoryPages = store.pages.filter((page) => /product|shop|catalog/i.test(`${page.slug} ${page.title}`));
  const customContentPages = store.pages.filter((page) => !page.isHomepage && !/product|shop|catalog|checkout/i.test(`${page.slug} ${page.title}`));
  const checkoutSettingsHref = withStoreId("/admin/site-settings?tab=payment", activeStoreId);
  const shippingSettingsHref = withStoreId("/admin/site-settings?tab=delivery", activeStoreId);
  const supportSettingsHref = withStoreId("/admin/site-settings?tab=support", activeStoreId);
  const faqSettingsHref = withStoreId("/admin/site-settings?tab=faq", activeStoreId);
  const aboutSettingsHref = withStoreId("/admin/site-settings?tab=about", activeStoreId);
  const footerSettingsHref = withStoreId("/admin/site-settings?tab=footer", activeStoreId);
  const selectedProductPage = productStoryPages.find((page) => page.id === selectedPageId) ?? productStoryPages[0] ?? null;
  const selectedCustomContentPage = customContentPages.find((page) => page.id === selectedPageId) ?? customContentPages[0] ?? null;
  const getPageBlock = (page: StorePage | null, type: StorePageBlock["type"]) => page?.blocks.find((block) => block.type === type) ?? null;
  const homepageHeroBlock = getPageBlock(homepagePage, "hero");
  const homepagePromoBlock = getPageBlock(homepagePage, "promo-banner");
  const homepageFeaturedProductsBlock = getPageBlock(homepagePage, "featured-products");
  const homepageFaqBlock = getPageBlock(homepagePage, "faq-accordion");
  const homepageTrustBlock = getPageBlock(homepagePage, "trust-badges");
  const homepageSocialFeedBlock = getPageBlock(homepagePage, "social-feed");
  const homepageVideoReelBlock = getPageBlock(homepagePage, "video-reel");
  const homepageTestimonialsBlock = getPageBlock(homepagePage, "testimonials");
  const homepageCategoryShowcaseBlock = getPageBlock(homepagePage, "category-showcase");
  const homepageRecentlyViewedBlock = getPageBlock(homepagePage, "recently-viewed");
  const productRichTextBlock = getPageBlock(selectedProductPage, "rich-text");
  const productFaqBlock = getPageBlock(selectedProductPage, "faq-accordion");
  const productTrustBlock = getPageBlock(selectedProductPage, "trust-badges");
  const customRichTextBlock = getPageBlock(selectedCustomContentPage, "rich-text");
  const customFaqBlock = getPageBlock(selectedCustomContentPage, "faq-accordion");
  const customTrustBlock = getPageBlock(selectedCustomContentPage, "trust-badges");
  const homepageHeroProps = (homepageHeroBlock?.props ?? {}) as {
    title?: string;
    highlight?: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    mediaUrl?: string;
    mediaType?: string;
  };
  const homepagePromoProps = (homepagePromoBlock?.props ?? {}) as {
    title?: string;
    subtitle?: string;
  };
  const homepageFeaturedProps = (homepageFeaturedProductsBlock?.props ?? {}) as {
    title?: string;
    tagline?: string;
    limit?: number;
  };
  const homepageFaqProps = (homepageFaqBlock?.props ?? {}) as {
    title?: string;
    faqs?: Array<{ q: string; a: string }>;
  };
  const homepageTrustProps = (homepageTrustBlock?.props ?? {}) as { title?: string };
  const homepageSocialProps = (homepageSocialFeedBlock?.props ?? {}) as {
    title?: string;
    subtitle?: string;
    images?: string[];
  };
  const homepageTestimonialsProps = (homepageTestimonialsBlock?.props ?? {}) as {
    title?: string;
  };
  const productRichTextProps = (productRichTextBlock?.props ?? {}) as {
    title?: string;
    body?: string;
  };
  const productFaqProps = (productFaqBlock?.props ?? {}) as { title?: string };
  const productTrustProps = (productTrustBlock?.props ?? {}) as { title?: string };
  const customRichTextProps = (customRichTextBlock?.props ?? {}) as {
    title?: string;
    body?: string;
  };
  const customFaqProps = (customFaqBlock?.props ?? {}) as { title?: string };
  const customTrustProps = (customTrustBlock?.props ?? {}) as { title?: string };
  const selectedPageJourneyLabel = selectedPage?.isHomepage
    ? "Homepage"
    : /product|shop|catalog/i.test(`${selectedPage?.slug ?? ""} ${selectedPage?.title ?? ""}`)
      ? "Product Discovery"
      : "Custom Page";
  const basicStatusLabel = saving
    ? "Saving changes..."
    : hasUnsavedChanges
      ? lastDraftSavedAt
        ? `Autosaved locally at ${lastDraftSavedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
        : "Unsaved changes in local draft"
      : "All changes saved";
  const advancedJsonLabel = selectedBlock ? `${selectedBlock.type}.json` : "selected-block.json";
  const advancedPageJson = selectedPage
    ? JSON.stringify({
        id: selectedPage.id,
        title: selectedPage.title,
        slug: selectedPage.slug,
        seoTitle: selectedPage.seoTitle ?? "",
        seoDescription: selectedPage.seoDescription ?? "",
        isHomepage: selectedPage.isHomepage,
        blocks: selectedPage.blocks,
      }, null, 2)
    : "";
  const selectedBlockJson = selectedBlock ? JSON.stringify(selectedBlock, null, 2) : "";
  const basicGuideSteps: Array<{ id: BasicGuideStep; title: string; description: string; sectionId: string }> = [
    { id: "basics", title: "Store Basics", description: "Name, summary, publishing, and core page choice.", sectionId: "basic-step-basics" },
    { id: "homepage", title: "Homepage", description: "Hero, promotions, proof, and shopper-first story flow.", sectionId: "basic-step-homepage" },
    { id: "product", title: "Product Page", description: "Catalog and product-story guidance without raw block editing.", sectionId: "basic-step-product" },
    { id: "checkout", title: "Checkout Trust", description: "Payment, delivery, support, and reassurance settings.", sectionId: "basic-step-checkout" },
    { id: "custom", title: "Custom Pages", description: "FAQ, about, policy, and supporting page content.", sectionId: "basic-step-custom" },
    { id: "launch", title: "Preview & Publish", description: "Check the page, save confidently, and open advanced tools only if needed.", sectionId: "basic-step-launch" },
  ];
  const activeBasicStepMeta = basicGuideSteps.find((step) => step.id === basicGuideStep) ?? basicGuideSteps[0];
  const activeBasicStepIndex = basicGuideSteps.findIndex((step) => step.id === basicGuideStep);
  const basicStepCompletion = {
    basics: Boolean(store.name.trim() && store.description.trim()),
    homepage: Boolean(
      homepageHeroProps.title
      && homepageHeroProps.subtitle
      && homepageHeroProps.ctaText
      && ((homepagePromoProps.title ?? homepageFeaturedProps.title ?? "").toString().trim())
      && (
        ((homepageFaqProps.faqs ?? []).length > 0)
        || ((homepageSocialProps.images ?? []).filter(Boolean).length > 0)
        || Boolean(homepageTestimonialsProps.title)
        || Boolean(homepageTrustProps.title)
      ),
    ),
    product: Boolean(
      selectedProductPage
      && (
        Boolean(selectedProductPage.seoTitle?.trim())
        || Boolean(productRichTextProps.title)
        || Boolean(productTrustProps.title)
      ),
    ),
    checkout: Boolean(Boolean(checkoutSettingsHref) && Boolean(shippingSettingsHref)),
    custom: Boolean(
      selectedCustomContentPage
      && (
        Boolean(customRichTextProps.title)
        || Boolean(customFaqProps.title)
        || Boolean(customTrustProps.title)
      ),
    ),
    launch: Boolean(!hasUnsavedChanges),
  } satisfies Record<BasicGuideStep, boolean>;
  const basicStepRecommendations: Record<BasicGuideStep, string> = {
    basics: store.isPublished ? "Store is already live. Double-check the summary before moving on." : "Finish the store summary, then continue to your first impression.",
    homepage: homepageHeroProps.mediaUrl ? "Homepage media is in place. Tighten the headline, campaign, and proof flow next." : "Lead with a strong hero, then support it with products and trust cues.",
    product: selectedProductPage ? "Refine your main product or catalog page so shoppers can browse with confidence." : "Create or select a product-focused page in Advanced, then return here for guided content setup.",
    checkout: "Use guided settings for payment, delivery, support, and policy reassurance instead of raw page editing.",
    custom: selectedCustomContentPage ? "Use custom pages to answer FAQs, tell your story, and reduce hesitation." : "Add About, FAQ, or policy pages in Advanced, then come back here for merchant-safe editing.",
    launch: hasUnsavedChanges ? "Save the current draft, then preview the page on the live storefront." : "Open preview and do a final merchant-eye pass before you leave Basic Editing.",
  };
  const nextBasicStep = basicGuideSteps[activeBasicStepIndex + 1] ?? null;
  const basicStepActionLabels: Record<BasicGuideStep, string[]> = {
    basics: [
      "Confirm the store name and summary shoppers will recognize.",
      "Make sure the correct page is being edited before changing content.",
      "Decide whether this store should stay draft or go live after review.",
    ],
    homepage: [
      "Write the clearest promise first, then support it with one CTA.",
      "Use campaign and product sections to guide the next shopper click.",
      "Add trust content before expecting first-time visitors to buy.",
    ],
    product: [
      "Choose the main product or catalog page customers will land on next.",
      "Keep page titles and summaries specific to what shoppers can browse or buy.",
      "Add trust or FAQ support close to the buying decision.",
    ],
    checkout: [
      "Review payment methods customers can trust immediately.",
      "Clarify delivery timing, fees, and order expectations.",
      "Keep support and policy links easy to find before checkout hesitation starts.",
    ],
    custom: [
      "Use About, FAQ, and policy pages to answer questions before support messages arrive.",
      "Keep each page focused on one purpose instead of mixing everything together.",
      "End long-form pages with a next step, support path, or trust cue.",
    ],
    launch: [
      "Preview the page like a first-time shopper, not like an editor.",
      "Save when the story, trust, and CTA flow feel consistent.",
      "Only move to Advanced if you need layout or code-level control.",
    ],
  };
  const actionDockTargets = isAdvancedEditor
    ? [
        { id: "page-builder-details", label: "Details" },
        { id: "page-builder-blocks", label: "Blocks" },
        { id: "page-builder-preview", label: "Preview" },
        { id: "advanced-code-panels", label: "Code" },
        { id: "advanced-revisions", label: "Revisions" },
      ]
    : basicGuideSteps.map((step) => ({ id: step.sectionId, label: step.title }));
  const guidedPageJourneys = [
    {
      id: "homepage",
      label: "Homepage",
      state: basicStepCompletion.homepage ? "Ready" : homepagePage ? "In progress" : "Needs setup",
      detail: homepagePage ? "Lead with the hero, promotion, trust, and publish checks." : "Seed the homepage and set your first impression before anything else.",
      actionLabel: homepagePage ? "Open Homepage" : "Go To Basics",
      onClick: () => {
        if (homepagePage) {
          setSelectedPageId(homepagePage.id);
        }
        setBasicGuideStep(homepagePage ? "homepage" : "basics");
        scrollToBuilderSection(homepagePage ? "basic-step-homepage" : "basic-step-basics");
      },
    },
    {
      id: "product-discovery",
      label: "Product Discovery",
      state: productStoryPages.length > 0 ? "Configured" : "Recommended",
      detail: productStoryPages.length > 0 ? `${productStoryPages.length} product-focused page${productStoryPages.length > 1 ? "s are" : " is"} ready to refine.` : "Create or refine a product, catalog, or collection story page next.",
      actionLabel: productStoryPages[0] ? "Open Product Page" : "Open Advanced",
      onClick: () => {
        if (productStoryPages[0]) {
          setSelectedPageId(productStoryPages[0].id);
          setBasicGuideStep("product");
          scrollToBuilderSection("basic-step-product");
          return;
        }
        window.location.href = advancedEditorHref;
      },
    },
    {
      id: "checkout",
      label: "Checkout",
      state: "Settings",
      detail: "Payment, delivery, incentives, and reassurance live in guided checkout settings instead of raw page blocks.",
      actionLabel: "Open Checkout Settings",
      onClick: () => {
        window.location.href = checkoutSettingsHref;
      },
    },
    {
      id: "custom-pages",
      label: "Custom Pages",
      state: customContentPages.length > 0 ? "Active" : "Optional",
      detail: customContentPages.length > 0 ? `${customContentPages.length} custom content page${customContentPages.length > 1 ? "s are" : " is"} available for FAQs, about, policy, and story content.` : "Add About, FAQ, policy, or brand story pages after the main shopping flow is clear.",
      actionLabel: customContentPages[0] ? "Open Custom Page" : "Review Shipping Settings",
      onClick: () => {
        if (customContentPages[0]) {
          setSelectedPageId(customContentPages[0].id);
          setBasicGuideStep("custom");
          scrollToBuilderSection("basic-step-custom");
          return;
        }
        window.location.href = shippingSettingsHref;
      },
    },
  ] as const;
  const basicCompletionChecks = [
    {
      label: "Hero clarity",
      done: Boolean(homepageHeroProps.title && homepageHeroProps.ctaText),
      blocker: "Hero is missing a clear title or CTA.",
    },
    {
      label: "Trust content",
      done: Boolean(
        ((homepageFaqProps.faqs ?? []).length > 0)
        || Boolean(homepageTestimonialsProps.title)
        || Boolean(homepageTrustProps.title),
      ),
      blocker: "FAQ, testimonials, or trust messaging still needs setup.",
    },
    {
      label: "Product discovery",
      done: Boolean(homepageFeaturedProps.title || productStoryPages.length > 0),
      blocker: "Shoppers still need a clearer path into products or catalog pages.",
    },
    {
      label: "Checkout readiness",
      done: Boolean(checkoutSettingsHref),
      blocker: "Payment and delivery settings should be reviewed before launch.",
    },
    {
      label: "Publish confidence",
      done: !hasUnsavedChanges,
      blocker: "Save the current draft before doing the final preview pass.",
    },
  ] as const;
  const completionScore = Math.round((basicCompletionChecks.filter((item) => item.done).length / basicCompletionChecks.length) * 100);
  const activeBlockers = basicCompletionChecks.filter((item) => !item.done).map((item) => item.blocker);
  const nextRecommendedAction = !homepagePage
    ? {
        title: "Create the homepage foundation first",
        detail: "Start with the hero and promotion sections so the store immediately explains what it sells.",
        actionLabel: "Open Homepage Step",
        action: () => {
          setBasicGuideStep("homepage");
          scrollToBuilderSection("basic-step-homepage");
        },
      }
    : !homepageHeroProps.ctaText
      ? {
          title: "Add the homepage CTA",
          detail: "The hero still needs a strong action button so shoppers know where to go next.",
          actionLabel: "Fix Homepage CTA",
          action: () => {
            setSelectedPageId(homepagePage.id);
            setBasicGuideStep("homepage");
            scrollToBuilderSection("basic-step-homepage");
          },
        }
      : ((homepageFaqProps.faqs ?? []).length === 0) && !homepageTestimonialsProps.title
        ? {
            title: "Add trust-building content",
            detail: "FAQ or testimonial content is still missing, so shoppers may hesitate before buying.",
            actionLabel: "Open Homepage Trust",
            action: () => {
              setSelectedPageId(homepagePage.id);
              setBasicGuideStep("homepage");
              scrollToBuilderSection("basic-step-homepage");
            },
          }
        : !selectedProductPage
          ? {
              title: "Create a product discovery page",
              detail: "Customers still need a dedicated page for browsing products, collections, or featured offers.",
              actionLabel: "Open Advanced Editing",
              action: () => {
                window.location.href = advancedEditorHref;
              },
            }
        : hasUnsavedChanges
          ? {
              title: "Save and re-check the live preview",
              detail: "Your current draft has changes waiting to be saved before the final merchant-eye pass.",
              actionLabel: "Jump To Publish Step",
              action: () => {
                setBasicGuideStep("launch");
                scrollToBuilderSection("basic-step-launch");
              },
            }
          : {
              title: "Review checkout trust next",
              detail: "The storefront content looks healthy. Do a payment and delivery review before calling it launch-ready.",
              actionLabel: "Open Checkout Settings",
              action: () => {
                window.location.href = checkoutSettingsHref;
              },
            };
  const previewChecklist = [
    {
      label: "CTA clarity",
      done: Boolean(homepageHeroProps.ctaText),
      hint: "Shoppers should instantly know the next click.",
    },
    {
      label: "Mobile readability",
      done: Boolean((homepageHeroProps.title ?? "").toString().trim().length <= 60),
      hint: "Headline and support copy should stay easy to scan on phones.",
    },
    {
      label: "Trust proof",
      done: Boolean(
        ((homepageFaqProps.faqs ?? []).length > 0)
        || Boolean(homepageTestimonialsProps.title)
        || Boolean(homepageTrustProps.title),
      ),
      hint: "FAQ, testimonials, or trust badges should reduce buying hesitation.",
    },
    {
      label: "Product path",
      done: Boolean(homepageFeaturedProps.title || productStoryPages.length > 0),
      hint: "The page should point toward products, collections, or inquiry flow.",
    },
  ] as const;
  const activeJourneyWizard = selectedPage?.isHomepage
    ? {
        title: "Homepage Setup",
        steps: [
          "Lead with one clear promise and CTA.",
          "Use promotion blocks to spotlight the current campaign.",
          "Add FAQ, testimonials, or trust sections before publishing.",
        ],
      }
      : /product|shop|catalog/i.test(`${selectedPage?.slug ?? ""} ${selectedPage?.title ?? ""}`)
      ? {
          title: "Product Page Story",
          steps: [
            "Clarify what shoppers can browse or buy here.",
            "Make product sections easy to discover and compare.",
            "Keep supporting proof close to the shopping path.",
          ],
        }
      : {
          title: "Custom Page Content",
          steps: [
            "Keep the page focused on one purpose, like FAQ, policy, or brand story.",
            "Use short sections instead of long walls of text.",
            "Add a closing CTA or support path so the page still moves shoppers forward.",
        ],
        };
  const openBasicStep = (step: BasicGuideStep) => {
    setBasicGuideStep(step);
    const target = basicGuideSteps.find((item) => item.id === step);
    if (target) {
      scrollToBuilderSection(target.sectionId);
    }
  };
  const openPageAndStep = (pageId: string, step: BasicGuideStep) => {
    setSelectedPageId(pageId);
    setBasicGuideStep(step);
    const target = basicGuideSteps.find((item) => item.id === step);
    if (target) {
      scrollToBuilderSection(target.sectionId);
    }
  };
  const basicStepBlockers: Record<BasicGuideStep, string> = {
    basics: store.name.trim() && store.description.trim() ? "Store basics look good." : "Store name or description still needs attention.",
    homepage: homepageHeroProps.ctaText && (((homepageFaqProps.faqs ?? []).length > 0) || Boolean(homepageTestimonialsProps.title) || Boolean(homepageTrustProps.title))
      ? "Homepage story and trust flow are taking shape."
      : "Homepage still needs a stronger CTA, product path, or trust content.",
    product: selectedProductPage
      ? "Use this section to sharpen product browsing, trust, and page summary content."
      : "No product-focused page is selected yet.",
    checkout: "Review payment, delivery, support, and policy confidence before launch.",
    custom: selectedCustomContentPage
      ? "Use custom pages to answer support and trust questions before they become messages."
      : "Add About, FAQ, or policy pages to complete the storefront story.",
    launch: hasUnsavedChanges ? "You still have unsaved changes before the final review." : "Ready for final preview and publish checks.",
  };
  const basicStepPrimaryLabels: Record<BasicGuideStep, string> = {
    basics: basicStepCompletion.basics ? "Review Basics" : "Complete Basics",
    homepage: basicStepCompletion.homepage ? "Review Homepage" : "Build Homepage",
    product: basicStepCompletion.product ? "Refine Product Page" : "Set Up Product Page",
    checkout: "Review Checkout Trust",
    custom: basicStepCompletion.custom ? "Review Custom Pages" : "Set Up Custom Pages",
    launch: hasUnsavedChanges ? "Finish Launch Check" : "Open Launch Review",
  };
  const infoMapCards = [
    homepagePage ? {
      id: "info-homepage",
      title: "Homepage",
      icon: StoreIcon,
      placements: ["Homepage", "Main storefront", "First visit"],
      summary: "Hero, promotion, product discovery, and trust content that shapes the first impression.",
      actionLabel: "Open Homepage Setup",
      onClick: () => openPageAndStep(homepagePage.id, "homepage"),
    } : null,
    selectedProductPage ? {
      id: "info-product",
      title: selectedProductPage.title,
      icon: ShoppingBag,
      placements: ["Product page", "Catalog flow", selectedProductPage.slug],
      summary: "Product browsing or collection storytelling that helps shoppers move from interest into purchase.",
      actionLabel: "Open Product Setup",
      onClick: () => openPageAndStep(selectedProductPage.id, "product"),
    } : null,
    selectedCustomContentPage ? {
      id: "info-custom",
      title: selectedCustomContentPage.title,
      icon: FileText,
      placements: ["Custom page", /about/i.test(selectedCustomContentPage.slug) ? "Navbar / brand story" : "Footer / support", selectedCustomContentPage.slug],
      summary: "Supporting content like About, FAQ, policy, or service explanations.",
      actionLabel: "Open Custom Page Setup",
      onClick: () => openPageAndStep(selectedCustomContentPage.id, "custom"),
    } : null,
    {
      id: "info-checkout",
      title: "Checkout Trust",
      icon: HelpCircle,
      placements: ["Checkout", "Payment flow", "Delivery expectations"],
      summary: "Payment methods, delivery notes, and support reassurance that reduce hesitation before order placement.",
      actionLabel: "Open Checkout Trust",
      onClick: () => openBasicStep("checkout"),
    },
    {
      id: "info-footer",
      title: "Footer & Support",
      icon: MapPin,
      placements: ["Footer", "Support", "Site-wide"],
      summary: "Footer copy, support links, extra navigation, and policy access that appear across the storefront.",
      actionLabel: "Open Footer Settings",
      onClick: () => {
        window.location.href = footerSettingsHref;
      },
    },
  ].filter(Boolean) as Array<{
    id: string;
    title: string;
    icon: typeof StoreIcon;
    placements: string[];
    summary: string;
    actionLabel: string;
    onClick: () => void;
  }>;
  const renderCollapsedBasicStep = (step: BasicGuideStep) => {
    const meta = basicGuideSteps.find((item) => item.id === step) ?? activeBasicStepMeta;
    const isReady = basicStepCompletion[step];

    return (
      <div id={meta.sectionId} className="scroll-mt-28 rounded-xl border border-border/80 bg-background/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{meta.title}</p>
              <Badge variant={isReady ? "outline" : "secondary"} className="text-[10px]">
                {isReady ? "Ready" : "Needs attention"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
            <p className="mt-3 text-xs text-muted-foreground">{basicStepBlockers[step]}</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => openBasicStep(step)}>
            {basicStepPrimaryLabels[step]}
          </Button>
        </div>
      </div>
    );
  };
  const scrollToBuilderSection = (sectionId: string) => {
    if (typeof document === "undefined") return;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const openPreviewWorkspace = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setPreviewViewport("mobile");
      setIsMobilePreviewOpen(true);
      return;
    }

    setDesktopPreviewMode((current) => (current === "hidden" || current === "minimized" ? "side" : current));
    scrollToBuilderSection("page-builder-preview");
  };

  const copyBuilderText = async (value: string, label: string) => {
    if (!value.trim()) {
      toast.error(`Nothing to copy from ${label}.`);
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        throw new Error("Clipboard not available");
      }
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Failed to copy ${label}.`);
    }
  };

  const applyAdvancedPageJson = () => {
    if (!selectedPage) return;

    try {
      const parsed = JSON.parse(advancedPageJsonDraft) as Partial<StorePage>;
      const sanitizedPage = sanitizeStorePage({
        id: selectedPage.id,
        slug: parsed.slug ?? selectedPage.slug,
        title: parsed.title ?? selectedPage.title,
        seoTitle: parsed.seoTitle ?? selectedPage.seoTitle ?? "",
        seoDescription: parsed.seoDescription ?? selectedPage.seoDescription ?? "",
        isHomepage: Boolean(parsed.isHomepage ?? selectedPage.isHomepage),
        blocks: sanitizeStoreBlocks(parsed.blocks ?? selectedPage.blocks).map((block, index) => ({
          ...block,
          id: typeof block.id === "string" && block.id.trim() ? block.id : crypto.randomUUID(),
          sortOrder: index,
        })),
      });

      if (!sanitizedPage) {
        throw new Error("The page JSON did not produce a valid page.");
      }

      updateSelectedPage(() => sanitizedPage);
      setSelectedBlockId(sanitizedPage.blocks[0]?.id ?? "");
      toast.success("Applied page JSON to the current page draft.");
    } catch (error: any) {
      toast.error(error.message || "Failed to apply page JSON.");
    }
  };

  const applyAdvancedSelectedBlockJson = () => {
    if (!selectedPage || !selectedBlock) return;

    try {
      const parsed = JSON.parse(advancedSelectedBlockJsonDraft) as Partial<StorePageBlock>;
      const sanitizedBlocks = sanitizeStoreBlocks([
        {
          id: selectedBlock.id,
          type: parsed.type ?? selectedBlock.type,
          sortOrder: selectedBlock.sortOrder,
          isVisible: parsed.isVisible ?? selectedBlock.isVisible,
          props: parsed.props ?? selectedBlock.props,
        } as StorePageBlock,
      ]);
      const sanitizedBlock = sanitizedBlocks[0];

      if (!sanitizedBlock) {
        throw new Error("The block JSON did not produce a valid block.");
      }

      updateBlock(selectedBlock.id, () => ({
        ...sanitizedBlock,
        id: selectedBlock.id,
        sortOrder: selectedBlock.sortOrder,
      }));
      toast.success("Applied selected block JSON.");
    } catch (error: any) {
      toast.error(error.message || "Failed to apply block JSON.");
    }
  };

  const applyAdvancedThemeCss = () => {
    updateStoreTheme({ customCss: advancedThemeCssDraft });
    toast.success("Applied custom theme CSS to the local draft.");
  };

  const previewCanvas = (
    <StoreProvider store={store}>
      <StoreThemeScope theme={store.theme}>
        <div className={previewFrameClassName}>
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <div className="border-b border-border bg-card px-4 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {selectedPage?.title ?? "Preview"}
            </div>
            <div className={cn("overflow-y-auto", previewViewport === "mobile" ? "max-h-[70vh]" : "max-h-[720px]")}>
              {previewBlocks.length > 0 ? (
                previewBlocks.map((block, index) => {
                  const blockMeta = getCmsBlockRegistryItem(block.type, blockRegistry);
                  const isFocused = selectedBlockId === block.id;

                  return (
                    <div
                      key={block.id}
                      id={`cms-preview-block-${block.id}`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setSelectedBlockId(block.id);
                        }
                      }}
                      onClick={() => setSelectedBlockId(block.id)}
                      className={cn(
                        "group relative block w-full cursor-pointer text-left transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isFocused && "bg-primary/5",
                      )}
                    >
                      <div
                        className={cn(
                          "absolute inset-x-3 top-3 z-20 flex items-center justify-between gap-3 rounded-lg border bg-background/90 px-3 py-2 opacity-0 shadow-sm backdrop-blur transition-opacity",
                          "group-hover:opacity-100 group-focus-visible:opacity-100",
                          isFocused ? "border-primary/40 opacity-100" : "border-border/80",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {index + 1}. {blockMeta?.label ?? block.type}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">{block.type}</p>
                        </div>
                        <Badge variant={isFocused ? "secondary" : "outline"}>
                          {isFocused ? "Editing" : "Select"}
                        </Badge>
                      </div>
                      <div
                        className={cn(
                          "absolute inset-x-3 bottom-3 z-20 flex flex-wrap justify-end gap-2 opacity-0 transition-opacity",
                          "group-hover:opacity-100 group-focus-visible:opacity-100",
                          isFocused && "opacity-100",
                        )}
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant={isFocused ? "secondary" : "outline"}
                          className="h-8"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedBlockId(block.id);
                          }}
                        >
                          {isFocused ? "Focused" : "Edit"}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 bg-background/95"
                          onClick={(event) => {
                            event.stopPropagation();
                            updateBlock(block.id, (current) => ({ ...current, isVisible: !current.isVisible }));
                          }}
                        >
                          {block.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 bg-background/95"
                          disabled={index === 0}
                          onClick={(event) => {
                            event.stopPropagation();
                            moveBlock(block.id, -1);
                          }}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 bg-background/95"
                          disabled={index === previewBlocks.length - 1}
                          onClick={(event) => {
                            event.stopPropagation();
                            moveBlock(block.id, 1);
                          }}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        {isAdvancedEditor ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 bg-background/95"
                            onClick={(event) => {
                              event.stopPropagation();
                              duplicateBlock(block.id);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {isAdvancedEditor ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 bg-background/95 text-destructive hover:text-destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeBlock(block.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                      <div className={cn("transition-all", isFocused && "ring-2 ring-inset ring-primary/30")}>
                        <StorefrontBlockRenderer block={block} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-sm text-muted-foreground">Add blocks to preview this page.</div>
              )}
            </div>
          </div>
        </div>
      </StoreThemeScope>
    </StoreProvider>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card/70 p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={store.isPublished ? "default" : "secondary"}>{store.isPublished ? "Published" : "Draft"}</Badge>
              <Badge variant={hasUnsavedChanges ? "secondary" : "outline"}>{hasUnsavedChanges ? "Unsaved changes" : "Saved"}</Badge>
              {selectedPage?.isHomepage ? <Badge variant="outline">Homepage</Badge> : null}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-normal text-foreground">
                  {isAdvancedEditor ? "Advanced Editing" : "Basic Editing"}
                </h1>
                <Badge variant={isAdvancedEditor ? "secondary" : "outline"}>
                  {isAdvancedEditor ? "Full workspace" : "Merchant-safe workspace"}
                </Badge>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {isAdvancedEditor
                  ? `Manage storefront pages, templates, structure, revisions, and deep block controls for ${store.name}.`
                  : `Update storefront content, theme tokens, visibility, and page details for ${store.name} with simpler navigation.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant={isAdvancedEditor ? "outline" : "secondary"} size="sm" className="rounded-full">
                <Link to={basicEditorHref}>Basic Editing</Link>
              </Button>
              <Button asChild variant={isAdvancedEditor ? "secondary" : "outline"} size="sm" className="rounded-full">
                <Link to={advancedEditorHref}>Advanced Editing</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  Pages
                </div>
                <p className="mt-1 text-lg font-semibold text-foreground">{store.pages.length}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Layers3 className="h-3.5 w-3.5" />
                  Visible Blocks
                </div>
                <p className="mt-1 text-lg font-semibold text-foreground">{visibleBlockCount}</p>
              </div>
              <div className="col-span-2 rounded-lg border border-border bg-background/40 px-3 py-2 sm:col-span-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <StoreIcon className="h-3.5 w-3.5" />
                  Store Slug
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-foreground">{store.slug}</p>
              </div>
            </div>
            {!isAdvancedEditor ? (
              <div className="rounded-2xl border border-border/80 bg-background/70 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Guided Store Setup</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Work through the key storefront surfaces one by one. You are currently editing: {selectedPageJourneyLabel}.
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit">
                    {guidedPageJourneys.filter((item) => item.state === "Ready" || item.state === "Configured" || item.state === "Active").length}/{guidedPageJourneys.length} tracks moving
                  </Badge>
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Next Recommended Action</p>
                        <p className="mt-1 text-sm text-muted-foreground">{nextRecommendedAction.title}</p>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{nextRecommendedAction.detail}</p>
                      </div>
                      <Button type="button" size="sm" className="rounded-full" onClick={nextRecommendedAction.action}>
                        {nextRecommendedAction.actionLabel}
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-card/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Merchant Readiness</p>
                        <p className="mt-1 text-xs text-muted-foreground">A quick confidence score based on hero, trust, discovery, checkout, and save status.</p>
                      </div>
                      <div className="rounded-full border border-border px-3 py-1 text-sm font-semibold text-foreground">
                        {completionScore}%
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-secondary/70">
                      <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${completionScore}%` }} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {basicCompletionChecks.map((item) => (
                        <Badge key={item.label} variant={item.done ? "outline" : "secondary"}>
                          {item.done ? "Done" : "Needs work"}: {item.label}
                        </Badge>
                      ))}
                    </div>
                    {activeBlockers.length > 0 ? (
                      <div className="mt-3 rounded-xl border border-border/70 bg-background/80 p-3 text-xs text-muted-foreground">
                        {activeBlockers[0]}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 xl:grid-cols-4">
                  {guidedPageJourneys.map((journey, index) => (
                    <div key={journey.id} className="rounded-xl border border-border bg-card/80 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{index + 1}. {journey.label}</p>
                        <Badge variant={journey.state === "Needs setup" ? "secondary" : "outline"} className="text-[10px]">
                          {journey.state}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{journey.detail}</p>
                      <Button type="button" variant="outline" size="sm" className="mt-3 rounded-full" onClick={journey.onClick}>
                        {journey.actionLabel}
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-border bg-card/80 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{activeJourneyWizard.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Basic mode should feel like a mini-wizard for the page you are actively shaping.
                      </p>
                    </div>
                    <Badge variant="outline">{selectedPageJourneyLabel}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {activeJourneyWizard.steps.map((step, index) => (
                      <div key={step} className="rounded-xl border border-border/70 bg-background/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step {index + 1}</p>
                        <p className="mt-2 text-sm text-foreground">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <input
              ref={layoutImportInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                await importStoreLayout(await file.text());
                event.currentTarget.value = "";
              }}
            />
            {returnTo ? (
              <Button variant="outline" asChild className="gap-2">
                <Link to={returnTo}>
                  <ExternalLink className="h-4 w-4" />
                  Back To Storefront
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => void loadStore()} className="gap-2 px-3">
              <RefreshCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reload</span>
            </Button>
            <Button variant="outline" onClick={openPreviewWorkspace} className="gap-2 px-3">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Open Preview</span>
            </Button>
            {isAdvancedEditor ? (
              <Button variant="outline" onClick={exportStoreLayout} className="gap-2 px-3">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export Layout</span>
              </Button>
            ) : null}
            {isAdvancedEditor ? (
              <Button variant="outline" onClick={() => layoutImportInputRef.current?.click()} className="gap-2 px-3">
                <Import className="h-4 w-4" />
                <span className="hidden sm:inline">Import Layout</span>
              </Button>
            ) : null}
            <Button onClick={() => void saveAll()} disabled={saving} className="gap-2 px-3">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="hidden sm:inline">Save Pages</span>
            </Button>
          </div>
        </div>
      </div>
      <div className="sticky top-16 z-20 -mx-4 border-y border-border/60 bg-background/95 px-4 py-2.5 backdrop-blur-xl lg:hidden">
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-2">
            {[
              { value: "store", label: "Store" },
              { value: "theme", label: "Theme" },
              { value: "pages", label: "Pages" },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setWorkspaceTab(tab.value as "store" | "theme" | "pages");
                  setIsMobileSettingsOpen(true);
                  scrollToBuilderSection("page-builder-workspace");
                }}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3 text-xs font-medium transition-colors",
                  workspaceTab === tab.value
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
            {[
              { id: "page-builder-details", label: "Details" },
              { id: "page-builder-blocks", label: "Blocks" },
              { id: "page-builder-preview", label: "Preview" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToBuilderSection(item.id)}
                className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {selectedPage ? (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{selectedPage.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">{selectedPage.slug}</p>
            </div>
            <Badge variant="outline">{selectedPage.blocks.length} block{selectedPage.blocks.length === 1 ? "" : "s"}</Badge>
          </div>
        ) : null}
      </div>
        
      <div className="relative grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="lg:col-span-2 space-y-3">
            {recoverableDraft ? (
              <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Local draft available</p>
                  <p className="text-xs text-muted-foreground">
                    Autosaved {new Date(recoverableDraft.updatedAt).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={discardLocalDraft}>
                    Discard
                  </Button>
                  <Button type="button" size="sm" onClick={restoreLocalDraft}>
                    Restore Draft
                  </Button>
                </div>
              </div>
            ) : null}
            {hasUnsavedChanges ? (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                {lastDraftSavedAt
                  ? `Draft autosaved locally at ${lastDraftSavedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}.`
                  : "Editing draft locally. Save Page Builder changes to publish them."}
              </div>
            ) : null}
            <div className="sticky bottom-0 z-30 -mx-4 border-t border-border/70 bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{selectedPage?.title ?? "Page Builder"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {hasUnsavedChanges
                      ? lastDraftSavedAt
                        ? `Draft saved locally at ${lastDraftSavedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                        : "Unsaved page changes"
                      : "All page changes saved"}
                  </p>
                </div>
                <Button onClick={() => void saveAll()} disabled={saving} size="sm" className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </Button>
              </div>
            </div>
          </div>
          
          {/* Mobile FAB to toggle settings */}
          <Button 
            className="lg:hidden fixed bottom-6 right-6 z-[60] rounded-full shadow-2xl h-14 w-14" 
            onClick={() => setIsMobileSettingsOpen(!isMobileSettingsOpen)}
          >
            {isMobileSettingsOpen ? <Eye className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </Button>

          {/* Left Panel: Settings Form */}
          <div className={cn(
            "transition-transform duration-300",
            "lg:static lg:block lg:h-auto lg:w-auto lg:transform-none lg:rounded-lg lg:border lg:border-border lg:bg-card/70 lg:p-4 lg:shadow-sm",
            "lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto",
            "fixed inset-0 top-14 z-50 bg-background/98 backdrop-blur-xl border-t shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-4 pb-24 overflow-y-auto",
            isMobileSettingsOpen ? "translate-y-0" : "translate-y-full lg:translate-y-0"
          )}>
            <div id="page-builder-workspace" />
            <div className="hidden items-start justify-between gap-3 lg:mb-4 lg:flex">
              <div>
                <p className="text-sm font-semibold text-foreground">Store Workspace</p>
                <p className="text-xs text-muted-foreground">Use smaller panels for store setup, theme control, and page navigation.</p>
              </div>
              <Badge variant="outline">{selectedPageNumber || 0}/{store.pages.length}</Badge>
            </div>
            <div className="space-y-4">
            <div className="sticky top-0 z-20 -mx-4 mb-4 border-b bg-background/95 px-4 pb-3 pt-1 backdrop-blur-xl lg:hidden">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Editor workspace</p>
                  <p className="text-xs text-muted-foreground">
                    {workspaceTab === "pages"
                      ? "Pick a page first, then focus one section or guided setup area at a time."
                      : workspaceTab === "theme"
                        ? "Adjust store-wide visual settings."
                        : workspaceTab === "info"
                          ? "See where content appears across the storefront and jump into edits."
                          : "Store setup and publishing details."}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileSettingsOpen(false)}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Tabs value={workspaceTab} onValueChange={(value) => setWorkspaceTab(value as "store" | "theme" | "pages" | "info")} className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="store">Store</TabsTrigger>
                <TabsTrigger value="theme">Theme</TabsTrigger>
                <TabsTrigger value="pages">Pages</TabsTrigger>
                <TabsTrigger value="info">Info</TabsTrigger>
              </TabsList>

              <TabsContent value="store" className="space-y-4">
                <div className="sticky top-0 z-10 -mx-4 border-y border-border/60 bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden">
                  <div className="overflow-x-auto">
                    <div className="flex min-w-max items-center gap-2">
                      {[
                        { id: "store-basics", label: "Basics" },
                        { id: "store-publishing", label: "Publishing" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => scrollToBuilderSection(item.id)}
                          className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-sm font-medium text-foreground">Store Basics</p>
                  <p className="mt-1 text-xs text-muted-foreground">Name, routing slug, publishing state, and the brand summary used across the storefront.</p>
                </div>
                <div id="store-basics" className="grid gap-2 scroll-mt-36">
                  <Label>Store Name</Label>
                  <Input value={store.name} onChange={(e) => commitStoreChange({ ...store, name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Store Slug</Label>
                  <Input value={store.slug} readOnly />
                  <p className="text-xs text-muted-foreground">The storefront URL slug is locked after first setup to keep the live domain stable.</p>
                </div>
                <div className="grid gap-2">
                  <Label>Store Description</Label>
                  <Textarea rows={4} value={store.description} onChange={(e) => commitStoreChange({ ...store, description: e.target.value })} />
                </div>
                <div id="store-publishing" className="flex items-center justify-between rounded-lg border border-border p-3 scroll-mt-36">
                  <div>
                    <p className="text-sm font-medium text-foreground">Store Published</p>
                    <p className="text-xs text-muted-foreground">Turn this off to keep the CMS store in draft mode.</p>
                  </div>
                  <Switch checked={store.isPublished} onCheckedChange={(checked) => commitStoreChange({ ...store, isPublished: checked })} />
                </div>
              </TabsContent>

              <TabsContent value="theme" className="space-y-4">
                <div className="sticky top-0 z-10 -mx-4 border-y border-border/60 bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden">
                  <div className="overflow-x-auto">
                    <div className="flex min-w-max items-center gap-2">
                      {[
                        { id: "theme-package", label: "Package" },
                        { id: "theme-tokens", label: "Tokens" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => scrollToBuilderSection(item.id)}
                          className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Store Theme</p>
                    <p className="text-xs text-muted-foreground">These settings are saved to `store_themes` and power the live storefront preview.</p>
                    {isMissingThemeReference ? (
                      <p className="mt-2 text-xs text-amber-600">
                        The saved theme package reference for this store is missing. Page Builder is previewing the nearest compatible fallback until you save a new package choice.
                      </p>
                    ) : null}
                    {hasThemeVersionUpdate ? (
                      <p className="mt-2 text-xs text-sky-600">
                        This store is using theme snapshot v{installedThemePackageVersion} while the current package is v{resolvedEditorThemePackage?.version}. Saving Page Builder changes will install the latest snapshot for this store.
                      </p>
                    ) : null}
                    {hasBlueprintVersionUpdate ? (
                      <p className="mt-2 text-xs text-sky-600">
                        This store was created from an older blueprint snapshot. Saving Page Builder changes will refresh blueprint-owned store profile metadata for the current blueprint.
                      </p>
                    ) : null}
                  </div>
                  <div id="theme-package" className="grid gap-2 scroll-mt-36">
                    <Label>Theme Package</Label>
                    <Select value={store.theme.themePackageId ?? store.theme.presetId} onValueChange={(value) => updateStoreTheme({ themePackageId: value })} disabled={!themePresetsEnabled}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a theme package" />
                      </SelectTrigger>
                      <SelectContent>
                        {themePackages.map((themePackage) => (
                          <SelectItem key={themePackage.id} value={themePackage.id}>
                            {themePackage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {resolveThemePackageById(store.theme.themePackageId, themePackages, store.theme.presetId).description}
                    </p>
                    {!themePresetsEnabled ? <p className="text-xs text-muted-foreground">Theme package changes are disabled for this store package.</p> : null}
                  </div>
                  <div id="theme-tokens" className="grid gap-2 scroll-mt-36">
                    <Label>Color Mode</Label>
                    <Select value={store.theme.mode} onValueChange={(value) => updateStoreTheme({ mode: value as Store["theme"]["mode"] })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Heading Font</Label>
                    <Input value={store.theme.headingFont ?? ""} placeholder="'Outfit', sans-serif" onChange={(e) => updateStoreTheme({ headingFont: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Body Font</Label>
                    <Input value={store.theme.bodyFont ?? ""} placeholder="'Plus Jakarta Sans', sans-serif" onChange={(e) => updateStoreTheme({ bodyFont: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Border Radius</Label>
                    <Input value={store.theme.borderRadius ?? ""} placeholder="0.5rem" onChange={(e) => updateStoreTheme({ borderRadius: e.target.value })} />
                  </div>
                  <div className="grid gap-3 rounded-lg border border-border p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Guided theme overrides</p>
                      <p className="text-xs text-muted-foreground">Override the selected package without affecting any other store.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {GUIDED_THEME_TOKENS.map((token) => {
                        const resolvedVars = resolveStoreThemeVars(store.theme, themePackages).vars;
                        const currentValue = store.theme.customCssVars[token.key] ?? resolvedVars[token.key] ?? "";

                        return (
                          <div key={token.key} className="grid gap-2">
                            <Label>{token.label}</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="color"
                                value={hslChannelsToHex(currentValue) ?? "#000000"}
                                onChange={(event) => {
                                  const next = hexToHslChannels(event.target.value);
                                  if (!next) return;
                                  updateStoreTheme({
                                    customCssVars: {
                                      ...store.theme.customCssVars,
                                      [token.key]: next,
                                    },
                                  });
                                }}
                                className="h-10 w-16 p-1"
                              />
                              <Input
                                value={currentValue}
                                onChange={(event) => updateStoreTheme({
                                  customCssVars: {
                                    ...store.theme.customCssVars,
                                    [token.key]: event.target.value,
                                  },
                                })}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {isAdvancedEditor ? (
                    <div className="grid gap-2 rounded-lg border border-border p-4">
                      <Label>Custom Theme CSS</Label>
                      <Textarea
                        rows={8}
                        className="font-mono text-xs"
                        value={store.theme.customCss ?? ""}
                        onChange={(e) => updateStoreTheme({ customCss: e.target.value })}
                        placeholder="/* Advanced theme overrides for technical editors */"
                      />
                      <p className="text-xs text-muted-foreground">Advanced mode only. This CSS is applied on top of the resolved theme tokens for this store.</p>
                    </div>
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="info" className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Storefront Placement Map</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Use this map to understand where content appears before you edit it. Each card shows a lightweight storefront skeleton and can jump you straight into the matching setup area.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4">
                  {infoMapCards.map((card) => {
                    const Icon = card.icon;

                    return (
                      <div key={card.id} className="rounded-2xl border border-border bg-background/85 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-primary" />
                              <p className="text-sm font-semibold text-foreground">{card.title}</p>
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{card.summary}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {card.placements.map((placement) => (
                                <Badge key={`${card.id}-${placement}`} variant="outline">{placement}</Badge>
                              ))}
                            </div>
                          </div>
                          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={card.onClick}>
                            {card.actionLabel}
                          </Button>
                        </div>
                        <div className="mt-4 rounded-2xl border border-border/70 bg-muted/30 p-4">
                          <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
                            <div className="space-y-2 rounded-xl border border-border/60 bg-background/80 p-3">
                              <div className="h-3 w-20 rounded-full bg-muted" />
                              <div className="h-8 rounded-xl bg-muted/80" />
                              <div className="h-8 rounded-xl bg-muted/70" />
                            </div>
                            <div className="space-y-3 rounded-xl border border-border/60 bg-background/80 p-3">
                              <div className="h-4 w-28 rounded-full bg-muted" />
                              <div className="h-24 rounded-2xl bg-muted/75" />
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="h-20 rounded-xl bg-muted/70" />
                                <div className="h-20 rounded-xl bg-muted/60" />
                              </div>
                              <div className="h-12 rounded-xl bg-muted/50" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Button type="button" variant="outline" className="justify-start rounded-xl" onClick={() => { window.location.href = faqSettingsHref; }}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Open FAQ settings
                  </Button>
                  <Button type="button" variant="outline" className="justify-start rounded-xl" onClick={() => { window.location.href = aboutSettingsHref; }}>
                    <FileText className="mr-2 h-4 w-4" />
                    Open About settings
                  </Button>
                  <Button type="button" variant="outline" className="justify-start rounded-xl" onClick={() => { window.location.href = supportSettingsHref; }}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Open support settings
                  </Button>
                  <Button type="button" variant="outline" className="justify-start rounded-xl" onClick={() => { window.location.href = checkoutSettingsHref; }}>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Open payment settings
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="pages" className="space-y-4">
                <div className="sticky top-0 z-10 -mx-4 border-y border-border/60 bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden">
                  <div className="overflow-x-auto">
                    <div className="flex min-w-max items-center gap-2">
                      {[
                        { id: "pages-library", label: "Templates" },
                        { id: "pages-list", label: "Pages" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => scrollToBuilderSection(item.id)}
                          className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-sm font-medium text-foreground">Pages & Navigation</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isAdvancedEditor
                      ? "Select the page you want to edit, duplicate it, or create a new one from a compatible blueprint."
                      : "Select a page and update content safely. Structural page creation and replacements stay in Advanced Editing."}
                  </p>
                </div>
                <div id="pages-library" className="rounded-lg border border-border p-3 scroll-mt-36">
                  <div className="grid gap-3">
                    {!pageBlueprintsEnabled ? (
                      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        Page blueprints are disabled for this store. New pages will start blank and blueprint replacement is locked.
                      </div>
                    ) : null}
                    {!isAdvancedEditor ? (
                      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        New pages, template swaps, and layout imports live in <Link to={advancedEditorHref} className="font-medium text-foreground underline underline-offset-4">Advanced Editing</Link>.
                      </div>
                    ) : null}
                    <div className="grid gap-2">
                      <Label>New Page Template</Label>
                      <Select value={newPageTemplate} onValueChange={setNewPageTemplate} disabled={!pageBlueprintsEnabled || !isAdvancedEditor}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePageBlueprints.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {availablePageBlueprints.find((template) => template.id === newPageTemplate)?.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Showing templates matched to the <span className="font-medium text-foreground">{activeBlueprint.shortName}</span> blueprint.
                      </p>
                    </div>
                    {isAdvancedEditor ? (
                      <Button size="sm" variant="outline" onClick={addPage} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Page
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div id="pages-list" className="space-y-2 scroll-mt-36">
                  {store.pages.map((page) => (
                    <div
                      key={page.id}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setSelectedPageId(page.id);
                          setSelectedBlockId("");
                        }
                      }}
                      onClick={() => {
                        setSelectedPageId(page.id);
                        setSelectedBlockId("");
                      }}
                      className={`w-full rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                        selectedPageId === page.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{page.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{page.slug}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {page.isHomepage ? <Badge variant="secondary">Home</Badge> : null}
                          {isAdvancedEditor ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={(event) => {
                                event.stopPropagation();
                                duplicatePage(page.id);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {isAdvancedEditor ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(event) => {
                                event.stopPropagation();
                                removePage(page.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
            </div>
          </div>

          {selectedPage ? (
            <>
            <div className="space-y-6">
              <Card className="border-border">
                <div id="page-builder-details" />
                <CardHeader>
                  <CardTitle className="text-lg">Page Details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="sticky top-16 z-10 -mx-6 border-y border-border/60 bg-background/95 px-6 py-3 backdrop-blur-xl md:hidden md:col-span-2">
                    <div className="overflow-x-auto">
                      <div className="flex min-w-max items-center gap-2">
                        {[
                          { id: "page-meta", label: "Meta" },
                          { id: "page-template", label: "Template" },
                          { id: "page-home", label: "Homepage" },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => scrollToBuilderSection(item.id)}
                            className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div id="page-meta" className="grid gap-2 scroll-mt-36">
                    <Label>Page Title</Label>
                    <Input value={selectedPage.title} onChange={(e) => updateSelectedPage((page) => ({ ...page, title: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Page Slug</Label>
                    <Input value={selectedPage.slug} onChange={(e) => updateSelectedPage((page) => ({ ...page, slug: e.target.value }))} disabled={!isAdvancedEditor} />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>SEO Title</Label>
                    <Input value={selectedPage.seoTitle ?? ""} onChange={(e) => updateSelectedPage((page) => ({ ...page, seoTitle: e.target.value }))} />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>SEO Description</Label>
                    <Textarea rows={3} value={selectedPage.seoDescription ?? ""} onChange={(e) => updateSelectedPage((page) => ({ ...page, seoDescription: e.target.value }))} />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Revision Label For Next Save</Label>
                    <Input
                      value={revisionLabel}
                      placeholder={isAdvancedEditor ? "Homepage cleanup, seasonal refresh, trust update..." : "Optional note for this content pass"}
                      onChange={(e) => setRevisionLabel(e.target.value)}
                    />
                  </div>
                  {selectedPage.isHomepage ? (
                    <div className="md:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                      <p className="text-sm font-medium text-foreground">Homepage blocks are now the primary editing surface</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Legacy homepage entries in <code>site_settings</code> are still supported for backward compatibility, but Page Builder blocks lead the storefront and legacy values only backfill older setups.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setWorkspaceTab("pages")}>
                          Review homepage blocks
                        </Button>
                        <Button type="button" variant="ghost" size="sm" asChild>
                          <Link to="/admin/site-settings?tab=page_builder">Open global store settings</Link>
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {isAdvancedEditor ? (
                    <div id="page-template" className="grid gap-3 md:col-span-2 rounded-lg border border-border p-4 scroll-mt-36">
                      <div>
                        <p className="text-sm font-medium text-foreground">Apply Page Template</p>
                        <p className="text-xs text-muted-foreground">Replace the current block stack with a prebuilt page structure.</p>
                      </div>
                      <div className="flex flex-col gap-2 md:flex-row">
                        <Select value={activeTemplateId} onValueChange={setActiveTemplateId} disabled={!pageBlueprintsEnabled}>
                          <SelectTrigger className="md:max-w-[280px]">
                            <SelectValue placeholder="Choose a template" />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePageBlueprints.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" onClick={() => applyTemplate(activeTemplateId)} className="gap-2" disabled={!pageBlueprintsEnabled}>
                          <LayoutTemplate className="h-4 w-4" />
                          Apply Template
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {availablePageBlueprints.find((template) => template.id === activeTemplateId)?.description}
                      </p>
                      {!pageBlueprintsEnabled ? (
                        <p className="text-xs text-muted-foreground">Enable the `cms_pages` feature to use blueprint-backed page structures here.</p>
                      ) : null}
                    </div>
                  ) : (
                    <div id="page-template" className="grid gap-2 md:col-span-2 rounded-lg border border-dashed border-border p-4 scroll-mt-36">
                      <p className="text-sm font-medium text-foreground">Need a new layout or template?</p>
                      <p className="text-xs text-muted-foreground">
                        Switch to <Link to={advancedEditorHref} className="font-medium text-foreground underline underline-offset-4">Advanced Editing</Link> for page templates, homepage restructuring, and blueprint-driven layout changes.
                      </p>
                    </div>
                  )}
                  {selectedPage.isHomepage && isAdvancedEditor ? (
                    <div className="flex flex-col gap-3 rounded-lg border border-border p-4 md:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Recommended Homepage</p>
                        <p className="text-xs text-muted-foreground">Apply the updated conversion-focused block order and default trust sections.</p>
                      </div>
                      <Button type="button" variant="outline" onClick={applyRecommendedHomepage} className="gap-2">
                        <LayoutTemplate className="h-4 w-4" />
                        Apply Recommended Homepage
                      </Button>
                    </div>
                  ) : null}
                  <div id="page-home" className="flex items-center justify-between rounded-lg border border-border p-3 md:col-span-2 scroll-mt-36">
                    <div>
                      <p className="text-sm font-medium text-foreground">Homepage</p>
                      <p className="text-xs text-muted-foreground">Only one page should own the root storefront route.</p>
                    </div>
                    <Switch
                      checked={selectedPage.isHomepage}
                      disabled={!isAdvancedEditor}
                      onCheckedChange={(checked) =>
                        commitStoreChange((current) => {
                          if (!current) return current;
                          return {
                            ...current,
                            pages: current.pages.map((page) =>
                              page.id === selectedPage.id
                                ? { ...page, isHomepage: checked, slug: checked ? "/" : page.slug === "/" ? `/${page.title.toLowerCase().replace(/\s+/g, "-")}` : page.slug }
                                : checked
                                  ? { ...page, isHomepage: false }
                              : page,
                            ),
                          };
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <div id="page-builder-blocks" />
                <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="text-lg">{isAdvancedEditor ? "Blocks" : "Page Content"}</CardTitle>
                    <CardDescription>
                      {isAdvancedEditor
                        ? "Reorder, hide, configure, duplicate, and expand the sections for this page."
                        : "Update key storefront sections through forms and toggles without working directly with block structure."}
                      {isAdvancedEditor && selectedBlock ? ` Currently editing ${selectedBlock.type}.` : ""}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {isAdvancedEditor ? (
                      <Select value={nextBlockType} onValueChange={(value) => setNextBlockType(value as StorePageBlock["type"])}>
                        <SelectTrigger className="w-full sm:w-[220px]">
                          <SelectValue placeholder="Choose block type" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBlockRegistry.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    {isAdvancedEditor ? (
                      <Button variant="outline" onClick={addBlock} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Block
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isAdvancedEditor ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Wand2 className="h-4 w-4 text-primary" />
                              <p className="text-sm font-semibold text-foreground">Guided Basic Editing</p>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {activeBasicStepMeta.description} Basic mode is meant to feel more like a merchant setup assistant than block editing.
                            </p>
                          </div>
                          <Badge variant="secondary">{basicGuideSteps.findIndex((step) => step.id === basicGuideStep) + 1}/{basicGuideSteps.length}</Badge>
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                          {basicGuideSteps.map((step) => (
                            <button
                              key={step.id}
                              type="button"
                              onClick={() => {
                                setBasicGuideStep(step.id);
                                scrollToBuilderSection(step.sectionId);
                              }}
                              className={cn(
                                "rounded-xl border px-3 py-3 text-left transition-colors",
                                basicGuideStep === step.id
                                  ? "border-primary/30 bg-background text-foreground shadow-sm"
                                  : "border-transparent bg-background/70 text-muted-foreground hover:border-primary/20",
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium">{step.title}</p>
                                {basicStepCompletion[step.id] ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> : <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />}
                              </div>
                              <p className="mt-1 text-[11px] leading-4">{step.description}</p>
                            </button>
                          ))}
                        </div>
                        <div className="mt-4 rounded-2xl border border-border/60 bg-background/80 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{activeBasicStepMeta.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{basicStepRecommendations[basicGuideStep]}</p>
                          </div>
                          <Badge variant={basicStepCompletion[basicGuideStep] ? "outline" : "secondary"}>
                            {basicStepCompletion[basicGuideStep] ? "Ready" : "Needs attention"}
                          </Badge>
                        </div>
                        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
                          <div className="rounded-xl border border-border bg-background/75 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Step objective</p>
                            <p className="mt-2 text-sm font-medium text-foreground">{activeBasicStepMeta.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {basicStepRecommendations[basicGuideStep]}
                            </p>
                          </div>
                          <div className="rounded-xl border border-border bg-background/75 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Recommended actions</p>
                            <div className="mt-2 space-y-2">
                              {basicStepActionLabels[basicGuideStep].map((item) => (
                                <div key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      </div>
                      {basicGuideStep === "basics" ? (
                      <div id="basic-step-basics" className="grid gap-4 md:grid-cols-2 scroll-mt-28">
                        <div className="rounded-xl border border-border p-4 md:col-span-2">
                          <p className="text-sm font-semibold text-foreground">Store Basics</p>
                          <p className="mt-1 text-xs text-muted-foreground">Start with the essentials merchants expect first: identity, publishing, and where the main homepage experience lives.</p>
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label>Store Name</Label>
                              <Input value={store.name} onChange={(e) => commitStoreChange({ ...store, name: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                              <Label>Store Slug</Label>
                              <Input value={store.slug} readOnly />
                            </div>
                            <div className="grid gap-2">
                              <Label>Homepage</Label>
                              <Input value={homepagePage?.title ?? "No homepage selected"} readOnly />
                            </div>
                            <div className="grid gap-2">
                              <Label>Store Published</Label>
                              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                                <span className="text-sm text-foreground">{store.isPublished ? "Published" : "Draft"}</span>
                                <Switch checked={store.isPublished} onCheckedChange={(checked) => commitStoreChange({ ...store, isPublished: checked })} />
                              </div>
                            </div>
                            <div className="grid gap-2 md:col-span-2">
                              <Label>Store Description</Label>
                              <Textarea rows={4} value={store.description} onChange={(e) => commitStoreChange({ ...store, description: e.target.value })} />
                            </div>
                          </div>
                          <div className="mt-4 flex justify-end">
                            <Button type="button" size="sm" className="gap-2 rounded-full" onClick={() => openBasicStep("homepage")}>
                              Next Step
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      ) : renderCollapsedBasicStep("basics")}
                      {basicGuideStep === "homepage" ? (
                      <div id="basic-step-homepage" className="space-y-4 scroll-mt-28">
                        {homepagePage ? (
                          <>
                            {selectedPage?.id !== homepagePage.id ? (
                              <div className="rounded-xl border border-border/80 bg-background/80 p-4">
                                <p className="text-sm font-medium text-foreground">You are currently viewing {selectedPage?.title}.</p>
                                <p className="mt-1 text-xs text-muted-foreground">Switch to the homepage to edit the main storefront story in Basic mode.</p>
                                <Button type="button" variant="outline" size="sm" className="mt-3 rounded-full" onClick={() => openPageAndStep(homepagePage.id, "homepage")}>
                                  Switch to Homepage
                                </Button>
                              </div>
                            ) : null}
                            <div className="grid gap-4 md:grid-cols-2">
                              {homepageHeroBlock ? (
                                <div className="rounded-xl border border-border p-4 md:col-span-2">
                                  <p className="text-sm font-semibold text-foreground">Hero</p>
                                  <p className="mt-1 text-xs text-muted-foreground">Lead with one promise, one CTA, and media that helps shoppers understand the offer instantly.</p>
                                  <div className="mt-4 grid gap-3">
                                    <div className="grid gap-2">
                                      <Label>Headline</Label>
                                      <Input value={homepageHeroProps.title ?? ""} onChange={(e) => updateBlockProps(homepageHeroBlock.id, "hero", { title: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label>Highlight Text</Label>
                                      <Input value={homepageHeroProps.highlight ?? ""} onChange={(e) => updateBlockProps(homepageHeroBlock.id, "hero", { highlight: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label>Description</Label>
                                      <Textarea rows={4} value={homepageHeroProps.subtitle ?? ""} onChange={(e) => updateBlockProps(homepageHeroBlock.id, "hero", { subtitle: e.target.value })} />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div className="grid gap-2">
                                        <Label>Primary Button</Label>
                                        <Input value={homepageHeroProps.ctaText ?? ""} onChange={(e) => updateBlockProps(homepageHeroBlock.id, "hero", { ctaText: e.target.value })} />
                                      </div>
                                      <div className="grid gap-2">
                                        <Label>Primary Link</Label>
                                        <Input value={homepageHeroProps.ctaLink ?? ""} onChange={(e) => updateBlockProps(homepageHeroBlock.id, "hero", { ctaLink: e.target.value })} />
                                      </div>
                                    </div>
                                    <div className="grid gap-2">
                                      <Label>Hero Media</Label>
                                      <CloudinaryUpload
                                        value={homepageHeroProps.mediaUrl ?? ""}
                                        onChange={(url) => updateBlockProps(homepageHeroBlock.id, "hero", { mediaUrl: url })}
                                        onSelectAsset={(asset) => {
                                          if (!asset) return;
                                          updateBlockProps(homepageHeroBlock.id, "hero", { mediaType: asset.resourceType });
                                        }}
                                        folder="hero"
                                        accept="image/*,video/*"
                                        label="Upload hero media"
                                        resourceType="auto"
                                        storeId={store.id}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                              {homepagePromoBlock ? (
                                <div className="rounded-xl border border-border p-4">
                                  <p className="text-sm font-semibold text-foreground">Promotion</p>
                                  <div className="mt-4 grid gap-3">
                                    <div className="grid gap-2">
                                      <Label>Promo Title</Label>
                                      <Input value={homepagePromoProps.title ?? ""} onChange={(e) => updateBlockProps(homepagePromoBlock.id, "promo-banner", { title: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label>Promo Message</Label>
                                      <Textarea rows={4} value={homepagePromoProps.subtitle ?? ""} onChange={(e) => updateBlockProps(homepagePromoBlock.id, "promo-banner", { subtitle: e.target.value })} />
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                              {homepageFeaturedProductsBlock ? (
                                <div className="rounded-xl border border-border p-4">
                                  <p className="text-sm font-semibold text-foreground">Featured Products</p>
                                  <div className="mt-4 grid gap-3">
                                    <div className="grid gap-2">
                                      <Label>Section Title</Label>
                                      <Input value={homepageFeaturedProps.title ?? ""} onChange={(e) => updateBlockProps(homepageFeaturedProductsBlock.id, "featured-products", { title: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label>Tagline</Label>
                                      <Input value={homepageFeaturedProps.tagline ?? ""} onChange={(e) => updateBlockProps(homepageFeaturedProductsBlock.id, "featured-products", { tagline: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label>Product Count</Label>
                                      <Input type="number" min={1} max={24} value={String(homepageFeaturedProps.limit ?? 6)} onChange={(e) => updateFeaturedProductLimit(homepageFeaturedProductsBlock.id, Number(e.target.value || 6))} />
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                              {homepageFaqBlock ? (
                                <div className="rounded-xl border border-border p-4 md:col-span-2">
                                  <p className="text-sm font-semibold text-foreground">FAQ</p>
                                  <div className="mt-4 grid gap-3">
                                    <div className="grid gap-2">
                                      <Label>Heading</Label>
                                      <Input value={homepageFaqProps.title ?? ""} onChange={(e) => updateBlockProps(homepageFaqBlock.id, "faq-accordion", { title: e.target.value })} />
                                    </div>
                                    <div className="grid gap-3 rounded-lg border border-border p-3">
                                      <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-medium text-foreground">Questions</p>
                                        <Button type="button" variant="outline" size="sm" onClick={() => updateBlockProps(homepageFaqBlock.id, "faq-accordion", { faqs: [...(homepageFaqProps.faqs ?? []), { q: "", a: "" }] })}>
                                          <Plus className="h-4 w-4" />
                                          Add FAQ
                                        </Button>
                                      </div>
                                      {((homepageFaqProps.faqs ?? [])).map((faq, index) => (
                                        <div key={`${faq.q}-${index}`} className="grid gap-2 rounded-xl border border-border/70 p-3">
                                          <Input value={faq.q ?? ""} placeholder={`Question ${index + 1}`} onChange={(e) => {
                                            const next = [...(homepageFaqProps.faqs ?? [])];
                                            next[index] = { ...(next[index] ?? { q: "", a: "" }), q: e.target.value };
                                            updateBlockProps(homepageFaqBlock.id, "faq-accordion", { faqs: next });
                                          }} />
                                          <Textarea rows={3} value={faq.a ?? ""} placeholder="Answer" onChange={(e) => {
                                            const next = [...(homepageFaqProps.faqs ?? [])];
                                            next[index] = { ...(next[index] ?? { q: "", a: "" }), a: e.target.value };
                                            updateBlockProps(homepageFaqBlock.id, "faq-accordion", { faqs: next });
                                          }} />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                              {homepageSocialFeedBlock ? (
                                <div className="rounded-xl border border-border p-4">
                                  <p className="text-sm font-semibold text-foreground">Social Feed</p>
                                  <div className="mt-4 grid gap-3">
                                    <div className="grid gap-2">
                                      <Label>Title</Label>
                                      <Input value={homepageSocialProps.title ?? ""} onChange={(e) => updateBlockProps(homepageSocialFeedBlock.id, "social-feed", { title: e.target.value })} />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label>Subtitle</Label>
                                      <Input value={homepageSocialProps.subtitle ?? ""} onChange={(e) => updateBlockProps(homepageSocialFeedBlock.id, "social-feed", { subtitle: e.target.value })} />
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                              {homepageTrustBlock ? (
                                <div className="rounded-xl border border-border p-4">
                                  <p className="text-sm font-semibold text-foreground">Trust Section</p>
                                  <div className="mt-4 grid gap-3">
                                    <div className="grid gap-2">
                                      <Label>Heading</Label>
                                      <Input value={homepageTrustProps.title ?? ""} onChange={(e) => updateBlockProps(homepageTrustBlock.id, "trust-badges", { title: e.target.value })} />
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap justify-between gap-2">
                              <Button type="button" variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => openBasicStep("basics")}>
                                <ChevronLeft className="h-4 w-4" />
                                Back
                              </Button>
                              <Button type="button" size="sm" className="gap-2 rounded-full" onClick={() => openBasicStep("product")}>
                                Next Step
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
                            <p className="text-sm font-medium text-foreground">No homepage is ready yet.</p>
                            <p className="mt-1 text-xs text-muted-foreground">Create or assign a homepage in Advanced Editing, then return here for guided setup.</p>
                          </div>
                        )}
                      </div>
                      ) : renderCollapsedBasicStep("homepage")}
                      {basicGuideStep === "product" ? (
                      <div id="basic-step-product" className="space-y-4 scroll-mt-28">
                        <div className="rounded-xl border border-border p-4">
                          <p className="text-sm font-semibold text-foreground">Product Page Story</p>
                          <p className="mt-1 text-xs text-muted-foreground">Guide shoppers from browsing into confidence without touching raw block structure.</p>
                          {productStoryPages.length > 0 ? (
                            <>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {productStoryPages.map((page) => (
                                  <Button key={page.id} type="button" size="sm" variant={selectedProductPage?.id === page.id ? "secondary" : "outline"} className="rounded-full" onClick={() => openPageAndStep(page.id, "product")}>
                                    {page.title}
                                  </Button>
                                ))}
                              </div>
                              {selectedProductPage ? (
                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                  <div className="grid gap-2">
                                    <Label>Page Title</Label>
                                    <Input value={selectedPage?.id === selectedProductPage.id ? selectedPage.title : selectedProductPage.title} onChange={(e) => updateSelectedPage((page) => ({ ...page, title: e.target.value }))} />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Page Slug</Label>
                                    <Input value={selectedProductPage.slug} readOnly />
                                  </div>
                                  <div className="grid gap-2 md:col-span-2">
                                    <Label>SEO Title</Label>
                                    <Input value={selectedPage?.id === selectedProductPage.id ? selectedPage.seoTitle ?? "" : selectedProductPage.seoTitle ?? ""} onChange={(e) => updateSelectedPage((page) => ({ ...page, seoTitle: e.target.value }))} />
                                  </div>
                                  <div className="grid gap-2 md:col-span-2">
                                    <Label>SEO Description</Label>
                                    <Textarea rows={3} value={selectedPage?.id === selectedProductPage.id ? selectedPage.seoDescription ?? "" : selectedProductPage.seoDescription ?? ""} onChange={(e) => updateSelectedPage((page) => ({ ...page, seoDescription: e.target.value }))} />
                                  </div>
                                  {productRichTextBlock ? (
                                    <div className="grid gap-2 md:col-span-2 rounded-xl border border-border/70 p-3">
                                      <Label>Story Section Title</Label>
                                      <Input value={productRichTextProps.title ?? ""} onChange={(e) => updateBlockProps(productRichTextBlock.id, "rich-text", { title: e.target.value })} />
                                      <Label>Story Section Copy</Label>
                                      <Textarea rows={5} value={productRichTextProps.body ?? ""} onChange={(e) => updateBlockProps(productRichTextBlock.id, "rich-text", { body: e.target.value })} />
                                    </div>
                                  ) : null}
                                  {productTrustBlock ? (
                                    <div className="grid gap-2 rounded-xl border border-border/70 p-3">
                                      <Label>Trust Heading</Label>
                                      <Input value={productTrustProps.title ?? ""} onChange={(e) => updateBlockProps(productTrustBlock.id, "trust-badges", { title: e.target.value })} />
                                    </div>
                                  ) : null}
                                  {productFaqBlock ? (
                                    <div className="grid gap-2 rounded-xl border border-border/70 p-3">
                                      <Label>FAQ Heading</Label>
                                      <Input value={productFaqProps.title ?? ""} onChange={(e) => updateBlockProps(productFaqBlock.id, "faq-accordion", { title: e.target.value })} />
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-4">
                              <p className="text-sm font-medium text-foreground">No product-focused pages yet.</p>
                              <p className="mt-1 text-xs text-muted-foreground">Open Advanced Editing to add a catalog, collection, or product-story page first.</p>
                              <Button asChild type="button" variant="outline" size="sm" className="mt-3 rounded-full">
                                <Link to={advancedEditorHref}>Open Advanced Editing</Link>
                              </Button>
                            </div>
                          )}
                          <div className="mt-4 flex flex-wrap justify-between gap-2">
                            <Button type="button" variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => openBasicStep("homepage")}>
                              <ChevronLeft className="h-4 w-4" />
                              Back
                            </Button>
                            <Button type="button" size="sm" className="gap-2 rounded-full" onClick={() => openBasicStep("checkout")}>
                              Next Step
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      ) : renderCollapsedBasicStep("product")}
                      {basicGuideStep === "checkout" ? (
                      <div id="basic-step-checkout" className="space-y-4 rounded-xl border border-border p-4 scroll-mt-28">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Checkout Trust</p>
                          <p className="mt-1 text-xs text-muted-foreground">Customers decide whether to finish the order here. Keep payment, delivery, policy, and support expectations clear.</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {[
                            { title: "Payment Settings", detail: "Manage enabled payment methods and checkout confidence.", actionLabel: "Open Payment Settings", action: () => { window.location.href = checkoutSettingsHref; } },
                            { title: "Delivery Settings", detail: "Clarify delivery fees, timing, and fulfillment rules.", actionLabel: "Open Delivery Settings", action: () => { window.location.href = shippingSettingsHref; } },
                            { title: "Support Settings", detail: "Make help channels visible before customers hesitate.", actionLabel: "Open Support Settings", action: () => { window.location.href = supportSettingsHref; } },
                            { title: "Policy Content", detail: "Keep refund, exchange, and policy guidance easy to find.", actionLabel: "Open FAQ / Policy", action: () => { window.location.href = faqSettingsHref; } },
                          ].map((item) => (
                            <div key={item.title} className="rounded-xl border border-border/70 bg-background/80 p-4">
                              <p className="text-sm font-medium text-foreground">{item.title}</p>
                              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                              <Button type="button" variant="outline" size="sm" className="mt-4 rounded-full" onClick={item.action}>
                                {item.actionLabel}
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap justify-between gap-2">
                          <Button type="button" variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => openBasicStep("product")}>
                            <ChevronLeft className="h-4 w-4" />
                            Back
                          </Button>
                          <Button type="button" size="sm" className="gap-2 rounded-full" onClick={() => openBasicStep("custom")}>
                            Next Step
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      ) : renderCollapsedBasicStep("checkout")}
                      {basicGuideStep === "custom" ? (
                      <div id="basic-step-custom" className="space-y-4 scroll-mt-28">
                        <div className="rounded-xl border border-border p-4">
                          <p className="text-sm font-semibold text-foreground">Custom Pages</p>
                          <p className="mt-1 text-xs text-muted-foreground">Use supporting pages for FAQs, brand story, policy, and reassurance without dropping into block lists.</p>
                          {customContentPages.length > 0 ? (
                            <>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {customContentPages.map((page) => (
                                  <Button key={page.id} type="button" size="sm" variant={selectedCustomContentPage?.id === page.id ? "secondary" : "outline"} className="rounded-full" onClick={() => openPageAndStep(page.id, "custom")}>
                                    {page.title}
                                  </Button>
                                ))}
                              </div>
                              {selectedCustomContentPage ? (
                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                  <div className="grid gap-2">
                                    <Label>Page Title</Label>
                                    <Input value={selectedPage?.id === selectedCustomContentPage.id ? selectedPage.title : selectedCustomContentPage.title} onChange={(e) => updateSelectedPage((page) => ({ ...page, title: e.target.value }))} />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Page Slug</Label>
                                    <Input value={selectedCustomContentPage.slug} readOnly />
                                  </div>
                                  {customRichTextBlock ? (
                                    <div className="grid gap-2 md:col-span-2 rounded-xl border border-border/70 p-3">
                                      <Label>Page Heading</Label>
                                      <Input value={customRichTextProps.title ?? ""} onChange={(e) => updateBlockProps(customRichTextBlock.id, "rich-text", { title: e.target.value })} />
                                      <Label>Page Body</Label>
                                      <Textarea rows={6} value={customRichTextProps.body ?? ""} onChange={(e) => updateBlockProps(customRichTextBlock.id, "rich-text", { body: e.target.value })} />
                                    </div>
                                  ) : null}
                                  {customFaqBlock ? (
                                    <div className="grid gap-2 rounded-xl border border-border/70 p-3">
                                      <Label>FAQ Heading</Label>
                                      <Input value={customFaqProps.title ?? ""} onChange={(e) => updateBlockProps(customFaqBlock.id, "faq-accordion", { title: e.target.value })} />
                                    </div>
                                  ) : null}
                                  {customTrustBlock ? (
                                    <div className="grid gap-2 rounded-xl border border-border/70 p-3">
                                      <Label>Trust Heading</Label>
                                      <Input value={customTrustProps.title ?? ""} onChange={(e) => updateBlockProps(customTrustBlock.id, "trust-badges", { title: e.target.value })} />
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-4">
                              <p className="text-sm font-medium text-foreground">No custom pages are available yet.</p>
                              <p className="mt-1 text-xs text-muted-foreground">Add an About, FAQ, or policy page in Advanced Editing first, then return here for guided copy updates.</p>
                            </div>
                          )}
                          <div className="mt-4 flex flex-wrap justify-between gap-2">
                            <Button type="button" variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => openBasicStep("checkout")}>
                              <ChevronLeft className="h-4 w-4" />
                              Back
                            </Button>
                            <Button type="button" size="sm" className="gap-2 rounded-full" onClick={() => openBasicStep("launch")}>
                              Next Step
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      ) : renderCollapsedBasicStep("custom")}
                      {basicGuideStep === "launch" ? (
                      <div id="basic-step-launch" className="space-y-4 rounded-xl border border-dashed border-border bg-muted/20 p-4 scroll-mt-28">
                        <div>
                          <p className="text-sm font-medium text-foreground">Preview & Publish</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Preview the live storefront, save confidently, and only open Advanced Editing when you truly need structure or code-level controls.
                          </p>
                        </div>
                        <div className="grid gap-3 lg:grid-cols-3">
                          {[
                            {
                              title: "Message check",
                              ready: Boolean(homepageHeroProps.title && homepageHeroProps.ctaText),
                              detail: "Your headline and CTA should tell shoppers what to do next immediately.",
                            },
                            {
                              title: "Trust check",
                              ready: Boolean(
                                ((homepageFaqProps.faqs ?? []).length > 0)
                                || Boolean(homepageTrustProps.title)
                                || Boolean(homepageTestimonialsProps.title),
                              ),
                              detail: "Make sure support answers, proof, or trust cues appear before customers hesitate.",
                            },
                            {
                              title: "Publish check",
                              ready: Boolean(store.isPublished && !hasUnsavedChanges),
                              detail: "Go live after preview when the page feels coherent on mobile and desktop.",
                            },
                          ].map((item) => (
                            <div key={item.title} className="rounded-xl border border-border/70 bg-background/80 p-3">
                              <div className="flex items-center gap-2">
                                <Badge variant={item.ready ? "outline" : "secondary"}>{item.ready ? "Ready" : "Review"}</Badge>
                                <p className="text-sm font-medium text-foreground">{item.title}</p>
                              </div>
                              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                            </div>
                          ))}
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-xl border border-border/70 bg-background/80 p-3 text-xs text-muted-foreground">Status: {basicStatusLabel}</div>
                          <div className="rounded-xl border border-border/70 bg-background/80 p-3 text-xs text-muted-foreground">Undo and redo are always available from the dock.</div>
                          <div className="rounded-xl border border-border/70 bg-background/80 p-3 text-xs text-muted-foreground">Need templates, raw JSON, CSS, or structure changes? Use Advanced.</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" className="gap-2 rounded-full" onClick={openPreviewWorkspace}>
                            <Eye className="h-4 w-4" />
                            Preview storefront
                          </Button>
                          <Button type="button" size="sm" onClick={() => void saveAll()} disabled={saving} className="gap-2 rounded-full">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save changes
                          </Button>
                          <Button asChild type="button" variant="outline" size="sm" className="rounded-full">
                            <Link to={advancedEditorHref}>Open Advanced Editing</Link>
                          </Button>
                        </div>
                        <div className="flex justify-start">
                          <Button type="button" variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => {
                            setBasicGuideStep("custom");
                            scrollToBuilderSection("basic-step-custom");
                          }}>
                            <ChevronLeft className="h-4 w-4" />
                            Back
                          </Button>
                        </div>
                      </div>
                      ) : renderCollapsedBasicStep("launch")}
                    </div>
                  ) : null}
                  {isAdvancedEditor ? (
                  <div className="sticky top-16 z-10 -mx-6 border-y border-border/60 bg-background/95 px-6 py-3 backdrop-blur-xl md:hidden">
                    <div className="overflow-x-auto">
                      <div className="flex min-w-max items-center gap-2">
                        {[
                          { id: "block-library", label: "Add" },
                          { id: "block-list", label: "List" },
                          selectedBlock ? { id: `cms-block-${selectedBlock.id}`, label: "Focused" } : null,
                        ].filter(Boolean).map((item) => (
                          <button
                            key={(item as { id: string; label: string }).id}
                            type="button"
                            onClick={() => scrollToBuilderSection((item as { id: string; label: string }).id)}
                            className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground"
                          >
                            {(item as { id: string; label: string }).label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  ) : null}
                  {isAdvancedEditor && selectedPage.blocks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No blocks yet. Add one to start composing this page for the current blueprint.
                    </div>
                  ) : null}

                  {isAdvancedEditor && selectedPage.blocks.length > 0 ? (
                    <div id="block-library" className="rounded-xl border border-border bg-muted/20 p-3 scroll-mt-36">
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedPage.blocks.map((block, index) => {
                          const blockMeta = getCmsBlockRegistryItem(block.type, blockRegistry);

                          return (
                            <Button
                              key={block.id}
                              type="button"
                              size="sm"
                              variant={selectedBlockId === block.id ? "secondary" : "outline"}
                              className="h-8"
                              onClick={() => {
                                setSelectedBlockId(block.id);
                                setIsMobileSettingsOpen(true);
                                scrollToBuilderSection(`cms-block-${block.id}`);
                              }}
                            >
                              {index + 1}. {blockMeta?.label ?? block.type}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {isAdvancedEditor ? (
                  <div id="block-list" className="space-y-4 scroll-mt-36">
                  {selectedPage.blocks.map((block, index) => {
                    const blockMeta = getCmsBlockRegistryItem(block.type, blockRegistry);
                    const isFocused = selectedBlockId === block.id;

                    return (
                      <div
                        key={block.id}
                        id={`cms-block-${block.id}`}
                        className={`rounded-xl border bg-card/60 p-4 transition-colors ${
                          isFocused ? "border-primary bg-primary/5 shadow-sm" : "border-border"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <LayoutTemplate className="h-4 w-4 text-primary" />
                              <p className="text-sm font-semibold text-foreground">{blockMeta?.label ?? block.type}</p>
                              <Badge variant="outline">#{index + 1}</Badge>
                              {isFocused ? <Badge variant="secondary">Editing</Badge> : null}
                            </div>
                            <p className="mt-1 hidden text-xs text-muted-foreground md:block">{blockMeta?.description}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" size="sm" variant={isFocused ? "secondary" : "outline"} onClick={() => setSelectedBlockId(block.id)}>
                              {isFocused ? "Focused" : "Edit Block"}
                            </Button>
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={index === 0} onClick={() => moveBlock(block.id, -1)}>
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={index === selectedPage.blocks.length - 1} onClick={() => moveBlock(block.id, 1)}>
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => duplicateBlock(block.id)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateBlock(block.id, (current) => ({ ...current, isVisible: !current.isVisible }))}>
                              {block.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </Button>
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeBlock(block.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between rounded-lg border border-border/70 bg-background/70 px-3 py-2 md:hidden">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-foreground">
                              {isFocused ? "Focused block editor" : "Tap edit to focus this block"}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {block.isVisible ? "Visible on storefront" : "Hidden from storefront"}
                            </p>
                          </div>
                          {!isFocused ? (
                            <Button type="button" size="sm" variant="outline" onClick={() => setSelectedBlockId(block.id)}>
                              Edit
                            </Button>
                          ) : null}
                        </div>

                        <div className={cn("mt-4 grid gap-4", !isFocused && "hidden md:grid")}>
                          <div className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">Visible on storefront</p>
                              <p className="text-xs text-muted-foreground">Hide a block without deleting its configuration.</p>
                            </div>
                            <Switch checked={block.isVisible} onCheckedChange={(checked) => updateBlock(block.id, (current) => ({ ...current, isVisible: checked }))} />
                          </div>

                          {!isFocused ? (
                            <div className="hidden rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground md:block">
                              Select this block to open its content controls and edit fields.
                            </div>
                          ) : null}

                          {isFocused && block.type === "featured-products" ? (
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="grid gap-2 md:max-w-[240px]">
                                <Label>Product Limit</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={24}
                                  value={String(block.props.limit ?? 6)}
                                  onChange={(e) => updateFeaturedProductLimit(block.id, Number(e.target.value || 6))}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Tagline</Label>
                                <Input value={block.props.tagline ?? ""} onChange={(e) => updateBlockProps(block.id, "featured-products", { tagline: e.target.value })} />
                              </div>
                              <div className="grid gap-2 md:col-span-2">
                                <Label>Section Title</Label>
                                <Input value={block.props.title ?? ""} onChange={(e) => updateBlockProps(block.id, "featured-products", { title: e.target.value })} />
                              </div>
                            </div>
                          ) : null}

                          {isFocused && block.type === "countdown" ? (
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="grid gap-2 md:col-span-2">
                                <Label>Title</Label>
                                <Input value={block.props.title ?? ""} onChange={(e) => updateBlockProps(block.id, "countdown", { title: e.target.value })} />
                              </div>
                              <div className="grid gap-2 md:col-span-2">
                                <Label>Subtitle</Label>
                                <Input value={block.props.subtitle ?? ""} onChange={(e) => updateBlockProps(block.id, "countdown", { subtitle: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>End Date</Label>
                                <Input value={block.props.endDate ?? ""} placeholder="2026-12-31T23:59:59" onChange={(e) => updateBlockProps(block.id, "countdown", { endDate: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Background</Label>
                                <Input value={block.props.bgGradient ?? ""} placeholder="linear-gradient(...)" onChange={(e) => updateBlockProps(block.id, "countdown", { bgGradient: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>CTA Text</Label>
                                <Input value={block.props.ctaText ?? ""} onChange={(e) => updateBlockProps(block.id, "countdown", { ctaText: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>CTA Link</Label>
                                <Input value={block.props.ctaLink ?? ""} onChange={(e) => updateBlockProps(block.id, "countdown", { ctaLink: e.target.value })} />
                              </div>
                            </div>
                          ) : null}

                          {isFocused && block.type === "hero" ? (
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="grid gap-2">
                                <Label>Tagline</Label>
                                <Input value={block.props.tagline ?? ""} onChange={(e) => updateBlockProps(block.id, "hero", { tagline: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Anchor ID</Label>
                                <Input value={block.props.anchorId ?? ""} onChange={(e) => updateBlockProps(block.id, "hero", { anchorId: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Title</Label>
                                <Input value={block.props.title ?? ""} onChange={(e) => updateBlockProps(block.id, "hero", { title: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Highlight</Label>
                                <Input value={block.props.highlight ?? ""} onChange={(e) => updateBlockProps(block.id, "hero", { highlight: e.target.value })} />
                              </div>
                              <div className="grid gap-2 md:col-span-2">
                                <Label>Subtitle</Label>
                                <Textarea rows={4} value={block.props.subtitle ?? ""} onChange={(e) => updateBlockProps(block.id, "hero", { subtitle: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Primary CTA Text</Label>
                                <Input value={block.props.ctaText ?? ""} onChange={(e) => updateBlockProps(block.id, "hero", { ctaText: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Primary CTA Link</Label>
                                <Input value={block.props.ctaLink ?? ""} onChange={(e) => updateBlockProps(block.id, "hero", { ctaLink: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Secondary CTA Text</Label>
                                <Input value={block.props.secondaryCtaText ?? ""} onChange={(e) => updateBlockProps(block.id, "hero", { secondaryCtaText: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Secondary CTA Link</Label>
                                <Input value={block.props.secondaryCtaLink ?? ""} onChange={(e) => updateBlockProps(block.id, "hero", { secondaryCtaLink: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Media URL</Label>
                                <CloudinaryUpload
                                  value={block.props.mediaUrl ?? ""}
                                  onChange={(url) => updateBlockProps(block.id, "hero", { mediaUrl: url })}
                                  onSelectAsset={(asset) => {
                                    if (!asset) return;
                                    updateBlockProps(block.id, "hero", { mediaType: asset.resourceType });
                                  }}
                                  folder="hero"
                                  accept="image/*,video/*"
                                  label="Upload hero media"
                                  resourceType="auto"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Media Type</Label>
                                <Select value={(block.props.mediaType as "image" | "video" | undefined) ?? "image"} onValueChange={(value) => updateBlockProps(block.id, "hero", { mediaType: value })}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="image">Image</SelectItem>
                                    <SelectItem value="video">Video</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Overlay Color</Label>
                                <Input value={block.props.overlayColor ?? ""} placeholder="#000000" onChange={(e) => updateBlockProps(block.id, "hero", { overlayColor: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Overlay Opacity</Label>
                                <Input type="number" min={0} max={100} value={String(block.props.overlayOpacity ?? 50)} onChange={(e) => updateBlockProps(block.id, "hero", { overlayOpacity: Number(e.target.value || 50) })} />
                              </div>
                            </div>
                          ) : null}

                          {isFocused && block.type === "promo-banner" ? (
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="grid gap-2 md:col-span-2">
                                <Label>Title</Label>
                                <Input value={block.props.title ?? ""} onChange={(e) => updateBlockProps(block.id, "promo-banner", { title: e.target.value })} />
                              </div>
                              <div className="grid gap-2 md:col-span-2">
                                <Label>Subtitle</Label>
                                <Textarea rows={4} value={block.props.subtitle ?? ""} onChange={(e) => updateBlockProps(block.id, "promo-banner", { subtitle: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Badge Text</Label>
                                <Input value={block.props.badgeText ?? ""} onChange={(e) => updateBlockProps(block.id, "promo-banner", { badgeText: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Background Style</Label>
                                <Select value={(block.props.bgStyle as string | undefined) ?? "gradient"} onValueChange={(value) => updateBlockProps(block.id, "promo-banner", { bgStyle: value })}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="gradient">Gradient</SelectItem>
                                    <SelectItem value="dark">Dark</SelectItem>
                                    <SelectItem value="accent">Accent</SelectItem>
                                    <SelectItem value="luxury-gold">Luxury Gold</SelectItem>
                                    <SelectItem value="indigo">Indigo</SelectItem>
                                    <SelectItem value="rose">Rose</SelectItem>
                                    <SelectItem value="aurora">Aurora</SelectItem>
                                    <SelectItem value="luxury-dark">Luxury Dark</SelectItem>
                                    <SelectItem value="confetti">Confetti</SelectItem>
                                    <SelectItem value="mesh-gradient">Mesh Gradient</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>CTA Text</Label>
                                <Input value={block.props.ctaText ?? ""} onChange={(e) => updateBlockProps(block.id, "promo-banner", { ctaText: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>CTA Link</Label>
                                <Input value={block.props.ctaLink ?? ""} onChange={(e) => updateBlockProps(block.id, "promo-banner", { ctaLink: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Text Alignment</Label>
                                <Select value={(block.props.textAlignment as string | undefined) ?? "center"} onValueChange={(value) => updateBlockProps(block.id, "promo-banner", { textAlignment: value })}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="left">Left</SelectItem>
                                    <SelectItem value="center">Center</SelectItem>
                                    <SelectItem value="right">Right</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Padding Size</Label>
                                <Select value={(block.props.paddingSize as string | undefined) ?? "cozy"} onValueChange={(value) => updateBlockProps(block.id, "promo-banner", { paddingSize: value })}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="compact">Compact</SelectItem>
                                    <SelectItem value="cozy">Cozy</SelectItem>
                                    <SelectItem value="large">Large</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>Card Opacity</Label>
                                <Input type="number" min={0} max={100} value={String(block.props.cardOpacity ?? 0)} onChange={(e) => updateBlockProps(block.id, "promo-banner", { cardOpacity: Number(e.target.value || 0) })} />
                              </div>
                              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                                <Label>Glow Button</Label>
                                <Switch checked={(block.props.enableGlow as boolean | undefined) ?? false} onCheckedChange={(checked) => updateBlockProps(block.id, "promo-banner", { enableGlow: checked })} />
                              </div>
                              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                                <Label>Particles</Label>
                                <Switch checked={(block.props.enableParticles as boolean | undefined) ?? true} onCheckedChange={(checked) => updateBlockProps(block.id, "promo-banner", { enableParticles: checked })} />
                              </div>
                              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                                <Label>Orbs</Label>
                                <Switch checked={(block.props.enableOrbs as boolean | undefined) ?? true} onCheckedChange={(checked) => updateBlockProps(block.id, "promo-banner", { enableOrbs: checked })} />
                              </div>
                            </div>
                          ) : null}

                          {isFocused && block.type === "category-showcase" ? (
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="grid gap-2">
                                <Label>Tagline</Label>
                                <Input value={block.props.tagline ?? ""} onChange={(e) => updateBlockProps(block.id, "category-showcase", { tagline: e.target.value })} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Title</Label>
                                <Input value={block.props.title ?? ""} onChange={(e) => updateBlockProps(block.id, "category-showcase", { title: e.target.value })} />
                              </div>
                            </div>
                          ) : null}

                          {isFocused && block.type === "rich-text" ? (
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="grid gap-2 md:col-span-2">
                                <Label>Eyebrow</Label>
                                <Input value={block.props.eyebrow ?? ""} onChange={(e) => updateRichTextBlockField(block.id, "eyebrow", e.target.value)} />
                              </div>
                              <div className="grid gap-2 md:col-span-2">
                                <Label>Title</Label>
                                <Input value={block.props.title ?? ""} onChange={(e) => updateRichTextBlockField(block.id, "title", e.target.value)} />
                              </div>
                              <div className="grid gap-2 md:col-span-2">
                                <Label>Body</Label>
                                <Textarea rows={5} value={block.props.body ?? ""} onChange={(e) => updateRichTextBlockField(block.id, "body", e.target.value)} />
                              </div>
                              <div className="grid gap-2 md:max-w-[240px]">
                                <Label>Alignment</Label>
                                <Select value={(block.props.align as "left" | "center" | undefined) ?? "center"} onValueChange={(value) => updateRichTextBlockField(block.id, "align", value)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="center">Center</SelectItem>
                                    <SelectItem value="left">Left</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : null}

                          {isFocused && block.type === "recently-viewed" ? (
                            <div className="grid gap-2 md:col-span-2">
                              <Label>Section Title</Label>
                              <Input value={block.props.title ?? ""} onChange={(e) => updateBlockProps(block.id, "recently-viewed", { title: e.target.value })} />
                            </div>
                          ) : null}

                                                      {isFocused && block.type === "social-feed" ? (
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2 md:col-span-2">
                                  <Label>Title</Label>
                                  <Input value={block.props.title ?? ""} onChange={(e) => updateBlockProps(block.id, "social-feed", { title: e.target.value })} />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                  <Label>Subtitle</Label>
                                  <Input value={block.props.subtitle ?? ""} onChange={(e) => updateBlockProps(block.id, "social-feed", { subtitle: e.target.value })} />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                  <Label>Images (Comma separated URLs)</Label>
                                  <Textarea value={((block.props.images as string[]) || []).join(', ')} onChange={(e) => updateBlockProps(block.id, "social-feed", { images: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="https://..., https://..." />
                                </div>
                              </div>
                            ) : null}

                            {isFocused && block.type === "video-reel" ? (
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2 md:col-span-2">
                                  <Label>Title Over Video</Label>
                                  <Input value={block.props.title ?? ""} onChange={(e) => updateBlockProps(block.id, "video-reel", { title: e.target.value })} />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                  <Label>Video URL (.mp4)</Label>
                                  <Input value={block.props.videoUrl ?? ""} onChange={(e) => updateBlockProps(block.id, "video-reel", { videoUrl: e.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Call to Action Text</Label>
                                  <Input value={block.props.ctaText ?? ""} onChange={(e) => updateBlockProps(block.id, "video-reel", { ctaText: e.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Call to Action Link</Label>
                                  <Input value={block.props.ctaLink ?? ""} onChange={(e) => updateBlockProps(block.id, "video-reel", { ctaLink: e.target.value })} />
                                </div>
                              </div>
                            ) : null}

                            {isFocused && block.type === "faq-accordion" ? (
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2 md:col-span-2">
                                  <Label>Title</Label>
                                  <Input value={block.props.title ?? ""} onChange={(e) => updateBlockProps(block.id, "faq-accordion", { title: e.target.value })} />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                  <Label>Subtitle</Label>
                                  <Input value={block.props.subtitle ?? ""} onChange={(e) => updateBlockProps(block.id, "faq-accordion", { subtitle: e.target.value })} />
                                </div>
                                <div className="grid gap-2 md:col-span-2 border border-border p-3 rounded-lg">
                                  <p className="text-sm font-medium mb-2">FAQ Items</p>
                                  <p className="text-xs text-muted-foreground mb-4">Edit via JSON for now. Standard format: {`[{"q": "Question?", "a": "Answer"}]`}</p>
                                  <Textarea rows={6} className="font-mono text-xs" value={JSON.stringify(block.props.faqs || [], null, 2)} onChange={(e) => {
                                    try {
                                      const parsed = JSON.parse(e.target.value);
                                      updateBlockProps(block.id, "faq-accordion", { faqs: parsed });
                                    } catch(err) { /* ignore JSON error until valid */ }
                                  }} />
                                </div>
                              </div>
                            ) : null}

                            {isFocused && block.type === "trust-badges" ? (
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2 md:col-span-2">
                                  <Label>Title</Label>
                                  <Input value={block.props.title ?? ""} onChange={(e) => updateBlockProps(block.id, "trust-badges", { title: e.target.value })} />
                                </div>
                                <div className="grid gap-2 md:col-span-2 border border-border p-3 rounded-lg">
                                  <p className="text-sm font-medium mb-2">Badges</p>
                                  <p className="text-xs text-muted-foreground mb-4">Edit via JSON. Icons: truck, payment, returns, support, shield.</p>
                                  <Textarea rows={6} className="font-mono text-xs" value={JSON.stringify(block.props.badges || [], null, 2)} onChange={(e) => {
                                    try {
                                      const parsed = JSON.parse(e.target.value);
                                      updateBlockProps(block.id, "trust-badges", { badges: parsed });
                                    } catch(err) { /* ignore JSON error until valid */ }
                                  }} />
                                </div>
                              </div>
                            ) : null}

                            {isFocused && block.type === "testimonials" ? (
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2 md:col-span-2">
                                  <Label>Title</Label>
                                  <Input value={block.props.title ?? ""} onChange={(e) => updateBlockProps(block.id, "testimonials", { title: e.target.value })} />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                  <Label>Subtitle</Label>
                                  <Input value={block.props.subtitle ?? ""} onChange={(e) => updateBlockProps(block.id, "testimonials", { subtitle: e.target.value })} />
                                </div>
                                <div className="grid gap-2 md:col-span-2 border border-border p-3 rounded-lg">
                                  <p className="text-sm font-medium mb-2">Reviews</p>
                                  <p className="text-xs text-muted-foreground mb-4">Edit via JSON. Format: {`[{"name": "Customer", "rating": 5, "comment": "Review"}]`}</p>
                                  <Textarea rows={6} className="font-mono text-xs" value={JSON.stringify(block.props.reviews || [], null, 2)} onChange={(e) => {
                                    try {
                                      const parsed = JSON.parse(e.target.value);
                                      updateBlockProps(block.id, "testimonials", { reviews: parsed });
                                    } catch(err) { /* ignore JSON error until valid */ }
                                  }} />
                                </div>
                              </div>
                            ) : null}

                            {isFocused ? (
                              <div className="grid gap-2 rounded-lg border border-border p-3">
                                <Label>Raw Block Props JSON</Label>
                                <Textarea
                                  rows={10}
                                  className="font-mono text-xs"
                                  value={JSON.stringify(block.props ?? {}, null, 2)}
                                  onChange={(e) => {
                                    try {
                                      const parsed = JSON.parse(e.target.value) as Record<string, unknown>;
                                      updateBlock(block.id, (current) => ({
                                        ...current,
                                        props: parsed,
                                      } as StorePageBlock));
                                    } catch {
                                      // Keep current value until JSON becomes valid again.
                                    }
                                  }}
                                />
                                <p className="text-xs text-muted-foreground">Advanced mode only. Edit the raw block payload directly when you need full control.</p>
                              </div>
                            ) : null}

                            {isFocused && !["featured-products", "rich-text", "countdown", "hero", "promo-banner", "category-showcase", "recently-viewed", "social-feed", "video-reel", "faq-accordion", "trust-badges", "testimonials"].includes(block.type) ? (
                            <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                              This block currently uses the existing storefront component and its existing site settings. Block-specific editing can be expanded next.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                  ) : null}
                </CardContent>
              </Card>

              {desktopPreviewMode === "below" ? (
                <Card className="border-border overflow-hidden">
                <div id="page-builder-preview" />
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">Live Preview</CardTitle>
                    <CardDescription>
                      Current editor state rendered with the storefront theme.
                      {selectedBlock ? ` Preview is synced to ${selectedBlock.type}.` : ""}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center rounded-lg border border-border p-1">
                      <Button
                        type="button"
                        size="icon"
                        variant={previewViewport === "desktop" ? "secondary" : "ghost"}
                        aria-label="Desktop preview"
                        title="Desktop preview"
                        className="h-8 w-8"
                        onClick={() => setPreviewViewport("desktop")}
                      >
                        <Monitor className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant={previewViewport === "mobile" ? "secondary" : "ghost"}
                        aria-label="Mobile preview"
                        title="Mobile preview"
                        className="h-8 w-8"
                        onClick={() => setPreviewViewport("mobile")}
                      >
                        <Smartphone className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center rounded-lg border border-border p-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={desktopPreviewMode === "below" ? "secondary" : "ghost"}
                        className="h-8 rounded-md px-3 text-xs"
                        onClick={() => setDesktopPreviewMode("below")}
                      >
                        Below
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-md px-3 text-xs"
                        onClick={() => setDesktopPreviewMode("side")}
                      >
                        Side
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-md px-3 text-xs"
                        onClick={() => {
                          setDesktopPreviewMode("side");
                          setDesktopPreviewSide((current) => (current === "right" ? "left" : "right"));
                        }}
                      >
                        Flip Side
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-md px-3 text-xs"
                        onClick={() => setDesktopPreviewMode("minimized")}
                      >
                        Min
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-md px-3 text-xs"
                        onClick={() => setDesktopPreviewMode("hidden")}
                      >
                        Hide
                      </Button>
                    </div>
                    <Badge variant="outline">{selectedPage.slug}</Badge>
                  </div>
                </CardHeader>
                <CardContent>{previewCanvas}</CardContent>
              </Card>
              ) : null}

              {isAdvancedEditor ? (
                <Card className="border-border">
                  <div id="advanced-code-panels" />
                  <CardHeader>
                    <CardTitle className="text-lg">Code Panels</CardTitle>
                    <CardDescription>Technical editing surfaces for raw page payloads, selected block props, and layout import/export workflows.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Tabs value={activeAdvancedCodePanel} onValueChange={(value) => setActiveAdvancedCodePanel(value as AdvancedCodePanel)} className="space-y-4">
                      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-secondary/40 p-1">
                        <TabsTrigger value="page-json" className="gap-2"><Code2 className="h-4 w-4" /> Page JSON</TabsTrigger>
                        <TabsTrigger value="block-json" className="gap-2"><FileText className="h-4 w-4" /> Block JSON</TabsTrigger>
                        <TabsTrigger value="theme-css" className="gap-2"><Wand2 className="h-4 w-4" /> Theme CSS</TabsTrigger>
                        <TabsTrigger value="layout" className="gap-2"><LayoutTemplate className="h-4 w-4" /> Layout Tools</TabsTrigger>
                      </TabsList>

                      <TabsContent value="page-json" className="grid gap-3 rounded-lg border border-border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">Current Page JSON</p>
                            <p className="text-xs text-muted-foreground">Edit the selected page schema directly when you want to batch structural content changes without touching one field at a time.</p>
                          </div>
                          <Badge variant="outline">{selectedPage?.slug ?? "/"}</Badge>
                        </div>
                        <Textarea rows={20} className="font-mono text-xs" value={advancedPageJsonDraft} onChange={(event) => setAdvancedPageJsonDraft(event.target.value)} />
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setAdvancedPageJsonDraft(advancedPageJson)} className="gap-2">
                            <RefreshCcw className="h-4 w-4" />
                            Reset
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => void copyBuilderText(advancedPageJsonDraft, "page JSON")} className="gap-2">
                            <ClipboardCopy className="h-4 w-4" />
                            Copy
                          </Button>
                          <Button type="button" size="sm" onClick={applyAdvancedPageJson} className="gap-2">
                            <Rocket className="h-4 w-4" />
                            Apply To Draft
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="block-json" className="grid gap-3 rounded-lg border border-border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">Selected Block JSON</p>
                            <p className="text-xs text-muted-foreground">Technical editors can patch deep block props here, then return to the visual preview to confirm the result.</p>
                          </div>
                          <Badge variant="outline">{advancedJsonLabel}</Badge>
                        </div>
                        <Textarea
                          rows={20}
                          className="font-mono text-xs"
                          value={advancedSelectedBlockJsonDraft}
                          onChange={(event) => setAdvancedSelectedBlockJsonDraft(event.target.value)}
                          placeholder="Select a block to edit its raw JSON payload."
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setAdvancedSelectedBlockJsonDraft(selectedBlockJson)} className="gap-2" disabled={!selectedBlock}>
                            <RefreshCcw className="h-4 w-4" />
                            Reset
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => void copyBuilderText(advancedSelectedBlockJsonDraft, "block JSON")} className="gap-2" disabled={!selectedBlock}>
                            <ClipboardCopy className="h-4 w-4" />
                            Copy
                          </Button>
                          <Button type="button" size="sm" onClick={applyAdvancedSelectedBlockJson} className="gap-2" disabled={!selectedBlock}>
                            <Rocket className="h-4 w-4" />
                            Apply To Draft
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="theme-css" className="grid gap-3 rounded-lg border border-border p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">Custom Theme CSS</p>
                            <p className="text-xs text-muted-foreground">Use store-scoped CSS for precise polish after theme tokens and guided controls are no longer enough.</p>
                          </div>
                          <Badge variant="outline">store.theme.customCss</Badge>
                        </div>
                        <Textarea rows={16} className="font-mono text-xs" value={advancedThemeCssDraft} onChange={(event) => setAdvancedThemeCssDraft(event.target.value)} />
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setAdvancedThemeCssDraft(store.theme.customCss ?? "")} className="gap-2">
                            <RefreshCcw className="h-4 w-4" />
                            Reset
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => void copyBuilderText(advancedThemeCssDraft, "theme CSS")} className="gap-2">
                            <ClipboardCopy className="h-4 w-4" />
                            Copy
                          </Button>
                          <Button type="button" size="sm" onClick={applyAdvancedThemeCss} className="gap-2">
                            <Rocket className="h-4 w-4" />
                            Apply To Draft
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="layout" className="grid gap-4 rounded-lg border border-border p-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">Layout Import / Export</p>
                          <p className="mt-1 text-xs text-muted-foreground">Move full storefront structures between workspaces, archive current drafts, or hand off a JSON package to a technical teammate.</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Button type="button" variant="outline" onClick={exportStoreLayout} className="gap-2">
                            <Download className="h-4 w-4" />
                            Export Current Layout
                          </Button>
                          <Button type="button" variant="outline" onClick={() => layoutImportInputRef.current?.click()} className="gap-2">
                            <Import className="h-4 w-4" />
                            Import Layout Package
                          </Button>
                        </div>
                        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground">
                          Layout import replaces the local draft after confirmation. Save after importing so the normalized persistence flow writes the result as the next storefront revision.
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : null}

              {isAdvancedEditor ? (
                <Card id="advanced-revisions" className="border-border scroll-mt-36">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <History className="h-4 w-4 text-primary" />
                      Revision History
                    </CardTitle>
                    <CardDescription>Recent saved snapshots for this page. Restore loads the snapshot back into the editor.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {loadingRevisions ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : null}

                    {!loadingRevisions && revisions.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                        No saved revisions yet. The first snapshot appears after you save the CMS.
                      </div>
                    ) : null}

                    {revisions.map((revision) => (
                      <div key={revision.id} className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{revision.revision_label}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(revision.created_at).toLocaleString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => restoreRevision(revision.id)}>
                          Restore
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Custom storefront pages should avoid app-owned slugs like `/shop`, `/product`, `/checkout`, or `/admin`. Local previews can resolve through the configured local store slug when one is set.
                </div>
                {desktopPreviewMode === "minimized" ? (
                  <div className="hidden lg:flex fixed right-24 top-28 z-30 items-center gap-2 rounded-full border border-border/80 bg-background/95 px-3 py-2 shadow-xl backdrop-blur-xl">
                    <Eye className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-foreground">Preview minimized</span>
                    <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={() => setDesktopPreviewMode("side")}>
                      Reopen
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={() => setDesktopPreviewMode("hidden")}>
                      Hide
                    </Button>
                  </div>
                ) : null}
                {desktopPreviewMode === "side" ? (
                  <div className={cn(
                    "hidden lg:block fixed top-24 z-30 w-[min(460px,calc(100vw-8rem))]",
                    desktopPreviewSide === "right" ? "right-24" : "left-24",
                  )}>
                    <Card className="overflow-hidden border-border/80 bg-background/95 shadow-2xl backdrop-blur-xl">
                      <CardHeader className="space-y-3 border-b border-border/70 pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">Live Preview</CardTitle>
                            <CardDescription>
                              Floating storefront preview for quicker merchant review without leaving the editor.
                            </CardDescription>
                          </div>
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setDesktopPreviewMode("minimized")}>
                            <PanelRightClose className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center rounded-lg border border-border p-1">
                            <Button
                              type="button"
                              size="icon"
                              variant={previewViewport === "desktop" ? "secondary" : "ghost"}
                              className="h-8 w-8"
                              onClick={() => setPreviewViewport("desktop")}
                            >
                              <Monitor className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant={previewViewport === "mobile" ? "secondary" : "ghost"}
                              className="h-8 w-8"
                              onClick={() => setPreviewViewport("mobile")}
                            >
                              <Smartphone className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setDesktopPreviewMode("below")}>
                            Push Below
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setDesktopPreviewSide((current) => (current === "right" ? "left" : "right"))}>
                            Move {desktopPreviewSide === "right" ? "Left" : "Right"}
                          </Button>
                          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setDesktopPreviewMode("hidden")}>
                            Close
                          </Button>
                          <Button type="button" variant="outline" size="sm" asChild className="rounded-full">
                            <a href={previewHref} target="_blank" rel="noreferrer">
                              Open Full Tab
                            </a>
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="max-h-[78vh] overflow-auto p-4">
                        <div className="mb-4 rounded-xl border border-border/70 bg-background/80 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Preview Checklist</p>
                            <Badge variant="outline">{previewChecklist.filter((item) => item.done).length}/{previewChecklist.length} ready</Badge>
                          </div>
                          <div className="mt-3 grid gap-2">
                            {previewChecklist.map((item) => (
                              <div key={item.label} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card/70 px-3 py-2">
                                <div>
                                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                                  <p className="mt-1 text-[11px] text-muted-foreground">{item.hint}</p>
                                </div>
                                <Badge variant={item.done ? "outline" : "secondary"}>{item.done ? "Good" : "Check"}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                        {previewCanvas}
                      </CardContent>
                    </Card>
                  </div>
                ) : null}
            </div>
            <div className="pointer-events-none fixed right-2 top-1/2 z-40 flex -translate-y-1/2 justify-end sm:right-4">
              <div className="pointer-events-auto flex items-center gap-2">
                {isActionDockMinimized ? (
                  <div className="flex flex-col items-end gap-2">
                    <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-full shadow-lg" onClick={undoStoreChange} disabled={undoStack.length === 0} title="Undo">
                      <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-full shadow-lg" onClick={redoStoreChange} disabled={redoStack.length === 0} title="Redo">
                      <Redo2 className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" size="icon" className="h-10 w-10 rounded-full shadow-lg" onClick={openPreviewWorkspace} title="Preview">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="icon" className="h-10 w-10 rounded-full shadow-lg" onClick={() => void saveAll()} disabled={saving} title="Save">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full shadow-lg"
                      onClick={() => setIsActionDockMinimized(false)}
                      title="Expand dock"
                    >
                      <PanelRightOpen className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-[min(320px,calc(100vw-1rem))] rounded-[1.5rem] border border-border/80 bg-background/95 p-3 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{isAdvancedEditor ? "Advanced Editing Dock" : "Basic Editing Dock"}</p>
                        <p className="truncate text-xs text-muted-foreground">{basicStatusLabel}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                        onClick={() => setIsActionDockMinimized(true)}
                        title="Minimize dock"
                      >
                        <PanelRightClose className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={undoStoreChange} disabled={undoStack.length === 0} className="justify-start rounded-full">
                        <Undo2 className="h-4 w-4" />
                        Undo
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={redoStoreChange} disabled={redoStack.length === 0} className="justify-start rounded-full">
                        <Redo2 className="h-4 w-4" />
                        Redo
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={openPreviewWorkspace} className="justify-start rounded-full">
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                      <Button type="button" size="sm" onClick={() => void saveAll()} disabled={saving} className="justify-start rounded-full">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Jump To</p>
                        {!isAdvancedEditor ? (
                          <Badge variant={basicStepCompletion[basicGuideStep] ? "outline" : "secondary"} className="text-[10px]">
                            {basicStepCompletion[basicGuideStep] ? "Ready" : "In progress"}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {actionDockTargets.map((target) => (
                          <Button
                            key={target.id}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() => {
                              if (!isAdvancedEditor) {
                                const step = basicGuideSteps.find((item) => item.sectionId === target.id);
                                if (step) {
                                  setBasicGuideStep(step.id);
                                }
                              }
                              scrollToBuilderSection(target.id);
                            }}
                          >
                            {target.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    {!isAdvancedEditor ? (
                      <div className="mt-3 rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-[11px] text-muted-foreground">
                        Merchant-safe flow with guided steps, local draft autosave, and quick jump links.
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-[11px] text-muted-foreground">
                        Advanced mode keeps block controls, code panels, revisions, and layout workflows within quick reach.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <Sheet open={isMobilePreviewOpen} onOpenChange={setIsMobilePreviewOpen}>
              <SheetContent side="bottom" className="h-[92vh] rounded-t-[1.75rem] px-0 pb-0 pt-6 lg:hidden">
                <SheetHeader className="px-4">
                  <SheetTitle>Mobile Preview</SheetTitle>
                  <SheetDescription>
                    Review the current page like a shopper on a phone, then close and continue editing.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4 flex items-center justify-between gap-3 border-y border-border/70 px-4 py-3">
                  <div className="flex items-center rounded-lg border border-border p-1">
                    <Button
                      type="button"
                      size="icon"
                      variant={previewViewport === "desktop" ? "secondary" : "ghost"}
                      className="h-8 w-8"
                      onClick={() => setPreviewViewport("desktop")}
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant={previewViewport === "mobile" ? "secondary" : "ghost"}
                      className="h-8 w-8"
                      onClick={() => setPreviewViewport("mobile")}
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button type="button" variant="outline" size="sm" asChild className="rounded-full">
                    <a href={previewHref} target="_blank" rel="noreferrer">
                      Open Full Tab
                    </a>
                  </Button>
                </div>
                <div className="overflow-auto px-4 pb-6 pt-4">
                  <div className="mb-4 rounded-xl border border-border/70 bg-background/80 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Preview Checklist</p>
                      <Badge variant="outline">{previewChecklist.filter((item) => item.done).length}/{previewChecklist.length} ready</Badge>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {previewChecklist.map((item) => (
                        <div key={item.label} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card/70 px-3 py-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">{item.hint}</p>
                          </div>
                          <Badge variant={item.done ? "outline" : "secondary"}>{item.done ? "Good" : "Check"}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  {previewCanvas}
                </div>
              </SheetContent>
            </Sheet>
            </>
          ) : (
            <Card className="border-border rounded-xl">
              <CardContent className="flex min-h-[280px] flex-col justify-center gap-5 p-5">
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-foreground">Choose a page to start editing</p>
                  <p className="text-sm text-muted-foreground">
                    Open the Pages workspace, select an existing page, or create a new one from a blueprint to unlock the full editor.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceTab("pages");
                      setIsMobileSettingsOpen(true);
                      scrollToBuilderSection("pages-list");
                    }}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    <p className="text-sm font-medium text-foreground">Browse pages</p>
                    <p className="mt-1 text-xs text-muted-foreground">Pick a page and focus one section at a time.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceTab("pages");
                      setIsMobileSettingsOpen(true);
                      scrollToBuilderSection("pages-library");
                    }}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    <p className="text-sm font-medium text-foreground">Create from blueprint</p>
                    <p className="mt-1 text-xs text-muted-foreground">Start with a recommended structure, then customize blocks.</p>
                  </button>
                </div>
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                  Stores without initialized pages should create or restore one first. After that, page details, blocks, preview, and revisions appear here.
                </div>
              </CardContent>
            </Card>
          )}
      </div>
    </div>
  );
}

