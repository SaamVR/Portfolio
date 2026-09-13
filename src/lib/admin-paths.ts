export function withStoreId(path: string, storeId?: string | null) {
  if (!storeId) return path;

  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("storeId", storeId);
  const nextQuery = params.toString();

  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function buildSiteSettingsPath(
  tab?: string | null,
  storeId?: string | null,
) {
  const path = tab
    ? `/admin/site-settings?tab=${encodeURIComponent(tab)}`
    : "/admin/site-settings";

  return withStoreId(path, storeId);
}

export type PageBuilderMode = "basic" | "advanced";

export function buildPageBuilderPath(
  mode: PageBuilderMode = "basic",
  options?: {
    pageId?: string | null;
    blockId?: string | null;
    returnTo?: string | null;
    storeId?: string | null;
    legacy?: boolean | null;
  },
) {
  const params = new URLSearchParams();

  if (options?.pageId) {
    params.set("page", options.pageId);
  }

  if (options?.blockId) {
    params.set("block", options.blockId);
  }

  if (options?.returnTo) {
    params.set("returnTo", options.returnTo);
  }

  if (options?.storeId) {
    params.set("storeId", options.storeId);
  }

  if (options?.legacy) {
    params.set("legacy", "1");
  }

  const query = params.toString();
  return query ? `/admin/page-builder/${mode}?${query}` : `/admin/page-builder/${mode}`;
}


export function buildSectionStylesPath(options?: {
  pageId?: string | null;
  blockId?: string | null;
  storeId?: string | null;
}) {
  const params = new URLSearchParams();
  if (options?.pageId) params.set("page", options.pageId);
  if (options?.blockId) params.set("block", options.blockId);
  if (options?.storeId) params.set("storeId", options.storeId);
  const query = params.toString();
  return query ? `/admin/page-builder/styles?${query}` : "/admin/page-builder/styles";
}

export function getHomepageSectionEditorLink(editTab: string, storeId?: string | null) {
  switch (editTab) {
    case "page_builder":
      return {
        href: buildPageBuilderPath("basic", {
          storeId,
          returnTo: buildSiteSettingsPath("template_features", storeId),
        }),
        label: "Open Page Builder",
      };
    case "shop_page":
      return {
        href: buildSiteSettingsPath("shop_page", storeId),
        label: "Open shop page settings",
      };
    case "faq":
      return {
        href: buildSiteSettingsPath("faq", storeId),
        label: "Open FAQ and policy settings",
      };
    case "brand_seo":
      return {
        href: buildSiteSettingsPath("brand_seo", storeId),
        label: "Open brand settings",
      };
    case "analytics":
      return {
        href: buildSiteSettingsPath("analytics", storeId),
        label: "Open analytics settings",
      };
    case "template_features":
      return {
        href: buildSiteSettingsPath("template_features", storeId),
        label: "Open homepage section settings",
      };
    default:
      return {
        href: buildSiteSettingsPath(editTab, storeId),
        label: "Open related settings",
      };
  }
}
