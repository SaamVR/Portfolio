"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, Copy, Eye, EyeOff, Loader2, Paintbrush2, PanelRightClose, PanelRightOpen, Plus, RotateCcw, Redo2, Rocket, Save, Settings2, Sparkles, Trash2, Undo2, Link as LinkIcon, Download, Upload, FileJson, Monitor, Smartphone, Tablet, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import { useMerchantConfirm } from "@/components/admin/MerchantConfirmDialog";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
import { persistStorefrontState } from "@/lib/cms/store-persistence";
import { refreshStorefrontContentCache } from "@/lib/storefront-cache-client";
import { GUIDED_THEME_TOKENS, hexToHslChannels, hslChannelsToHex, resolveStoreThemeVars } from "@/lib/cms/store-theme-utils";
import { supabase } from "@/integrations/supabase/client";
import { resolveStorefrontTemplateSeed } from "@/lib/cms/storefront-template-seeds";
import { getStorefrontTemplateDefinition, resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { loadThemePackages } from "@/lib/theme-packages";
import { Link, useLocation, useSearchParams } from "@/lib/react-router-dom-shim";
import { buildPageBuilderPath } from "@/lib/admin-paths";
import { BasicModeWizard } from "./BasicModeWizard";
import { DomTreeNavigator } from "./DomTreeNavigator";
import { StoreProvider } from "./StoreProvider";
import { StoreThemeScope } from "./StoreThemeScope";
import { StorefrontBlockRenderer } from "./StorefrontBlockRenderer";
import { FashionV3BlockRenderer } from "./fashion-v3/FashionV3BlockRenderer";
import { FashionV3Shell } from "./fashion-v3/FashionV3Shell";
import { ThreadsBlockRenderer } from "./threads/ThreadsBlockRenderer";
import { ThreadsShell } from "./threads/ThreadsShell";
import { VisualCssInspector } from "./VisualCssInspector";
import { MobileMerchantEditorSheet } from "./editor/MobileMerchantEditorSheet";
import { generateExportBundle, downloadExportBundle, parseImportBundle, ThemeExportBundle } from "@/lib/cms/theme-export-import";
import { createRegistryDefaultBlock, fallbackBlockRegistry, filterBlockRegistryForTemplateSeed, loadBlockRegistry, type CmsBlockRegistryItem } from "@/lib/cms/block-registry";
import { buildStorefrontEditorDraftEnvelope, getStorefrontEditorDraftKey, parseStorefrontEditorDraft, serializeStorefrontEditorDraft } from "@/lib/cms/storefront-platform/editor/draft-storage";
import { getStorefrontEditorQualityIssues } from "@/lib/cms/storefront-platform/editor/quality-assist";
import { applyCompositionRecipe, createCompositionBlockFromRecipe, getCompatibleCompositionRecipes, getCompositionEditorFields, getPlatformAestheticOptions, updateCompositionAction as updateCompositionActionContract, updateCompositionField as updateCompositionFieldContract } from "@/lib/cms/storefront-platform/editor/platform-contracts";

const BASIC_TEXT_FIELDS = [
  "eyebrow",
  "tagline",
  "title",
  "highlight",
  "subtitle",
  "body",
  "ctaText",
  "ctaLink",
  "secondaryTitle",
  "secondarySubtitle",
  "secondaryCtaText",
  "secondaryCtaLink",
  "badgeText",
  "mediaUrl",
  "videoUrl",
] as const;

const PROMO_BG_STYLES = ["gradient", "dark", "accent", "luxury-gold", "indigo", "rose", "aurora", "luxury-dark", "confetti", "mesh-gradient"] as const;
const PROMO_ALIGNMENTS = ["left", "center", "right"] as const;
const PROMO_PADDING_SIZES = ["compact", "cozy", "large"] as const;
const PROMO_THEME_DEFAULT_VALUE = "__theme-default";

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

function serializeStoreDraft(store: Store): string {
  return JSON.stringify(store);
}

function formatSavedTime(value: Date | null): string {
  return value
    ? value.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "";
}

function formatThemeFieldLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

function buildImportChangeSummary(store: Store, bundle: ThemeExportBundle) {
  const themeChanges = Object.entries(bundle.theme)
    .filter(([key, value]) => JSON.stringify(store.theme[key as keyof Store["theme"]]) !== JSON.stringify(value))
    .map(([key]) => formatThemeFieldLabel(key));

  const pageChanges = (bundle.pages ?? []).map((importedPage) => {
    const currentPage = store.pages.find((page) => page.slug === importedPage.slug);
    return {
      title: currentPage?.title ?? importedPage.title,
      slug: importedPage.slug,
      currentBlocks: currentPage?.blocks.length ?? 0,
      importedBlocks: importedPage.blocks.length,
      isNewPage: !currentPage,
    };
  });

  const layoutReplacementCount = pageChanges.filter((page) => !page.isNewPage).length;

  return {
    themeChanges,
    pageChanges,
    layoutReplacementCount,
    newPageCount: pageChanges.filter((page) => page.isNewPage).length,
    hasLayout: pageChanges.length > 0,
  };
}

function scrollToLiveEditorSection(sectionId: string) {
  if (typeof document === "undefined") return;
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updatePage(store: Store, pageId: string, updater: (page: StorePage) => StorePage) {
  return {
    ...store,
    pages: store.pages.map((page) => (page.id === pageId ? updater(page) : page)),
  };
}

function updateBlock(store: Store, pageId: string, blockId: string, updater: (block: StorePageBlock) => StorePageBlock) {
  return updatePage(store, pageId, (page) => ({
    ...page,
    blocks: page.blocks.map((block) => (block.id === blockId ? updater(block) : block)) as StorePageBlock[],
  }));
}

export function StorefrontLiveEditor({
  store,
  page,
  setStore,
  adminMode,
  selectedBlockId,
  onAdminModeChange,
  onSelectedBlockChange,
  canManageStore,
  userId,
}: {
  store: Store;
  page: StorePage;
  setStore: React.Dispatch<React.SetStateAction<Store>>;
  adminMode: boolean;
  selectedBlockId: string | null;
  onAdminModeChange: (value: boolean) => void;
  onSelectedBlockChange: (value: string | null) => void;
  canManageStore: boolean;
  userId: string | null | undefined;
}) {
  const [searchParams] = useSearchParams();
  const [editorMode, setEditorMode] = useState<"basic" | "advanced">(searchParams.get("mode") === "advanced" ? "advanced" : "basic");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [nextBlockType, setNextBlockType] = useState<StorePageBlock["type"]>("rich-text");
  const [insertPosition, setInsertPosition] = useState<"before" | "after">("after");
  const [history, setHistory] = useState<Store[]>([]);
  const [redoHistory, setRedoHistory] = useState<Store[]>([]);
  const [isDockMinimized, setIsDockMinimized] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [persistedSnapshot, setPersistedSnapshot] = useState(() => serializeStoreDraft(store));
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [localDraftProtected, setLocalDraftProtected] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { confirm: confirmMerchantAction, confirmationDialog } = useMerchantConfirm();
  
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importPreview, setImportPreview] = useState<ThemeExportBundle | null>(null);
  const [importError, setImportError] = useState("");
  const [blockRegistry, setBlockRegistry] = useState<CmsBlockRegistryItem[]>(fallbackBlockRegistry);
  const lastLoadedStoreRef = useRef(store);
  const storeIdRef = useRef(store.id);
  const pageIdRef = useRef(page.id);
  const draftSnapshotRef = useRef(serializeStoreDraft(store));
  const storeDraftRef = useRef(store);
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;
  const basicEditorHref = buildPageBuilderPath("basic", { pageId: page.id, returnTo });
  const advancedEditorHref = buildPageBuilderPath("advanced", { pageId: page.id, returnTo });
  const currentSnapshot = useMemo(() => serializeStoreDraft(store), [store]);
  storeIdRef.current = store.id;
  pageIdRef.current = page.id;
  draftSnapshotRef.current = currentSnapshot;
  storeDraftRef.current = store;
  const hasUnsavedChanges = currentSnapshot !== persistedSnapshot;
  const selectedBlock = useMemo(
    () => page.blocks.find((block) => block.id === selectedBlockId) ?? null,
    [page.blocks, selectedBlockId],
  );
  const importChangeSummary = useMemo(
    () => (importPreview ? buildImportChangeSummary(store, importPreview) : null),
    [importPreview, store],
  );
  const selectedBlockQualityIssues = useMemo(
    () => selectedBlock ? getStorefrontEditorQualityIssues(selectedBlock) : [],
    [selectedBlock],
  );
  const selectedCompositionEditor = useMemo(() => getCompositionEditorFields(selectedBlock), [selectedBlock]);
  const activeTemplateSeed = useMemo(() => {
    const profile = store.siteSettings?.storefront_profile;
    const inferredTemplateSeedId = typeof profile === "object" && profile && "template_id" in profile && typeof profile.template_id === "string"
      ? profile.template_id
      : typeof profile === "object" && profile && "product_visibility" in profile && profile.product_visibility === "landing_only"
        ? "landing-page"
        : undefined;
    return resolveStorefrontTemplateSeed(inferredTemplateSeedId);
  }, [store.siteSettings]);
  const availableBlockRegistry = useMemo(
    () => filterBlockRegistryForTemplateSeed(blockRegistry, activeTemplateSeed),
    [activeTemplateSeed, blockRegistry],
  );
  const compositionEnabled = availableBlockRegistry.some((block) => block.value === "composition");
  const platformAestheticOptions = useMemo(() => getPlatformAestheticOptions(store.theme), [store.theme]);

  useEffect(() => {
    if (!adminMode) {
      onSelectedBlockChange(null);
    }
  }, [adminMode, onSelectedBlockChange]);

  useEffect(() => {
    let cancelled = false;

    const loadRegistry = async () => {
      const registry = await loadBlockRegistry(supabase);
      if (!cancelled) {
        setBlockRegistry(registry);
      }
    };

    void loadRegistry();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const loadedStore = storeDraftRef.current;
    const baseline = serializeStoreDraft(loadedStore);
    lastLoadedStoreRef.current = loadedStore;
    setPersistedSnapshot(baseline);
    setHistory([]);
    setRedoHistory([]);
    setLastSavedAt(null);
    setSaveError(null);
    setLocalDraftProtected(false);

    if (typeof window !== "undefined") {
      const key = getStorefrontEditorDraftKey(loadedStore.id, page.id);
      const result = parseStorefrontEditorDraft(window.localStorage.getItem(key), {
        storeId: loadedStore.id,
        pageId: page.id,
        baseSnapshot: baseline,
      });
      if (result.status === "available" && serializeStoreDraft(result.envelope.draft) !== baseline) {
        setStore(result.envelope.draft);
        setHistory([loadedStore]);
        setLocalDraftProtected(true);
        toast.info("Recovered your protected storefront draft from this device.");
      } else if (result.status === "stale" || result.status === "invalid" || result.status === "base-mismatch") {
        window.localStorage.removeItem(key);
      }
    }
  // Reset the persisted baseline only when the loaded storefront identity changes.
  // Ordinary local edits must remain dirty until persistence succeeds.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id, store.id]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncOnlineState = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", syncOnlineState);
    window.addEventListener("offline", syncOnlineState);
    return () => {
      window.removeEventListener("online", syncOnlineState);
      window.removeEventListener("offline", syncOnlineState);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hasUnsavedChanges) return undefined;
    const key = getStorefrontEditorDraftKey(store.id, page.id);
    const persistLocalDraft = () => {
      try {
        const envelope = buildStorefrontEditorDraftEnvelope({
          store: storeDraftRef.current,
          pageId: page.id,
          baseSnapshot: persistedSnapshot,
        });
        window.localStorage.setItem(key, serializeStorefrontEditorDraft(envelope));
        setLocalDraftProtected(true);
      } catch (error) {
        console.warn("Unable to protect storefront editor draft locally:", error);
        setLocalDraftProtected(false);
      }
    };
    const timer = window.setTimeout(persistLocalDraft, 350);
    const flushDraft = () => persistLocalDraft();
    const flushOnVisibility = () => {
      if (document.visibilityState === "hidden") persistLocalDraft();
    };
    window.addEventListener("pagehide", flushDraft);
    document.addEventListener("visibilitychange", flushOnVisibility);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", flushDraft);
      document.removeEventListener("visibilitychange", flushOnVisibility);
    };
  }, [currentSnapshot, hasUnsavedChanges, page.id, persistedSnapshot, store.id]);

  useEffect(() => {
    if (!availableBlockRegistry.some((block) => block.value === nextBlockType)) {
      setNextBlockType(availableBlockRegistry[0]?.value ?? "rich-text");
    }
  }, [availableBlockRegistry, nextBlockType]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasUnsavedChanges) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (!canManageStore) {
    return null;
  }

  const applyStoreChange = (updater: (current: Store) => Store) => {
      setStore((current) => {
        setHistory((existing) => {
          const next = [...existing, current];
          return next.length > 20 ? next.slice(next.length - 20) : next;
        });
        setRedoHistory([]);
        return updater(current);
      });
  };

  const undoLastChange = () => {
    setHistory((existing) => {
      const previous = existing[existing.length - 1];
      if (!previous) {
        toast.error("No live editor changes to undo.");
        return existing;
      }

      setStore(previous);
      setRedoHistory((existingRedo) => [...existingRedo, store]);
      return existing.slice(0, -1);
    });
  };

  const redoLastChange = () => {
    setRedoHistory((existing) => {
      const nextState = existing[existing.length - 1];
      if (!nextState) {
        toast.error("No live editor changes to redo.");
        return existing;
      }

      setHistory((previousHistory) => [...previousHistory, store]);
      setStore(nextState);
      return existing.slice(0, -1);
    });
  };

  const resetToLoadedState = async () => {
    if (!hasUnsavedChanges) {
      setStore(lastLoadedStoreRef.current);
      setHistory([]);
      onSelectedBlockChange(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(getStorefrontEditorDraftKey(store.id, page.id));
      }
      setLocalDraftProtected(false);
      setSaveError(null);
      toast.success("Live editor reset to the last loaded storefront state.");
      return;
    }

    const originStoreId = store.id;
    const originPageId = page.id;
    const originDraftSnapshot = currentSnapshot;
    const confirmed = await confirmMerchantAction({
      title: "Discard unsaved live edits?",
      description: "Reset this live editor to the last loaded storefront state.",
      entityLabel: "Page",
      entityValue: page.title,
      storeName: store.name,
      impacts: [
        "Unsaved local edits in the current live-editor draft will be discarded.",
        "The editor returns to the last loaded or successfully saved storefront state; this confirmation does not publish anything.",
      ],
      recoveryText: "Cancel to keep the current unsaved live-editor draft unchanged.",
      confirmLabel: "Discard and reset",
      tone: "destructive",
    });
    if (!confirmed) return;
    if (
      storeIdRef.current !== originStoreId
      || pageIdRef.current !== originPageId
      || draftSnapshotRef.current !== originDraftSnapshot
    ) {
      toast.warning("The live-editor target changed, so the reset was cancelled.");
      return;
    }

    setStore(lastLoadedStoreRef.current);
    setHistory([]);
    onSelectedBlockChange(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(getStorefrontEditorDraftKey(store.id, page.id));
    }
    setLocalDraftProtected(false);
    setSaveError(null);
    toast.success("Live editor reset to the last loaded storefront state.");
  };

  const toggleAdminMode = async () => {
    if (!adminMode) {
      onAdminModeChange(true);
      return;
    }
    if (!hasUnsavedChanges) {
      onAdminModeChange(false);
      return;
    }

    const originStoreId = store.id;
    const originPageId = page.id;
    const originDraftSnapshot = currentSnapshot;
    const confirmed = await confirmMerchantAction({
      title: "Close live editor and keep local draft?",
      description: "Close the live-editor controls without saving or discarding the current local edits.",
      entityLabel: "Page",
      entityValue: page.title,
      storeName: store.name,
      impacts: [
        "The current unsaved edits stay available and are protected in a page-scoped draft on this device.",
        "The edits are not published or server-saved yet. Reopen this page to continue, then save when ready.",
      ],
      recoveryText: "Cancel to keep the live editor open with the current draft unchanged.",
      confirmLabel: "Close and keep draft",
      tone: "warning",
    });
    if (!confirmed) return;
    if (
      storeIdRef.current !== originStoreId
      || pageIdRef.current !== originPageId
      || draftSnapshotRef.current !== originDraftSnapshot
    ) {
      toast.warning("The live-editor target changed, so the close action was cancelled.");
      return;
    }

    onAdminModeChange(false);
  };

  const handleExport = (type: "theme-only" | "theme-and-layout" | "full-store") => {
    const bundle = generateExportBundle(store, type);
    downloadExportBundle(bundle, `${store.slug}-${type}.json`);
    toast.success(`Exported ${type.replace(/-/g, " ")} bundle`);
  };

  const handleImportAnalyze = () => {
    if (!importJson.trim()) {
      setImportError("Please paste a JSON bundle.");
      return;
    }
    const res = parseImportBundle(importJson);
    if (res.success) {
      setImportPreview(res.bundle);
      setImportError("");
    } else {
      setImportError(res.error);
      setImportPreview(null);
    }
  };

  const applyImport = () => {
    if (!importPreview) return;
    
    applyStoreChange((current) => {
      const newStore = { ...current };
      newStore.theme = { ...newStore.theme, ...importPreview.theme };
      
      if (importPreview.pages && importPreview.pages.length > 0) {
        newStore.pages = newStore.pages.map(p => {
          const importedPage = importPreview.pages!.find(ip => ip.slug === p.slug);
          return importedPage ? { ...p, blocks: importedPage.blocks } : p;
        });
      }
      return newStore;
    });
    
    setImportDialogOpen(false);
    setImportJson("");
    setImportPreview(null);
    toast.success("Theme bundle applied");
  };

  const updateStoreThemeToken = (token: string, value: string) => {
    applyStoreChange((current) => ({
      ...current,
      theme: {
        ...current.theme,
        customCssVars: {
          ...current.theme.customCssVars,
          [token]: value,
        },
      },
    }));
  };

  const updateStoreThemeAesthetic = (aesthetic: NonNullable<Store["theme"]["aesthetic"]>) => {
    applyStoreChange((current) => ({
      ...current,
      theme: { ...current.theme, aesthetic },
    }));
  };

  const updateSelectedBlockField = (field: string, value: string) => {
    if (!selectedBlock) return;

    applyStoreChange((current) => updateBlock(current, page.id, selectedBlock.id, (block) => ({
      ...block,
      props: {
        ...(block.props as Record<string, unknown>),
        [field]: value,
      },
    } as StorePageBlock)));
  };

  const updateSelectedBlock = (patch: Partial<StorePageBlock>) => {
    if (!selectedBlock) return;
    const normalizedPatch = normalizeBlockMetaPatch(patch);
    applyStoreChange((current) => updateBlock(current, page.id, selectedBlock.id, (block) => ({
      ...block,
      ...normalizedPatch,
    } as StorePageBlock)));
  };

  const updateSelectedBlockProps = (patch: Record<string, unknown>) => {
    if (!selectedBlock) return;

    applyStoreChange((current) => updateBlock(current, page.id, selectedBlock.id, (block) => ({
      ...block,
      props: mergeBlockProps(block.props as Record<string, unknown>, patch),
    } as StorePageBlock)));
  };

  const updateSelectedBlockNumber = (field: string, value: string) => {
    if (!selectedBlock) return;
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      updateSelectedBlockProps({ [field]: undefined });
      return;
    }
    updateSelectedBlockProps({ [field]: parsed });
  };

  const updateSelectedBlockJsonArray = (field: string, value: string) => {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error("Not an array");
      }
      updateSelectedBlockProps({ [field]: parsed });
    } catch {
      toast.error(`Invalid JSON array for ${field}.`);
    }
  };

  const updateSelectedArrayItem = (field: string, index: number, patch: Record<string, unknown>) => {
    if (!selectedBlock) return;
    const currentItems = Array.isArray((selectedBlock.props as Record<string, unknown>)[field])
      ? ([...(selectedBlock.props as Record<string, unknown>)[field] as unknown[]] as Record<string, unknown>[])
      : [];
    currentItems[index] = {
      ...(currentItems[index] ?? {}),
      ...patch,
    };
    updateSelectedBlockProps({ [field]: currentItems });
  };

  const addSelectedArrayItem = (field: string, item: Record<string, unknown>) => {
    if (!selectedBlock) return;
    const currentItems = Array.isArray((selectedBlock.props as Record<string, unknown>)[field])
      ? ([...(selectedBlock.props as Record<string, unknown>)[field] as unknown[]] as Record<string, unknown>[])
      : [];
    updateSelectedBlockProps({ [field]: [...currentItems, item] });
  };

  const removeSelectedArrayItem = (field: string, index: number) => {
    if (!selectedBlock) return;
    const currentItems = Array.isArray((selectedBlock.props as Record<string, unknown>)[field])
      ? ([...(selectedBlock.props as Record<string, unknown>)[field] as unknown[]] as Record<string, unknown>[])
      : [];
    updateSelectedBlockProps({ [field]: currentItems.filter((_, itemIndex) => itemIndex !== index) });
  };

  const moveSelectedBlock = (direction: -1 | 1) => {
    if (!selectedBlock) return;

    applyStoreChange((current) => updatePage(current, page.id, (currentPage) => {
      const blocks = [...currentPage.blocks].sort((a, b) => a.sortOrder - b.sortOrder);
      const index = blocks.findIndex((block) => block.id === selectedBlock.id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= blocks.length) {
        return currentPage;
      }

      const [block] = blocks.splice(index, 1);
      blocks.splice(nextIndex, 0, block);
      return {
        ...currentPage,
        blocks: blocks.map((item, sortOrder) => ({ ...item, sortOrder })),
      };
    }));
  };

  const duplicateSelectedBlock = () => {
    if (!selectedBlock) return;

    applyStoreChange((current) => updatePage(current, page.id, (currentPage) => {
      const sourceIndex = currentPage.blocks.findIndex((block) => block.id === selectedBlock.id);
      if (sourceIndex === -1) {
        return currentPage;
      }

      const sourceBlock = currentPage.blocks[sourceIndex];
      const duplicatedBlock: StorePageBlock = {
        ...sourceBlock,
        id: crypto.randomUUID(),
        sortOrder: sourceIndex + 1,
      };

      const blocks = [...currentPage.blocks];
      blocks.splice(sourceIndex + 1, 0, duplicatedBlock);
      onSelectedBlockChange(duplicatedBlock.id);

      return {
        ...currentPage,
        blocks: blocks.map((block, index) => ({ ...block, sortOrder: index })),
      };
    }));
  };

  const removeSelectedBlock = () => {
    if (!selectedBlock) return;

    applyStoreChange((current) => updatePage(current, page.id, (currentPage) => {
      if (currentPage.blocks.length <= 1) {
        toast.error("A page needs at least one block.");
        return currentPage;
      }

      const sourceIndex = currentPage.blocks.findIndex((block) => block.id === selectedBlock.id);
      if (sourceIndex === -1) {
        return currentPage;
      }

      const blocks = currentPage.blocks.filter((block) => block.id !== selectedBlock.id)
        .map((block, index) => ({ ...block, sortOrder: index }));
      const nextSelected = blocks[Math.max(0, sourceIndex - 1)] ?? blocks[0] ?? null;
      onSelectedBlockChange(nextSelected?.id ?? null);

      return {
        ...currentPage,
        blocks,
      };
    }));
  };

  const switchSelectedBlockType = (nextType: StorePageBlock["type"]) => {
    if (!selectedBlock || selectedBlock.type === nextType) return;

    applyStoreChange((current) => updateBlock(current, page.id, selectedBlock.id, (block) => {
      const replacement = createRegistryDefaultBlock(nextType, block.sortOrder);
      return {
        ...replacement,
        id: block.id,
        sortOrder: block.sortOrder,
        isVisible: block.isVisible,
      };
    }));
    toast.success(`Switched block to ${nextType}.`);
  };

  const insertNewBlock = () => {
    if (!selectedBlock) return;

    applyStoreChange((current) => updatePage(current, page.id, (currentPage) => {
      const sourceIndex = currentPage.blocks.findIndex((block) => block.id === selectedBlock.id);
      if (sourceIndex === -1) {
        return currentPage;
      }

      const insertionIndex = insertPosition === "before" ? sourceIndex : sourceIndex + 1;
      const nextBlock = createRegistryDefaultBlock(nextBlockType, insertionIndex);
      const blocks = [...currentPage.blocks];
      blocks.splice(insertionIndex, 0, nextBlock);
      onSelectedBlockChange(nextBlock.id);

      return {
        ...currentPage,
        blocks: blocks.map((block, index) => ({ ...block, sortOrder: index })),
      };
    }));
  };

  const insertCompositionRecipe = (recipeId: string) => {
    if (!compositionEnabled) return;
    applyStoreChange((current) => updatePage(current, page.id, (currentPage) => {
      const sourceIndex = selectedBlock
        ? currentPage.blocks.findIndex((block) => block.id === selectedBlock.id)
        : currentPage.blocks.length - 1;
      const insertionIndex = Math.max(0, sourceIndex + 1);
      const nextBlock = createCompositionBlockFromRecipe(recipeId, insertionIndex);
      const blocks = [...currentPage.blocks];
      blocks.splice(insertionIndex, 0, nextBlock);
      onSelectedBlockChange(nextBlock.id);
      return { ...currentPage, blocks: blocks.map((block, index) => ({ ...block, sortOrder: index })) };
    }));
  };

  const applySelectedCompositionRecipe = (recipeId: string) => {
    if (!selectedBlock || selectedBlock.type !== "composition") return;
    applyStoreChange((current) => updateBlock(current, page.id, selectedBlock.id, (block) => applyCompositionRecipe(block, recipeId)));
  };

  const updateSelectedCompositionField = (nodeId: string, key: "text" | "src" | "alt", value: string) => {
    if (!selectedBlock || selectedBlock.type !== "composition") return;
    applyStoreChange((current) => updateBlock(current, page.id, selectedBlock.id, (block) => updateCompositionFieldContract(block, nodeId, key, value)));
  };

  const updateSelectedCompositionAction = (nodeId: string, index: number, patch: { label?: string; href?: string }) => {
    if (!selectedBlock || selectedBlock.type !== "composition") return;
    applyStoreChange((current) => updateBlock(current, page.id, selectedBlock.id, (block) => updateCompositionActionContract(block, nodeId, index, patch)));
  };

  const saveLiveEdits = async (intent: "save" | "publish" | "unpublish" = "save") => {
    if (!isOnline) {
      setSaveError("Offline. Your draft is protected on this device and can be retried when the connection returns.");
      toast.warning("You are offline. The storefront draft is protected locally.");
      return;
    }
    setSaveError(null);
    const targetPublicationState = intent === "publish"
      ? true
      : intent === "unpublish"
        ? false
        : store.isPublished;
    const persistedStore = { ...store, isPublished: targetPublicationState };

    setSaving(true);
    try {
      const [themePackages, businessProfileResult] = await Promise.all([
        loadThemePackages(supabase, store.id),
        supabase.from("store_business_profiles" as any).select("template_id").eq("store_id", store.id).maybeSingle(),
      ]);
      const templateSeed = resolveStorefrontTemplateSeed((businessProfileResult.data as { template_id?: string | null } | null)?.template_id ?? null);
      const result = await persistStorefrontState({
        client: supabase,
        store,
        ownerId: userId ?? null,
        templateSeed,
        themePackages,
        selectedPage: page,
        revisionLabel: `Live ${editorMode} edit`,
        changedBy: userId ?? null,
        publicationState: targetPublicationState,
      });

      if (result.error) {
        const message = result.error.message || "Unknown error";
        setSaveError(`Save failed: ${message}`);
        toast.error(`Failed to save live edits: ${message}`);
        return;
      }

      await refreshStorefrontContentCache(supabase, store.id, {
        pageSlugs: [page.slug],
      });

      setStore(persistedStore);
      const nextSnapshot = serializeStoreDraft(persistedStore);
      setPersistedSnapshot(nextSnapshot);
      lastLoadedStoreRef.current = persistedStore;
      setHistory([]);
      setLastSavedAt(new Date());
      setSaveError(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(getStorefrontEditorDraftKey(store.id, page.id));
      }
      setLocalDraftProtected(false);
      toast.success(
        intent === "publish"
          ? "Storefront published."
          : intent === "unpublish"
            ? "Storefront unpublished. Draft preview remains available to you."
            : "Storefront edits saved.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown network error";
      setSaveError(`Save failed: ${message}`);
      toast.error("Could not save storefront changes. Your local draft is still protected.");
    } finally {
      setSaving(false);
    }
  };

  const resolvedThemeVars = resolveStoreThemeVars(store.theme).vars;
  const liveDockTargets = editorMode === "advanced"
    ? [
        { id: "live-editor-theme", label: "Theme" },
        { id: "live-editor-selected-block", label: "Block" },
        { id: "live-editor-advanced-tools", label: "Advanced" },
      ]
    : [
        { id: "live-editor-theme", label: "Theme" },
        { id: "live-editor-selected-block", label: "Content" },
      ];
  const saveStatusLabel = saving
    ? "Saving storefront changes..."
    : saveError
      ? saveError
      : !isOnline && hasUnsavedChanges
        ? localDraftProtected
          ? "Offline. Draft protected on this device; retry when connection returns."
          : "Offline. Keep this page open until local draft protection completes."
        : hasUnsavedChanges
          ? localDraftProtected
            ? lastSavedAt
              ? `Unsaved edits protected locally. Last server save ${formatSavedTime(lastSavedAt)}.`
              : "Unsaved edits protected locally on this device."
            : lastSavedAt
              ? `Unsaved edits. Last saved ${formatSavedTime(lastSavedAt)}.`
              : "Unsaved edits. Save before changing storefront visibility."
          : lastSavedAt
            ? `Saved at ${formatSavedTime(lastSavedAt)}. Storefront is ${store.isPublished ? "published" : "draft"}.`
            : `All changes saved. Storefront is ${store.isPublished ? "published" : "draft"}.`;
  const saveStatusTone = saveError || !isOnline ? "secondary" : saving ? "secondary" : hasUnsavedChanges ? "secondary" : "outline";
  const previewBlocks = [...page.blocks].sort((a, b) => a.sortOrder - b.sortOrder);
  const previewStorefrontProfile = typeof store.siteSettings?.storefront_profile === "object" && store.siteSettings.storefront_profile
    ? store.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const previewTemplateId = resolveStorefrontTemplateId(previewStorefrontProfile?.template_id, {
    templateSeedId: typeof previewStorefrontProfile?.template_id === "string" ? previewStorefrontProfile.template_id : null,
    productVisibility: typeof previewStorefrontProfile?.product_visibility === "string" ? previewStorefrontProfile.product_visibility : null,
  });
  const previewTemplate = getStorefrontTemplateDefinition(previewTemplateId);
  const compatibleCompositionRecipes = getCompatibleCompositionRecipes(previewTemplateId);

  const renderAdvancedControls = () => {
    if (!selectedBlock || editorMode !== "advanced") {
      return null;
    }

    switch (selectedBlock.type) {
      case "hero":
        return (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Anchor ID</Label>
              <Input value={selectedBlock.props.anchorId ?? ""} onChange={(event) => updateSelectedBlockProps({ anchorId: event.target.value })} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Media Type</Label>
                <Select
                  value={(selectedBlock.props.mediaType as "image" | "video" | undefined) ?? "image"}
                  onValueChange={(value) => updateSelectedBlockProps({ mediaType: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Image Fit</Label>
                <Select
                  value={(selectedBlock.props.mediaFit as "cover" | "contain" | undefined) ?? "cover"}
                  onValueChange={(value) => updateSelectedBlockProps({ mediaFit: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Fill frame</SelectItem>
                    <SelectItem value="contain">Fit whole image</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Overlay Opacity</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={selectedBlock.props.overlayOpacity?.toString() ?? ""}
                  onChange={(event) => updateSelectedBlockNumber("overlayOpacity", event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Hero Media</Label>
              <CloudinaryUpload
                value={selectedBlock.props.mediaUrl ?? ""}
                onChange={(url) => updateSelectedBlockProps({ mediaUrl: url })}
                onSelectAsset={(asset) => {
                  if (!asset) return;
                  updateSelectedBlockProps({ mediaType: asset.resourceType });
                }}
                folder="hero"
                accept="image/*,video/*"
                label="Upload hero media"
                resourceType="auto"
                storeId={store.id}
              />
            </div>
            <div className="grid gap-2">
              <Label>Overlay Color</Label>
              <Input value={selectedBlock.props.overlayColor ?? ""} onChange={(event) => updateSelectedBlockProps({ overlayColor: event.target.value })} />
            </div>
          </div>
        );
      case "promo-banner": {
        const promoBgStyle =
          typeof selectedBlock.props.bgStyle === "string"
            ? selectedBlock.props.bgStyle
            : undefined;
        const usesCustomPromoTheme = Boolean(promoBgStyle);
        const clearPromoThemePatch = {
          bgStyle: undefined,
          enableGlow: undefined,
          enableParticles: undefined,
          enableOrbs: undefined,
          cardOpacity: undefined,
        };

        return (
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Background Style</Label>
                <Select
                  value={promoBgStyle ?? PROMO_THEME_DEFAULT_VALUE}
                  onValueChange={(value) =>
                    updateSelectedBlockProps(
                      value === PROMO_THEME_DEFAULT_VALUE
                        ? clearPromoThemePatch
                        : { bgStyle: value },
                    )
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROMO_THEME_DEFAULT_VALUE}>Follow site theme</SelectItem>
                    {PROMO_BG_STYLES.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Text Alignment</Label>
                <Select value={(selectedBlock.props.textAlignment as string | undefined) ?? "center"} onValueChange={(value) => updateSelectedBlockProps({ textAlignment: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROMO_ALIGNMENTS.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Padding Size</Label>
                <Select value={(selectedBlock.props.paddingSize as string | undefined) ?? "cozy"} onValueChange={(value) => updateSelectedBlockProps({ paddingSize: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROMO_PADDING_SIZES.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {usesCustomPromoTheme ? (
                <div className="grid gap-2">
                  <Label>Card Opacity</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={selectedBlock.props.cardOpacity?.toString() ?? ""}
                    onChange={(event) => updateSelectedBlockNumber("cardOpacity", event.target.value)}
                  />
                </div>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Primary promo image</Label>
                <CloudinaryUpload
                  value={(selectedBlock.props.imageUrl as string | undefined) ?? ""}
                  onChange={(url) => updateSelectedBlockProps({ imageUrl: url })}
                  folder="promo-banner"
                  accept="image/*"
                  label="Upload primary promo image"
                  resourceType="image"
                  storeId={store.id}
                />
              </div>
              <div className="grid gap-2">
                <Label>Secondary promo image</Label>
                <CloudinaryUpload
                  value={(selectedBlock.props.secondaryImageUrl as string | undefined) ?? ""}
                  onChange={(url) => updateSelectedBlockProps({ secondaryImageUrl: url })}
                  folder="promo-banner"
                  accept="image/*"
                  label="Upload secondary promo image"
                  resourceType="image"
                  storeId={store.id}
                />
              </div>
            </div>
            {usesCustomPromoTheme ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                  <Label>Glow</Label>
                  <Switch checked={(selectedBlock.props.enableGlow as boolean | undefined) ?? false} onCheckedChange={(checked) => updateSelectedBlockProps({ enableGlow: checked })} />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                  <Label>Particles</Label>
                  <Switch checked={(selectedBlock.props.enableParticles as boolean | undefined) ?? false} onCheckedChange={(checked) => updateSelectedBlockProps({ enableParticles: checked })} />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                  <Label>Orbs</Label>
                  <Switch checked={(selectedBlock.props.enableOrbs as boolean | undefined) ?? false} onCheckedChange={(checked) => updateSelectedBlockProps({ enableOrbs: checked })} />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
                Promo colors and card treatment are following the active site theme.
              </div>
            )}
          </div>
        );
      }
      case "category-showcase":
        return (
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                <Label>Autoplay carousel</Label>
                <Switch checked={(selectedBlock.props.autoplay as boolean | undefined) ?? true} onCheckedChange={(checked) => updateSelectedBlockProps({ autoplay: checked })} />
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                <Label>Show arrows</Label>
                <Switch checked={(selectedBlock.props.showArrows as boolean | undefined) ?? true} onCheckedChange={(checked) => updateSelectedBlockProps({ showArrows: checked })} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Category limit</Label>
                <Input type="number" min="1" max="24" value={selectedBlock.props.limit?.toString() ?? "10"} onChange={(event) => updateSelectedBlockNumber("limit", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Autoplay interval (ms)</Label>
                <Input type="number" min="2500" max="15000" step="500" value={selectedBlock.props.autoplayIntervalMs?.toString() ?? "3400"} onChange={(event) => updateSelectedBlockNumber("autoplayIntervalMs", event.target.value)} />
              </div>
            </div>
          </div>
        );
      case "featured-products":
        return (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Product Limit</Label>
              <Input
                type="number"
                min="1"
                max="24"
                value={selectedBlock.props.limit?.toString() ?? "6"}
                onChange={(event) => updateSelectedBlockNumber("limit", event.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                <Label>Autoplay carousel</Label>
                <Switch checked={(selectedBlock.props.autoplay as boolean | undefined) ?? true} onCheckedChange={(checked) => updateSelectedBlockProps({ autoplay: checked })} />
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                <Label>Show arrows</Label>
                <Switch checked={(selectedBlock.props.showArrows as boolean | undefined) ?? true} onCheckedChange={(checked) => updateSelectedBlockProps({ showArrows: checked })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Autoplay interval (ms)</Label>
              <Input type="number" min="2500" max="15000" step="500" value={selectedBlock.props.autoplayIntervalMs?.toString() ?? "4300"} onChange={(event) => updateSelectedBlockNumber("autoplayIntervalMs", event.target.value)} />
            </div>
          </div>
        );
      case "recommended-products":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Product source</Label>
              <Select value={(selectedBlock.props.source as string | undefined) ?? "newest"} onValueChange={(value) => updateSelectedBlockProps({ source: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="featured-or-all">Featured or all</SelectItem>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Product limit</Label>
              <Input type="number" min="1" max="24" value={selectedBlock.props.limit?.toString() ?? "8"} onChange={(event) => updateSelectedBlockNumber("limit", event.target.value)} />
            </div>
          </div>
        );
      case "countdown":
        return (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>End Date</Label>
              <Input value={selectedBlock.props.endDate ?? ""} placeholder="2026-12-31T23:59:59" onChange={(event) => updateSelectedBlockProps({ endDate: event.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Background Gradient</Label>
              <Input value={selectedBlock.props.bgGradient ?? ""} onChange={(event) => updateSelectedBlockProps({ bgGradient: event.target.value })} />
            </div>
          </div>
        );
      case "rich-text":
        return (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Story image</Label>
              <CloudinaryUpload
                value={(selectedBlock.props.imageUrl as string | undefined) ?? ""}
                onChange={(url) => updateSelectedBlockProps({ imageUrl: url })}
                folder="rich-text"
                accept="image/*"
                label="Upload story image"
                resourceType="image"
                storeId={store.id}
              />
            </div>
            <div className="grid gap-2">
            <Label>Alignment</Label>
            <Select value={(selectedBlock.props.align as "left" | "center" | undefined) ?? "center"} onValueChange={(value) => updateSelectedBlockProps({ align: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">left</SelectItem>
                <SelectItem value="center">center</SelectItem>
              </SelectContent>
            </Select>
            </div>
          </div>
        );
      case "social-feed":
        return (
          <div className="grid gap-3">
            {((selectedBlock.props.images as string[] | undefined) ?? []).map((image, index) => (
              <div key={`${image}-${index}`} className="rounded-xl border border-border p-3">
                <div className="grid gap-2">
                  <Label>Image {index + 1}</Label>
                  <CloudinaryUpload
                    value={image}
                    onChange={(url) => {
                      const next = [ ...(((selectedBlock.props.images as string[] | undefined) ?? [])) ];
                      next[index] = url;
                      updateSelectedBlockProps({ images: next });
                    }}
                    folder="social-feed"
                    accept="image/*"
                    label="Upload social image"
                    resourceType="image"
                    storeId={store.id}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    const next = [ ...(((selectedBlock.props.images as string[] | undefined) ?? [])) ].filter((_, itemIndex) => itemIndex !== index);
                    updateSelectedBlockProps({ images: next });
                  }}>
                    Remove image
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => updateSelectedBlockProps({
              images: [...(((selectedBlock.props.images as string[] | undefined) ?? [])), ""],
            })}>
              Add image
            </Button>
          </div>
        );
      case "video-reel":
        return (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Video Upload</Label>
              <CloudinaryUpload
                value={selectedBlock.props.videoUrl ?? ""}
                onChange={(url) => updateSelectedBlockProps({ videoUrl: url })}
                folder="video-reel"
                accept="video/*"
                label="Upload video"
                resourceType="video"
                storeId={store.id}
              />
            </div>
          </div>
        );
      case "faq-accordion":
        return (
          <div className="grid gap-3">
            {((selectedBlock.props.faqs as Array<{ q: string; a: string }> | undefined) ?? []).map((faq, index) => (
              <div key={`${faq.q}-${index}`} className="rounded-xl border border-border p-3">
                <div className="grid gap-2">
                  <Label>Question</Label>
                  <Input value={faq.q ?? ""} onChange={(event) => updateSelectedArrayItem("faqs", index, { q: event.target.value })} />
                  <Label>Answer</Label>
                  <Textarea rows={3} value={faq.a ?? ""} onChange={(event) => updateSelectedArrayItem("faqs", index, { a: event.target.value })} />
                  <Button type="button" variant="outline" size="sm" onClick={() => removeSelectedArrayItem("faqs", index)}>
                    Remove FAQ
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addSelectedArrayItem("faqs", { q: "", a: "" })}>
              Add FAQ
            </Button>
          </div>
        );
      case "trust-badges":
        return (
          <div className="grid gap-3">
            {((selectedBlock.props.badges as Array<{ label: string; description?: string; icon?: string }> | undefined) ?? []).map((badge, index) => (
              <div key={`${badge.label}-${index}`} className="rounded-xl border border-border p-3">
                <div className="grid gap-2">
                  <Label>Label</Label>
                  <Input value={badge.label ?? ""} onChange={(event) => updateSelectedArrayItem("badges", index, { label: event.target.value })} />
                  <Label>Description</Label>
                  <Textarea rows={2} value={badge.description ?? ""} onChange={(event) => updateSelectedArrayItem("badges", index, { description: event.target.value })} />
                  <Label>Icon</Label>
                  <Select value={badge.icon ?? "shield"} onValueChange={(value) => updateSelectedArrayItem("badges", index, { icon: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="truck">truck</SelectItem>
                      <SelectItem value="payment">payment</SelectItem>
                      <SelectItem value="returns">returns</SelectItem>
                      <SelectItem value="support">support</SelectItem>
                      <SelectItem value="shield">shield</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" onClick={() => removeSelectedArrayItem("badges", index)}>
                    Remove badge
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addSelectedArrayItem("badges", { label: "", description: "", icon: "shield" })}>
              Add badge
            </Button>
          </div>
        );
      case "testimonials":
        return (
          <div className="grid gap-3">
            {((selectedBlock.props.reviews as Array<{ name: string; rating?: number; comment: string }> | undefined) ?? []).map((review, index) => (
              <div key={`${review.name}-${index}`} className="rounded-xl border border-border p-3">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input value={review.name ?? ""} onChange={(event) => updateSelectedArrayItem("reviews", index, { name: event.target.value })} />
                  <Label>Rating</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={String(review.rating ?? 5)}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value || "5", 10);
                      updateSelectedArrayItem("reviews", index, { rating: Number.isNaN(parsed) ? 5 : parsed });
                    }}
                  />
                  <Label>Comment</Label>
                  <Textarea rows={3} value={review.comment ?? ""} onChange={(event) => updateSelectedArrayItem("reviews", index, { comment: event.target.value })} />
                  <Button type="button" variant="outline" size="sm" onClick={() => removeSelectedArrayItem("reviews", index)}>
                    Remove review
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addSelectedArrayItem("reviews", { name: "", rating: 5, comment: "" })}>
              Add review
            </Button>
          </div>
        );
      default:
        return (
          <p className="text-xs text-muted-foreground">
            Expert editing for this block is still lightweight here. Use the full storefront editor for deeper structure changes.
          </p>
        );
    }
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-end sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-1/2 sm:-translate-y-1/2">
      {confirmationDialog}
      <div className="w-full sm:hidden">
        {adminMode ? (
          <MobileMerchantEditorSheet
            store={store}
            selectedBlock={selectedBlock}
            templateId={previewTemplateId}
            saving={saving}
            hasUnsavedChanges={hasUnsavedChanges}
            saveStatusLabel={saveStatusLabel}
            isOnline={isOnline}
            localDraftProtected={localDraftProtected}
            qualityIssues={selectedBlockQualityIssues}
            compositionEnabled={compositionEnabled}
            canUndo={history.length > 0}
            canRedo={redoHistory.length > 0}
            onClose={() => void toggleAdminMode()}
            onSave={() => void saveLiveEdits()}
            onPreview={() => setIsPreviewOpen(true)}
            onUndo={undoLastChange}
            onRedo={redoLastChange}
            onUpdateBlockMeta={updateSelectedBlock}
            onUpdateBlockProps={updateSelectedBlockProps}
            onMoveBlock={moveSelectedBlock}
            onDuplicateBlock={duplicateSelectedBlock}
            onRemoveBlock={removeSelectedBlock}
            onUpdateThemeToken={updateStoreThemeToken}
            onUpdateThemeAesthetic={updateStoreThemeAesthetic}
            onInsertCompositionRecipe={insertCompositionRecipe}
            onApplyCompositionRecipe={applySelectedCompositionRecipe}
            onUpdateCompositionField={updateSelectedCompositionField}
            onUpdateCompositionAction={updateSelectedCompositionAction}
          />
        ) : (
          <div className="pointer-events-auto mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-2 rounded-2xl border border-border bg-background/95 p-2 shadow-xl backdrop-blur">
            <Button type="button" className="min-h-11 flex-1 rounded-xl" onClick={() => void toggleAdminMode()}>
              <Settings2 className="h-4 w-4" />
              Edit store
            </Button>
            <Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={() => setIsPreviewOpen(true)}>
              <Smartphone className="h-4 w-4" />
              Preview
            </Button>
          </div>
        )}
      </div>
      <div className="hidden w-full max-w-[min(440px,100%)] flex-col items-end gap-3 sm:flex">
        <div className="pointer-events-auto flex justify-end">
          {isDockMinimized ? (
            <div className="flex flex-col items-end gap-2">
              <Button type="button" size="icon" variant={adminMode ? "secondary" : "ghost"} className="h-10 w-10 rounded-full shadow-lg" onClick={() => void toggleAdminMode()} title={adminMode ? "Close live editor" : "Open live editor"}>
                {adminMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button type="button" size="icon" variant="outline" className="h-10 w-10 rounded-full shadow-lg" onClick={() => undoLastChange()} disabled={history.length === 0} title="Undo live edit">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="outline" className="h-10 w-10 rounded-full shadow-lg" onClick={() => redoLastChange()} disabled={redoHistory.length === 0} title="Redo live edit">
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="outline" className="h-10 w-10 rounded-full shadow-lg" onClick={() => setIsPreviewOpen(true)} title="Open storefront preview">
                <Smartphone className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" className="h-10 w-10 rounded-full shadow-lg" onClick={() => void saveLiveEdits()} disabled={saving || !hasUnsavedChanges} title={hasUnsavedChanges ? "Save live edits" : "All changes saved"}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
              <Button type="button" size="icon" variant="outline" className="h-10 w-10 rounded-full shadow-lg" onClick={() => setIsDockMinimized(false)} title="Expand live editor dock">
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex w-full max-w-[min(320px,calc(100vw-1rem))] flex-col gap-2 rounded-[1.5rem] border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Quick Edit Panel</p>
                  <p className="truncate text-xs text-muted-foreground">{saveStatusLabel}</p>
                </div>
                <Button type="button" size="icon" variant="outline" className="h-9 w-9 rounded-full" onClick={() => setIsDockMinimized(true)} title="Minimize live editor dock">
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" size="sm" variant={adminMode ? "secondary" : "outline"} className="justify-start rounded-full" onClick={() => void toggleAdminMode()}>
                  {adminMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {adminMode ? "Close" : "Open"}
                </Button>
                <Button type="button" size="sm" variant="outline" className="justify-start rounded-full" onClick={() => void resetToLoadedState()}>
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
                <Button type="button" size="sm" variant="outline" className="justify-start rounded-full" onClick={() => undoLastChange()} disabled={history.length === 0}>
                  <Undo2 className="h-4 w-4" />
                  Undo
                </Button>
                <Button type="button" size="sm" variant="outline" className="justify-start rounded-full" onClick={() => redoLastChange()} disabled={redoHistory.length === 0}>
                  <Redo2 className="h-4 w-4" />
                  Redo
                </Button>
                <Button type="button" size="sm" variant="outline" className="justify-start rounded-full" onClick={() => setIsPreviewOpen(true)}>
                  <Smartphone className="h-4 w-4" />
                  Preview
                </Button>
                <Select value={editorMode} onValueChange={(value) => setEditorMode(value as "basic" | "advanced")}>
                  <SelectTrigger className="col-span-2 h-9 rounded-full px-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Guided Editing</SelectItem>
                    <SelectItem value="advanced">Expert Editing</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" size="sm" className="justify-start rounded-full" onClick={() => void saveLiveEdits()} disabled={saving || !hasUnsavedChanges}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {hasUnsavedChanges ? "Save updates" : "Saved"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={store.isPublished ? "outline" : "secondary"}
                  className="justify-start rounded-full"
                  onClick={() => void saveLiveEdits(store.isPublished ? "unpublish" : "publish")}
                  disabled={saving}
                >
                  <Rocket className="h-4 w-4" />
                  {store.isPublished ? "Unpublish" : "Publish"}
                </Button>
              </div>
              <div className="grid gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Jump</p>
                <div className="flex flex-wrap gap-2">
                  {liveDockTargets.map((target) => (
                    <Button
                      key={target.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => scrollToLiveEditorSection(target.id)}
                    >
                      {target.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {adminMode ? (
          <div className="pointer-events-auto max-h-[calc(100vh-5.5rem)] overflow-y-auto rounded-[1.75rem] border border-border bg-background/95 p-4 shadow-2xl backdrop-blur sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {editorMode === "advanced" ? "Expert Live Editor" : "Guided Setup Editor"}
                  </p>
                <Badge variant={saveStatusTone}>{saving ? "Saving" : hasUnsavedChanges ? "Unsaved" : "Saved"}</Badge>
                <Badge variant={store.isPublished ? "default" : "outline"}>{store.isPublished ? "Published" : "Draft"}</Badge>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-foreground">{page.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{saveStatusLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                {editorMode === "advanced" && (
                  <div className="flex items-center rounded-full border border-border bg-background p-1">
                    <Button type="button" size="sm" variant={viewport === "desktop" ? "secondary" : "ghost"} className="h-7 rounded-full px-3 text-xs" onClick={() => setViewport("desktop")}>Desktop</Button>
                    <Button type="button" size="sm" variant={viewport === "tablet" ? "secondary" : "ghost"} className="h-7 rounded-full px-3 text-xs" onClick={() => setViewport("tablet")}>Tablet</Button>
                    <Button type="button" size="sm" variant={viewport === "mobile" ? "secondary" : "ghost"} className="h-7 rounded-full px-3 text-xs" onClick={() => setViewport("mobile")}>Mobile</Button>
                  </div>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" size="sm" variant="outline" className="rounded-full">
                      <Download className="mr-2 h-4 w-4" />
                      Theme Export & Import
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport("theme-only")}>
                      <Download className="mr-2 h-4 w-4" /> Export Theme Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("theme-and-layout")}>
                      <FileJson className="mr-2 h-4 w-4" /> Export Theme & Layout
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                      <Upload className="mr-2 h-4 w-4" /> Import Theme Bundle
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button asChild type="button" size="sm" variant="outline" className="rounded-full">
                  <Link to={editorMode === "advanced" ? advancedEditorHref : basicEditorHref}>
                    {editorMode === "advanced" ? "Open Expert Workspace" : "Open Guided Workspace"}
                  </Link>
                </Button>
              </div>
            </div>

            {hasUnsavedChanges ? (
              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-950 dark:text-amber-100">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{localDraftProtected ? "Your edits are protected on this device but not saved to the server yet." : "Your edits are not persisted yet. Save them before leaving or changing storefront visibility."}</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-950 dark:text-emerald-100">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{store.isPublished ? "The published storefront is synced with the latest saved changes." : "Your saved storefront remains private until you publish it."}</p>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-4">
              {editorMode === "basic" ? (
                <div className="rounded-2xl border border-border p-4 bg-background">
                  <BasicModeWizard 
                    store={store} 
                    page={page} 
                    updateBlock={(blockId, patch) => {
                      applyStoreChange((current) => updateBlock(current, page.id, blockId, (block) => ({
                        ...block,
                        props: {
                          ...(block.props as Record<string, unknown>),
                          ...patch,
                        },
                      } as StorePageBlock)));
                    }}
                    updateThemeToken={updateStoreThemeToken}
                  />
                </div>
              ) : (
                <>
                  <div id="live-editor-theme" className="rounded-2xl border border-border p-3 scroll-mt-28">
                    <div className="mb-3 flex items-center gap-2">
                      <Paintbrush2 className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">Theme and aesthetic</p>
                    </div>
                    <div className="mb-4 grid gap-2 sm:grid-cols-2">
                      {platformAestheticOptions.map((option) => {
                        const selected = store.theme.aesthetic === option.storedValue || (!store.theme.aesthetic && option.engineId === "flat");
                        return (
                          <button
                            key={option.storedValue}
                            type="button"
                            className={`rounded-xl border p-3 text-left ${selected ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                            onClick={() => updateStoreThemeAesthetic(option.storedValue)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold">{option.label}</span>
                              {selected ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{option.detail}</p>
                            <p className="mt-2 text-[11px] text-muted-foreground">Presentation only — colors, logo, content, products, navigation, and fonts stay unchanged.</p>
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {GUIDED_THEME_TOKENS.map((token) => {
                        const currentValue = store.theme.customCssVars[token.key] ?? resolvedThemeVars[token.key] ?? "";
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
                                  updateStoreThemeToken(token.key, next);
                                }}
                                className="h-10 w-16 p-1"
                              />
                              <Input value={currentValue} onChange={(event) => updateStoreThemeToken(token.key, event.target.value)} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div id="live-editor-selected-block" className="rounded-2xl border border-border p-3 scroll-mt-28">
                    <div className="mb-3 flex items-center gap-2">
                      <Settings2 className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">Selected block</p>
                    </div>
                    {!selectedBlock ? (
                      <p className="text-sm text-muted-foreground">Click a highlighted section on the storefront to edit it here.</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{selectedBlock.type}</p>
                            <Badge variant="outline">{(selectedBlock.isVisible ?? selectedBlock.visible ?? true) ? "Visible" : "Hidden"}</Badge>
                          </div>
                          <Switch
                            checked={selectedBlock.isVisible ?? selectedBlock.visible ?? true}
                            onCheckedChange={(checked) => setStore((current) => updateBlock(current, page.id, selectedBlock.id, (block) => ({ ...block, isVisible: checked, visible: checked })))}
                          />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => moveSelectedBlock(-1)} className="justify-start">
                            <ArrowUp className="h-4 w-4" />
                            Move up
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => moveSelectedBlock(1)} className="justify-start">
                            <ArrowDown className="h-4 w-4" />
                            Move down
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => duplicateSelectedBlock()} className="justify-start">
                            <Copy className="h-4 w-4" />
                            Duplicate
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => removeSelectedBlock()} className="justify-start">
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                        <div id="live-editor-advanced-tools" className="grid gap-3 rounded-xl border border-border p-3 scroll-mt-28">
                          <div>
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <p className="text-sm font-medium text-foreground">Advanced block tools</p>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">Switch block type or insert a new section beside the current block.</p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="grid gap-2">
                              <Label>Switch Block Type</Label>
                              <Select value={selectedBlock.type} onValueChange={(value) => switchSelectedBlockType(value as StorePageBlock["type"])}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {availableBlockRegistry.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label>Insert Position</Label>
                              <Select value={insertPosition} onValueChange={(value) => setInsertPosition(value as "before" | "after")}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="before">Before selected</SelectItem>
                                  <SelectItem value="after">After selected</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                            <div className="grid gap-2">
                              <Label>Insert Block Type</Label>
                              <Select value={nextBlockType} onValueChange={(value) => setNextBlockType(value as StorePageBlock["type"])}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {availableBlockRegistry.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button type="button" size="sm" variant="outline" onClick={() => insertNewBlock()} className="sm:min-w-[132px]">
                              <Plus className="h-4 w-4" />
                              Insert Block
                            </Button>
                          </div>
                        </div>
                        {selectedBlock.type === "composition" ? (
                          <div className="grid gap-3 rounded-xl border border-border p-3">
                            <div>
                              <p className="text-sm font-medium">Composition recipe</p>
                              <p className="mt-1 text-xs text-muted-foreground">Recipe changes stay inside this section. Store colors, logo, products, navigation, and other sections are preserved.</p>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {compatibleCompositionRecipes.map((recipe) => (
                                <button
                                  key={recipe.id}
                                  type="button"
                                  className={`rounded-xl border p-3 text-left ${selectedCompositionEditor.recipeId === recipe.id ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                                  onClick={() => applySelectedCompositionRecipe(recipe.id)}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold">{recipe.label}</span>
                                    {recipe.recommended ? <Badge variant="secondary">Recommended</Badge> : null}
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">{recipe.guidance}</p>
                                </button>
                              ))}
                            </div>
                            {selectedCompositionEditor.fields.filter((field) => field.key !== "src").map((field) => (
                              <div key={`${field.nodeId}-${field.key}`} className="grid gap-2">
                                <Label>{field.label}</Label>
                                {field.multiline ? (
                                  <Textarea value={field.value} onChange={(event) => updateSelectedCompositionField(field.nodeId, field.key, event.target.value)} />
                                ) : (
                                  <Input value={field.value} onChange={(event) => updateSelectedCompositionField(field.nodeId, field.key, event.target.value)} />
                                )}
                              </div>
                            ))}
                            {selectedCompositionEditor.actions.map((action) => (
                              <div key={`${action.nodeId}-${action.index}`} className="grid gap-2 rounded-xl border border-border p-3">
                                <Label>Action {action.index + 1}</Label>
                                <Input value={action.label} placeholder="Button label" onChange={(event) => updateSelectedCompositionAction(action.nodeId, action.index, { label: event.target.value })} />
                                <Input value={action.href} placeholder="/shop" onChange={(event) => updateSelectedCompositionAction(action.nodeId, action.index, { href: event.target.value })} />
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {BASIC_TEXT_FIELDS.filter((field) => selectedBlock.type !== "composition" && typeof selectedBlock.props[field] === "string").map((field) => (
                          <div key={field} className="grid gap-2">
                            <div className="flex items-center justify-between">
                              <Label>{field}</Label>
                              {editorMode === "advanced" && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Bind to data">
                                      <LinkIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => updateSelectedBlockField(field, `{{store.name}}`)}>Store Name</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateSelectedBlockField(field, `{{store.description}}`)}>Store Description</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateSelectedBlockField(field, `{{product.price}}`)}>Product Price</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateSelectedBlockField(field, `{{product.inventory_count}}`)}>Inventory Count</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateSelectedBlockField(field, `{{customer.name}}`)}>Customer Name</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                            {field === "body" || field.toLowerCase().includes("subtitle") ? (
                              <Textarea
                                value={String(selectedBlock.props[field] ?? "")}
                                onChange={(event) => updateSelectedBlockField(field, event.target.value)}
                              />
                            ) : (
                              <Input
                                value={String(selectedBlock.props[field] ?? "")}
                                onChange={(event) => updateSelectedBlockField(field, event.target.value)}
                              />
                            )}
                          </div>
                        ))}
                        {renderAdvancedControls()}
                        {previewTemplateId === "threads" && ["hero", "category-showcase", "featured-products", "promo-banner", "rich-text", "testimonials", "faq-accordion"].includes(selectedBlock.type) ? (
                          <div className="grid gap-2 rounded-xl border border-border p-3">
                            <Label>Threads botanical decoration</Label>
                            <Select value={selectedBlock.decoration ?? "subtle"} onValueChange={(value) => updateSelectedBlock({ decoration: value as StorePageBlock["decoration"] })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Off</SelectItem>
                                <SelectItem value="subtle">Subtle</SelectItem>
                                <SelectItem value="full">Full</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="mb-3 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <p className="text-sm font-medium text-foreground">Visual CSS</p>
                          </div>
                          <VisualCssInspector 
                            selectedBlock={selectedBlock} 
                            updateSelectedBlock={updateSelectedBlock}
                            updateSelectedBlockProps={updateSelectedBlockProps} 
                            viewport={viewport}
                            allowCodeEditing={editorMode === "advanced"}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
      {editorMode === "advanced" && (
        <div className="hidden sm:block">
          <DomTreeNavigator
          page={page}
          selectedBlockId={selectedBlockId}
          onSelectBlock={onSelectedBlockChange}
          onMoveBlock={(id, direction) => {
            const index = page.blocks.findIndex(b => b.id === id);
            if (index < 0) return;
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= page.blocks.length) return;
            applyStoreChange((current) => updatePage(current, page.id, (p) => {
              const newBlocks = [...p.blocks];
              const temp = newBlocks[index];
              newBlocks[index] = newBlocks[targetIndex];
              newBlocks[targetIndex] = temp;
              return { ...p, blocks: newBlocks.map((b, i) => ({ ...b, sortOrder: i })) };
            }));
          }}
          onToggleVisibility={(id, isVisible) => {
            applyStoreChange((current) => updateBlock(current, page.id, id, (block) => ({ ...block, isVisible, visible: isVisible })));
          }}
          onRemoveBlock={(id) => {
            applyStoreChange((current) => updatePage(current, page.id, (p) => ({
              ...p,
              blocks: p.blocks.filter((b) => b.id !== id).map((b, i) => ({ ...b, sortOrder: i })),
            })));
          }}
          />
        </div>
      )}
      {isPreviewOpen ? (
        <div className="pointer-events-auto fixed inset-0 z-[90] bg-background/95 backdrop-blur">
          <div className="flex h-full flex-col">
            <div className="border-b border-border bg-background/95 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Storefront Preview</p>
                  <p className="text-xs text-muted-foreground">Preview the page as a merchant-friendly storefront check, then close to keep editing.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={viewport === "desktop" ? "secondary" : "outline"}
                    className="rounded-full"
                    onClick={() => setViewport("desktop")}
                  >
                    <Monitor className="h-4 w-4" />
                    Desktop
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={viewport === "tablet" ? "secondary" : "outline"}
                    className="rounded-full"
                    onClick={() => setViewport("tablet")}
                  >
                    <Tablet className="h-4 w-4" />
                    Tablet
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={viewport === "mobile" ? "secondary" : "outline"}
                    className="rounded-full"
                    onClick={() => setViewport("mobile")}
                  >
                    <Smartphone className="h-4 w-4" />
                    Mobile
                  </Button>
                  <Button type="button" size="icon" variant="outline" className="rounded-full" onClick={() => setIsPreviewOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              <div className={`mx-auto w-full ${viewport === "mobile" ? "max-w-[430px]" : viewport === "tablet" ? "max-w-[768px]" : "max-w-6xl"}`}>
                <StoreProvider store={store}>
                  <StoreThemeScope theme={store.theme}>
                    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
                      <div className="border-b border-border bg-card px-4 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {page.title}
                      </div>
                      <div className="overflow-y-auto">
                        {previewBlocks.length > 0 ? (
                          previewTemplateId === "fashion" ? (
                            <FashionV3Shell embedded>
                              {previewBlocks.map((block) => (
                                <FashionV3BlockRenderer key={block.id} block={block} template={previewTemplate} />
                              ))}
                            </FashionV3Shell>
                          ) : previewTemplateId === "threads" ? (
                            <ThreadsShell embedded>
                              {previewBlocks.map((block) => (
                                <ThreadsBlockRenderer key={block.id} block={block} template={previewTemplate} />
                              ))}
                            </ThreadsShell>
                          ) : (
                            previewBlocks.map((block) => (
                              <StorefrontBlockRenderer key={block.id} block={block} template={previewTemplate} />
                            ))
                          )
                        ) : (
                          <div className="p-8 text-sm text-muted-foreground">This page has no visible sections yet.</div>
                        )}
                      </div>
                    </div>
                  </StoreThemeScope>
                </StoreProvider>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Theme Bundle</DialogTitle>
            <DialogDescription>
              Paste the JSON code of the theme you want to import. This will overwrite current theme settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea 
              placeholder="Paste JSON here..." 
              className="h-40 font-mono text-xs"
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
            />
            {importError && (
              <div className="text-sm text-destructive font-medium">{importError}</div>
            )}
            {importPreview && (
              <div className="rounded-md bg-muted p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Change summary</p>
                  <Badge variant="outline">{importPreview.type.replace(/-/g, " ")}</Badge>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Theme changes</p>
                    <p className="mt-1">
                      {importChangeSummary?.themeChanges.length
                        ? importChangeSummary.themeChanges.slice(0, 6).join(", ")
                        : "No theme differences detected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Layout changes</p>
                    {importChangeSummary?.hasLayout ? (
                      <ul className="mt-1 space-y-1">
                        {importChangeSummary.pageChanges.slice(0, 4).map((pageChange) => (
                          <li key={pageChange.slug}>
                            {pageChange.title}: {pageChange.isNewPage ? "new page" : `${pageChange.currentBlocks} -> ${pageChange.importedBlocks} sections`}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1">No page layout included</p>
                    )}
                  </div>
                  {importChangeSummary?.layoutReplacementCount ? (
                    <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-100">
                      Applying this bundle replaces sections on {importChangeSummary.layoutReplacementCount} existing page{importChangeSummary.layoutReplacementCount === 1 ? "" : "s"} in your current draft.
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            {!importPreview ? (
              <Button onClick={handleImportAnalyze}>Analyze Bundle</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setImportPreview(null); setImportJson(""); setImportError(""); setImportDialogOpen(false); }}>Cancel</Button>
                <Button onClick={applyImport}>Apply Import</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
