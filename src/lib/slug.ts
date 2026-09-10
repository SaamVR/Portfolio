import { getCmsRootDomain, getPlatformSiteUrl, getStoreSubdomainBaseDomain } from "@/lib/platform/site-config";

/**
 * Generate a URL-friendly slug from a product name.
 * e.g. "Premium Cotton T-Shirt" -> "premium-cotton-t-shirt"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createStoreSlug(name: string) {
  return slugify(name || "my-store") || "my-store";
}

function getEncodedStoreSlug(storeSlug?: string | null) {
  return storeSlug ? encodeURIComponent(storeSlug) : null;
}

function normalizeHost(value?: string | null) {
  if (!value) return null;
  return value
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .split(":")[0]
    .trim()
    .toLowerCase() || null;
}

function isLocalHost(hostname?: string | null) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isVercelDeploymentHost(hostname?: string | null) {
  return Boolean(hostname && (hostname === "vercel.app" || hostname.endsWith(".vercel.app")));
}

function isPlatformAppPath(pathname: string) {
  return pathname === "/"
    || pathname.startsWith("/admin")
    || pathname.startsWith("/cms-admin")
    || pathname.startsWith("/signup")
    || pathname.startsWith("/merchant-signup");
}

function isExternalOrSpecialPath(path: string) {
  return /^(https?:)?\/\//i.test(path)
    || path.startsWith("#")
    || path.startsWith("mailto:")
    || path.startsWith("tel:")
    || path.startsWith("javascript:");
}

export function isDedicatedStorefrontHost(storeSlug?: string | null) {
  const encodedStoreSlug = getEncodedStoreSlug(storeSlug);
  if (!encodedStoreSlug || typeof window === "undefined") {
    return false;
  }

  const hostname = normalizeHost(window.location.hostname || window.location.host);
  if (!hostname || isLocalHost(hostname) || isVercelDeploymentHost(hostname)) {
    return false;
  }

  const storeSubdomainBaseDomain = normalizeHost(getStoreSubdomainBaseDomain());
  if (storeSubdomainBaseDomain && hostname === `${encodedStoreSlug}.${storeSubdomainBaseDomain}`) {
    return true;
  }

  const platformHosts = new Set(
    [
      normalizeHost(getCmsRootDomain()),
      normalizeHost(getPlatformSiteUrl()),
      storeSubdomainBaseDomain,
    ].filter((value): value is string => Boolean(value)),
  );

  return !platformHosts.has(hostname);
}

export function shouldUseDedicatedStorefrontPaths(storeSlug?: string | null) {
  const encodedStoreSlug = getEncodedStoreSlug(storeSlug);
  if (!encodedStoreSlug || !isDedicatedStorefrontHost(storeSlug)) {
    return false;
  }

  const pathname = window.location.pathname || "/";
  if (pathname === `/stores/${encodedStoreSlug}` || pathname.startsWith(`/stores/${encodedStoreSlug}/`)) {
    return false;
  }

  return !isPlatformAppPath(pathname);
}

function buildStorefrontScopedPath(path: string, storeSlug?: string | null) {
  const encodedStoreSlug = getEncodedStoreSlug(storeSlug);
  if (!encodedStoreSlug) {
    return path;
  }

  const [pathnamePart, queryPart] = path.split("?");
  const pathname = pathnamePart.startsWith("/") ? pathnamePart : `/${pathnamePart}`;
  const query = queryPart ? `?${queryPart}` : "";

  if (pathname === "/") {
    return `/stores/${encodedStoreSlug}${query}`;
  }

  return `/stores/${encodedStoreSlug}${pathname}${query}`;
}

/**
 * Build a product URL with slug: /product/premium-cotton-t-shirt-<id>
 * The id is appended after a double-hyphen delimiter for unambiguous extraction.
 */
export function productUrl(id: string, name: string, storeSlug?: string | null): string {
  const slug = slugify(name);
  const basePath = storeSlug
    ? buildStorefrontScopedPath("/product", storeSlug)
    : "/product";
  return `${basePath}/${slug}--${encodeURIComponent(id)}`;
}

export function storePageUrl(storeSlug: string, pageSlug: string): string {
  const normalizedSlug = pageSlug.replace(/^\/+/, "");
  return normalizedSlug ? buildStorefrontScopedPath(`/${normalizedSlug}`, storeSlug) : buildStorefrontScopedPath("/", storeSlug);
}

export function storefrontPath(path: string, storeSlug?: string | null): string {
  if (!storeSlug || isExternalOrSpecialPath(path)) {
    return path;
  }

  const [pathnamePart, queryPart] = path.split("?");
  const pathname = pathnamePart.startsWith("/") ? pathnamePart : `/${pathnamePart}`;
  const query = queryPart ? `?${queryPart}` : "";

  if (pathname !== "/" && isPlatformAppPath(pathname)) {
    return `${pathname}${query}`;
  }

  return buildStorefrontScopedPath(`${pathname}${query}`, storeSlug);
}

export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/**
 * Extract the product ID from a slug-id param.
 * Supports current double-hyphen URLs, UUID-only/UUID-suffix URLs,
 * and legacy launch-product URLs that used a single hyphen before the id.
 */
export function extractIdFromSlug(slugId: string): string {
  const decoded = decodeURIComponent(slugId);

  const delimiterIndex = decoded.lastIndexOf("--");
  if (delimiterIndex !== -1) {
    return decoded.slice(delimiterIndex + 2);
  }

  if (decoded.length >= 36) {
    const possibleId = decoded.slice(-36);
    if (isUuid(possibleId)) {
      return possibleId;
    }
  }

  if (decoded.startsWith("launch-")) {
    return decoded;
  }

  const legacyLaunchIndex = decoded.lastIndexOf("-launch-");
  if (legacyLaunchIndex !== -1) {
    return decoded.slice(legacyLaunchIndex + 1);
  }

  return decoded;
}
