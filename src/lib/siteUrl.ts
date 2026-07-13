const configuredSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const configuredStoreSubdomainBaseDomain = (
  process.env.NEXT_PUBLIC_STORE_SUBDOMAIN_BASE_DOMAIN
  || process.env.STORE_SUBDOMAIN_BASE_DOMAIN
  || process.env.NEXT_PUBLIC_CMS_ROOT_DOMAIN
  || process.env.CMS_ROOT_DOMAIN
  || ""
)
  .replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "")
  .replace(/\/$/, "");

export const siteUrl =
  configuredSiteUrl ||
  (typeof window !== "undefined" ? window.location.origin : "https://commerce-engine.local");

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${normalizedPath}`;
}

function normalizeDomain(value?: string | null) {
  if (!value) return null;
  return value
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .trim()
    .toLowerCase() || null;
}

function joinOriginPath(origin: string, path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedPath === "/" ? origin : `${origin}${normalizedPath}`;
}

export function resolveStoreOrigin(store?: { slug: string; customDomain?: string | null } | null) {
  if (!store?.slug) {
    return siteUrl;
  }

  const customDomain = normalizeDomain(store.customDomain);
  if (customDomain) {
    return `https://${customDomain}`;
  }

  if (configuredStoreSubdomainBaseDomain) {
    const protocol = configuredStoreSubdomainBaseDomain.startsWith("localhost") ? "http" : "https";
    return `${protocol}://${encodeURIComponent(store.slug)}.${configuredStoreSubdomainBaseDomain}`;
  }

  return `${siteUrl}/stores/${encodeURIComponent(store.slug)}`;
}

export function absoluteStoreUrl(store?: { slug: string; customDomain?: string | null } | null, path = "/") {
  const origin = resolveStoreOrigin(store);
  if (origin.includes("/stores/")) {
    const normalizedPath = path === "/" ? "" : (path.startsWith("/") ? path : `/${path}`);
    return `${origin}${normalizedPath}`;
  }

  return joinOriginPath(origin, path);
}
