import { defaultStore } from "@/lib/cms/default-store";
import type { CmsPageBlueprint } from "@/lib/cms/page-blueprints";
import type { Store, StorePage } from "@/lib/cms/schema";
import type { ThemeExportBundle } from "@/lib/cms/theme-export-import";
import { instantiateStorePagesFromTemplate } from "@/lib/cms/template-pages";
import { isStorefrontTemplateId, type StorefrontTemplateId } from "@/lib/cms/storefront-templates";

export type TemplatePreviewViewport = "desktop" | "tablet" | "mobile";

export function personalizePreviewPages(pages: StorePage[], store: Store): StorePage[] {
  return pages.map((page, pageIndex) => ({
    ...page,
    title: pageIndex === 0 ? `${store.name} Home` : page.title,
    blocks: page.blocks.map((block) => {
      if (block.type !== "hero") return block;
      return {
        ...block,
        props: {
          ...block.props,
          title: store.name,
          subtitle: store.description || block.props.subtitle,
        },
      };
    }),
  }));
}

export function createBuiltInBundle(
  templateId: string,
  pageBlueprints: CmsPageBlueprint[],
  store: Store,
): ThemeExportBundle {
  const pages = personalizePreviewPages(
    instantiateStorePagesFromTemplate(templateId, pageBlueprints, { blueprintId: templateId }),
    store,
  );
  return {
    schemaVersion: 1,
    type: "theme-and-layout",
    theme: store.theme,
    pages,
  };
}

export function createBuiltInCardBundle(
  templateId: string,
  pageBlueprints: CmsPageBlueprint[],
  store: Store,
): ThemeExportBundle {
  if (!isStorefrontTemplateId(templateId)) {
    return createBuiltInBundle(templateId, pageBlueprints, store);
  }

  return {
    schemaVersion: 1,
    type: "theme-and-layout",
    theme: defaultStore.theme,
    pages: instantiateStorePagesFromTemplate(templateId as StorefrontTemplateId, pageBlueprints, { blueprintId: templateId }),
  };
}

export function getCommunityPreviewAsset(
  item: { preview_asset_urls?: string[] | null; cover_image?: string | null },
  viewport: TemplatePreviewViewport,
) {
  const assets = Array.isArray(item.preview_asset_urls) ? item.preview_asset_urls.filter(Boolean) : [];
  if (assets.length === 0) {
    return item.cover_image || "";
  }

  if (viewport === "mobile") {
    return assets[2] || assets[1] || assets[0];
  }

  if (viewport === "tablet") {
    return assets[1] || assets[0];
  }

  return assets[0];
}
