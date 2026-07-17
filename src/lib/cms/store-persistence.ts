import type { SupabaseClient } from "@supabase/supabase-js";
import type { Store, StorePage } from "@/lib/cms/schema";
import { sanitizeStoreBlocks } from "@/lib/cms/validation";
import { resolveThemePackageById, type ThemePackageDefinition } from "@/lib/theme-packages";
import type { StoreBlueprintDefinition } from "@/lib/cms/store-blueprints";

type PersistStorefrontOptions = {
  client: SupabaseClient<any>;
  store: Store;
  ownerId?: string | null;
  blueprint: StoreBlueprintDefinition;
  themePackages: ThemePackageDefinition[];
  selectedPage?: StorePage | null;
  revisionLabel?: string;
  changedBy?: string | null;
};

export async function persistStorefrontState({
  client,
  store,
  ownerId,
  blueprint,
  themePackages,
  selectedPage,
  revisionLabel,
  changedBy,
}: PersistStorefrontOptions) {
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
      store_type: blueprint.id,
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
      },
      custom_css: store.theme.customCss ?? selectedThemePackage.customCss ?? null,
    },
    { onConflict: "store_id" },
  );
  if (themeError) return { error: themeError };

  const pageRows = store.pages.map((page) => ({
    id: page.id,
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
  const localPageIds = new Set(store.pages.map((page) => page.id));
  const pageIdsToDelete = Array.from(existingPageIds).filter((id) => !localPageIds.has(id));

  if (pageIdsToDelete.length > 0) {
    const { error: deleteBlocksError } = await client.from("store_page_blocks").delete().in("page_id", pageIdsToDelete);
    if (deleteBlocksError) return { error: deleteBlocksError };
    const { error: deletePagesError } = await client.from("store_pages").delete().in("id", pageIdsToDelete);
    if (deletePagesError) return { error: deletePagesError };
  }

  const blockRows = store.pages.flatMap((page) =>
    page.blocks.map((block, index) => ({
      id: block.id,
      page_id: page.id,
      store_id: store.id,
      block_type: block.type,
      props: block.props,
      sort_order: index,
      is_visible: block.isVisible,
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
      blueprint_id: blueprint.id,
      blueprint_version: 1,
      business_family: blueprint.businessFamily,
      catalog_mode: blueprint.catalogMode,
      enabled_modules: blueprint.capabilities,
    },
    { onConflict: "store_id" },
  );
  if (businessProfileError) return { error: businessProfileError };

  if (selectedPage && changedBy) {
    const { error: revisionError } = await client.from("store_page_revisions").insert({
      page_id: selectedPage.id,
      store_id: store.id,
      revision_label: revisionLabel?.trim() || "Manual save",
      changed_by: changedBy,
      blocks_snapshot: sanitizeStoreBlocks(selectedPage.blocks) as any,
    });
    if (revisionError) return { error: revisionError };
  }

  return { error: null };
}
