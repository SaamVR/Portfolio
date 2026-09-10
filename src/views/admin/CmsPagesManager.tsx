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
  Palette,
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
  GripVertical,
  Type,
} from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { useStoreEntitlements } from "@/hooks/useStoreEntitlements";
import { supabase } from "@/integrations/supabase/client";
import { Link, useLocation, useSearchParams, useNavigate } from "@/lib/react-router-dom-shim";
import { buildPageBuilderPath, withStoreId } from "@/lib/admin-paths";
import {
  DEFAULT_STORE_CURRENCY_CODE,
  DEFAULT_STORE_DESCRIPTION,
  DEFAULT_STORE_LOCALE,
} from "@/lib/cms/default-store";
import { defaultStore } from "@/lib/cms/default-store";
import { createDefaultCmsPage } from "@/lib/cms/block-library";
import { createRegistryDefaultBlock, filterBlockRegistryForTemplateSeed, getCmsBlockRegistryItem } from "@/lib/cms/block-registry";
import { applyLegacyHomepageSettingsToPages, type SiteSettingRecord } from "@/lib/cms/homepage-settings-adapter";
import { applyTemplateToPage, cmsPageTemplates, instantiateTemplate } from "@/lib/cms/page-templates";
import { storeSchema, type Store, type StorePage, type StorePageBlock } from "@/lib/cms/schema";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { storefrontPath } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StorefrontPreviewFrame } from "@/components/storefront/StorefrontPreviewFrame";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontTemplateRenderer } from "@/components/storefront/StorefrontTemplateRenderer";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import { sanitizeStoreBlocks, sanitizeStorePage, sanitizeStoreThemeCustomCss } from "@/lib/cms/validation";
import { getFeatureEnabled } from "@/lib/platform/control-plane";
import { fallbackStorefrontTemplateSeeds, resolveStorefrontTemplateSeed, type StorefrontTemplateSeedDefinition } from "@/lib/cms/storefront-template-seeds";
import { ensureRequiredStoreFlowPagesForTemplate, instantiateStorePagesFromTemplate } from "@/lib/cms/template-pages";
import { buildStorefrontTemplateSiteSettingsEntries, resolveStorefrontTemplateProfile } from "@/lib/cms/storefront-templates";
import { isThemePackageReferenceMissing, resolveThemePackageById, fallbackThemePackages, type ThemePackageDefinition } from "@/lib/theme-packages";
import AdminRecoveryPanel from "@/components/admin/AdminRecoveryPanel";
import { CmsEditorPreviewSheet } from "@/components/admin/CmsEditorPreviewSheet";
import { useMerchantConfirm } from "@/components/admin/MerchantConfirmDialog";
import { reconcileCmsEditorSelectedPageId, useCmsEditorDataController, type CmsEditorWorkspaceHydrationInput } from "@/lib/cms/editor-data-controller";
import {
  STORE_LAYOUT_PACKAGE_SCHEMA,
  useCmsEditorCommandController,
  type RecoverableDraft,
  type StoreLayoutPackage,
} from "@/lib/cms/editor-command-controller";
import {
  resolveCmsEditorRenderBranch,
  useCmsEditorPresentationController,
  type CmsEditorAdvancedCodePanel as AdvancedCodePanel,
  type CmsEditorBasicGuideStep as BasicGuideStep,
} from "@/lib/cms/editor-presentation-controller";
import { BASIC_THEME_TOKENS, GUIDED_THEME_TOKENS, hexToHslChannels, hslChannelsToHex, resolveStoreThemeVars } from "@/lib/cms/store-theme-utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TemplateGallery } from "./TemplateGallery";
import { TemplatePublishDialog } from "@/components/admin/TemplatePublishDialog";
import { BasicBlockMiniEditor } from "@/components/storefront/BasicBlockMiniEditor";
import { BasicModeEditor } from "@/components/storefront/BasicModeEditor";
import { DomTreeNavigator } from "@/components/storefront/DomTreeNavigator";
import { EditorShell } from "@/components/storefront/editor/EditorShell";
import { ThemePanel } from "@/components/storefront/editor/basic/ThemePanel";
import { BasicPagesTab } from "@/components/storefront/editor/basic/tabs/BasicPagesTab";
import { BasicLayoutTab } from "@/components/storefront/editor/basic/tabs/BasicLayoutTab";
import { BasicContentTab } from "@/components/storefront/editor/basic/tabs/BasicContentTab";
import { BasicStoreFlowTab } from "@/components/storefront/editor/basic/tabs/BasicStoreFlowTab";
import { BasicEffectsTab } from "@/components/storefront/editor/basic/tabs/BasicEffectsTab";
import { BasicLaunchTab } from "@/components/storefront/editor/basic/tabs/BasicLaunchTab";
import { BlockTreePanel } from "@/components/storefront/editor/advanced/tree/BlockTreePanel";
import { InspectorPanel } from "@/components/storefront/editor/advanced/inspector/InspectorPanel";
import { buildThemeRecipePatch, type ThemeRecipe } from "@/components/storefront/editor/basic/theme-recipes";
import type { BasicRailItem } from "@/components/storefront/editor/types";
import { VisualCssInspector } from "@/components/storefront/VisualCssInspector";
import { TiptapRichTextEditor } from "@/components/admin/TiptapRichTextEditor";
import type { RichTextDoc } from "@/lib/cms/schema";
import type { ThemeExportBundle } from "@/lib/cms/theme-export-import";
import { getBasicLayoutVariantOptions, getBasicStarterLayouts, resolveBasicEditorPageType, resolveBasicFlowSections } from "@/lib/cms/storefront-editor-registry";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";

const PROMO_THEME_DEFAULT_VALUE = "__theme-default";

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

function mergeBlockProps(
  currentProps: Record<string, unknown> | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const nextProps = { ...(currentProps ?? {}) };
  Object.entries(patch).forEach(([key, value]) => {
    if (value === undefined) {
      delete nextProps[key];
      return;
    }
    nextProps[key] = value;
  });
  return nextProps;
}

function normalizeBlockMetaPatch(patch: Partial<StorePageBlock>): Partial<StorePageBlock> {
  if ("isVisible" in patch && !("visible" in patch)) {
    return { ...patch, visible: patch.isVisible };
  }
  if ("visible" in patch && !("isVisible" in patch)) {
    return { ...patch, isVisible: patch.visible };
  }
  return patch;
}

type ThemeRecord = {
  preset_id: string | null;
  theme_package_id?: string | null;
  theme_package_version?: number | null;
  mode: "light" | "dark" | null;
  typography: Record<string, unknown> | null;
  components: Record<string, unknown> | null;
  colors: Record<string, string> | null;
  aesthetic?: Store["theme"]["aesthetic"] | null;
  radius_scale?: number | null;
  density_scale?: number | null;
  effects?: Store["theme"]["effects"] | null;
  palette_source?: Store["theme"]["paletteSource"] | null;
  palette_seed?: string | null;
  schema_version?: number | null;
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
  entrance_animation?: StorePageBlock["entranceAnimation"] | null;
  hover_effect?: StorePageBlock["hoverEffect"] | null;
  effect_override?: boolean | null;
  layout_variant?: string | null;
  custom_html?: string | null;
  custom_css?: string | null;
};

type BusinessProfileRecord = {
  template_id: string | null;
  business_family: string | null;
  catalog_mode: string | null;
};

type SmartPolishSummary = {
  before: {
    aesthetic: Store["theme"]["aesthetic"] | "unset";
    headingFont: string;
    bodyFont: string;
    intensity: NonNullable<Store["theme"]["effects"]>["intensity"] | "unset";
  };
  after: {
    aesthetic: NonNullable<Store["theme"]["aesthetic"]>;
    headingFont: string;
    bodyFont: string;
    intensity: NonNullable<Store["theme"]["effects"]>["intensity"];
  };
};

function serializeStoreDraft(store: Store): string {
  return JSON.stringify(store);
}

function cloneHomepageBlocksForTemplateSeed(
  templateSeedId: string,
): StorePageBlock[] {
  const seededPages = instantiateStorePagesFromTemplate(templateSeedId, { templateSeedId });
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
  templateSeeds: StorefrontTemplateSeedDefinition[] = [],
  themePackages: ThemePackageDefinition[] = fallbackThemePackages,
): Store {
  const rawSiteSettings = siteSettings.reduce<Record<string, unknown>>((settings, setting) => {
    settings[setting.key] = setting.value;
    return settings;
  }, {});
  const storefrontProfile = typeof rawSiteSettings.storefront_profile === "object" && rawSiteSettings.storefront_profile
    ? rawSiteSettings.storefront_profile as Record<string, unknown>
    : {};
  const templateProfile = resolveStorefrontTemplateProfile(storefrontProfile.template_id, {
    templateSeedId: businessProfile?.template_id ?? store.store_type ?? "general-catalog",
    productVisibility: typeof storefrontProfile.product_visibility === "string"
      ? storefrontProfile.product_visibility
      : null,
  });
  const templateSeed = resolveStorefrontTemplateSeed(templateProfile.templateSeedId, templateSeeds);
  const fallbackTheme = resolveThemePackageById(
    theme?.theme_package_id,
    themePackages,
    theme?.preset_id ?? templateProfile.seedDefinition.defaultTheme.presetId,
  );
  const mappedPages = pages
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
            entranceAnimation: block.entrance_animation ?? undefined,
            hoverEffect: block.hover_effect ?? undefined,
            effectOverride: block.effect_override ?? undefined,
            layoutVariant: block.layout_variant ?? undefined,
            customHtml: block.custom_html ?? undefined,
            customCss: block.custom_css ?? undefined,
            props: block.props ?? {},
          })),
      }),
    )
    .filter((page): page is StorePage => Boolean(page));
  const resolvedPages = ensureRequiredStoreFlowPagesForTemplate(
    mappedPages.length > 0
      ? applyLegacyHomepageSettingsToPages(mappedPages, siteSettings)
      : instantiateStorePagesFromTemplate(templateProfile),
    templateSeed,
  );

  return storeSchema.parse({
    id: store.id,
    name: store.name,
    slug: store.slug,
    customDomain: store.custom_domain ?? undefined,
    description: store.description ?? templateProfile.seedDefinition.storeDescription ?? DEFAULT_STORE_DESCRIPTION,
    currencyCode: store.currency_code ?? DEFAULT_STORE_CURRENCY_CODE,
    locale: store.locale ?? DEFAULT_STORE_LOCALE,
    isPublished: store.is_published ?? false,
    theme: {
      presetId: theme?.preset_id ?? fallbackTheme.presetId,
      themePackageId: theme?.theme_package_id ?? fallbackTheme.id,
      mode: theme?.mode ?? templateProfile.seedDefinition.defaultTheme.mode,
      headingFont: typeof theme?.typography?.headingFont === "string" ? theme.typography.headingFont : (fallbackTheme.tokens.typography.headingFont ?? templateProfile.seedDefinition.defaultTheme.headingFont),
      bodyFont: typeof theme?.typography?.bodyFont === "string" ? theme.typography.bodyFont : (fallbackTheme.tokens.typography.bodyFont ?? templateProfile.seedDefinition.defaultTheme.bodyFont),
      borderRadius: typeof theme?.components?.borderRadius === "string" ? theme.components.borderRadius : (fallbackTheme.tokens.components.borderRadius ?? templateProfile.seedDefinition.defaultTheme.borderRadius),
      radiusScale: typeof theme?.radius_scale === "number" ? theme.radius_scale : templateProfile.seedDefinition.defaultTheme.radiusScale,
      densityScale: typeof theme?.density_scale === "number" ? theme.density_scale : templateProfile.seedDefinition.defaultTheme.densityScale,
      aesthetic: theme?.aesthetic ?? (typeof theme?.components?.aesthetic === "string" ? theme.components.aesthetic as Store["theme"]["aesthetic"] : templateProfile.seedDefinition.defaultTheme.aesthetic),
      effects: theme?.effects ?? (typeof theme?.components?.effects === "object" && theme.components.effects ? theme.components.effects as Store["theme"]["effects"] : templateProfile.seedDefinition.defaultTheme.effects),
      paletteSource: theme?.palette_source ?? templateProfile.seedDefinition.defaultTheme.paletteSource,
      paletteSeed: theme?.palette_seed ?? templateProfile.seedDefinition.defaultTheme.paletteSeed,
      schemaVersion: theme?.schema_version ?? templateProfile.seedDefinition.defaultTheme.schemaVersion ?? 1,
      customCssVars: theme?.colors ?? theme?.resolved_tokens?.[theme?.mode ?? templateProfile.seedDefinition.defaultTheme.mode] ?? fallbackTheme.tokens[theme?.mode ?? templateProfile.seedDefinition.defaultTheme.mode],
      customCss: theme?.custom_css ?? fallbackTheme.customCss,
    },
    pages: resolvedPages,
  });
}

function getTemplateBootstrapStoreName(templateSeedId: string) {
  const templateProfile = resolveStorefrontTemplateProfile(templateSeedId, { templateSeedId });
  return `${templateProfile.seedDefinition.shortName} Store`;
}

export default function CmsPagesManager() {
  const { user, role , activeStoreId} = useAuth();
  const { data: entitlements } = useStoreEntitlements(activeStoreId);
  const location = useLocation();
  const isTemplateGalleryRoute = location.pathname === "/admin/templates";
  const [searchParams] = useSearchParams();
  const [store, setStore] = useState<Store | null>(null);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [bootstrapping, setBootstrapping] = useState(false);
  const [nextBlockType, setNextBlockType] = useState<StorePageBlock["type"]>("rich-text");
  const storeTemplateSeeds = fallbackStorefrontTemplateSeeds;
  const [newPageTemplate, setNewPageTemplate] = useState(cmsPageTemplates[0]?.id ?? "landing");
  const [activeTemplateId, setActiveTemplateId] = useState(cmsPageTemplates[0]?.id ?? "landing");
  const [revisionLabel, setRevisionLabel] = useState("");
  const [smartPolishSummary, setSmartPolishSummary] = useState<SmartPolishSummary | null>(null);
  const [advancedPageJsonDraft, setAdvancedPageJsonDraft] = useState("");
  const [advancedSelectedBlockJsonDraft, setAdvancedSelectedBlockJsonDraft] = useState("");
  const [advancedThemeCssDraft, setAdvancedThemeCssDraft] = useState("");
  const [persistedSnapshot, setPersistedSnapshot] = useState("");
  const [recoverableDraft, setRecoverableDraft] = useState<RecoverableDraft | null>(null);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<Date | null>(null);
  const [undoStack, setUndoStack] = useState<Store[]>([]);
  const [redoStack, setRedoStack] = useState<Store[]>([]);
  const [storeTemplateSeedId, setStoreTemplateSeedId] = useState("general-catalog");
  const [installedThemePackageVersion, setInstalledThemePackageVersion] = useState<number | null>(null);
  const navigate = useNavigate();
  const { confirm: confirmMerchantAction, confirmationDialog } = useMerchantConfirm();
  const {
    workspaceTab,
    setWorkspaceTab,
    isMobileSettingsOpen,
    setIsMobileSettingsOpen,
    previewViewport,
    setPreviewViewport,
    basicGuideStep,
    setBasicGuideStep,
    isActionDockMinimized,
    setIsActionDockMinimized,
    desktopPreviewMode,
    setDesktopPreviewMode,
    desktopPreviewSide,
    setDesktopPreviewSide,
    isMobilePreviewOpen,
    setIsMobilePreviewOpen,
    hasCheckedBasicPreview,
    setHasCheckedBasicPreview,
    activeAdvancedCodePanel,
    setActiveAdvancedCodePanel,
    draggedAdvancedBlockId,
    setDraggedAdvancedBlockId,
    builderMode,
    isAdvancedEditor,
    isBasicEditor,
    useLegacyEditor,
  } = useCmsEditorPresentationController({
    pathname: location.pathname,
    isTemplateGalleryRoute,
    activeStoreId,
    legacyMode: searchParams.get("legacy") === "1",
  });

  const layoutImportInputRef = useRef<HTMLInputElement | null>(null);
  const selectedPageIdRef = useRef(selectedPageId);
  selectedPageIdRef.current = selectedPageId;
  const requestedPageId = searchParams.get("page");
  const requestedBlockId = searchParams.get("block") ?? "";
  const returnTo = searchParams.get("returnTo");
  const hydrateCmsEditorStore = useCallback((input: CmsEditorWorkspaceHydrationInput) => mapRecordsToStore(
    input.store,
    input.businessProfile,
    input.theme,
    input.pages,
    input.blocks,
    input.siteSettings,
    fallbackStorefrontTemplateSeeds,
    input.themePackages,
  ), []);
  const {
    workspace: loadedWorkspace,
    loading,
    workspaceError,
    blockRegistry,
    themePackages,
    revisions,
    loadingRevisions,
    revisionError,
    reloadWorkspace: loadStore,
    reloadRevisions,
    captureEditorContext,
    isEditorContextCurrent,
  } = useCmsEditorDataController({
    client: supabase,
    activeStoreId,
    enabled: role === "admin",
    selectedPageId,
    requestedPageId,
    hydrateStore: hydrateCmsEditorStore,
  });
  const basicEditorHref = buildPageBuilderPath("basic", {
    pageId: requestedPageId,
    blockId: requestedBlockId || null,
    returnTo,
    storeId: activeStoreId,
  });
  const legacyBasicEditorHref = buildPageBuilderPath("basic", {
    pageId: requestedPageId,
    blockId: requestedBlockId || null,
    returnTo,
    storeId: activeStoreId,
    legacy: true,
  });
  const advancedEditorHref = buildPageBuilderPath("advanced", {
    pageId: requestedPageId,
    blockId: requestedBlockId || null,
    returnTo,
    storeId: activeStoreId,
  });
  const legacyAdvancedEditorHref = buildPageBuilderPath("advanced", {
    pageId: requestedPageId,
    blockId: requestedBlockId || null,
    returnTo,
    storeId: activeStoreId,
    legacy: true,
  });
  const pageTemplatesEnabled = getFeatureEnabled(entitlements?.featureMap, "cms_pages", true);
  const themePresetsEnabled = getFeatureEnabled(entitlements?.featureMap, "theme_presets", true);
  const pushHistoryLimit = 20;
  const activeTemplateSeed = useMemo(
    () => resolveStorefrontTemplateSeed(storeTemplateSeedId, storeTemplateSeeds),
    [storeTemplateSeedId, storeTemplateSeeds],
  );
  const {
    busy: saving,
    error: saveError,
    draftStorageKey,
    clearError: clearCommandError,
    reportError: reportCommandError,
    readRecoverableDraft,
    writeRecoverableDraft,
    clearRecoverableDraft,
    saveStorefront,
    prepareStoreLayoutImport,
    prepareThemeBundleApplication,
    prepareRevisionRestore,
  } = useCmsEditorCommandController({
    client: supabase,
    activeStoreId,
    ownerId: user?.id ?? null,
    activeTemplateSeed,
    themePackages,
    captureEditorContext,
    isEditorContextCurrent,
    reloadWorkspace: loadStore,
  });
  const availablePageTemplates = useMemo(() => cmsPageTemplates, []);
  const availableBlockRegistry = useMemo(
    () => filterBlockRegistryForTemplateSeed(blockRegistry, activeTemplateSeed),
    [activeTemplateSeed, blockRegistry],
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

  const commitStoreChange = useCallback((
    updater: Store | null | ((current: Store | null) => Store | null),
    options?: { trackHistory?: boolean; resetHistory?: boolean },
  ) => {
    clearCommandError();
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
  }, [clearCommandError]);

  useEffect(() => {
    if (!loadedWorkspace) return;

    if (!loadedWorkspace.store) {
      commitStoreChange(null, { trackHistory: false, resetHistory: true });
      setInstalledThemePackageVersion(null);
      setSelectedPageId("");
      setSelectedBlockId("");
      setStoreTemplateSeedId("general-catalog");
      setPersistedSnapshot("");
      setRecoverableDraft(null);
      setLastDraftSavedAt(null);
      return;
    }

    const parsedStore = loadedWorkspace.store;
    commitStoreChange(parsedStore, { trackHistory: false, resetHistory: true });
    setStoreTemplateSeedId(loadedWorkspace.storeTemplateSeedId);
    setInstalledThemePackageVersion(loadedWorkspace.installedThemePackageVersion);
    setPersistedSnapshot(serializeStoreDraft(parsedStore));
    setLastDraftSavedAt(null);
    setSelectedPageId(loadedWorkspace.selectedPageId);
  }, [commitStoreChange, loadedWorkspace]);

  const currentSnapshot = useMemo(() => (store ? serializeStoreDraft(store) : ""), [store]);
  const hasUnsavedChanges = Boolean(store && persistedSnapshot && currentSnapshot !== persistedSnapshot);

  useEffect(() => {
    commitStoreChange(null, { trackHistory: false, resetHistory: true });
    setSelectedPageId("");
    setSelectedBlockId("");
    setRevisionLabel("");
    setInstalledThemePackageVersion(null);
    setPersistedSnapshot("");
    setRecoverableDraft(null);
    setLastDraftSavedAt(null);
    setBootstrapping(false);
  }, [activeStoreId, commitStoreChange]);

  useEffect(() => {
    if (!availablePageTemplates.some((template) => template.id === newPageTemplate)) {
      setNewPageTemplate(availablePageTemplates[0]?.id ?? "landing");
    }
  }, [availablePageTemplates, newPageTemplate]);

  useEffect(() => {
    if (!availablePageTemplates.some((template) => template.id === activeTemplateId)) {
      setActiveTemplateId(availablePageTemplates[0]?.id ?? "landing");
    }
  }, [activeTemplateId, availablePageTemplates]);

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

    const draft = readRecoverableDraft();
    setRecoverableDraft(draft && draft.snapshot !== persistedSnapshot ? draft : null);
  }, [draftStorageKey, persistedSnapshot, readRecoverableDraft]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasUnsavedChanges) return undefined;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!draftStorageKey || !store || !hasUnsavedChanges) return;

    setRecoverableDraft(null);
    const timeout = window.setTimeout(() => {
      const updatedAt = writeRecoverableDraft(currentSnapshot);
      if (updatedAt) {
        setLastDraftSavedAt(updatedAt);
      }
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [currentSnapshot, draftStorageKey, hasUnsavedChanges, store, writeRecoverableDraft]);

  const selectedPage = useMemo(() => {
    if (!store) return null;
    return store.pages.find((page) => page.id === selectedPageId)
      ?? store.pages.find((page) => page.isHomepage)
      ?? store.pages[0]
      ?? null;
  }, [store, selectedPageId]);

  const selectedBlock = useMemo(
    () => selectedPage?.blocks.find((block) => block.id === selectedBlockId) ?? selectedPage?.blocks[0] ?? null,
    [selectedBlockId, selectedPage],
  );

  useEffect(() => {
    if (!store) return;

    const reconciledPageId = reconcileCmsEditorSelectedPageId(store.pages, requestedPageId, selectedPageId);
    if (reconciledPageId !== selectedPageId) {
      setSelectedPageId(reconciledPageId);
      return;
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

    const context = captureEditorContext();
    const originStoreId = context.storeId;
    if (!originStoreId) {
      toast.error("Select a store before initializing the storefront workspace.");
      return;
    }

    const originStore = store?.id === originStoreId ? store : null;
    setBootstrapping(true);

    const templateProfile = resolveStorefrontTemplateProfile(storeTemplateSeedId, { templateSeedId: storeTemplateSeedId });
    const templateSeed = resolveStorefrontTemplateSeed(templateProfile.templateSeedId, storeTemplateSeeds);
    const seedPages = instantiateStorePagesFromTemplate(templateProfile);
    const themePackage = resolveThemePackageById(
      templateProfile.seedDefinition.defaultTheme.presetId,
      themePackages,
      templateProfile.seedDefinition.defaultTheme.presetId,
    );

    const { error: storeError } = await supabase.from("stores").upsert(
      {
        id: originStoreId,
        owner_id: user.id,
        name: originStore?.name ?? getTemplateBootstrapStoreName(templateSeed.id),
        slug: originStore?.slug ?? `store-${originStoreId.slice(0, 8)}`,
        description: templateProfile.seedDefinition.storeDescription,
        currency_code: "BDT",
        locale: "en-BD",
        is_published: false,
        store_type: templateSeed.id,
      },
      { onConflict: "slug" },
    );

    if (storeError) {
      if (isEditorContextCurrent(context)) {
        toast.error("Failed to initialize the storefront workspace.");
        setBootstrapping(false);
      }
      return;
    }

    await supabase.from("store_themes").upsert(
      {
        store_id: originStoreId,
        preset_id: themePackage.presetId,
        mode: templateProfile.seedDefinition.defaultTheme.mode,
        theme_package_id: themePackage.id,
        theme_package_version: themePackage.version,
        colors: themePackage.tokens[templateProfile.seedDefinition.defaultTheme.mode] ?? {},
        typography: {
          headingFont: templateProfile.seedDefinition.defaultTheme.headingFont,
          bodyFont: templateProfile.seedDefinition.defaultTheme.bodyFont,
        },
        components: {
          borderRadius: templateProfile.seedDefinition.defaultTheme.borderRadius,
          aesthetic: templateProfile.seedDefinition.defaultTheme.aesthetic,
          effects: templateProfile.seedDefinition.defaultTheme.effects,
        },
        aesthetic: templateProfile.seedDefinition.defaultTheme.aesthetic ?? "minimal",
        radius_scale: templateProfile.seedDefinition.defaultTheme.radiusScale ?? 1,
        density_scale: templateProfile.seedDefinition.defaultTheme.densityScale ?? 1,
        effects: templateProfile.seedDefinition.defaultTheme.effects ?? {
          scrollReveals: false,
          hoverEffects: true,
          parallax: false,
          intensity: "medium",
        },
        palette_source: templateProfile.seedDefinition.defaultTheme.paletteSource ?? null,
        palette_seed: templateProfile.seedDefinition.defaultTheme.paletteSeed ?? null,
        schema_version: templateProfile.seedDefinition.defaultTheme.schemaVersion ?? 1,
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
          store_id: originStoreId,
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
            store_id: originStoreId,
            block_type: block.type as any,
            props: block.props as any,
            sort_order: block.sortOrder,
            is_visible: block.isVisible,
            entrance_animation: block.entranceAnimation ?? null,
            hover_effect: block.hoverEffect ?? null,
            effect_override: block.effectOverride ?? null,
            layout_variant: block.layoutVariant ?? null,
            custom_html: block.customHtml ?? null,
            custom_css: block.customCss ?? null,
          })),
          { onConflict: "id" },
        );
      }
    }

    await supabase.from("store_business_profiles").upsert(
      {
        store_id: originStoreId,
        template_id: templateProfile.templateSeedId,
        business_family: templateProfile.businessFamily,
        catalog_mode: templateProfile.catalogMode,
        enabled_modules: templateProfile.seedDefinition.capabilities,
      },
      { onConflict: "store_id" },
    );

    const siteSettingsRows = buildStorefrontTemplateSiteSettingsEntries(templateProfile.seedDefinition).map((entry) => ({
      store_id: originStoreId,
      key: entry.key,
      value: entry.value,
    }));

    if (siteSettingsRows.length > 0) {
      const { error: siteSettingsError } = await supabase
        .from("site_settings")
        .upsert(siteSettingsRows, { onConflict: "store_id,key" });

      if (siteSettingsError) {
        if (isEditorContextCurrent(context)) {
          toast.error("Failed to seed template site settings.");
          setBootstrapping(false);
        }
        return;
      }
    }

    if (isEditorContextCurrent(context)) {
      toast.success("Storefront workspace is ready.");
      setBootstrapping(false);
      await loadStore();
    }
  };

  const addPage = () => {
    commitStoreChange((current) => {
        if (!current) return current;
        const page = pageTemplatesEnabled
        ? instantiateTemplate(newPageTemplate, current.pages.length) ?? createDefaultCmsPage(current.pages.length)
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
    if (!pageTemplatesEnabled) {
      toast.error("Page templates are not enabled for this store.");
      return;
    }
    updateSelectedPage((page) => applyTemplateToPage(page, templateId) ?? page);
    setActiveTemplateId(templateId);
    toast.success("Template applied to the current page.");
  };

  const applyRecommendedHomepage = async () => {
    if (!selectedPage?.isHomepage) {
      toast.error("Select the homepage before applying the recommended homepage layout.");
      return;
    }

    const context = captureEditorContext();
    const pageId = selectedPage.id;
    if (selectedPage.blocks.length > 0) {
      const confirmed = await confirmMerchantAction({
        title: "Replace the current homepage layout?",
        description: "The recommended homepage will replace every section currently in this homepage draft.",
        entityLabel: "Page",
        entityValue: selectedPage.title,
        storeName: store?.name,
        impacts: [
          `${selectedPage.blocks.length} current section${selectedPage.blocks.length === 1 ? "" : "s"} will be replaced in the editor.`,
          "Nothing becomes customer-visible until you explicitly save or publish the resulting draft.",
        ],
        recoveryText: "You can cancel now to keep the current homepage unchanged.",
        confirmLabel: "Replace homepage",
        tone: "warning",
      });
      if (!confirmed || !isEditorContextCurrent(context) || selectedPageIdRef.current !== pageId) return;
    }

    updateSelectedPage((page) => ({
      ...page,
      slug: "/",
      isHomepage: true,
      blocks: cloneHomepageBlocksForTemplateSeed(storeTemplateSeedId),
    }));
    setSelectedBlockId("");
    toast.success("Recommended homepage layout applied. Review the draft before saving.");
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
    value: string | RichTextDoc,
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
        props: mergeBlockProps(current.props as Record<string, unknown>, patch),
      } as StorePageBlock;
    });
  };

  const updateAnyBlockProps = (blockId: string, patch: Record<string, unknown>) => {
    updateBlock(blockId, (current) => ({
      ...current,
      props: mergeBlockProps(current.props as Record<string, unknown>, patch),
    } as StorePageBlock));
  };

  const updateBlockMeta = (blockId: string, patch: Partial<StorePageBlock>) => {
    const normalizedPatch = normalizeBlockMetaPatch(patch);
    updateBlock(blockId, (current) => ({
      ...current,
      ...normalizedPatch,
    } as StorePageBlock));
  };

  const reorderBlocks = (startIndex: number, endIndex: number) => {
    updateSelectedPage((page) => {
      if (startIndex < 0 || endIndex < 0 || startIndex >= page.blocks.length || endIndex >= page.blocks.length) {
        return page;
      }

      const blocks = [...page.blocks].sort((a, b) => a.sortOrder - b.sortOrder);
      const [movedBlock] = blocks.splice(startIndex, 1);
      blocks.splice(endIndex, 0, movedBlock);

      return {
        ...page,
        blocks: blocks.map((block, index) => ({ ...block, sortOrder: index })),
      };
    });
  };

  const addBlockOfType = (type: StorePageBlock["type"]) => {
    if (!selectedPage) return;

    const nextBlock = createRegistryDefaultBlock(type, selectedPage.blocks.length);
    updateSelectedPage((page) => ({
      ...page,
      blocks: [...page.blocks, nextBlock],
    }));
    setSelectedBlockId(nextBlock.id);
    toast.success("Section added to this page.");
  };

  const updateThemeVar = (cssKey: string, hexValue: string) => {
    const next = hexToHslChannels(hexValue);
    if (!next || !store) return;

    updateStoreTheme({
      customCssVars: {
        ...store.theme.customCssVars,
        [cssKey]: next,
      },
      paletteSource: "manual",
    });
  };

  const updateThemeVars = (hexVars: Record<string, string>) => {
    const nextVars = Object.entries(hexVars).reduce<Record<string, string>>((acc, [key, value]) => {
      const next = hexToHslChannels(value);
      if (next) {
        acc[key] = next;
      }
      return acc;
    }, {});

    if (Object.keys(nextVars).length === 0) return;

    commitStoreChange((current) => {
      if (!current) return current;
      return {
        ...current,
        theme: {
          ...current.theme,
          customCssVars: {
            ...current.theme.customCssVars,
            ...nextVars,
          },
          paletteSource: "generated",
        },
      };
    });
  };

  const updateThemePackage = (packageId: string) => {
    if (!store) return;

    const themePackage = resolveThemePackageById(packageId, themePackages, packageId);
    updateStoreTheme({
      presetId: themePackage.presetId,
      themePackageId: themePackage.id,
      mode: themePackage.mode,
      headingFont: themePackage.tokens.typography.headingFont ?? store.theme.headingFont,
      bodyFont: themePackage.tokens.typography.bodyFont ?? store.theme.bodyFont,
      borderRadius: themePackage.tokens.components.borderRadius ?? store.theme.borderRadius,
      customCssVars: {},
      paletteSource: undefined,
    });
  };

  const updateThemeMode = (mode: "light" | "dark") => {
    updateStoreTheme({ mode });
  };

  const updateFont = (target: "heading" | "body", fontFamily: string) => {
    updateStoreTheme(target === "heading" ? { headingFont: fontFamily } : { bodyFont: fontFamily });
  };

  const updateThemeScale = (target: "radius" | "density", value: number) => {
    const safeValue = Math.max(0, Math.min(1, value));
    updateStoreTheme(target === "radius" ? { radiusScale: safeValue } : { densityScale: safeValue });
  };

  const updateThemeAesthetic = (aesthetic: NonNullable<Store["theme"]["aesthetic"]>) => {
    updateStoreTheme({ aesthetic });
  };

  const updateThemeScales = (radiusScale: number, densityScale: number) => {
    updateStoreTheme({
      radiusScale: Math.max(0, Math.min(1, radiusScale)),
      densityScale: Math.max(0, Math.min(1, densityScale)),
    });
  };

  const resetThemePalette = () => {
    if (!store) return;
    const nextVars = { ...store.theme.customCssVars };
    for (const key of ["--primary", "--accent", "--background", "--foreground"]) {
      delete nextVars[key];
    }
    updateStoreTheme({ customCssVars: nextVars, paletteSource: undefined });
  };

  const applyThemeRecipe = (recipe: ThemeRecipe) => {
    if (!store) return;
    updateStoreTheme(buildThemeRecipePatch(recipe, store.theme));
  };

  const updateThemeEffect = (
    effectKey: "scrollReveals" | "hoverEffects" | "parallax" | "intensity",
    value: boolean | "subtle" | "medium" | "bold",
  ) => {
    updateStoreTheme({
      effects: {
        scrollReveals: store?.theme.effects?.scrollReveals ?? false,
        hoverEffects: store?.theme.effects?.hoverEffects ?? true,
        parallax: store?.theme.effects?.parallax ?? false,
        intensity: store?.theme.effects?.intensity ?? "medium",
        [effectKey]: value,
      },
    });
  };

  const selectPage = (pageId: string) => {
    setSelectedPageId(pageId);
    setSelectedBlockId("");
  };

  const exportStoreLayout = () => {
    if (!store) return;

    const payload: StoreLayoutPackage = {
      schema: STORE_LAYOUT_PACKAGE_SCHEMA,
      exportedAt: new Date().toISOString(),
      source: {
        storeName: store.name,
        storeSlug: store.slug,
        templateSeedId: storeTemplateSeedId,
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
    const context = captureEditorContext();
    if (!store || !context.storeId || store.id !== context.storeId || !isEditorContextCurrent(context)) return;

    try {
      clearCommandError();
      const prepared = prepareStoreLayoutImport({ raw, store, allowAdvanced: isAdvancedEditor });
      if (hasUnsavedChanges) {
        const pageId = selectedPageIdRef.current;
        const confirmed = await confirmMerchantAction({
          title: "Replace the unsaved Page Builder draft?",
          description: "Importing this storefront layout will replace the current unsaved editor draft for this store.",
          entityLabel: "Import",
          entityValue: "Storefront layout package",
          storeName: store.name,
          impacts: [
            "Current unsaved page and theme edits may be replaced by the imported layout.",
            "The imported result remains a draft until you explicitly save or publish it.",
          ],
          recoveryText: "Cancel to keep the current local draft unchanged.",
          confirmLabel: "Import and replace draft",
          tone: "warning",
        });
        if (!confirmed || !isEditorContextCurrent(context) || selectedPageIdRef.current !== pageId) return;
      }

      if (!isEditorContextCurrent(context)) return;
      commitStoreChange(prepared.store);
      setSelectedPageId(prepared.selectedPageId);
      setSelectedBlockId("");
      setWorkspaceTab("pages");
      toast.success("Layout imported. Review it, then save Page Builder changes.");
    } catch (error) {
      if (!isEditorContextCurrent(context)) return;
      const message = error instanceof Error ? error.message : "Failed to import storefront layout.";
      reportCommandError(message);
      toast.error(message);
    }
  };

  const applyThemeBundle = async (bundle: ThemeExportBundle) => {
    if (!store) return false;

    const context = captureEditorContext();
    const pageId = selectedPageIdRef.current;
    if (!context.storeId || store.id !== context.storeId || !isEditorContextCurrent(context)) return false;

    const changeSummary = [
      "Theme tokens and typography",
      bundle.pages?.length ? `${bundle.pages.length} page layout${bundle.pages.length === 1 ? "" : "s"}` : null,
      bundle.type === "full-store" ? "full-store structure" : null,
    ].filter(Boolean).join(", ");

    try {
      clearCommandError();
      const prepared = prepareThemeBundleApplication({ bundle, store, allowAdvanced: isAdvancedEditor });
      const confirmed = await confirmMerchantAction({
        title: `Apply this ${bundle.type.replace(/-/g, " ")} bundle?`,
        description: "The bundle will update the current storefront editor draft. Review the resulting draft before saving it.",
        entityLabel: "Bundle changes",
        entityValue: changeSummary || "Theme settings",
        storeName: store.name,
        impacts: [
          hasUnsavedChanges
            ? "Existing unsaved editor changes may be merged with or replaced by the imported bundle."
            : "The current theme or page structure may change in the editor.",
          "No customer-visible change occurs until the resulting draft is saved or published.",
        ],
        recoveryText: "Cancel to keep the current storefront draft unchanged.",
        confirmLabel: "Apply bundle",
        tone: "warning",
      });
      if (!confirmed || !isEditorContextCurrent(context) || selectedPageIdRef.current !== pageId) return false;

      commitStoreChange(prepared.store);
      if (prepared.replacedPages) setSelectedPageId(prepared.selectedPageId);
      setSelectedBlockId("");
      toast.success("Template applied to the draft. Review it before saving.");
      return true;
    } catch (error) {
      if (!isEditorContextCurrent(context)) return false;
      const message = error instanceof Error ? error.message : "Failed to apply template.";
      reportCommandError(message);
      toast.error(message);
      return false;
    }
  };

  const saveAll = async (intent: "save" | "publish" | "unpublish" = "save") => {
    if (!store || !user) return;

    const result = await saveStorefront({ store, selectedPage, revisionLabel, intent });
    if (result.status === "success") {
      toast.success(
        intent === "publish"
          ? "Storefront published."
          : intent === "unpublish"
            ? "Storefront unpublished. Preview remains available to you."
            : "Page Builder changes saved.",
      );
      setRevisionLabel("");
      setPersistedSnapshot(serializeStoreDraft(result.persistedStore));
      setRecoverableDraft(null);
      setLastDraftSavedAt(null);
      return;
    }
    if (result.status === "error") {
      toast.error(result.message);
    }
  };

  const restoreRevision = async (revisionId: string) => {
    const revision = revisions.find((item) => item.id === revisionId);
    if (!revision || !selectedPage) return;

    const context = captureEditorContext();
    const pageId = selectedPage.id;
    try {
      clearCommandError();
      const prepared = prepareRevisionRestore({
        revisionBlocks: revision.blocks_snapshot,
        selectedPage,
      });
      const confirmed = await confirmMerchantAction({
        title: `Restore revision “${revision.revision_label}”?`,
        description: "This saved revision will replace the sections currently loaded in this page editor.",
        entityLabel: "Page",
        entityValue: selectedPage.title,
        storeName: store?.name,
        impacts: [
          `Current sections: ${prepared.currentBlockCount}; revision sections: ${prepared.revisionBlockCount}.`,
          prepared.changedTypes.length > 0
            ? `Changed block types include ${prepared.changedTypes.slice(0, 4).join(", ")}${prepared.changedTypes.length > 4 ? ", and more" : ""}.`
            : "The revision keeps the same block-type order as the current page.",
          hasUnsavedChanges
            ? "Your current unsaved edits on this page will be replaced."
            : "The saved snapshot will be loaded into the editor as a new draft.",
        ],
        recoveryText: "The live storefront is unchanged until you save or publish the restored draft.",
        confirmLabel: "Restore revision",
        tone: "warning",
      });
      if (!confirmed || !isEditorContextCurrent(context) || selectedPageIdRef.current !== pageId) return;

      updateSelectedPage((page) => ({ ...page, blocks: prepared.blocks }));
      toast.success("Revision restored into the editor. Review the draft before saving.");
    } catch (error) {
      if (!isEditorContextCurrent(context)) return;
      const message = error instanceof Error ? error.message : "Failed to restore revision.";
      reportCommandError(message);
      toast.error(message);
    }
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
    clearRecoverableDraft();
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

  if (isTemplateGalleryRoute && !activeStoreId) {
    return (
      <div className="space-y-6">
        <Card className="border-border bg-card/80 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Storefront Templates</CardTitle>
                <CardDescription>
                  Browse the live storefront templates first. To apply one, pick or create a store from the switcher or launch flow.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="gap-2">
              <Link to="/signup">
                <Rocket className="h-4 w-4" />
                Create Store
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/admin">
                <StoreIcon className="h-4 w-4" />
                Go To Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
        <TemplateGallery store={defaultStore} />
      </div>
    );
  }

  if ((loading || workspaceError) && !store) {
    return (
      <AdminRecoveryPanel
        title={workspaceError ? "Page Builder unavailable" : "Loading Page Builder"}
        description={workspaceError ?? "The storefront workspace is being restored for the active store."}
        loadingLabel={workspaceError ? "The active store was not replaced with partial or stale data." : "Rebuilding page, block, and theme state."}
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
                <StoreIcon className="h-5 w-5" />
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
                Generate the first page builder snapshot for this store using its template, theme, and page defaults.
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
              <p className="text-sm font-medium text-foreground">Template-aware</p>
              <p className="mt-1 text-xs text-muted-foreground">The starter workspace pulls from the current storefront template and page templates.</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-sm font-medium text-foreground">Safe to customize</p>
              <p className="mt-1 text-xs text-muted-foreground">Once initialized, edits stay local to this store and wonâ€™t mutate shared source packages.</p>
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
  const guidedEditingActionItems = [
    {
      id: "undo",
      label: "Undo",
      detail: undoStack.length > 0 ? `${undoStack.length} step${undoStack.length === 1 ? "" : "s"} available` : "Nothing to undo",
      disabled: undoStack.length === 0,
      action: undoStoreChange,
      icon: Undo2,
      variant: "outline" as const,
    },
    {
      id: "redo",
      label: "Redo",
      detail: redoStack.length > 0 ? `${redoStack.length} step${redoStack.length === 1 ? "" : "s"} available` : "Nothing to redo",
      disabled: redoStack.length === 0,
      action: redoStoreChange,
      icon: Redo2,
      variant: "outline" as const,
    },
    {
      id: "save",
      label: saving ? "Saving..." : hasUnsavedChanges ? "Save now" : "Saved",
      detail: basicStatusLabel,
      disabled: saving,
      action: () => void saveAll(),
      icon: Save,
      variant: "default" as const,
    },
  ];
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
    product: selectedProductPage ? "Refine your main product or catalog page so shoppers can browse with confidence." : "Create or select a product-focused page in Expert Editing, then return here for guided content setup.",
    checkout: "Use guided settings for payment, delivery, support, and policy reassurance instead of raw page editing.",
    custom: selectedCustomContentPage ? "Use custom pages to answer FAQs, tell your story, and reduce hesitation." : "Add About, FAQ, or policy pages in Expert Editing, then come back here for merchant-safe editing.",
    launch: hasUnsavedChanges ? "Save the current draft, then preview the page on the live storefront." : "Open preview and do a final merchant-eye pass before you leave Guided Editing.",
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
        { id: "advanced-visual-inspector", label: "Inspector" },
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
              actionLabel: "Open Expert Editing",
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
      if (builderMode === "basic") setHasCheckedBasicPreview(true);
      setIsMobilePreviewOpen(true);
      return;
    }

    setDesktopPreviewMode((current) => (current === "hidden" || current === "minimized" ? "side" : current));
    scrollToBuilderSection("page-builder-preview");
  };
  const openBasicPreviewOverlay = (viewport: "desktop" | "tablet" | "mobile" = previewViewport) => {
    setPreviewViewport(viewport);
    setHasCheckedBasicPreview(true);
    setIsMobilePreviewOpen(true);
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
        blocks: sanitizeStoreBlocks(parsed.blocks ?? selectedPage.blocks, { allowAdvanced: isAdvancedEditor }).map((block, index) => ({
          ...block,
          id: typeof block.id === "string" && block.id.trim() ? block.id : crypto.randomUUID(),
          sortOrder: index,
        })),
      }, { allowAdvanced: isAdvancedEditor });

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
          visible: parsed.visible ?? parsed.isVisible ?? selectedBlock.visible ?? selectedBlock.isVisible,
          entranceAnimation: parsed.entranceAnimation ?? selectedBlock.entranceAnimation,
          hoverEffect: parsed.hoverEffect ?? selectedBlock.hoverEffect,
          effectOverride: parsed.effectOverride ?? selectedBlock.effectOverride,
          layoutVariant: parsed.layoutVariant ?? selectedBlock.layoutVariant,
          customHtml: parsed.customHtml ?? selectedBlock.customHtml,
          customCss: parsed.customCss ?? selectedBlock.customCss,
          props: parsed.props ?? selectedBlock.props,
        } as StorePageBlock,
      ], { allowAdvanced: true });
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
    const sanitizedCustomCss = sanitizeStoreThemeCustomCss(advancedThemeCssDraft);
    if (advancedThemeCssDraft.trim() && !sanitizedCustomCss) {
      toast.error("Blocked unsupported or unsafe theme CSS rules.");
      return;
    }
    updateStoreTheme({ customCss: sanitizedCustomCss });
    toast.success("Applied custom theme CSS to the local draft.");
  };

  const renderPreviewCanvas = (options?: { fullHeight?: boolean; interactive?: boolean }) => {
    const interactive = options?.interactive ?? true;
    const fullHeight = options?.fullHeight ?? false;

    return (
      <StoreProvider store={store}>
        <div className="[&_.animate-blur-in]:!opacity-100 [&_.animate-blur-in]:!blur-none [&_.animate-blur-in]:!filter-none [&_.animate-fade-in]:!opacity-100 [&_.animate-slide-up]:!opacity-100">
          {selectedPage ? (
            <StorefrontPreviewFrame
              viewport={previewViewport}
              title={`${selectedPage.title} preview`}
              className={cn(!fullHeight && "max-h-[720px]")}
              showToolbar={false}
              selectedBlockId={selectedBlockId}
              onSelectBlock={(blockId) => setSelectedBlockId(blockId ?? "")}
            >
              <StoreThemeScope theme={store.theme} themePackages={themePackages} respectVisitorPreference={false}>
                <StorefrontTemplateRenderer
                  store={store}
                  page={selectedPage}
                  blocks={previewBlocks}
                  adminMode={interactive}
                  selectedBlockId={selectedBlockId}
                  canManageStorefront={interactive}
                  onSelectBlock={(blockId) => setSelectedBlockId(blockId ?? "")}
                />
              </StoreThemeScope>
            </StorefrontPreviewFrame>
          ) : (
            <div className="rounded-xl border border-border bg-background p-8 text-sm text-muted-foreground">Add blocks to preview this page.</div>
          )}
        </div>
      </StoreProvider>
    );
  };
  const previewCanvas = renderPreviewCanvas();
  const cleanPreviewCanvas = renderPreviewCanvas({ fullHeight: true, interactive: false });
  const renderBasicPreviewSheet = () => {
    if (!selectedPage) return null;

    return (
      <CmsEditorPreviewSheet
        open={isMobilePreviewOpen}
        onOpenChange={setIsMobilePreviewOpen}
        viewport={previewViewport}
        onViewportChange={setPreviewViewport}
        pageTitle={selectedPage.title}
        previewCanvas={cleanPreviewCanvas}
      />
    );
  };
  const presentationBranch = resolveCmsEditorRenderBranch({
    workspaceTab,
    isBasicEditor,
    isAdvancedEditor,
    useLegacyEditor,
    hasSelectedPage: Boolean(selectedPage),
  });
  const storefrontProfile = typeof store.siteSettings?.storefront_profile === "object" && store.siteSettings?.storefront_profile
    ? store.siteSettings.storefront_profile as Record<string, unknown>
    : {};
  const storefrontTemplateId = resolveStorefrontTemplateId(storefrontProfile.template_id, {
    templateSeedId: typeof storefrontProfile.template_id === "string" ? storefrontProfile.template_id : storeTemplateSeedId,
    productVisibility: typeof storefrontProfile.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });
  const selectedPageType = selectedPage ? resolveBasicEditorPageType(selectedPage.slug) : "custom";
  const starterLayoutRecommendations = getBasicStarterLayouts(storefrontTemplateId, selectedPageType);
  const flowSections = resolveBasicFlowSections(storefrontTemplateId);
  const basicShellItems: BasicRailItem[] = [
    { id: "pages", label: "Pages", shortLabel: "Pg", icon: LayoutTemplate },
    { id: "content", label: "Content", shortLabel: "Ct", icon: Type },
    { id: "layout", label: "Layout", shortLabel: "Ly", icon: PanelsTopLeft },
    { id: "theme", label: "Theme", shortLabel: "Th", icon: Palette },
    { id: "effects", label: "Effects", shortLabel: "Ef", icon: Sparkles },
    { id: "flow", label: "Flow", shortLabel: "Fl", icon: ShoppingBag },
    { id: "launch", label: "Launch", shortLabel: "Ln", icon: Rocket, warning: !store.isPublished },
  ];
  const themeFonts = ["Inter", "Poppins", "Playfair Display", "Raleway", "Oswald", "Montserrat", "Nunito", "Source Sans 3"];
  const sortedSelectedBlocks = selectedPage ? [...selectedPage.blocks].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  const focusedContentBlock = selectedBlock ?? sortedSelectedBlocks[0] ?? null;
  const focusedLayoutBlock = selectedBlock ?? sortedSelectedBlocks[0] ?? null;
  const focusedLayoutVariants = focusedLayoutBlock ? getBasicLayoutVariantOptions(storefrontTemplateId, focusedLayoutBlock.type) : [];
  const readinessChecklist = [
    { id: "hero", label: "Hero message", ready: selectedPage ? selectedPage.blocks.some((block) => block.type === "hero" && block.isVisible) : false },
    { id: "products", label: "Discovery path", ready: selectedPage ? selectedPage.blocks.some((block) => ["featured-products", "category-showcase"].includes(block.type) && block.isVisible) : false },
    { id: "trust", label: "Trust section", ready: selectedPage ? selectedPage.blocks.some((block) => ["trust-badges", "faq-accordion", "testimonials"].includes(block.type) && block.isVisible) : false },
    { id: "theme", label: "Theme chosen", ready: Boolean(store.theme.aesthetic || store.theme.presetId !== "default") },
    { id: "mobile", label: "Mobile preview checked", ready: hasCheckedBasicPreview || previewViewport === "mobile" },
  ];
  const launchReadyCount = readinessChecklist.filter((item) => item.ready).length;
  const resolvedThemeVars = resolveStoreThemeVars(store.theme, themePackages).vars;
  const colorValueFromTheme = (token: string, fallback: string) => hslChannelsToHex(resolvedThemeVars[token] ?? "") ?? fallback;
  const primaryColorHex = colorValueFromTheme("--primary", "#10b981");
  const accentColorHex = colorValueFromTheme("--accent", "#f59e0b");
  const backgroundColorHex = colorValueFromTheme("--background", "#0f172a");
  const foregroundColorHex = colorValueFromTheme("--foreground", "#f8fafc");
  const renderSectionCard = ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-500">{title}</p>
        {description ? <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p> : null}
      </div>
      {children}
    </section>
  );
  const renderField = ({
    label,
    value,
    onChange,
    multiline = false,
    placeholder,
    type = "text",
  }: {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    multiline?: boolean;
    placeholder?: string;
    type?: "text" | "number";
  }) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-600 dark:text-gray-400">{label}</Label>
      {multiline ? (
        <Textarea
          value={String(value ?? "")}
          placeholder={placeholder}
          rows={4}
          className="border-gray-300 dark:border-gray-700"
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          type={type}
          value={String(value ?? "")}
          placeholder={placeholder}
          className="h-11 border-gray-300 dark:border-gray-700"
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
  const currentPageBlueprintOption = availablePageTemplates.find((template) => template.id === activeTemplateId)
    ?? availablePageTemplates.find((template) => template.id === newPageTemplate)
    ?? null;
  const renderNewBasicPanel = (tab: BasicRailItem["id"]) => {
    if (!selectedPage) return null;

    if (tab === "pages") {
      return (
        <BasicPagesTab
          page={selectedPage}
          allPages={store.pages}
          selectPage={selectPage}
          onCreatePage={addPage}
        />
      );
    }

    if (tab === "layout") {
      return (
        <BasicLayoutTab
          page={selectedPage}
          reorderBlocks={(start, end) => {
            const diff = end - start;
            const block = sortedSelectedBlocks[start];
            if (block) moveBlock(block.id, diff > 0 ? 1 : -1);
          }}
          availableBlocks={availableBlockRegistry}
          addBlockOfType={addBlockOfType}
          removeBlock={removeBlock}
          duplicateBlock={duplicateBlock}
        />
      );
    }

    if (tab === "content") {
      return (
        <BasicContentTab
          page={selectedPage}
          storeId={store.id}
          focusedBlockId={selectedBlockId}
          onFocusBlock={(blockId) => setSelectedBlockId(blockId ?? "")}
          updateBlockProps={updateAnyBlockProps}
          updateBlockMeta={updateBlockMeta}
          allPages={store.pages}
        />
      );
    }

    if (tab === "theme") {
      return (
        <ThemePanel
          theme={store.theme}
          themePackages={themePackages}
          colors={{
            primary: primaryColorHex,
            accent: accentColorHex,
            background: backgroundColorHex,
            foreground: foregroundColorHex,
          }}
          fonts={themeFonts}
          onThemePackageChange={updateThemePackage}
          onModeChange={updateThemeMode}
          onColorChange={(key, value) => updateThemeVar(`--${key}`, value)}
          onResetPalette={resetThemePalette}
          onApplyRecipe={applyThemeRecipe}
          onFontChange={updateFont}
          onAestheticChange={updateThemeAesthetic}
          onScaleChange={updateThemeScale}
          onScalePresetChange={updateThemeScales}
        />
      );
    }

    if (tab === "effects") {
      return (
        <BasicEffectsTab
          effects={store.theme.effects}
          onUpdateEffect={updateThemeEffect}
        />
      );
    }

    if (tab === "flow") {
      return (
        <BasicStoreFlowTab store={store} />
      );
    }

    return (
      <BasicLaunchTab
        store={store}
        onPublish={() => void saveAll("publish")}
        onUnpublish={() => void saveAll("unpublish")}
        isPublishing={saving}
      />
    );
  };

  const renderNewAdvancedTree = () => {
    if (!selectedPage) return null;
    return (
      <BlockTreePanel
        page={selectedPage}
        availableBlocks={availableBlockRegistry}
        selectedBlockId={selectedBlockId}
        onSelectBlock={setSelectedBlockId}
        onMoveBlock={moveBlock}
        onToggleVisibility={(id, isVisible) => updateBlockMeta(id, { isVisible, visible: isVisible })}
        onRemoveBlock={removeBlock}
        onAddBlock={addBlockOfType}
      />
    );
  };

  const renderNewAdvancedInspector = () => (
    <InspectorPanel
      selectedBlock={selectedBlock}
      updateSelectedBlockProps={(props) => selectedBlock && updateAnyBlockProps(selectedBlock.id, props)}
      updateSelectedBlockMeta={(patch) => selectedBlock && updateBlockMeta(selectedBlock.id, patch)}
      viewport={previewViewport}
      onViewportChange={setPreviewViewport}
      storeId={store.id}
      allPages={store.pages}
    />
  );

  if (presentationBranch === "gallery") {
    return (
      <>
        {confirmationDialog}
        <TemplateGallery
          store={store}
          applyThemeBundle={applyThemeBundle}
        />
      </>
    );
  }

  if (presentationBranch === "basic-recovery") {
    return (
      <AdminRecoveryPanel
        title="Opening Basic Editor"
        description="Basic mode is preparing the first editable page for this store."
        loadingLabel="Finding the homepage and storefront sections."
        retryLabel="Reload Basic Editor"
        onRetry={() => void loadStore()}
      />
    );
  }

  if (presentationBranch === "editor-shell" && selectedPage) {
    return (
      <>
      {confirmationDialog}
      <EditorShell
        store={store}
        pages={store.pages}
        activePageId={selectedPage.id}
        onPageChange={selectPage}
        selectedBlockId={selectedBlockId}
        onSelectBlock={(id) => setSelectedBlockId(id ?? "")}
        mode={isAdvancedEditor ? "advanced" : "basic"}
        onModeChange={(nextMode) => {
          navigate(nextMode === "advanced" ? advancedEditorHref : basicEditorHref);
        }}
        breakpoint={previewViewport}
        onBreakpointChange={(value) => {
          setPreviewViewport(value);
          if (value === "mobile") {
            setHasCheckedBasicPreview(true);
          }
        }}
        canUseAdvanced={getFeatureEnabled(entitlements?.featureMap, "advanced_storefront_editing", true)}
        saveState={saving ? "saving" : saveError ? "error" : hasUnsavedChanges ? "idle" : "saved"}
        saveDetail={saving ? "Saving your draft" : saveError ?? (hasUnsavedChanges ? "Draft has changes" : "All changes saved")}
        basicItems={basicShellItems}
        modeHrefs={{ basic: basicEditorHref, advanced: advancedEditorHref }}
        panelTitle={selectedPage.title}
        panelBreadcrumb={`Page ${selectedPageNumber} Â· ${selectedPage.slug}`}
        panelHelp="Edit this page with live storefront content, theme, and preview controls."
        renderBasicPanel={(tab) => renderNewBasicPanel(tab)}
        renderPreview={() => previewCanvas}
        renderAdvancedTree={() => renderNewAdvancedTree()}
        renderAdvancedInspector={() => renderNewAdvancedInspector()}
        headerActions={[
          {
            id: "save",
            label: saving ? "Saving" : hasUnsavedChanges ? "Save" : "Saved",
            icon: saving ? Loader2 : Save,
            onClick: () => void saveAll(),
            disabled: saving,
            className: "hidden lg:inline-flex",
          },
          {
            id: "publish",
            label: store.isPublished ? "Unpublish" : "Publish",
            icon: store.isPublished ? EyeOff : Rocket,
            onClick: () => void saveAll(store.isPublished ? "unpublish" : "publish"),
            disabled: saving,
            variant: "secondary",
            className: "hidden lg:inline-flex",
          },
          {
            id: "legacy",
            label: "Legacy",
            href: isAdvancedEditor ? legacyAdvancedEditorHref : legacyBasicEditorHref,
            variant: "ghost",
            className: "hidden lg:inline-flex",
          },
        ]}
        previewToolbarContent={
          <>
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={previewHref} target="_blank" rel="noreferrer">Open Store</a>
            </Button>
          </>
        }
        onMobilePreview={() => openBasicPreviewOverlay(previewViewport)}
        onUndo={undoStoreChange}
        onRedo={redoStoreChange}
        onSave={() => void saveAll()}
        onPublish={() => void saveAll(store.isPublished ? "unpublish" : "publish")}
        publishLabel={store.isPublished ? "Unpublish" : "Publish"}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        saveLabel={saving ? "Saving" : hasUnsavedChanges ? "Save" : "Saved"}
      />
      {renderBasicPreviewSheet()}
      </>
    );
  }

  if (presentationBranch === "guided-editor" && selectedPage) {
    const vibeOptions: Array<{ label: string; aesthetic: NonNullable<Store["theme"]["aesthetic"]>; heading: string; body: string }> = [
      { label: "Minimal", aesthetic: "minimal", heading: "Inter", body: "Inter" },
      { label: "Glass", aesthetic: "glassmorphism", heading: "Poppins", body: "Inter" },
      { label: "Fluid", aesthetic: "fluid", heading: "Raleway", body: "Nunito" },
      { label: "Cubic", aesthetic: "brutalist", heading: "Oswald", body: "Lato" },
      { label: "Editorial", aesthetic: "editorial", heading: "Playfair Display", body: "Source Sans 3" },
      { label: "Luxury", aesthetic: "dark-luxury", heading: "Playfair Display", body: "Inter" },
      { label: "Pop", aesthetic: "playful-pop", heading: "Montserrat", body: "Nunito" },
    ];

    const applySmartPolish = () => {
      const nextVibe = vibeOptions[Math.floor(Math.random() * vibeOptions.length)];
      const beforeSummary: SmartPolishSummary["before"] = {
        aesthetic: store.theme.aesthetic ?? "unset",
        headingFont: store.theme.headingFont ?? "Default heading",
        bodyFont: store.theme.bodyFont ?? "Default body",
        intensity: store.theme.effects?.intensity ?? "unset",
      };
      updateThemeAesthetic(nextVibe.aesthetic);
      updateFont("heading", nextVibe.heading);
      updateFont("body", nextVibe.body);
      updateThemeEffect("scrollReveals", true);
      updateThemeEffect("hoverEffects", true);
      updateThemeEffect("intensity", nextVibe.aesthetic === "minimal" ? "subtle" : "medium");
      updateStoreTheme({
        radiusScale: nextVibe.aesthetic === "brutalist" ? 0.1 : nextVibe.aesthetic === "playful-pop" ? 0.9 : 0.55,
        densityScale: nextVibe.aesthetic === "editorial" ? 0.75 : 0.5,
        paletteSource: "generated",
        paletteSeed: `${nextVibe.aesthetic}-${Date.now()}`,
      });
      setRevisionLabel(`Smart Polish checkpoint - ${nextVibe.label}`);
      setSmartPolishSummary({
        before: beforeSummary,
        after: {
          aesthetic: nextVibe.aesthetic,
          headingFont: nextVibe.heading,
          bodyFont: nextVibe.body,
          intensity: nextVibe.aesthetic === "minimal" ? "subtle" : "medium",
        },
      });
      toast.success("Smart Polish applied. Review the preview before saving.");
    };

    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background">
        {confirmationDialog}
        <div className="sticky top-0 z-30 border-b border-border/70 bg-background/95 px-3 py-3 backdrop-blur-xl sm:px-4">
          <div className="mx-auto flex max-w-[1800px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={store.isPublished ? "default" : "secondary"}>{store.isPublished ? "Published" : "Draft"}</Badge>
                <Badge variant={hasUnsavedChanges ? "secondary" : "outline"}>{hasUnsavedChanges ? "Unsaved changes" : "Saved"}</Badge>
                <Badge variant="outline">Guided Editing</Badge>
                {lastDraftSavedAt ? <Badge variant="outline" className="hidden sm:inline-flex">Autosaved {lastDraftSavedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</Badge> : null}
              </div>
              <h1 className="mt-2 truncate text-xl font-semibold text-foreground md:text-2xl">Guided Editor: {store.name}</h1>
              <p className="mt-1 hidden text-sm text-muted-foreground sm:block">Simple first glance, powerful underneath: guided setup, layout control, theme polish, and live preview.</p>
            </div>
            <div className="hidden flex-wrap items-center gap-2 xl:flex">
              <Button variant="outline" asChild className="gap-2">
                <Link to={advancedEditorHref}>
                  <Code2 className="h-4 w-4" />
                  Expert
                </Link>
              </Button>
            </div>
          </div>
          <div className="mx-auto mt-3 max-w-[1800px]">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.7fr))]">
              <div className="rounded-2xl border border-border bg-card/80 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">Editing safety</p>
                  <Badge variant={saving ? "secondary" : hasUnsavedChanges ? "secondary" : "outline"}>
                    {saving ? "Saving" : hasUnsavedChanges ? "Local draft" : "Up to date"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{basicStatusLabel}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Changes are kept locally as you work. Save persists your edits; Publish controls whether shoppers can access the storefront.
                </p>
              </div>
              {guidedEditingActionItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  disabled={item.disabled}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-left transition-colors",
                    item.variant === "default"
                      ? "border-primary/30 bg-primary/10 hover:bg-primary/15"
                      : "border-border bg-card/80 hover:border-primary/30 hover:bg-primary/5",
                    item.disabled && "cursor-not-allowed opacity-60 hover:border-border hover:bg-card/80",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <item.icon className={cn("h-4 w-4", item.variant === "default" ? "text-primary" : "text-muted-foreground")} />
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-[1800px] gap-4 p-3 pb-36 sm:p-4 sm:pb-32 xl:grid-cols-[460px_minmax(0,1fr)] xl:pb-4">
          <aside className="min-h-[calc(100dvh-8rem)] overflow-hidden rounded-lg border border-border bg-card shadow-sm xl:min-h-[calc(100vh-8rem)]">
            <div className="flex h-full min-h-[calc(100dvh-8rem)] flex-col pb-20 xl:min-h-[calc(100vh-8rem)] xl:pb-0">
              <div className="border-b border-border bg-muted/20 p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Quick Polish</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Improve spacing, type, motion, and style direction in one pass.</p>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={applySmartPolish} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Polish
                  </Button>
                </div>
                {smartPolishSummary ? (
                  <div className="mt-3 rounded-lg border border-border bg-background/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Smart Polish Applied</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {smartPolishSummary.before.aesthetic} moved to {smartPolishSummary.after.aesthetic}, with {smartPolishSummary.after.headingFont} / {smartPolishSummary.after.bodyFont}.
                    </p>
                  </div>
                ) : null}
              </div>
              <BasicModeEditor
                store={store}
                page={selectedPage}
                allPages={store.pages}
                updateBlockProps={updateAnyBlockProps}
                updateBlockMeta={updateBlockMeta}
                reorderBlocks={reorderBlocks}
                updateThemeVar={updateThemeVar}
                updateThemeVars={updateThemeVars}
                updateThemePackage={updateThemePackage}
                updateThemeMode={updateThemeMode}
                updateFont={updateFont}
                updateThemeScale={updateThemeScale}
                updateThemeAesthetic={updateThemeAesthetic}
                updateThemeEffect={updateThemeEffect}
                selectPage={selectPage}
                addBlockOfType={addBlockOfType}
                removeBlock={removeBlock}
                duplicateBlock={duplicateBlock}
                previewChecked={hasCheckedBasicPreview}
                availableBlocks={availableBlockRegistry}
              />
            </div>
          </aside>

          <main className="hidden min-h-[calc(100vh-8rem)] rounded-lg border border-border bg-card/70 p-4 shadow-sm xl:block">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Live Preview</p>
                <p className="mt-1 text-xs text-muted-foreground">Click a section in the preview to focus it. Use Full Screen for a clean customer-eye check.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-lg border border-border p-1">
                  <Button type="button" size="icon" variant={previewViewport === "desktop" ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => setPreviewViewport("desktop")} title="Desktop preview">
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant={previewViewport === "tablet" ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => setPreviewViewport("tablet")} title="Tablet preview">
                    <PanelsTopLeft className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant={previewViewport === "mobile" ? "secondary" : "ghost"} className="h-8 w-8" onClick={() => {
                    setPreviewViewport("mobile");
                    setHasCheckedBasicPreview(true);
                  }} title="Mobile preview">
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => openBasicPreviewOverlay(previewViewport)} className="gap-2">
                  <Eye className="h-4 w-4" />
                  Full Screen
                </Button>
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={previewHref} target="_blank" rel="noreferrer">Open Store</a>
                </Button>
              </div>
            </div>
            {previewCanvas}
          </main>
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-3 xl:hidden">
          <div className="pointer-events-auto w-full max-w-[380px] rounded-[1.6rem] border border-border bg-background/95 p-1.5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-2 pb-1.5 pt-0.5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mobile Editor Dock</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {saving
                    ? "Saving your draft..."
                    : hasUnsavedChanges
                      ? "Draft changed. Save before leaving."
                      : lastDraftSavedAt
                        ? `Saved at ${lastDraftSavedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                        : "All changes saved."}
                </p>
              </div>
              <Badge variant={saving || hasUnsavedChanges ? "secondary" : "outline"} className="shrink-0 rounded-full px-2 py-0.5 text-[10px]">
                {saving ? "Saving" : hasUnsavedChanges ? "Draft" : "Saved"}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="sm" className="h-10 flex-1 rounded-full gap-1.5 px-2 text-xs" onClick={() => openBasicPreviewOverlay("mobile")} title="Preview" data-testid="basic-mobile-preview-button">
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={undoStoreChange} disabled={undoStack.length === 0} title="Undo">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={redoStoreChange} disabled={redoStack.length === 0} title="Redo">
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button type="button" size="sm" className="h-10 flex-1 rounded-full gap-1.5 px-2 text-xs" onClick={() => void saveAll()} disabled={saving} title="Save">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving" : hasUnsavedChanges ? "Save" : "Saved"}
              </Button>
            </div>
          </div>
        </div>

        <CmsEditorPreviewSheet
          open={isMobilePreviewOpen}
          onOpenChange={setIsMobilePreviewOpen}
          viewport={previewViewport}
          onViewportChange={setPreviewViewport}
          pageTitle={selectedPage.title}
          previewCanvas={cleanPreviewCanvas}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {confirmationDialog}
      {isAdvancedEditor && selectedPage ? (
        <DomTreeNavigator
          page={selectedPage}
          selectedBlockId={selectedBlockId}
          onSelectBlock={setSelectedBlockId}
          onMoveBlock={moveBlock}
          onToggleVisibility={(blockId, isVisible) => updateBlockMeta(blockId, { isVisible, visible: isVisible })}
          onRemoveBlock={removeBlock}
        />
      ) : null}
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
                  {isAdvancedEditor ? "Expert Editing" : "Storefront Editor"}
                </h1>
                <Badge variant={isAdvancedEditor ? "secondary" : "outline"}>
                  {isAdvancedEditor ? "Full workspace" : "Storefront manager"}
                </Badge>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {isAdvancedEditor
                  ? `Manage storefront pages, templates, structure, revisions, and deep block controls for ${store.name}.`
                  : `Manage storefront pages, templates, revisions, and launch tools for ${store.name}.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to={basicEditorHref}>Guided Editing</Link>
              </Button>
              <Button asChild variant={isAdvancedEditor ? "secondary" : "outline"} size="sm" className="rounded-full">
                <Link to={advancedEditorHref}>Expert Editing</Link>
              </Button>
              {!isAdvancedEditor && (
                <Button size="sm" className="rounded-full gap-1.5" onClick={() => void saveAll()} disabled={saving || !hasUnsavedChanges}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "Saved"}
                </Button>
              )}
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
            {isBasicEditor ? (
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
              <>
                <Button variant="outline" onClick={exportStoreLayout} className="gap-2 px-3">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export Layout</span>
                </Button>
                {store && (
                  <TemplatePublishDialog store={store}>
                    <Button variant="outline" className="gap-2 px-3 text-purple-600 hover:text-purple-700" data-testid="open-template-publish-dialog">
                      <Rocket className="h-4 w-4" />
                      <span className="hidden sm:inline">Publish Template</span>
                    </Button>
                  </TemplatePublishDialog>
                )}
              </>
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
              { value: "gallery", label: "Templates" },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setWorkspaceTab(tab.value as "store" | "theme" | "pages" | "gallery");
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
                <div id="store-publishing" className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 scroll-mt-36">
                  <div>
                    <p className="text-sm font-medium text-foreground">Storefront visibility</p>
                    <p className="text-xs text-muted-foreground">{store.isPublished ? "Published and available to eligible shoppers." : "Draft only. Use preview while you prepare the storefront."}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={store.isPublished ? "outline" : "default"}
                    onClick={() => void saveAll(store.isPublished ? "unpublish" : "publish")}
                    disabled={saving}
                  >
                    {store.isPublished ? "Unpublish" : "Publish"}
                  </Button>
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
                  </div>
                  <div id="theme-package" className="grid gap-2 scroll-mt-36">
                    <Label>Theme Package</Label>
                    <Select value={store.theme.themePackageId ?? store.theme.presetId} onValueChange={updateThemePackage} disabled={!themePresetsEnabled}>
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
                      <p className="text-sm font-medium text-foreground">Basic Color Customizer</p>
                      <p className="text-xs text-muted-foreground">Customize primary, accent, and background brand colors saved to store customCssVars.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {BASIC_THEME_TOKENS.map((token) => {
                        const resolvedVars = resolveStoreThemeVars(store.theme, themePackages).vars;
                        const currentValue = store.theme.customCssVars[token.key] ?? resolvedVars[token.key] ?? "";

                        return (
                          <div key={token.key} className="grid gap-2">
                            <Label>{token.label}</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="color"
                                value={hslChannelsToHex(currentValue) ?? (currentValue.startsWith("#") ? currentValue : "#000000")}
                                onChange={(event) => {
                                  const next = hexToHslChannels(event.target.value) ?? event.target.value;
                                  updateStoreTheme({
                                    customCssVars: {
                                      ...store.theme.customCssVars,
                                      [token.key]: next,
                                    },
                                  });
                                }}
                                className="h-10 w-16 p-1 cursor-pointer"
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
                      ? "Select the page you want to edit, duplicate it, or create a new one from a compatible template graph."
                      : "Select a page and update content safely. Structural page creation and replacements stay in Expert Editing."}
                  </p>
                </div>
                <div id="pages-library" className="rounded-lg border border-border p-3 scroll-mt-36">
                  <div className="grid gap-3">
                    {!pageTemplatesEnabled ? (
                      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        Page templates are disabled for this store. New pages will start blank and template replacement is locked.
                      </div>
                    ) : null}
                    {!isAdvancedEditor ? (
                      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        New pages, template swaps, and layout imports live in <Link to={advancedEditorHref} className="font-medium text-foreground underline underline-offset-4">Expert Editing</Link>.
                      </div>
                    ) : null}
                    <div className="grid gap-2">
                      <Label>New Page Template</Label>
                      <Select value={newPageTemplate} onValueChange={setNewPageTemplate} disabled={!pageTemplatesEnabled || !isAdvancedEditor}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePageTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {availablePageTemplates.find((template) => template.id === newPageTemplate)?.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Showing page templates matched to the <span className="font-medium text-foreground">{activeTemplateSeed.shortName}</span> storefront type.
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
                    <div className="flex flex-wrap gap-2">
                      {["Before major edit", "Mobile polish checkpoint", "Launch-ready checkpoint"].map((label) => (
                        <Button
                          key={label}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => setRevisionLabel(label)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The next save creates a named checkpoint in Revision History using this label.
                    </p>
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
                          <Link to="/admin/site-settings?tab=template_features">Open global store settings</Link>
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
                        <Select value={activeTemplateId} onValueChange={setActiveTemplateId} disabled={!pageTemplatesEnabled}>
                          <SelectTrigger className="md:max-w-[280px]">
                            <SelectValue placeholder="Choose a template" />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePageTemplates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" onClick={() => applyTemplate(activeTemplateId)} className="gap-2" disabled={!pageTemplatesEnabled}>
                          <LayoutTemplate className="h-4 w-4" />
                          Apply Template
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {availablePageTemplates.find((template) => template.id === activeTemplateId)?.description}
                      </p>
                      {!pageTemplatesEnabled ? (
                        <p className="text-xs text-muted-foreground">Enable the `cms_pages` feature to use template-backed page structures here.</p>
                      ) : null}
                    </div>
                  ) : (
                    <div id="page-template" className="grid gap-2 md:col-span-2 rounded-lg border border-dashed border-border p-4 scroll-mt-36">
                      <p className="text-sm font-medium text-foreground">Need a new layout or template?</p>
                      <p className="text-xs text-muted-foreground">
                        Switch to <Link to={advancedEditorHref} className="font-medium text-foreground underline underline-offset-4">Expert Editing</Link> for page templates, homepage restructuring, and deeper layout changes.
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
                    <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-dashed border-border py-24 text-center">
                      <div className="rounded-full bg-primary/10 p-4">
                        <LayoutTemplate className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">Guided Store Setup</h3>
                        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                          Basic editing is now available directly on your live storefront. Open the Basic Editor to get started.
                        </p>
                      </div>
                      <Button asChild size="lg" className="gap-2 rounded-full mt-4">
                        <Link to={basicEditorHref}>
                          <Wand2 className="h-5 w-5" />
                          Launch Basic Editor
                        </Link>
                      </Button>
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
                      No blocks yet. Add one to start composing this page for the current storefront template.
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
                    const promoBgStyle = block.type === "promo-banner" && typeof block.props.bgStyle === "string" ? block.props.bgStyle : undefined;
                    const usesCustomPromoTheme = Boolean(promoBgStyle);
                    const clearPromoThemePatch = {
                      bgStyle: undefined,
                      enableGlow: undefined,
                      enableParticles: undefined,
                      enableOrbs: undefined,
                      cardOpacity: undefined,
                    };

                    return (
                      <div
                        key={block.id}
                        id={`cms-block-${block.id}`}
                        draggable
                        onDragStart={(event) => {
                          setDraggedAdvancedBlockId(block.id);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", block.id);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const sourceId = draggedAdvancedBlockId ?? event.dataTransfer.getData("text/plain");
                          const startIndex = selectedPage.blocks.findIndex((item) => item.id === sourceId);
                          if (startIndex !== -1 && startIndex !== index) {
                            reorderBlocks(startIndex, index);
                          }
                          setDraggedAdvancedBlockId(null);
                        }}
                        onDragEnd={() => setDraggedAdvancedBlockId(null)}
                        className={cn(
                          "rounded-xl border bg-card/60 p-4 transition-colors",
                          isFocused ? "border-primary bg-primary/5 shadow-sm" : "border-border",
                          draggedAdvancedBlockId === block.id && "border-primary bg-primary/5 opacity-70",
                        )}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
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
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() =>
                                updateBlock(block.id, (current) => {
                                  const nextVisible = !(current.isVisible ?? current.visible ?? true);
                                  return { ...current, isVisible: nextVisible, visible: nextVisible };
                                })
                              }
                            >
                              {(block.isVisible ?? block.visible ?? true) ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
                              {(block.isVisible ?? block.visible ?? true) ? "Visible on storefront" : "Hidden from storefront"}
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
                            <Switch
                              checked={block.isVisible ?? block.visible ?? true}
                              onCheckedChange={(checked) => updateBlock(block.id, (current) => ({ ...current, isVisible: checked, visible: checked }))}
                            />
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
                                <Select
                                  value={promoBgStyle ?? PROMO_THEME_DEFAULT_VALUE}
                                  onValueChange={(value) =>
                                    updateBlockProps(
                                      block.id,
                                      "promo-banner",
                                      value === PROMO_THEME_DEFAULT_VALUE
                                        ? clearPromoThemePatch
                                        : { bgStyle: value },
                                    )
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={PROMO_THEME_DEFAULT_VALUE}>Follow site theme</SelectItem>
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
                              {usesCustomPromoTheme ? (
                                <>
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
                                    <Switch checked={(block.props.enableParticles as boolean | undefined) ?? false} onCheckedChange={(checked) => updateBlockProps(block.id, "promo-banner", { enableParticles: checked })} />
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                                    <Label>Orbs</Label>
                                    <Switch checked={(block.props.enableOrbs as boolean | undefined) ?? false} onCheckedChange={(checked) => updateBlockProps(block.id, "promo-banner", { enableOrbs: checked })} />
                                  </div>
                                </>
                              ) : (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100 md:col-span-2">
                                  Promo colors and card treatment are following the active site theme.
                                </div>
                              )}
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
                                <TiptapRichTextEditor
                                  value={block.props.body as RichTextDoc | string}
                                  onChange={(doc) => updateRichTextBlockField(block.id, "body", doc)}
                                />
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
                <div id="page-builder-preview" className="space-y-3 pt-4">
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Live Preview</h3>
                      <p className="text-xs text-muted-foreground">Current page layout rendered with your storefront theme.</p>
                    </div>
                  </div>
                  {previewCanvas}
                </div>
              ) : null}

              {isAdvancedEditor ? (
                <Card id="advanced-visual-inspector" className="border-border scroll-mt-36">
                  <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle className="text-lg">Visual CSS Inspector</CardTitle>
                      <CardDescription>
                        Fine-tune the selected block visually. Breakpoint controls write scoped overrides without changing the Guided Editing content.
                      </CardDescription>
                    </div>
                    <div className="flex items-center rounded-lg border border-border p-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={previewViewport === "desktop" ? "secondary" : "ghost"}
                        className="h-8 rounded-md px-3 text-xs"
                        onClick={() => setPreviewViewport("desktop")}
                      >
                        Desktop
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={previewViewport === "tablet" ? "secondary" : "ghost"}
                        className="h-8 rounded-md px-3 text-xs"
                        onClick={() => setPreviewViewport("tablet")}
                      >
                        Tablet
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={previewViewport === "mobile" ? "secondary" : "ghost"}
                        className="h-8 rounded-md px-3 text-xs"
                        onClick={() => setPreviewViewport("mobile")}
                      >
                        Mobile
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <VisualCssInspector
                      selectedBlock={selectedBlock}
                      viewport={previewViewport}
                      allowCodeEditing={isAdvancedEditor}
                      updateSelectedBlock={(patch) => {
                        if (!selectedBlock) return;
                        updateBlockMeta(selectedBlock.id, patch);
                      }}
                      updateSelectedBlockProps={(patch) => {
                        if (!selectedBlock) return;
                        updateAnyBlockProps(selectedBlock.id, patch);
                      }}
                    />
                  </CardContent>
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
                    {revisionError ? (
                      <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-amber-800 dark:text-amber-200">{revisionError}</p>
                        <Button type="button" variant="outline" size="sm" onClick={() => void reloadRevisions()}>
                          Retry revision history
                        </Button>
                      </div>
                    ) : null}
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
                          <p className="mt-1 text-xs text-muted-foreground">
                            {sanitizeStoreBlocks(revision.blocks_snapshot).length} section{sanitizeStoreBlocks(revision.blocks_snapshot).length === 1 ? "" : "s"} saved
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
                {isAdvancedEditor && desktopPreviewMode === "minimized" ? (
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
                {isAdvancedEditor && desktopPreviewMode === "side" ? (
                  <div className={cn(
                    "hidden lg:block fixed top-24 z-30 w-[min(460px,calc(100vw-8rem))]",
                    desktopPreviewSide === "right" ? "right-24" : "left-24",
                  )}>
                    <Card className="overflow-hidden border-border/80 bg-background/95 shadow-2xl backdrop-blur-xl">                      <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 py-3 px-4">
                        <div>
                          <CardTitle className="text-base font-semibold">Live Preview</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDesktopPreviewMode("below")}>
                            Dock Below
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setDesktopPreviewMode("minimized")}>
                            <PanelRightClose className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="max-h-[75vh] overflow-auto p-3">
                        {previewCanvas}
                      </CardContent>
                    </Card>
                  </div>
                ) : null}
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
                    Open the Pages workspace, select an existing page, or create a new one from a template to unlock the full editor.
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
                    <p className="text-sm font-medium text-foreground">Create from template</p>
                    <p className="mt-1 text-xs text-muted-foreground">Start with a recommended structure, then customize blocks.</p>
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceTab("gallery");
                    }}
                    className="col-span-full rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/20"
                  >
                    <p className="text-sm font-medium text-primary-foreground">Browse Template Gallery</p>
                    <p className="mt-1 text-xs text-primary/80">Explore pre-built designs and preview them with your store data.</p>
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

