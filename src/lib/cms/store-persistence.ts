import type { SupabaseClient } from "@supabase/supabase-js";
import type { Store, StorePage } from "@/lib/cms/schema";
import { sanitizeStoreBlocks } from "@/lib/cms/validation";
import { resolveThemePackageById, type ThemePackageDefinition } from "@/lib/theme-packages";
import type { StorefrontTemplateSeedDefinition } from "@/lib/cms/storefront-template-seeds";

type PersistStorefrontOptions = {
  client: SupabaseClient<any>;
  store: Store;
  ownerId?: string | null;
  templateSeed?: StorefrontTemplateSeedDefinition;
  themePackages: ThemePackageDefinition[];
  selectedPage?: StorePage | null;
  revisionLabel?: string;
  changedBy?: string | null;
};

export function mapPersistedPageIdsByLocalId(
  pages: Array<{ id: string; slug: string }>,
  existingPages: Array<{ id: string; slug: string }>,
) {
  const existingPagesBySlug = new Map(existingPages.map((page) => [page.slug, page.id]));
  return new Map(pages.map((page) => [page.id, existingPagesBySlug.get(page.slug) ?? page.id]));
}

export function mapPersistedBlockIdsByLocalId(
  pages: Array<{ id: string; slug: string; blocks: Array<{ id: string; type: string }> }>,
  persistedPageIdByLocalId: Map<string, string>,
  existingBlocks: Array<{ id: string; page_id: string; block_type: string; sort_order?: number }>,
) {
  const mappedBlockIdByLocalId = new Map<string, string>();
  const usedExistingBlockIds = new Set<string>();

  for (const page of pages) {
    const persistedPageId = persistedPageIdByLocalId.get(page.id) ?? page.id;
    const pageExistingBlocks = existingBlocks
      .filter((block) => block.page_id === persistedPageId)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    for (const block of page.blocks) {
      if (pageExistingBlocks.some((eb) => eb.id === block.id && !usedExistingBlockIds.has(eb.id))) {
        mappedBlockIdByLocalId.set(block.id, block.id);
        usedExistingBlockIds.add(block.id);
      }
    }

    for (const block of page.blocks) {
      if (mappedBlockIdByLocalId.has(block.id)) {
        continue;
      }

      const matchingExisting = pageExistingBlocks.find(
        (eb) => eb.block_type === block.type && !usedExistingBlockIds.has(eb.id),
      );

      if (matchingExisting) {
        mappedBlockIdByLocalId.set(block.id, matchingExisting.id);
        usedExistingBlockIds.add(matchingExisting.id);
      } else {
        mappedBlockIdByLocalId.set(block.id, block.id);
      }
    }
  }

  return mappedBlockIdByLocalId;
}

export async function persistStorefrontState({
  client,
  store,
  ownerId,
  templateSeed,
  themePackages,
  selectedPage,
  revisionLabel,
  changedBy,
}: PersistStorefrontOptions) {
  if (!templateSeed) {
    return { error: new Error("A template seed is required to persist storefront state.") };
  }
  const activeTemplateSeed = templateSeed;
  const selectedThemePackage = resolveThemePackageById(store.theme.themePackageId, themePackages, store.theme.presetId);

  const { error: storeError } = await client.from("stores").upsert(
    {
      id: store.id,
      owner_id: ownerId ?? undefined,
      name: store.name,
      slug: store.slug,
      description: store.description,
      currency_code: store.currencyCode,
      locale: store.locale,
      is_published: store.isPublished,
      store_type: activeTemplateSeed.id,
    },
    { onConflict: "id" },
  );
  if (storeError) return { error: storeError };

  const { error: themeError } = await client.from("store_themes").upsert(
    {
      store_id: store.id,
      preset_id: selectedThemePackage.presetId,
      theme_package_id: selectedThemePackage.id,
      theme_package_version: selectedThemePackage.version,
      mode: store.theme.mode,
      colors: store.theme.customCssVars,
      resolved_tokens: {
        light: selectedThemePackage.tokens.light,
        dark: selectedThemePackage.tokens.dark,
      },
      typography: {
        headingFont: store.theme.headingFont,
        bodyFont: store.theme.bodyFont,
      },
      components: {
        borderRadius: store.theme.borderRadius,
        aesthetic: store.theme.aesthetic,
        effects: store.theme.effects,
      },
      aesthetic: store.theme.aesthetic ?? "minimal",
      radius_scale: store.theme.radiusScale ?? 1,
      density_scale: store.theme.densityScale ?? 1,
      effects: store.theme.effects ?? {
        scrollReveals: false,
        hoverEffects: true,
        parallax: false,
        intensity: "medium",
      },
      palette_source: store.theme.paletteSource ?? null,
      palette_seed: store.theme.paletteSeed ?? null,
      schema_version: store.theme.schemaVersion ?? 1,
      custom_css: store.theme.customCss ?? selectedThemePackage.customCss ?? null,
    },
    { onConflict: "store_id" },
  );
  if (themeError) return { error: themeError };

  const { data: existingPagesBeforeSave, error: existingPagesError } = await client
    .from("store_pages")
    .select("id, slug")
    .eq("store_id", store.id);
  if (existingPagesError) return { error: existingPagesError };

  const persistedPageIdByLocalId = mapPersistedPageIdsByLocalId(
    store.pages,
    (existingPagesBeforeSave as Array<{ id: string; slug: string }> | null) ?? [],
  );

  const pageRows = store.pages.map((page) => ({
    id: persistedPageIdByLocalId.get(page.id) ?? page.id,
    store_id: store.id,
    slug: page.slug,
    title: page.title,
    seo_title: page.seoTitle || null,
    seo_description: page.seoDescription || null,
    is_homepage: page.isHomepage,
  }));

  const { error: pageError } = await client.from("store_pages").upsert(pageRows, { onConflict: "id" });
  if (pageError) return { error: pageError };

  const { data: existingPages } = await client.from("store_pages").select("id").eq("store_id", store.id);
  const existingPageIds = new Set<string>(((existingPages as Array<{ id: string }> | null) ?? []).map((page) => page.id));
  const localPageIds = new Set(pageRows.map((page) => page.id));
  const pageIdsToDelete = Array.from(existingPageIds).filter((id) => !localPageIds.has(id));

  if (pageIdsToDelete.length > 0) {
    const { error: deleteBlocksError } = await client.from("store_page_blocks").delete().in("page_id", pageIdsToDelete);
    if (deleteBlocksError) return { error: deleteBlocksError };
    const { error: deletePagesError } = await client.from("store_pages").delete().in("id", pageIdsToDelete);
    if (deletePagesError) return { error: deletePagesError };
  }

  const { data: existingBlocksBeforeSave, error: existingBlocksBeforeSaveError } = await client
    .from("store_page_blocks")
    .select("id, page_id, block_type, sort_order")
    .eq("store_id", store.id);
  if (existingBlocksBeforeSaveError) return { error: existingBlocksBeforeSaveError };

  const persistedBlockIdByLocalId = mapPersistedBlockIdsByLocalId(
    store.pages,
    persistedPageIdByLocalId,
    (existingBlocksBeforeSave as Array<{ id: string; page_id: string; block_type: string; sort_order?: number }> | null) ?? [],
  );

  const blockRows = store.pages.flatMap((page) =>
    page.blocks.map((block, index) => ({
      id: persistedBlockIdByLocalId.get(block.id) ?? block.id,
      page_id: persistedPageIdByLocalId.get(page.id) ?? page.id,
      store_id: store.id,
      block_type: block.type,
      props: block.props,
      sort_order: index,
      is_visible: block.isVisible,
      entrance_animation: block.entranceAnimation ?? null,
      hover_effect: block.hoverEffect ?? null,
      effect_override: block.effectOverride ?? null,
      layout_variant: block.layoutVariant ?? null,
      custom_html: block.customHtml ?? null,
      custom_css: block.customCss ?? null,
    })),
  );

  if (blockRows.length > 0) {
    const { error: blockError } = await client.from("store_page_blocks").upsert(blockRows, { onConflict: "id" });
    if (blockError) return { error: blockError };
  }

  const { data: existingBlocks } = await client.from("store_page_blocks").select("id").eq("store_id", store.id);
  const existingBlockIds = new Set<string>(((existingBlocks as Array<{ id: string }> | null) ?? []).map((block) => block.id));
  const localBlockIds = new Set(blockRows.map((block) => block.id));
  const blockIdsToDelete = Array.from(existingBlockIds).filter((id) => !localBlockIds.has(id));

  if (blockIdsToDelete.length > 0) {
    const { error: deleteBlocksError } = await client.from("store_page_blocks").delete().in("id", blockIdsToDelete);
    if (deleteBlocksError) return { error: deleteBlocksError };
  }

  const { error: businessProfileError } = await client.from("store_business_profiles").upsert(
    {
      store_id: store.id,
      template_id: activeTemplateSeed.id,
      business_family: activeTemplateSeed.businessFamily,
      catalog_mode: activeTemplateSeed.catalogMode,
      enabled_modules: activeTemplateSeed.capabilities,
    },
    { onConflict: "store_id" },
  );
  if (businessProfileError) return { error: businessProfileError };

  if (selectedPage && changedBy) {
    const { error: revisionError } = await client.from("store_page_revisions").insert({
      page_id: persistedPageIdByLocalId.get(selectedPage.id) ?? selectedPage.id,
      store_id: store.id,
      revision_label: revisionLabel?.trim() || "Manual save",
      changed_by: changedBy,
      blocks_snapshot: sanitizeStoreBlocks(selectedPage.blocks) as any,
    });
    if (revisionError) return { error: revisionError };
  }

  return { error: null };
}
