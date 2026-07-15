function normalizeHost(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .split(":")[0]
    .trim()
    .toLowerCase();
}

function isLocalHost(value?: string | null) {
  const host = normalizeHost(value);
  return host === "localhost" || host === "127.0.0.1";
}

function getRuntimeOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin.replace(/\/$/, "");
}

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
  configuredSiteUrl && !(isLocalHost(configuredSiteUrl) && !isLocalHost(getRuntimeOrigin()))
    ? configuredSiteUrl
    : getRuntimeOrigin() ||
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

  if (configuredStoreSubdomainBaseDomain && !(isLocalHost(configuredStoreSubdomainBaseDomain) && !isLocalHost(siteUrl))) {
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
