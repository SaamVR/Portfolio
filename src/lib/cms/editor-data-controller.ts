"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fallbackBlockRegistry, loadBlockRegistry, type CmsBlockRegistryItem } from "@/lib/cms/block-registry";
import { sanitizeStoreBlocks } from "@/lib/cms/validation";
import { advanceEditorContext, editorContextMatches, type EditorContextToken } from "@/lib/cms/editor-context";
import type { SiteSettingRecord } from "@/lib/cms/homepage-settings-adapter";
import type { Store, StorePageBlock } from "@/lib/cms/schema";
import { fallbackThemePackages, loadThemePackages, type ThemePackageDefinition } from "@/lib/theme-packages";
import { fallbackStorefrontTemplateSeeds } from "@/lib/cms/storefront-template-seeds";
import { resolveStorefrontTemplateProfile } from "@/lib/cms/storefront-templates";
import type { Database } from "@/integrations/supabase/types";
import {
  isCmsEditorRequestCurrent,
  reconcileCmsEditorSelectedPageId,
} from "@/lib/cms/editor-data-controller-guards";

export { isCmsEditorRequestCurrent, reconcileCmsEditorSelectedPageId } from "@/lib/cms/editor-data-controller-guards";

export type CmsEditorStoreRecord = {
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

export type CmsEditorThemeRecord = {
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
  overrides?: Record<string, unknown> | null;
  custom_css?: string | null;
  resolved_tokens?: Record<string, Record<string, string>> | null;
};

export type CmsEditorPageRecord = {
  id: string;
  slug: string;
  title: string;
  seo_title: string | null;
  seo_description: string | null;
  is_homepage: boolean | null;
};

export type CmsEditorBlockRecord = {
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
  variant_options?: StorePageBlock["variantOptions"] | null;
  custom_html?: string | null;
  custom_css?: string | null;
};

export type CmsEditorBusinessProfileRecord = {
  template_id: string | null;
  business_family: string | null;
  catalog_mode: string | null;
};

export type CmsEditorRevision = {
  id: string;
  created_at: string;
  revision_label: string;
  blocks_snapshot: StorePageBlock[];
};

export type CmsEditorWorkspaceHydrationInput = {
  store: CmsEditorStoreRecord;
  businessProfile: CmsEditorBusinessProfileRecord | null;
  theme: CmsEditorThemeRecord | null;
  pages: CmsEditorPageRecord[];
  blocks: CmsEditorBlockRecord[];
  siteSettings: SiteSettingRecord[];
  themePackages: ThemePackageDefinition[];
};

export type CmsEditorWorkspaceSnapshot = {
  requestId: number;
  store: Store | null;
  selectedPageId: string;
  storeTemplateSeedId: string;
  installedThemePackageVersion: number | null;
};

type CmsEditorDataControllerOptions = {
  client: SupabaseClient<Database>;
  activeStoreId: string | null;
  enabled: boolean;
  selectedPageId: string;
  requestedPageId: string | null;
  hydrateStore: (input: CmsEditorWorkspaceHydrationInput) => Store;
};

function throwForQueryError(label: string, error: { message?: string } | null | undefined) {
  if (error) {
    throw new Error(`${label}: ${error.message ?? "database query failed"}`);
  }
}

export function useCmsEditorDataController({
  client,
  activeStoreId,
  enabled,
  selectedPageId,
  requestedPageId,
  hydrateStore,
}: CmsEditorDataControllerOptions) {
  const editorContextRef = useRef<EditorContextToken>({ storeId: activeStoreId, generation: 0 });
  editorContextRef.current = advanceEditorContext(editorContextRef.current, activeStoreId);

  const workspaceRequestRef = useRef(0);
  const sharedLibraryRequestRef = useRef(0);
  const revisionRequestRef = useRef(0);
  const selectedPageIdRef = useRef(selectedPageId);
  const requestedPageIdRef = useRef(requestedPageId);
  selectedPageIdRef.current = selectedPageId;
  requestedPageIdRef.current = requestedPageId;

  const [workspace, setWorkspace] = useState<CmsEditorWorkspaceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [blockRegistry, setBlockRegistry] = useState<CmsBlockRegistryItem[]>(fallbackBlockRegistry);
  const [themePackages, setThemePackages] = useState<ThemePackageDefinition[]>(fallbackThemePackages);
  const [revisions, setRevisions] = useState<CmsEditorRevision[]>([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);
  const [revisionError, setRevisionError] = useState<string | null>(null);

  const captureEditorContext = useCallback((): EditorContextToken => ({ ...editorContextRef.current }), []);
  const isEditorContextCurrent = useCallback(
    (context: EditorContextToken) => editorContextMatches(editorContextRef.current, context),
    [],
  );

  const reloadWorkspace = useCallback(async () => {
    const context = captureEditorContext();
    const requestId = ++workspaceRequestRef.current;
    const isCurrent = () => isCmsEditorRequestCurrent({
      currentRequestId: workspaceRequestRef.current,
      requestId,
      currentContext: editorContextRef.current,
      capturedContext: context,
    });

    if (!enabled) {
      if (isCurrent()) setLoading(false);
      return;
    }

    if (isCurrent()) {
      setLoading(true);
      setWorkspaceError(null);
    }

    const storeId = context.storeId;
    if (!storeId) {
      if (isCurrent()) {
        setWorkspace({
          requestId,
          store: null,
          selectedPageId: "",
          storeTemplateSeedId: "general-catalog",
          installedThemePackageVersion: null,
        });
        setLoading(false);
      }
      return;
    }

    try {
      const storeResponse = await client
        .from("stores")
        .select("id, name, slug, custom_domain, description, currency_code, locale, is_published, store_type")
        .eq("id", storeId)
        .maybeSingle();

      if (!isCurrent()) return;
      throwForQueryError("stores", storeResponse.error);

      const storeRecord = storeResponse.data as CmsEditorStoreRecord | null;
      if (!storeRecord) {
        setWorkspace({
          requestId,
          store: null,
          selectedPageId: "",
          storeTemplateSeedId: "general-catalog",
          installedThemePackageVersion: null,
        });
        return;
      }

      const [
        businessProfileResponse,
        themeResponse,
        pagesResponse,
        blocksResponse,
        siteSettingsResponse,
        loadedThemePackages,
      ] = await Promise.all([
        client
          .from("store_business_profiles")
          .select("template_id, business_family, catalog_mode")
          .eq("store_id", storeRecord.id)
          .maybeSingle(),
        client
          .from("store_themes")
          .select("preset_id, theme_package_id, theme_package_version, mode, typography, components, colors, aesthetic, radius_scale, density_scale, effects, palette_source, palette_seed, schema_version, overrides, custom_css, resolved_tokens")
          .eq("store_id", storeRecord.id)
          .maybeSingle(),
        client
          .from("store_pages")
          .select("id, slug, title, seo_title, seo_description, is_homepage")
          .eq("store_id", storeRecord.id)
          .order("slug"),
        client
          .from("store_page_blocks")
          .select("id, page_id, block_type, props, sort_order, is_visible, entrance_animation, hover_effect, effect_override, layout_variant, variant_options, custom_html, custom_css")
          .eq("store_id", storeRecord.id)
          .order("sort_order"),
        client
          .from("site_settings")
          .select("key, value")
          .eq("store_id", storeRecord.id)
          .in("key", ["hero_section", "promo_banner", "home_featured", "home_categories", "storefront_profile"]),
        loadThemePackages(client, storeRecord.id),
      ]);

      if (!isCurrent()) return;
      throwForQueryError("store_business_profiles", businessProfileResponse.error);
      throwForQueryError("store_themes", themeResponse.error);
      throwForQueryError("store_pages", pagesResponse.error);
      throwForQueryError("store_page_blocks", blocksResponse.error);
      throwForQueryError("site_settings", siteSettingsResponse.error);

      const businessProfile = (businessProfileResponse.data as CmsEditorBusinessProfileRecord | null) ?? null;
      const siteSettings = (siteSettingsResponse.data as SiteSettingRecord[] | null) ?? [];
      const parsedStore = hydrateStore({
        store: storeRecord,
        businessProfile,
        theme: (themeResponse.data as CmsEditorThemeRecord | null) ?? null,
        pages: (pagesResponse.data as CmsEditorPageRecord[] | null) ?? [],
        blocks: (blocksResponse.data as CmsEditorBlockRecord[] | null) ?? [],
        siteSettings,
        themePackages: loadedThemePackages,
      });

      if (!isCurrent()) return;

      const storefrontProfileSetting = (siteSettings.find((entry) => entry.key === "storefront_profile")?.value ?? null) as Record<string, unknown> | null;
      const storeTemplateSeedId = resolveStorefrontTemplateProfile(storefrontProfileSetting?.template_id, {
        templateSeedId: businessProfile?.template_id ?? storeRecord.store_type ?? "general-catalog",
        productVisibility: typeof storefrontProfileSetting?.product_visibility === "string"
          ? storefrontProfileSetting.product_visibility
          : null,
      }).templateSeedId;

      setThemePackages(loadedThemePackages);
      setWorkspace({
        requestId,
        store: parsedStore,
        selectedPageId: reconcileCmsEditorSelectedPageId(
          parsedStore.pages,
          requestedPageIdRef.current,
          selectedPageIdRef.current,
        ),
        storeTemplateSeedId,
        installedThemePackageVersion: typeof (themeResponse.data as CmsEditorThemeRecord | null)?.theme_package_version === "number"
          ? (themeResponse.data as CmsEditorThemeRecord).theme_package_version ?? null
          : null,
      });
      setWorkspaceError(null);
    } catch (error) {
      if (!isCurrent()) return;
      console.error("Failed to load CMS editor workspace:", error);
      setWorkspaceError("Failed to refresh the Page Builder workspace. Retry to restore the active store.");
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [captureEditorContext, client, enabled, hydrateStore]);

  const reloadSharedLibraries = useCallback(async () => {
    if (!enabled) return;
    const context = captureEditorContext();
    const requestId = ++sharedLibraryRequestRef.current;
    const isCurrent = () => isCmsEditorRequestCurrent({
      currentRequestId: sharedLibraryRequestRef.current,
      requestId,
      currentContext: editorContextRef.current,
      capturedContext: context,
    });

    const [registry, loadedThemePackages] = await Promise.all([
      loadBlockRegistry(client),
      loadThemePackages(client, context.storeId),
    ]);

    if (!isCurrent()) return;
    setBlockRegistry(registry);
    setThemePackages(loadedThemePackages);
  }, [captureEditorContext, client, enabled]);

  const reloadRevisions = useCallback(async () => {
    const pageId = selectedPageIdRef.current;
    const requestId = ++revisionRequestRef.current;

    if (!enabled || !pageId) {
      setRevisions([]);
      setLoadingRevisions(false);
      setRevisionError(null);
      return;
    }

    const context = captureEditorContext();
    const isCurrent = () => isCmsEditorRequestCurrent({
      currentRequestId: revisionRequestRef.current,
      requestId,
      currentContext: editorContextRef.current,
      capturedContext: context,
      currentPageId: selectedPageIdRef.current,
      pageId,
    });

    if (isCurrent()) {
      setLoadingRevisions(true);
      setRevisionError(null);
      setRevisions([]);
    }

    try {
      const response = await client
        .from("store_page_revisions")
        .select("id, created_at, revision_label, blocks_snapshot")
        .eq("page_id", pageId)
        .order("created_at", { ascending: false })
        .limit(8);

      if (!isCurrent()) return;
      throwForQueryError("store_page_revisions", response.error);

      const rows = (response.data as Array<{
        id: string;
        created_at: string;
        revision_label: string;
        blocks_snapshot: unknown[];
      }> | null) ?? [];

      setRevisions(
        rows
          .map((revision) => ({
            ...revision,
            blocks_snapshot: sanitizeStoreBlocks(Array.isArray(revision.blocks_snapshot) ? revision.blocks_snapshot : []),
          }))
          .filter((revision) => revision.blocks_snapshot.length > 0),
      );
      setRevisionError(null);
    } catch (error) {
      if (!isCurrent()) return;
      console.error("Failed to load CMS page revisions:", error);
      setRevisionError("Revision history could not be loaded for this page.");
    } finally {
      if (isCurrent()) setLoadingRevisions(false);
    }
  }, [captureEditorContext, client, enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void reloadWorkspace();
  }, [activeStoreId, enabled, reloadWorkspace]);

  useEffect(() => {
    if (!enabled) return;
    setThemePackages(fallbackThemePackages);
    void reloadSharedLibraries();
  }, [activeStoreId, enabled, reloadSharedLibraries]);

  useEffect(() => {
    void reloadRevisions();
  }, [activeStoreId, enabled, reloadRevisions, selectedPageId]);

  return {
    workspace,
    loading,
    workspaceError,
    blockRegistry,
    themePackages,
    revisions,
    loadingRevisions,
    revisionError,
    reloadWorkspace,
    reloadSharedLibraries,
    reloadRevisions,
    captureEditorContext,
    isEditorContextCurrent,
  };
}
