export const ADMIN_COLLECTION_PAGE_SIZE = 30;

export type AdminCollectionPage<T> = {
  items: T[];
  page: number;
  hasNext: boolean;
  nextPage: number | null;
};

function clampPageSize(pageSize: number) {
  if (!Number.isFinite(pageSize)) return ADMIN_COLLECTION_PAGE_SIZE;
  return Math.min(100, Math.max(1, Math.floor(pageSize)));
}

export function getAdminCollectionRange(page: number, pageSize = ADMIN_COLLECTION_PAGE_SIZE) {
  const safePage = Number.isFinite(page) ? Math.max(0, Math.floor(page)) : 0;
  const safePageSize = clampPageSize(pageSize);
  const from = safePage * safePageSize;

  return {
    page: safePage,
    pageSize: safePageSize,
    from,
    // PostgREST ranges are inclusive. Ask for one extra row to derive hasNext without a count query.
    to: from + safePageSize,
  };
}

export function buildAdminCollectionPage<T>(
  rows: readonly T[],
  page: number,
  pageSize = ADMIN_COLLECTION_PAGE_SIZE,
): AdminCollectionPage<T> {
  const range = getAdminCollectionRange(page, pageSize);
  const hasNext = rows.length > range.pageSize;

  return {
    items: rows.slice(0, range.pageSize),
    page: range.page,
    hasNext,
    nextPage: hasNext ? range.page + 1 : null,
  };
}

export function normalizeAdminCollectionSearch(value: string, maxLength = 100) {
  return value.trim().replace(/\s+/g, " ").slice(0, Math.max(1, maxLength));
}

export function normalizeAdminOrSearch(value: string, maxLength = 100) {
  return normalizeAdminCollectionSearch(value, maxLength)
    .replace(/[(),.*"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
