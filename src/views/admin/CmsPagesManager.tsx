"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  ExternalLink,
  FileText,
  Layers3,
  Monitor,
  Smartphone,
  Store as StoreIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { useStoreEntitlements } from "@/hooks/useStoreEntitlements";
import { supabase } from "@/integrations/supabase/client";
import { Link, useSearchParams } from "@/lib/react-router-dom-shim";
import { defaultStore } from "@/lib/cms/default-store";
import { createDefaultBlock, createDefaultCmsPage, cmsBlockTypeOptions, reservedCmsSlugs } from "@/lib/cms/block-library";
import { applyTemplateToPage, cmsPageTemplates, instantiateTemplate } from "@/lib/cms/page-templates";
import { storeSchema, type Store, type StorePage, type StorePageBlock } from "@/lib/cms/schema";
import { themePresets } from "@/lib/themePresets";
import { cn } from "@/lib/utils";
import { StoreProvider } from "@/components/storefront/StoreProvider";
import { StoreThemeScope } from "@/components/storefront/StoreThemeScope";
import { StorefrontBlockRenderer } from "@/components/storefront/StorefrontBlockRenderer";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";
import { sanitizeStoreBlocks, sanitizeStorePage, validateStoreForPersistence } from "@/lib/cms/validation";
import { getFeatureEnabled } from "@/lib/platform/control-plane";

type StoreRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  currency_code: string | null;
  locale: string | null;
  is_published: boolean | null;
};

type ThemeRecord = {
  preset_id: string | null;
  mode: "light" | "dark" | null;
  typography: Record<string, unknown> | null;
  components: Record<string, unknown> | null;
  colors: Record<string, string> | null;
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

type RecoverableDraft = {
  snapshot: string;
  updatedAt: string;
};

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

function cloneDefaultHomepageBlocks(): StorePageBlock[] {
  const homepage = defaultStore.pages.find((page) => page.isHomepage) ?? defaultStore.pages[0];

  return homepage.blocks.map((block, index) => ({
    ...block,
    id: crypto.randomUUID(),
    sortOrder: index,
  }));
}

function mapRecordsToStore(
  store: StoreRecord,
  theme: ThemeRecord | null,
  pages: PageRecord[],
  blocks: BlockRecord[],
): Store {
  return storeSchema.parse({
    id: store.id,
    name: store.name,
    slug: store.slug,
    description: store.description ?? defaultStore.description,
    currencyCode: store.currency_code ?? defaultStore.currencyCode,
    locale: store.locale ?? defaultStore.locale,
    isPublished: store.is_published ?? false,
    theme: {
      presetId: theme?.preset_id ?? defaultStore.theme.presetId,
      mode: theme?.mode ?? defaultStore.theme.mode,
      headingFont: typeof theme?.typography?.headingFont === "string" ? theme.typography.headingFont : defaultStore.theme.headingFont,
      bodyFont: typeof theme?.typography?.bodyFont === "string" ? theme.typography.bodyFont : defaultStore.theme.bodyFont,
      borderRadius: typeof theme?.components?.borderRadius === "string" ? theme.components.borderRadius : defaultStore.theme.borderRadius,
      customCssVars: theme?.colors ?? {},
    },
    pages:
      pages.length > 0
        ? pages
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
            .filter((page): page is StorePage => Boolean(page))
        : defaultStore.pages,
  });
}

export default function CmsPagesManager() {
  const { user, role , activeStoreId} = useAuth();
  const { data: entitlements } = useStoreEntitlements(activeStoreId);
  const [searchParams] = useSearchParams();
  const [store, setStore] = useState<Store | null>(null);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const [nextBlockType, setNextBlockType] = useState<StorePageBlock["type"]>("rich-text");
  const [newPageTemplate, setNewPageTemplate] = useState(cmsPageTemplates[0]?.id ?? "landing");
  const [activeTemplateId, setActiveTemplateId] = useState(cmsPageTemplates[0]?.id ?? "landing");
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");
  const [revisionLabel, setRevisionLabel] = useState("");
  const [revisions, setRevisions] = useState<Array<{ id: string; created_at: string; revision_label: string; blocks_snapshot: StorePageBlock[] }>>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [persistedSnapshot, setPersistedSnapshot] = useState("");
  const [recoverableDraft, setRecoverableDraft] = useState<RecoverableDraft | null>(null);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<Date | null>(null);
  const requestedPageId = searchParams.get("page");
  const requestedBlockId = searchParams.get("block") ?? "";
  const returnTo = searchParams.get("returnTo");
  const launchTemplatesEnabled = getFeatureEnabled(entitlements?.featureMap, "launch_templates");
  const themePresetsEnabled = getFeatureEnabled(entitlements?.featureMap, "theme_presets");
  const draftStorageKey = useMemo(() => getDraftStorageKey(activeStoreId), [activeStoreId]);

  const loadStore = useCallback(async () => {
    setLoading(true);
    const storeResponse = await (supabase as any)
      .from("stores")
      .select("id, name, slug, description, currency_code, locale, is_published")
      .eq("id", activeStoreId as string)
      .maybeSingle();

    const storeRecord = storeResponse.data as StoreRecord | null;

    if (!storeRecord) {
      setStore(null);
      setSelectedPageId("");
      setPersistedSnapshot("");
      setRecoverableDraft(null);
      setLastDraftSavedAt(null);
      setLoading(false);
      return;
    }

    const [themeResponse, pagesResponse, blocksResponse] = await Promise.all([
      (supabase as any).from("store_themes").select("preset_id, mode, typography, components, colors").eq("store_id", storeRecord.id).maybeSingle(),
      (supabase as any).from("store_pages").select("id, slug, title, seo_title, seo_description, is_homepage").eq("store_id", storeRecord.id).order("slug"),
      (supabase as any).from("store_page_blocks").select("id, page_id, block_type, props, sort_order, is_visible").eq("store_id", storeRecord.id).order("sort_order"),
    ]);

    const parsedStore = mapRecordsToStore(
      storeRecord,
      (themeResponse.data as ThemeRecord | null) ?? null,
      (pagesResponse.data as PageRecord[] | null) ?? [],
      (blocksResponse.data as BlockRecord[] | null) ?? [],
    );

    setStore(parsedStore);
    setPersistedSnapshot(serializeStoreDraft(parsedStore));
    setLastDraftSavedAt(null);
    setSelectedPageId((current) => {
      if (requestedPageId && parsedStore.pages.some((page) => page.id === requestedPageId)) {
        return requestedPageId;
      }

      return current || parsedStore.pages[0]?.id || "";
    });
    setSelectedBlockId(requestedBlockId);
    setLoading(false);
  }, [activeStoreId, requestedBlockId, requestedPageId]);

  const currentSnapshot = useMemo(() => (store ? serializeStoreDraft(store) : ""), [store]);
  const hasUnsavedChanges = Boolean(store && persistedSnapshot && currentSnapshot !== persistedSnapshot);

  useEffect(() => {
    if (role !== "admin") return;
    void loadStore();
  }, [loadStore, role]);

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
      const { data } = await (supabase as any)
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
    setStore((current) => {
      if (!current) return current;
      return {
        ...current,
        pages: current.pages.map((page) => (page.id === selectedPageId ? updater(page) : page)),
      };
    });
  };

  const updateStoreTheme = (patch: Partial<Store["theme"]>) => {
    setStore((current) => {
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

    setBootstrapping(true);

    const { error: storeError } = await (supabase as any).from("stores").upsert(
      {
        id: activeStoreId,
        owner_id: user.id,
        name: defaultStore.name,
        slug: defaultStore.slug,
        description: defaultStore.description,
        currency_code: defaultStore.currencyCode,
        locale: defaultStore.locale,
        is_published: defaultStore.isPublished,
      },
      { onConflict: "slug" },
    );

    if (storeError) {
      toast.error("Failed to create the default store.");
      setBootstrapping(false);
      return;
    }

    await (supabase as any).from("store_themes").upsert(
      {
        store_id: activeStoreId,
        preset_id: defaultStore.theme.presetId,
        mode: defaultStore.theme.mode,
        colors: defaultStore.theme.customCssVars,
        typography: {
          headingFont: defaultStore.theme.headingFont,
          bodyFont: defaultStore.theme.bodyFont,
        },
        components: {
          borderRadius: defaultStore.theme.borderRadius,
        },
      },
      { onConflict: "store_id" },
    );

    for (const page of defaultStore.pages) {
      await (supabase as any).from("store_pages").upsert(
        {
          id: page.id,
          store_id: activeStoreId,
          slug: page.slug,
          title: page.title,
          seo_title: page.seoTitle ?? null,
          seo_description: page.seoDescription ?? null,
          is_homepage: page.isHomepage,
        },
        { onConflict: "id" },
      );

      if (page.blocks.length > 0) {
        await (supabase as any).from("store_page_blocks").upsert(
          page.blocks.map((block) => ({
            id: block.id,
            page_id: page.id,
            store_id: activeStoreId,
            block_type: block.type,
            props: block.props,
            sort_order: block.sortOrder,
            is_visible: block.isVisible,
          })),
          { onConflict: "id" },
        );
      }
    }

    toast.success("Default CMS store is ready.");
    setBootstrapping(false);
    await loadStore();
  };

  const addPage = () => {
    setStore((current) => {
      if (!current) return current;
      const page = launchTemplatesEnabled
        ? instantiateTemplate(newPageTemplate, current.pages.length) ?? createDefaultCmsPage(current.pages.length)
        : createDefaultCmsPage(current.pages.length);
      setSelectedPageId(page.id);
      return { ...current, pages: [...current.pages, page] };
    });
  };

  const duplicatePage = (pageId: string) => {
    setStore((current) => {
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
    if (!launchTemplatesEnabled) {
      toast.error("Launch templates are not enabled for this store.");
      return;
    }
    updateSelectedPage((page) => applyTemplateToPage(page, templateId) ?? page);
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
      blocks: cloneDefaultHomepageBlocks(),
    }));
    setSelectedBlockId("");
    toast.success("Recommended homepage layout applied. Save Page Builder changes to publish it.");
  };

  const removePage = (pageId: string) => {
    setStore((current) => {
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
    const nextBlock = createDefaultBlock(nextBlockType, selectedPage.blocks.length);
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

    const { error: storeError } = await (supabase as any).from("stores").upsert(
      {
        id: safeStore.id,
        owner_id: user.id,
        name: safeStore.name,
        slug: safeStore.slug,
        description: safeStore.description,
        currency_code: safeStore.currencyCode,
        locale: safeStore.locale,
        is_published: safeStore.isPublished,
      },
      { onConflict: "id" },
    );

    if (storeError) {
      toast.error("Failed to save store details.");
      setSaving(false);
      return;
    }

    const { error: themeError } = await (supabase as any).from("store_themes").upsert(
      {
        store_id: safeStore.id,
        preset_id: safeStore.theme.presetId,
        mode: safeStore.theme.mode,
        colors: safeStore.theme.customCssVars,
        typography: {
          headingFont: safeStore.theme.headingFont,
          bodyFont: safeStore.theme.bodyFont,
        },
        components: {
          borderRadius: safeStore.theme.borderRadius,
        },
      },
      { onConflict: "store_id" },
    );

    if (themeError) {
      toast.error("Failed to save store theme.");
      setSaving(false);
      return;
    }

    const pageRows = safeStore.pages.map((page) => ({
      id: page.id,
      store_id: safeStore.id,
      slug: page.slug,
      title: page.title,
      seo_title: page.seoTitle || null,
      seo_description: page.seoDescription || null,
      is_homepage: page.isHomepage,
    }));

    const { error: pageError } = await (supabase as any).from("store_pages").upsert(pageRows, { onConflict: "id" });

    if (pageError) {
      toast.error("Failed to save store pages.");
      setSaving(false);
      return;
    }

    const { data: existingPages } = await (supabase as any).from("store_pages").select("id").eq("store_id", safeStore.id);
    const existingPageIds = new Set<string>(((existingPages as Array<{ id: string }> | null) ?? []).map((page) => page.id));
    const localPageIds = new Set(safeStore.pages.map((page) => page.id));
    const pageIdsToDelete = Array.from(existingPageIds).filter((id) => !localPageIds.has(id));

    if (pageIdsToDelete.length > 0) {
      await (supabase as any).from("store_page_blocks").delete().in("page_id", pageIdsToDelete);
      await (supabase as any).from("store_pages").delete().in("id", pageIdsToDelete);
    }

    const blockRows = safeStore.pages.flatMap((page) =>
      page.blocks.map((block, index) => ({
        id: block.id,
        page_id: page.id,
        store_id: safeStore.id,
        block_type: block.type,
        props: block.props,
        sort_order: index,
        is_visible: block.isVisible,
      })),
    );

    if (blockRows.length > 0) {
      const { error: blockError } = await (supabase as any).from("store_page_blocks").upsert(blockRows, { onConflict: "id" });

      if (blockError) {
        toast.error("Failed to save page blocks.");
        setSaving(false);
        return;
      }
    }

    const { data: existingBlocks } = await (supabase as any).from("store_page_blocks").select("id").eq("store_id", safeStore.id);
    const existingBlockIds = new Set<string>(((existingBlocks as Array<{ id: string }> | null) ?? []).map((block) => block.id));
    const localBlockIds = new Set(blockRows.map((block) => block.id));
    const blockIdsToDelete = Array.from(existingBlockIds).filter((id) => !localBlockIds.has(id));

    if (blockIdsToDelete.length > 0) {
      await (supabase as any).from("store_page_blocks").delete().in("id", blockIdsToDelete);
    }

    if (selectedPage) {
      await (supabase as any).from("store_page_revisions").insert({
        page_id: selectedPage.id,
        store_id: safeStore.id,
        revision_label: revisionLabel.trim() || "Manual save",
        changed_by: user.id,
        blocks_snapshot: sanitizeStoreBlocks(selectedPage.blocks),
      });
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

    setStore(parsedStore.data);
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

  if (role !== "admin") {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Page Builder</CardTitle>
          <CardDescription>Bootstrap the new multi-page storefront tables with the current demo storefront as the default store.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={bootstrapDefaultStore} disabled={bootstrapping} className="gap-2">
            {bootstrapping ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Create Default Store
          </Button>
        </CardContent>
      </Card>
    );
  }

  const baseDomain = process.env.NEXT_PUBLIC_STORE_SUBDOMAIN_BASE_DOMAIN || "localhost:3000";
  const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "https:" : "http:";
  const previewPath = selectedPage?.slug === "/" ? "" : selectedPage?.slug ?? "";
  const previewHref = `${protocol}//${store.slug}.${baseDomain}${previewPath}`;
  
  const previewBlocks = selectedPage ? [...selectedPage.blocks].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  const previewFrameClassName = previewViewport === "mobile" ? "mx-auto w-full max-w-[420px]" : "w-full";
  const visibleBlockCount = selectedPage?.blocks.filter((block) => block.isVisible).length ?? 0;
  const selectedPageNumber = selectedPage ? store.pages.findIndex((page) => page.id === selectedPage.id) + 1 : 0;

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
              <h1 className="text-2xl font-semibold tracking-normal text-foreground">Page Builder</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Shape storefront pages, theme settings, and live sections for {store.name}.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
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
              <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <StoreIcon className="h-3.5 w-3.5" />
                  Store Slug
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-foreground">{store.slug}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {returnTo ? (
              <Button variant="outline" asChild className="gap-2">
                <Link to={returnTo}>
                  <ExternalLink className="h-4 w-4" />
                  Back To Storefront
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => void loadStore()} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Reload
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <a href={previewHref} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Preview Page
              </a>
            </Button>
            <Button onClick={() => void saveAll()} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Pages
            </Button>
          </div>
        </div>
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
            "fixed inset-x-0 bottom-0 z-50 bg-background/95 backdrop-blur-xl border-t shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-4 pb-24 max-h-[75vh] overflow-y-auto rounded-t-3xl",
            isMobileSettingsOpen ? "translate-y-0" : "translate-y-full lg:translate-y-0"
          )}>
            <div className="hidden items-start justify-between gap-3 lg:mb-4 lg:flex">
              <div>
                <p className="text-sm font-semibold text-foreground">Store Workspace</p>
                <p className="text-xs text-muted-foreground">Settings, theme, and page list</p>
              </div>
              <Badge variant="outline">{selectedPageNumber || 0}/{store.pages.length}</Badge>
            </div>
            <div className="space-y-4">
            <div className="flex items-center justify-between lg:hidden mb-4 pb-2 border-b">
              <h3 className="font-semibold">Edit Section</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileSettingsOpen(false)}>
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-2">
              <Label>Store Name</Label>
              <Input value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Store Slug</Label>
              <Input value={store.slug} onChange={(e) => setStore({ ...store, slug: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Store Description</Label>
              <Textarea rows={4} value={store.description} onChange={(e) => setStore({ ...store, description: e.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Store Published</p>
                <p className="text-xs text-muted-foreground">Turn this off to keep the CMS store in draft mode.</p>
              </div>
              <Switch checked={store.isPublished} onCheckedChange={(checked) => setStore({ ...store, isPublished: checked })} />
            </div>

            <Separator />

            <div className="space-y-3 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Store Theme</p>
                <p className="text-xs text-muted-foreground">These settings are saved to `store_themes` and power the live storefront preview.</p>
              </div>
              <div className="grid gap-2">
                <Label>Theme Preset</Label>
                <Select value={store.theme.presetId} onValueChange={(value) => updateStoreTheme({ presetId: value })} disabled={!themePresetsEnabled}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a theme preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {themePresets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {themePresets.find((preset) => preset.id === store.theme.presetId)?.description}
                </p>
                {!themePresetsEnabled ? <p className="text-xs text-muted-foreground">Theme preset changes are disabled for this store package.</p> : null}
              </div>
              <div className="grid gap-2">
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
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Pages</p>
                <p className="text-xs text-muted-foreground">Homepage plus custom storefront pages.</p>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="grid gap-3">
                {!launchTemplatesEnabled ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    Launch templates are disabled for this store. New pages will start blank and template replacement is locked.
                  </div>
                ) : null}
                <div className="grid gap-2">
                  <Label>New Page Template</Label>
                  <Select value={newPageTemplate} onValueChange={setNewPageTemplate} disabled={!launchTemplatesEnabled}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {cmsPageTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {cmsPageTemplates.find((template) => template.id === newPageTemplate)?.description}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={addPage} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Page
                </Button>
              </div>
            </div>

            <div className="space-y-2">
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>

          {selectedPage ? (
            <div className="space-y-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Page Details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Page Title</Label>
                    <Input value={selectedPage.title} onChange={(e) => updateSelectedPage((page) => ({ ...page, title: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Page Slug</Label>
                    <Input value={selectedPage.slug} onChange={(e) => updateSelectedPage((page) => ({ ...page, slug: e.target.value }))} />
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
                    <Input value={revisionLabel} placeholder="Homepage cleanup, Eid promo, July refresh..." onChange={(e) => setRevisionLabel(e.target.value)} />
                  </div>
                  <div className="grid gap-3 md:col-span-2 rounded-lg border border-border p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Apply Page Template</p>
                      <p className="text-xs text-muted-foreground">Replace the current block stack with a prebuilt page structure.</p>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row">
                      <Select value={activeTemplateId} onValueChange={setActiveTemplateId} disabled={!launchTemplatesEnabled}>
                        <SelectTrigger className="md:max-w-[280px]">
                          <SelectValue placeholder="Choose a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {cmsPageTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" onClick={() => applyTemplate(activeTemplateId)} className="gap-2" disabled={!launchTemplatesEnabled}>
                        <LayoutTemplate className="h-4 w-4" />
                        Apply Template
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {cmsPageTemplates.find((template) => template.id === activeTemplateId)?.description}
                    </p>
                    {!launchTemplatesEnabled ? (
                      <p className="text-xs text-muted-foreground">Enable the `launch_templates` feature to use prebuilt page structures here.</p>
                    ) : null}
                  </div>
                  {selectedPage.isHomepage ? (
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
                  <div className="flex items-center justify-between rounded-lg border border-border p-3 md:col-span-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">Homepage</p>
                      <p className="text-xs text-muted-foreground">Only one page should own the root storefront route.</p>
                    </div>
                    <Switch
                      checked={selectedPage.isHomepage}
                      onCheckedChange={(checked) =>
                        setStore((current) => {
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
                <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="text-lg">Blocks</CardTitle>
                    <CardDescription>
                      Reorder, hide, and configure the sections for this page.
                      {selectedBlock ? ` Currently editing ${selectedBlock.type}.` : ""}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select value={nextBlockType} onValueChange={(value) => setNextBlockType(value as StorePageBlock["type"])}>
                      <SelectTrigger className="w-full sm:w-[220px]">
                        <SelectValue placeholder="Choose block type" />
                      </SelectTrigger>
                      <SelectContent>
                        {cmsBlockTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={addBlock} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Block
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedPage.blocks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No blocks yet. Add one to start composing this page.
                    </div>
                  ) : null}

                  {selectedPage.blocks.length > 0 ? (
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedPage.blocks.map((block, index) => {
                          const blockMeta = cmsBlockTypeOptions.find((option) => option.value === block.type);

                          return (
                            <Button
                              key={block.id}
                              type="button"
                              size="sm"
                              variant={selectedBlockId === block.id ? "secondary" : "outline"}
                              className="h-8"
                              onClick={() => setSelectedBlockId(block.id)}
                            >
                              {index + 1}. {blockMeta?.label ?? block.type}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {selectedPage.blocks.map((block, index) => {
                    const blockMeta = cmsBlockTypeOptions.find((option) => option.value === block.type);
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
                            <p className="mt-1 text-xs text-muted-foreground">{blockMeta?.description}</p>
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

                        <div className="mt-4 grid gap-4">
                          <div className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">Visible on storefront</p>
                              <p className="text-xs text-muted-foreground">Hide a block without deleting its configuration.</p>
                            </div>
                            <Switch checked={block.isVisible} onCheckedChange={(checked) => updateBlock(block.id, (current) => ({ ...current, isVisible: checked }))} />
                          </div>

                          {!isFocused ? (
                            <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
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

                            {isFocused && !["featured-products", "rich-text", "countdown", "hero", "promo-banner", "category-showcase", "recently-viewed", "social-feed", "video-reel", "faq-accordion", "trust-badges", "testimonials"].includes(block.type) ? (
                            <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                              This block currently uses the existing storefront component and its existing site settings. Block-specific editing can be expanded next.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="border-border overflow-hidden">
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
                    <Badge variant="outline">{selectedPage.slug}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <StoreProvider store={store}>
                    <StoreThemeScope theme={store.theme}>
                      <div className={previewFrameClassName}>
                        <div className="overflow-hidden rounded-xl border border-border bg-background">
                          <div className="border-b border-border bg-card px-4 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            {selectedPage.title}
                          </div>
                          <div className="max-h-[720px] overflow-y-auto">
                            {previewBlocks.length > 0 ? (
                              previewBlocks.map((block, index) => {
                                const blockMeta = cmsBlockTypeOptions.find((option) => option.value === block.type);
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
                                      "group relative block w-full text-left transition-colors cursor-pointer",
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
                                    </div>
                                    <div
                                      className={cn(
                                        "transition-all",
                                        isFocused && "ring-2 ring-inset ring-primary/30",
                                      )}
                                    >
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
                </CardContent>
              </Card>

              <Card className="border-border">
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

              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Custom storefront pages should avoid app-owned slugs like `/shop`, `/product`, `/checkout`, or `/admin`. For local previews, the app will load the `threadbd` store automatically on `localhost`.
              </div>
            </div>
          ) : (
            <Card className="border-border">
              <CardContent className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
                Select a page to edit its details and blocks.
              </CardContent>
            </Card>
          )}
      </div>
    </div>
  );
}

