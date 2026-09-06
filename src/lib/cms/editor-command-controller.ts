"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { reservedCmsSlugs } from "@/lib/cms/block-library";
import type { EditorContextToken } from "@/lib/cms/editor-context";
import { storeSchema, type Store, type StorePage, type StorePageBlock } from "@/lib/cms/schema";
import { persistStorefrontState } from "@/lib/cms/store-persistence";
import type { StorefrontTemplateSeedDefinition } from "@/lib/cms/storefront-template-seeds";
import type { ThemeExportBundle } from "@/lib/cms/theme-export-import";
import { sanitizeStoreBlocks, sanitizeStorePage, validateStoreForPersistence } from "@/lib/cms/validation";
import { refreshStorefrontContentCache } from "@/lib/storefront-cache-client";
import type { ThemePackageDefinition } from "@/lib/theme-packages";

export const STORE_LAYOUT_PACKAGE_SCHEMA = "ecomcms.storefront-layout.v1";

export type StoreLayoutPackage = {
  schema: typeof STORE_LAYOUT_PACKAGE_SCHEMA;
  exportedAt: string;
  source: {
    storeName: string;
    storeSlug: string;
    templateSeedId: string;
  };
  layout: {
    description: string;
    theme: Store["theme"];
    pages: StorePage[];
  };
};

export type RecoverableDraft = {
  snapshot: string;
  updatedAt: string;
};

export type CmsEditorPersistIntent = "save" | "publish" | "unpublish";

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type CreateId = () => string;

export type PreparedStoreMutation = {
  store: Store;
  selectedPageId: string;
  replacedPages: boolean;
};

export type PreparedRevisionRestore = {
  pageId: string;
  blocks: StorePageBlock[];
  currentBlockCount: number;
  revisionBlockCount: number;
  changedTypes: StorePageBlock["type"][];
};

export type CmsEditorSaveResult =
  | { status: "success"; persistedStore: Store }
  | { status: "error"; message: string }
  | { status: "stale" }
  | { status: "ignored" };

function resolveDraftStorage(storage?: DraftStorage): DraftStorage | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function getCmsEditorDraftStorageKey(storeId: string | null | undefined): string {
  return storeId ? `commerce-engine-cms-draft:${storeId}` : "";
}

export function readCmsEditorRecoverableDraft(
  key: string,
  storage?: DraftStorage,
): RecoverableDraft | null {
  const target = resolveDraftStorage(storage);
  if (!key || !target) return null;

  try {
    const rawDraft = target.getItem(key);
    if (!rawDraft) return null;
    const parsed = JSON.parse(rawDraft) as Partial<RecoverableDraft>;
    if (typeof parsed.snapshot !== "string" || typeof parsed.updatedAt !== "string") return null;
    return { snapshot: parsed.snapshot, updatedAt: parsed.updatedAt };
  } catch {
    return null;
  }
}

export function writeCmsEditorRecoverableDraft(
  key: string,
  snapshot: string,
  storage?: DraftStorage,
  now: () => Date = () => new Date(),
): Date | null {
  const target = resolveDraftStorage(storage);
  if (!key || !target) return null;

  try {
    const savedAt = now();
    target.setItem(key, JSON.stringify({ snapshot, updatedAt: savedAt.toISOString() } satisfies RecoverableDraft));
    return savedAt;
  } catch {
    return null;
  }
}

export function clearCmsEditorRecoverableDraft(key: string, storage?: DraftStorage): void {
  const target = resolveDraftStorage(storage);
  if (!key || !target) return;
  try {
    target.removeItem(key);
  } catch {
    // Draft cleanup must never turn a completed authoritative save into a UI failure.
  }
}

function isManagedStorefrontFlowPage(page: StorePage): boolean {
  if (page.slug !== "/shop") return false;
  return page.blocks.every((block) => block.type === "rich-text" && block.isVisible === false);
}

export function prepareCmsEditorPersistence(store: Store, intent: CmsEditorPersistIntent) {
  const validatedStore = validateStoreForPersistence(store);
  if (!validatedStore.success) {
    const firstIssue = validatedStore.error.issues[0];
    return {
      ok: false as const,
      message: `CMS validation failed: ${firstIssue?.message ?? "Please review the page content."}`,
    };
  }

  const safeStore = validatedStore.data;
  const targetPublicationState = intent === "publish"
    ? true
    : intent === "unpublish"
      ? false
      : safeStore.isPublished;
  const seenSlugs = new Set<string>();

  for (const page of safeStore.pages) {
    if (!page.slug.startsWith("/")) {
      return { ok: false as const, message: `Page slug "${page.slug}" must start with "/".` };
    }
    if (page.slug !== "/" && reservedCmsSlugs.has(page.slug) && !isManagedStorefrontFlowPage(page)) {
      return { ok: false as const, message: `"${page.slug}" is already handled by the app and cannot be reused here.` };
    }
    if (seenSlugs.has(page.slug)) {
      return { ok: false as const, message: `Duplicate page slug found: ${page.slug}` };
    }
    seenSlugs.add(page.slug);
  }

  return { ok: true as const, store: safeStore, targetPublicationState };
}

function defaultCreateId(): string {
  return crypto.randomUUID();
}

export function prepareStoreLayoutImport({
  raw,
  store,
  allowAdvanced,
  createId = defaultCreateId,
}: {
  raw: string;
  store: Store;
  allowAdvanced: boolean;
  createId?: CreateId;
}): PreparedStoreMutation {
  const parsed = JSON.parse(raw) as Partial<StoreLayoutPackage>;
  if (parsed.schema !== STORE_LAYOUT_PACKAGE_SCHEMA || !parsed.layout || !Array.isArray(parsed.layout.pages)) {
    throw new Error("This is not a valid storefront layout package.");
  }

  const importedPages = parsed.layout.pages.flatMap((page) => {
    const pageId = createId();
    const sanitizedPage = sanitizeStorePage({
      ...page,
      id: pageId,
      isHomepage: Boolean(page.isHomepage),
      blocks: sanitizeStoreBlocks(page.blocks ?? [], { allowAdvanced }).map((block, blockIndex) => ({
        ...block,
        id: createId(),
        sortOrder: blockIndex,
      })),
    }, { allowAdvanced });
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

  return {
    store: candidate,
    selectedPageId: candidate.pages.find((page) => page.isHomepage)?.id ?? candidate.pages[0]?.id ?? "",
    replacedPages: true,
  };
}

export function prepareThemeBundleApplication({
  bundle,
  store,
  allowAdvanced,
  createId = defaultCreateId,
}: {
  bundle: ThemeExportBundle;
  store: Store;
  allowAdvanced: boolean;
  createId?: CreateId;
}): PreparedStoreMutation {
  const importedPages = (bundle.pages || []).flatMap((page) => {
    const pageId = createId();
    const sanitizedPage = sanitizeStorePage({
      ...page,
      id: pageId,
      isHomepage: Boolean(page.isHomepage),
      blocks: sanitizeStoreBlocks(page.blocks ?? [], { allowAdvanced }).map((block, blockIndex) => ({
        ...block,
        id: createId(),
        sortOrder: blockIndex,
      })),
    }, { allowAdvanced });
    return sanitizedPage ? [sanitizedPage] : [];
  });
  const normalizedPages = importedPages.length > 0
    ? importedPages.map((page, index) => ({
        ...page,
        isHomepage: index === 0,
        slug: index === 0 ? "/" : page.slug === "/" ? `/page-${index + 1}` : page.slug,
      }))
    : store.pages;
  const candidate = storeSchema.parse({ ...store, theme: bundle.theme, pages: normalizedPages });

  return {
    store: candidate,
    selectedPageId: importedPages.length > 0
      ? candidate.pages.find((page) => page.isHomepage)?.id ?? candidate.pages[0]?.id ?? ""
      : "",
    replacedPages: importedPages.length > 0,
  };
}

export function prepareRevisionRestore({
  revisionBlocks,
  selectedPage,
}: {
  revisionBlocks: StorePageBlock[];
  selectedPage: StorePage;
}): PreparedRevisionRestore {
  const blocks = sanitizeStoreBlocks(revisionBlocks).map((block, index) => ({ ...block, sortOrder: index }));
  const currentTypes = (selectedPage.blocks ?? []).map((block) => block.type);
  const revisionTypes = blocks.map((block) => block.type);
  const changedTypes = Array.from(new Set(revisionTypes.filter((type, index) => currentTypes[index] !== type)));
  return {
    pageId: selectedPage.id,
    blocks,
    currentBlockCount: selectedPage.blocks?.length ?? 0,
    revisionBlockCount: blocks.length,
    changedTypes,
  };
}

type CmsEditorCommandControllerOptions = {
  client: SupabaseClient<any>;
  activeStoreId: string | null;
  ownerId: string | null;
  activeTemplateSeed: StorefrontTemplateSeedDefinition;
  themePackages: ThemePackageDefinition[];
  captureEditorContext: () => EditorContextToken;
  isEditorContextCurrent: (context: EditorContextToken) => boolean;
  reloadWorkspace: () => Promise<void>;
};

export function useCmsEditorCommandController({
  client,
  activeStoreId,
  ownerId,
  activeTemplateSeed,
  themePackages,
  captureEditorContext,
  isEditorContextCurrent,
  reloadWorkspace,
}: CmsEditorCommandControllerOptions) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftStorageKey = useMemo(() => getCmsEditorDraftStorageKey(activeStoreId), [activeStoreId]);

  useEffect(() => {
    setBusy(false);
    setError(null);
  }, [activeStoreId]);

  const clearError = useCallback(() => setError(null), []);
  const reportError = useCallback((message: string) => setError(message), []);
  const readRecoverableDraft = useCallback(
    () => readCmsEditorRecoverableDraft(draftStorageKey),
    [draftStorageKey],
  );
  const writeRecoverableDraft = useCallback(
    (snapshot: string) => writeCmsEditorRecoverableDraft(draftStorageKey, snapshot),
    [draftStorageKey],
  );
  const clearRecoverableDraft = useCallback(
    () => clearCmsEditorRecoverableDraft(draftStorageKey),
    [draftStorageKey],
  );
  const clearDraftForStore = useCallback((storeId: string) => {
    clearCmsEditorRecoverableDraft(getCmsEditorDraftStorageKey(storeId));
  }, []);

  const saveStorefront = useCallback(async ({
    store,
    selectedPage,
    revisionLabel,
    intent,
  }: {
    store: Store;
    selectedPage: StorePage | null;
    revisionLabel: string;
    intent: CmsEditorPersistIntent;
  }): Promise<CmsEditorSaveResult> => {
    if (!ownerId) return { status: "ignored" };

    const context = captureEditorContext();
    if (!context.storeId || store.id !== context.storeId || !isEditorContextCurrent(context)) {
      return { status: "stale" };
    }

    setError(null);
    const prepared = prepareCmsEditorPersistence(store, intent);
    if (!prepared.ok) {
      if (isEditorContextCurrent(context)) setError(prepared.message);
      return { status: "error", message: prepared.message };
    }

    setBusy(true);
    let failureMessage: string | null = null;
    let persistedStore: Store | null = null;

    try {
      const persistResult = await persistStorefrontState({
        client,
        store: prepared.store,
        ownerId,
        templateSeed: activeTemplateSeed,
        themePackages,
        selectedPage,
        revisionLabel,
        changedBy: ownerId,
        publicationState: prepared.targetPublicationState,
      });
      if (persistResult.error) {
        throw new Error(`Failed to save Page Builder changes: ${persistResult.error.message || "Unknown persistence error"}`);
      }

      await refreshStorefrontContentCache(client, prepared.store.id, {
        pageSlugs: selectedPage ? [selectedPage.slug] : undefined,
      });
      clearDraftForStore(context.storeId);
      persistedStore = { ...prepared.store, isPublished: prepared.targetPublicationState };
    } catch (caught) {
      failureMessage = caught instanceof Error ? caught.message : "Failed to save Page Builder changes.";
    } finally {
      if (isEditorContextCurrent(context)) setBusy(false);
    }

    if (!isEditorContextCurrent(context)) return { status: "stale" };
    await reloadWorkspace();
    if (!isEditorContextCurrent(context)) return { status: "stale" };

    if (failureMessage) {
      setError(failureMessage);
      return { status: "error", message: failureMessage };
    }
    if (!persistedStore) {
      const message = "Failed to save Page Builder changes.";
      setError(message);
      return { status: "error", message };
    }

    setError(null);
    return { status: "success", persistedStore };
  }, [
    activeTemplateSeed,
    captureEditorContext,
    clearDraftForStore,
    client,
    isEditorContextCurrent,
    ownerId,
    reloadWorkspace,
    themePackages,
  ]);

  const prepareLayoutImport = useCallback(
    (input: { raw: string; store: Store; allowAdvanced: boolean }) => prepareStoreLayoutImport(input),
    [],
  );
  const prepareThemeBundle = useCallback(
    (input: { bundle: ThemeExportBundle; store: Store; allowAdvanced: boolean }) => prepareThemeBundleApplication(input),
    [],
  );
  const prepareRevision = useCallback(
    (input: { revisionBlocks: StorePageBlock[]; selectedPage: StorePage }) => prepareRevisionRestore(input),
    [],
  );

  return {
    busy,
    error,
    draftStorageKey,
    clearError,
    reportError,
    readRecoverableDraft,
    writeRecoverableDraft,
    clearRecoverableDraft,
    saveStorefront,
    prepareStoreLayoutImport: prepareLayoutImport,
    prepareThemeBundleApplication: prepareThemeBundle,
    prepareRevisionRestore: prepareRevision,
  };
}
