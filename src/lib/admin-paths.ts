export function withStoreId(path: string, storeId?: string | null) {
  if (!storeId) return path;

  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("storeId", storeId);
  const nextQuery = params.toString();

  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export type PageBuilderMode = "basic" | "advanced";

export function buildPageBuilderPath(
  mode: PageBuilderMode = "basic",
  options?: {
    pageId?: string | null;
    blockId?: string | null;
    returnTo?: string | null;
    storeId?: string | null;
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

  const query = params.toString();
  return query ? `/admin/page-builder/${mode}?${query}` : `/admin/page-builder/${mode}`;
}
