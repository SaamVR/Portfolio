export type StorefrontRoutingMode = "scoped" | "dedicated";

function getEncodedStoreSlug(storeSlug?: string | null) {
  return storeSlug ? encodeURIComponent(storeSlug) : null;
}

function isExternalOrSpecialPath(path: string) {
  return /^(https?:)?\/\//i.test(path)
    || path.startsWith("#")
    || path.startsWith("mailto:")
    || path.startsWith("tel:")
    || path.startsWith("javascript:");
}

function isPlatformAppPath(pathname: string) {
  return pathname.startsWith("/admin")
    || pathname.startsWith("/cms-admin")
    || pathname.startsWith("/signup")
    || pathname.startsWith("/merchant-signup");
}

function splitRoute(path: string) {
  const hashIndex = path.indexOf("#");
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const queryIndex = withoutHash.indexOf("?");

  return {
    pathname: queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash,
    query: queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : "",
    hash,
  };
}

function buildRoute(pathname: string, query: string, hash: string) {
  return `${pathname}${query ? `?${query}` : ""}${hash}`;
}

function getScopedPrefix(storeSlug?: string | null) {
  const encodedStoreSlug = getEncodedStoreSlug(storeSlug);
  return encodedStoreSlug ? `/stores/${encodedStoreSlug}` : null;
}

function stripScopedStorefrontPath(path: string, storeSlug?: string | null) {
  const scopedPrefix = getScopedPrefix(storeSlug);
  if (!scopedPrefix || isExternalOrSpecialPath(path)) {
    return path;
  }

  const { pathname, query, hash } = splitRoute(path);
  if (isPlatformAppPath(pathname)) {
    return path;
  }

  if (pathname === scopedPrefix) {
    return buildRoute("/", query, hash);
  }

  if (pathname.startsWith(`${scopedPrefix}/`)) {
    return buildRoute(pathname.slice(scopedPrefix.length) || "/", query, hash);
  }

  return path;
}

export function toCanonicalStorefrontPath(path: string, storeSlug?: string | null) {
  const scopedPrefix = getScopedPrefix(storeSlug);
  if (!scopedPrefix || !path || isExternalOrSpecialPath(path)) {
    return path;
  }

  const { pathname, query, hash } = splitRoute(path);
  if (isPlatformAppPath(pathname)) {
    return path;
  }

  if (pathname === scopedPrefix || pathname.startsWith(`${scopedPrefix}/`)) {
    return path;
  }

  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const canonicalPathname = normalizedPathname === "/"
    ? scopedPrefix
    : `${scopedPrefix}${normalizedPathname}`;

  return buildRoute(canonicalPathname, query, hash);
}

export function toPublicStorefrontPath(
  path: string,
  storeSlug: string | null | undefined,
  mode: StorefrontRoutingMode,
) {
  if (mode !== "dedicated" || !storeSlug || !path || isExternalOrSpecialPath(path)) {
    return path;
  }

  const canonicalPath = toCanonicalStorefrontPath(path, storeSlug);
  const publicPath = stripScopedStorefrontPath(canonicalPath, storeSlug);
  const { pathname, query, hash } = splitRoute(publicPath);
  if (!query) {
    return publicPath;
  }

  const params = new URLSearchParams(query);
  const nextPath = params.get("next");
  if (nextPath) {
    params.set("next", stripScopedStorefrontPath(nextPath, storeSlug));
  }

  return buildRoute(pathname, params.toString(), hash);
}

export function getDedicatedStorefrontRedirectPath(storeSlug: string, pathname: string) {
  const scopedPrefix = getScopedPrefix(storeSlug);
  if (!scopedPrefix) return null;

  if (pathname === scopedPrefix) {
    return "/";
  }

  if (pathname.startsWith(`${scopedPrefix}/`)) {
    return pathname.slice(scopedPrefix.length) || "/";
  }

  return null;
}
