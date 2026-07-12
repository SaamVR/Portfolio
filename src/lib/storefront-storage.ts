export function getStorefrontScope(storeId?: string | null) {
  if (storeId) {
    return `store:${storeId}`;
  }

  if (typeof window === "undefined") {
    return "global";
  }

  const host = window.location.host.toLowerCase();
  const pathname = window.location.pathname;
  const storePathMatch = pathname.match(/^\/stores\/([^/]+)/i);

  if (storePathMatch?.[1]) {
    return `${host}:stores/${decodeURIComponent(storePathMatch[1]).toLowerCase()}`;
  }

  return host;
}

export function getScopedStorefrontStorageKey(prefix: string, storeId?: string | null) {
  return `${prefix}:${getStorefrontScope(storeId)}`;
}
